import { eq } from 'drizzle-orm';
import { getGitHubAuthHeader, loadGitHubConfig } from '../config/github.js';
import { db } from '../db/index.js';
import { categories, serverCategories, servers, users } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';
import { GitHubFetcherService, type GitHubRepositoryMetadata } from './github-fetcher.js';

const OFFICIAL_REGISTRY_README_URL =
  'https://raw.githubusercontent.com/modelcontextprotocol/servers/refs/heads/main/README.md';
const GITHUB_SEARCH_API_URL = 'https://api.github.com/search/repositories';
const GITHUB_TOPIC_QUERY = 'topic:mcp-server archived:false is:public';
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_REQUEST_DELAY_MS = 250;
const DEFAULT_SEARCH_PAGES = 3;
const DEFAULT_FALLBACK_CATEGORY = 'developer-tools';
const DEFAULT_SEEDER_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_SEEDER_USERNAME = 'mcp-seeder';

interface GitHubSearchResponse {
  items: Array<{ html_url: string }>;
}

interface PreparedServer {
  githubUrl: string;
  name: string;
  slug: string;
  description: string;
  readmeContent: string | null;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt: Date | null;
  categorySlugs: string[];
}

export interface SeedOptions {
  limit?: number;
  batchSize?: number;
  delayMs?: number;
  searchPages?: number;
}

export interface SeedSummary {
  discovered: number;
  attempted: number;
  imported: number;
  skippedDuplicates: number;
  failed: number;
}

export class SeederService {
  private readonly fetcher: GitHubFetcherService;
  private readonly githubHeaders: Record<string, string>;

  constructor(private readonly database = db) {
    this.fetcher = new GitHubFetcherService();
    this.githubHeaders = this.buildGitHubHeaders();
  }

