import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  categories,
  serverCategories,
  servers,
  serverTags,
  tags,
} from '../db/schema.js';
import type { GitHubFetcherService, GitHubRepositoryMetadata } from './github-fetcher.js';
import type { PaginatedResult } from '../routes/me.js';
import { AppError } from '../utils/app-error.js';
import { SearchService } from './search.js';
import type { SearchParams } from './search.js';
import { WebhookService } from './webhook.js';
import { detectMcpSpecVersions, extractToolSchemasFromReadme, extractToolSchemasFromMcpJson } from '../utils/mcp-spec.js';

interface CreateServerParams {
  githubUrl: string;
  userId: string;
  categorySlugs?: string[];
}

type ListServerParams = SearchParams;

export interface ServerListResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

type DbClient = typeof db;

type ServerRow = typeof servers.$inferSelect;

export interface ServerResponse extends ServerRow {
  categories: string[];
  tags: string[];
}

export interface ServerPreview {
  name: string;
  description: string;
  githubUrl: string;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt: Date | null;
}

export class ServerService {
  private readonly searchService: SearchService;
  private readonly webhookService: WebhookService;

  constructor(
    private readonly githubFetcher: Pick<GitHubFetcherService, 'fetchRepositoryMetadata'>,
    private readonly database: DbClient = db,
    searchService?: SearchService,
    webhookService?: WebhookService,
  ) {
    this.searchService = searchService ?? new SearchService(database);
    this.webhookService = webhookService ?? new WebhookService();
  }

