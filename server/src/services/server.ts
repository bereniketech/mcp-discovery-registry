import { count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  categories,
  serverCategories,
  servers,
  serverTags,
  tags,
} from '../db/schema.js';
import type { GitHubFetcherService, GitHubRepositoryMetadata } from './github-fetcher.js';
import { AppError } from '../utils/app-error.js';

interface CreateServerParams {
  githubUrl: string;
  userId: string;
}

interface ListServerParams {
  page?: number;
  perPage?: number;
}

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

export class ServerService {
  constructor(
    private readonly githubFetcher: Pick<GitHubFetcherService, 'fetchRepositoryMetadata'>,
    private readonly database: DbClient = db,
  ) {}

  async create({ githubUrl, userId }: CreateServerParams): Promise<ServerResponse> {
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

    const slug = await this.generateUniqueSlug(metadata.name);

    try {
      const [created] = await this.database
        .insert(servers)
        .values(this.toInsertPayload(metadata, userId, slug))
        .returning();

      if (!created) {
        throw new AppError('Failed to create server', 500, 'server_create_failed');
      }

      return {
        ...created,
        categories: [],
        tags: [],
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new AppError('This server is already registered.', 409, 'duplicate_server');
      }

      throw error;
    }
  }

  async getBySlug(slug: string): Promise<ServerResponse> {
    const rows = await this.database
      .select()
      .from(servers)
      .where(eq(servers.slug, slug))
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
    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
    const offset = (page - 1) * perPage;

    const countRows = await this.database
      .select({ total: count() })
      .from(servers);

    const total = countRows[0]?.total ?? 0;

    const serverRows = await this.database
      .select()
      .from(servers)
      .orderBy(desc(servers.createdAt))
      .limit(perPage)
      .offset(offset);

    const serverIds = serverRows.map((row) => row.id);
    const categoriesByServer = await this.getCategoriesMap(serverIds);
    const tagsByServer = await this.getTagsMap(serverIds);

    const items = serverRows.map((row) => ({
      ...row,
      categories: categoriesByServer.get(row.id) ?? [],
      tags: tagsByServer.get(row.id) ?? [],
    }));

    return {
      items,
      page,
      perPage,
      totalItems: total,
      totalPages: total === 0 ? 0 : Math.ceil(total / perPage),
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