  async run(options: SeedOptions = {}): Promise<SeedSummary> {
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    const delayMs = options.delayMs ?? DEFAULT_REQUEST_DELAY_MS;
    const searchPages = options.searchPages ?? DEFAULT_SEARCH_PAGES;

    if (batchSize <= 0) {
      throw new AppError('batchSize must be greater than 0', 400, 'invalid_seed_batch_size');
    }

    if (delayMs < 0) {
      throw new AppError('delayMs cannot be negative', 400, 'invalid_seed_delay');
    }

    const categoryMap = await this.loadCategoryMap();
    const fallbackCategorySlug = this.getFallbackCategorySlug(categoryMap);
    const seederUserId = await this.ensureSeederUser();

    console.log('Collecting candidate repositories from official sources...');
    const candidates = await this.collectCandidateUrls(searchPages);

    const existingRows = await this.database
      .select({ githubUrl: servers.githubUrl, slug: servers.slug })
      .from(servers);

    const existingUrls = new Set(existingRows.map((row) => row.githubUrl));
    const usedSlugs = new Set(existingRows.map((row) => row.slug));

    const preparedServers: PreparedServer[] = [];
    let skippedDuplicates = 0;
    let failed = 0;

    console.log(`Discovered ${candidates.length} candidates. Fetching metadata...`);

    for (let index = 0; index < candidates.length; index += 1) {
      const githubUrl = candidates[index] ?? '';

      if (existingUrls.has(githubUrl)) {
        skippedDuplicates += 1;
        continue;
      }

      if (options.limit && preparedServers.length >= options.limit) {
        break;
      }

      try {
        const metadata = await this.fetcher.fetchRepositoryMetadata(githubUrl);
        const categorySlugs = this.categorize(metadata, categoryMap, fallbackCategorySlug);
        const slug = this.generateUniqueSlug(metadata.name, usedSlugs);

        preparedServers.push({
          githubUrl: metadata.githubUrl,
          name: metadata.name,
          slug,
          description: metadata.description,
          readmeContent: metadata.readmeContent,
          githubStars: metadata.githubStars,
          githubForks: metadata.githubForks,
          openIssues: metadata.openIssues,
          lastCommitAt: metadata.lastCommitAt,
          categorySlugs,
        });

        existingUrls.add(metadata.githubUrl);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to fetch metadata for ${githubUrl}: ${message}`);
      }

      if ((index + 1) % 10 === 0 || index === candidates.length - 1) {
        console.log(
          `Progress ${index + 1}/${candidates.length}: prepared=${preparedServers.length}, duplicates=${skippedDuplicates}, failed=${failed}`,
        );
      }

      if (delayMs > 0) {
        await this.wait(delayMs);
      }
    }

    if (preparedServers.length === 0) {
      console.log('No new repositories to import.');
      return {
        discovered: candidates.length,
        attempted: 0,
        imported: 0,
        skippedDuplicates,
        failed,
      };
    }

    console.log(`Inserting ${preparedServers.length} prepared repositories in batches of ${batchSize}...`);

    let imported = 0;

    for (let start = 0; start < preparedServers.length; start += batchSize) {
      const chunk = preparedServers.slice(start, start + batchSize);

      const insertedRows = await this.database
        .insert(servers)
        .values(
          chunk.map((record) => ({
            name: record.name,
            slug: record.slug,
            description: record.description,
            githubUrl: record.githubUrl,
            authorId: seederUserId,
            readmeContent: record.readmeContent,
            githubStars: record.githubStars,
            githubForks: record.githubForks,
            openIssues: record.openIssues,
            lastCommitAt: record.lastCommitAt,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: servers.id, githubUrl: servers.githubUrl });

      const insertedByUrl = new Map(insertedRows.map((row) => [row.githubUrl, row.id]));
      const categoryLinks: Array<{ serverId: string; categoryId: string }> = [];

      for (const record of chunk) {
        const serverId = insertedByUrl.get(record.githubUrl);

        if (!serverId) {
          skippedDuplicates += 1;
          continue;
        }

        imported += 1;

        for (const categorySlug of record.categorySlugs) {
          const categoryId = categoryMap.get(categorySlug);
          if (categoryId) {
            categoryLinks.push({ serverId, categoryId });
          }
        }
      }

      if (categoryLinks.length > 0) {
        await this.database.insert(serverCategories).values(categoryLinks).onConflictDoNothing();
      }

      console.log(
        `Inserted batch ${Math.floor(start / batchSize) + 1}: imported=${imported}, skipped=${skippedDuplicates}, failed=${failed}`,
      );
    }

    return {
      discovered: candidates.length,
      attempted: preparedServers.length,
      imported,
      skippedDuplicates,
      failed,
    };
  }

  private async collectCandidateUrls(searchPages: number): Promise<string[]> {
    const [officialUrls, topicUrls] = await Promise.all([
      this.fetchOfficialRegistryUrls(),
      this.fetchGitHubTopicUrls(searchPages),
    ]);

    const combined = [...officialUrls, ...topicUrls];
    const deduped = Array.from(new Set(combined));

    return deduped.filter((url) => this.isGitHubRepoUrl(url));
  }

  private async fetchOfficialRegistryUrls(): Promise<string[]> {
    const response = await fetch(OFFICIAL_REGISTRY_README_URL, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'mcp-discovery-registry',
      },
    });

    if (!response.ok) {
      throw new AppError('Failed to fetch official MCP registry source', 502, 'registry_source_unavailable');
    }

    const content = await response.text();
    const matches = content.match(/https:\/\/github\.com\/[^\s)\]]+/g) ?? [];

    return matches
      .map((url) => this.normalizeGitHubUrl(url))
      .filter((url): url is string => Boolean(url))
      .filter((url) => !url.endsWith('/modelcontextprotocol/servers'));
  }

  private async fetchGitHubTopicUrls(searchPages: number): Promise<string[]> {
    const urls: string[] = [];

    for (let page = 1; page <= searchPages; page += 1) {
      const params = new URLSearchParams({
        q: GITHUB_TOPIC_QUERY,
        sort: 'stars',
        order: 'desc',
        per_page: '100',
        page: String(page),
      });

      const response = await fetch(`${GITHUB_SEARCH_API_URL}?${params.toString()}`, {
        headers: this.githubHeaders,
      });

      if (!response.ok) {
        throw this.mapGitHubSearchError(response.status);
      }

      const payload = (await response.json()) as GitHubSearchResponse;

      if (!payload.items || payload.items.length === 0) {
        break;
      }

      for (const item of payload.items) {
        const normalized = this.normalizeGitHubUrl(item.html_url);
        if (normalized) {
          urls.push(normalized);
        }
      }
    }

    return urls;
  }

  private async loadCategoryMap(): Promise<Map<string, string>> {
    const rows = await this.database.select({ id: categories.id, slug: categories.slug }).from(categories);

    if (rows.length === 0) {
      throw new AppError('No categories found. Run db:seed first.', 500, 'categories_not_seeded');
    }

    return new Map(rows.map((row) => [row.slug, row.id]));
  }

  private getFallbackCategorySlug(categoryMap: Map<string, string>): string {
    if (categoryMap.has(DEFAULT_FALLBACK_CATEGORY)) {
      return DEFAULT_FALLBACK_CATEGORY;
    }

    const first = categoryMap.keys().next().value;

    if (!first) {
      throw new AppError('No categories found for fallback assignment', 500, 'category_fallback_missing');
    }

    return first;
  }

  private categorize(
    metadata: Pick<GitHubRepositoryMetadata, 'name' | 'description' | 'readmeContent'>,
    categoryMap: Map<string, string>,
    fallbackCategorySlug: string,
  ): string[] {
    const haystack = `${metadata.name} ${metadata.description} ${metadata.readmeContent ?? ''}`.toLowerCase();

    const rules: Array<{ slug: string; keywords: string[] }> = [
      { slug: 'databases', keywords: ['database', 'postgres', 'mysql', 'sqlite', 'redis', 'mongodb', 'supabase'] },
      { slug: 'communication', keywords: ['slack', 'discord', 'telegram', 'email', 'chat', 'messaging'] },
      { slug: 'social-media', keywords: ['twitter', 'x.com', 'reddit', 'linkedin', 'social'] },
      { slug: 'ai-infrastructure', keywords: ['openai', 'anthropic', 'llm', 'model', 'inference', 'embedding'] },
      { slug: 'data-processing', keywords: ['etl', 'pipeline', 'scrape', 'parser', 'transform', 'analytics'] },
      { slug: 'productivity', keywords: ['notion', 'calendar', 'task', 'todo', 'docs', 'workflow'] },
      { slug: 'developer-tools', keywords: ['github', 'gitlab', 'code', 'ci', 'deploy', 'developer'] },
    ];

    const matched = rules
      .filter((rule) => categoryMap.has(rule.slug) && rule.keywords.some((keyword) => haystack.includes(keyword)))
      .map((rule) => rule.slug);

    if (matched.length === 0) {
      return [fallbackCategorySlug];
    }

    return Array.from(new Set(matched));
  }

  private async ensureSeederUser(): Promise<string> {
    await this.database
      .insert(users)
      .values({
        id: DEFAULT_SEEDER_USER_ID,
        username: DEFAULT_SEEDER_USERNAME,
        displayName: 'MCP Seeder',
        bio: 'System user for importing MCP servers',
      })
      .onConflictDoNothing();

    const byIdRows = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, DEFAULT_SEEDER_USER_ID))
      .limit(1);

    if (byIdRows[0]) {
      return byIdRows[0].id;
    }

    const byUsernameRows = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, DEFAULT_SEEDER_USERNAME))
      .limit(1);

    if (!byUsernameRows[0]) {
      throw new AppError('Failed to initialize seeder user', 500, 'seeder_user_init_failed');
    }

    return byUsernameRows[0].id;
  }

  private generateUniqueSlug(name: string, usedSlugs: Set<string>): string {
    const base = this.slugify(name);
    let candidate = base;
    let suffix = 2;

    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(candidate);
    return candidate;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'server';
  }

  private normalizeGitHubUrl(url: string): string | null {
    const cleaned = url.trim().replace(/[),.;]+$/g, '');
    const match = cleaned.match(/^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i);

    if (!match) {
      return null;
    }

    const owner = match[1];
    const repo = match[2];

    if (!owner || !repo) {
      return null;
    }

    return `https://github.com/${owner}/${repo}`;
  }

  private isGitHubRepoUrl(url: string): boolean {
    return /^https:\/\/github\.com\/[^/]+\/[^/]+$/i.test(url);
  }

  private mapGitHubSearchError(status: number): AppError {
    if (status === 401 || status === 403) {
      return new AppError('GitHub API authentication failed or rate limit exceeded', 502, 'github_auth_failed');
    }

    if (status >= 500) {
      return new AppError('GitHub search API unavailable', 502, 'github_search_unavailable');
    }

    return new AppError('Failed to fetch GitHub search results', 502, 'github_search_failed');
  }

  private buildGitHubHeaders(): Record<string, string> {
    const config = loadGitHubConfig();
    const authHeader = getGitHubAuthHeader(config);

    if (!authHeader) {
      throw new AppError('GitHub authentication is not configured correctly', 500, 'github_config_error');
    }

    return {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'mcp-discovery-registry',
      ...authHeader,
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