  async create({ githubUrl, userId, categorySlugs = [] }: CreateServerParams): Promise<ServerResponse> {
    const metadata = await this.githubFetcher.fetchRepositoryMetadata(githubUrl);

    const existingRows = await this.database
      .select({ id: servers.id })
      .from(servers)
      .where(eq(servers.githubUrl, metadata.githubUrl))
      .limit(1);

    const existing = existingRows[0];

    if (existing) {
      throw new AppError('This server is already registered.', 409, 'duplicate_server');
    }

    const normalizedCategorySlugs = Array.from(
      new Set(categorySlugs.map((slug) => slug.trim().toLowerCase())),
    ).filter(Boolean);
    const categoryIds = await this.resolveCategoryIds(normalizedCategorySlugs);

    const slug = await this.generateUniqueSlug(metadata.name);

    const toolSchemas = (() => {
      if (metadata.mcpJsonContent) {
        const fromMcp = extractToolSchemasFromMcpJson(metadata.mcpJsonContent);
        if (fromMcp.length > 0) {
          return fromMcp;
        }
      }
      if (metadata.readmeContent) {
        return extractToolSchemasFromReadme(metadata.readmeContent);
      }
      return [];
    })();

    const mcpSpecVersions = detectMcpSpecVersions(
      metadata.readmeContent,
      metadata.mcpJsonContent,
    );

    try {
      const [created] = await this.database
        .insert(servers)
        .values({
          ...this.toInsertPayload(metadata, userId, slug),
          toolSchemas: toolSchemas.length > 0 ? toolSchemas : [],
          mcpSpecVersions,
        })
        .returning();

      if (!created) {
        throw new AppError('Failed to create server', 500, 'server_create_failed');
      }

      if (categoryIds.length > 0) {
        await this.database.insert(serverCategories).values(
          categoryIds.map((categoryId) => ({
            serverId: created.id,
            categoryId,
          })),
        );
      }

      const result: ServerResponse = {
        ...created,
        categories: normalizedCategorySlugs,
        tags: [],
      };

      // Dispatch webhook notification — fire-and-forget, does not block response.
      void this.webhookService.dispatch('server.created', result);

      return result;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new AppError('This server is already registered.', 409, 'duplicate_server');
      }

      throw error;
    }
  }

  async preview(githubUrl: string): Promise<ServerPreview> {
    const metadata = await this.githubFetcher.fetchRepositoryMetadata(githubUrl);

    const existingRows = await this.database
      .select({ id: servers.id })
      .from(servers)
      .where(eq(servers.githubUrl, metadata.githubUrl))
      .limit(1);

    if (existingRows[0]) {
      throw new AppError('This server is already registered.', 409, 'duplicate_server');
    }

    return {
      name: metadata.name,
      description: metadata.description,
      githubUrl: metadata.githubUrl,
      githubStars: metadata.githubStars,
      githubForks: metadata.githubForks,
      openIssues: metadata.openIssues,
      lastCommitAt: metadata.lastCommitAt,
    };
  }

  async getBySlug(slug: string): Promise<ServerResponse> {
    const rows = await this.database
      .select()
      .from(servers)
      .where(and(eq(servers.slug, slug), eq(servers.moderationStatus, 'active')))
      .limit(1);

    const server = rows[0];

    if (!server) {
      throw new AppError('Server not found', 404, 'server_not_found');
    }

    const [serverCategoriesList, serverTagsList] = await Promise.all([
      this.getCategorySlugs(server.id),
      this.getTagSlugs(server.id),
    ]);

    return {
      ...server,
      categories: serverCategoriesList,
      tags: serverTagsList,
    };
  }

  async list(params: ListServerParams = {}): Promise<ServerListResult<ServerResponse>> {
    return this.searchService.search(params) as Promise<ServerListResult<ServerResponse>>;
  }

  async listByAuthor(
    userId: string,
    pagination: { page: number; perPage: number } = { page: 1, perPage: 20 },
  ): Promise<PaginatedResult<ServerResponse>> {
    const { page, perPage } = pagination;
    const offset = (page - 1) * perPage;

    const [rows, totalRows] = await Promise.all([
      this.database
        .select()
        .from(servers)
        .where(eq(servers.authorId, userId))
        .orderBy(desc(servers.createdAt))
        .limit(perPage)
        .offset(offset),
      this.database
        .select({ total: count() })
        .from(servers)
        .where(eq(servers.authorId, userId)),
    ]);

    const serverIds = rows.map((row) => row.id);
    const [categoriesMap, tagsMap] = await Promise.all([
      this.getCategoriesMap(serverIds),
      this.getTagsMap(serverIds),
    ]);

    return {
      data: rows.map((row) => ({
        ...row,
        categories: categoriesMap.get(row.id) ?? [],
        tags: tagsMap.get(row.id) ?? [],
      })),
      meta: {
        page,
        per_page: perPage,
        total: Number(totalRows[0]?.total ?? 0),
      },
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = this.slugify(name);
    let candidate = base;
    let suffix = 2;

    while (true) {
      const existingRows = await this.database
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.slug, candidate))
        .limit(1);

      const existing = existingRows[0];

      if (!existing) {
        return candidate;
      }

      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'server';
  }

  private toInsertPayload(metadata: GitHubRepositoryMetadata, userId: string, slug: string) {
    return {
      name: metadata.name,
      slug,
      description: metadata.description,
      githubUrl: metadata.githubUrl,
      authorId: userId,
      readmeContent: metadata.readmeContent,
      githubStars: metadata.githubStars,
      githubForks: metadata.githubForks,
      openIssues: metadata.openIssues,
      lastCommitAt: metadata.lastCommitAt,
    };
  }

  private async resolveCategoryIds(categorySlugs: string[]): Promise<string[]> {
    if (categorySlugs.length === 0) {
      return [];
    }

    const categoryRows = await this.database
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(inArray(categories.slug, categorySlugs));

    const slugToId = new Map(categoryRows.map((row) => [row.slug, row.id]));
    const missing = categorySlugs.filter((slug) => !slugToId.has(slug));

    if (missing.length > 0) {
      throw new AppError('One or more categories are invalid.', 422, 'invalid_categories');
    }

    return categorySlugs.map((slug) => slugToId.get(slug) as string);
  }

  private async getCategorySlugs(serverId: string): Promise<string[]> {
    const rows = await this.database
      .select({ slug: categories.slug })
      .from(serverCategories)
      .innerJoin(categories, eq(serverCategories.categoryId, categories.id))
      .where(eq(serverCategories.serverId, serverId));

    return rows.map((row) => row.slug);
  }

  private async getTagSlugs(serverId: string): Promise<string[]> {
    const rows = await this.database
      .select({ slug: tags.slug })
      .from(serverTags)
      .innerJoin(tags, eq(serverTags.tagId, tags.id))
      .where(eq(serverTags.serverId, serverId));

    return rows.map((row) => row.slug);
  }

  private async getCategoriesMap(serverIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();

    if (serverIds.length === 0) {
      return map;
    }

    const rows = await this.database
      .select({ serverId: serverCategories.serverId, slug: categories.slug })
      .from(serverCategories)
      .innerJoin(categories, eq(serverCategories.categoryId, categories.id))
      .where(inArray(serverCategories.serverId, serverIds));

    for (const row of rows) {
      const current = map.get(row.serverId) ?? [];
      current.push(row.slug);
      map.set(row.serverId, current);
    }

    return map;
  }

  private async getTagsMap(serverIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();

    if (serverIds.length === 0) {
      return map;
    }

    const rows = await this.database
      .select({ serverId: serverTags.serverId, slug: tags.slug })
      .from(serverTags)
      .innerJoin(tags, eq(serverTags.tagId, tags.id))
      .where(inArray(serverTags.serverId, serverIds));

    for (const row of rows) {
      const current = map.get(row.serverId) ?? [];
      current.push(row.slug);
      map.set(row.serverId, current);
    }

    return map;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    return 'code' in error && error.code === '23505';
  }
}
