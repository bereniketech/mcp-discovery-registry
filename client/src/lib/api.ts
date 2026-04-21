const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

export type HealthStatus = 'healthy' | 'stale' | 'dead' | 'unknown';

export interface ServerVersion {
  id: string;
  serverId: string;
  version: string;
  releaseUrl: string | null;
  releasedAt: string;
  detectedAt: string;
  changelog: string | null;
}

export interface Server {
  id: string;
  name: string;
  slug: string;
  description: string;
  githubUrl: string;
  websiteUrl?: string;
  categories: string[];
  tags: string[];
  authorId: string;
  votesCount: number;
  favoritesCount: number;
  readmeContent?: string | null;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt?: string | null;
  createdAt: string;
  updatedAt: string;
  toolSchemas?: ToolSchema[];
  configTemplate?: Record<string, unknown> | null;
  ratingAvg?: string | null | undefined;
  ratingCount?: number | undefined;
  commentsCount?: number | undefined;
  ownerId?: string | null | undefined;
  // Health check fields
  healthStatus?: HealthStatus;
  healthCheckedAt?: string | null;
  healthReason?: string | null;
  // Version tracking
  latestVersion?: string | null;
  // Moderation
  moderationStatus?: string;
  // MCP spec version compatibility
  mcpSpecVersions?: string[];
}

export interface ServerPreview {
  name: string;
  description: string;
  githubUrl: string;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt?: string | null;
}

export interface ToolSchema {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

interface ApiEnvelope<TData> {
  data: TData;
  meta?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    status?: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ServerListQuery {
  q?: string;
  category?: string;
  tags?: string[];
  sort?: 'trending' | 'newest' | 'stars' | 'votes';
  page?: number;
  perPage?: number;
}

export interface ServerListResponse {
  items: Server[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface VoteToggleResult {
  voted: boolean;
  votesCount: number;
}

export interface FavoriteToggleResult {
  favorited: boolean;
  favoritesCount: number;
}

export interface AddTagResult {
  tagId: string;
  tag: string;
  serverId: string;
}

export interface CommentAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  serverId: string;
  userId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
}

export interface RatingResult {
  avg: number | null;
  count: number;
}

export interface ClaimInitResult {
  token: string;
  instructions: string;
}

export interface ClaimVerifyResult {
  claimed: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions = {}) {}

  async getHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }

  async listServers(query: ServerListQuery = {}): Promise<ServerListResponse> {
    const params = new URLSearchParams();

    if (query.q) params.set('q', query.q);
    if (query.category) params.set('category', query.category);
    if (query.tags?.length) query.tags.forEach((t) => params.append('tags', t));
    if (query.sort) params.set('sort', query.sort);
    if (query.page) params.set('page', String(query.page));
    if (query.perPage) params.set('per_page', String(query.perPage));

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    const response = await this.request<ApiEnvelope<Server[]>>(`/servers${suffix}`);

    return {
      items: response.data,
      page: response.meta?.page ?? 1,
      perPage: response.meta?.per_page ?? response.data.length,
      totalItems: response.meta?.total ?? response.data.length,
      totalPages: response.meta?.total_pages ?? 1,
    };
  }

  async getServerBySlug(slug: string): Promise<Server> {
    const response = await this.request<ApiEnvelope<Server>>(`/servers/${slug}`);
    return response.data;
  }

  async previewServer(githubUrl: string, accessToken: string): Promise<ServerPreview> {
    const response = await this.request<ApiEnvelope<ServerPreview>>('/servers/preview', {
      method: 'POST',
      token: accessToken,
      body: { github_url: githubUrl },
    });

    return response.data;
  }

  async createServer(githubUrl: string, accessToken: string, categories: string[] = []): Promise<Server> {
    const response = await this.request<ApiEnvelope<Server>>('/servers', {
      method: 'POST',
      token: accessToken,
      body: { github_url: githubUrl, categories },
    });

    return response.data;
  }

  async toggleVote(serverId: string, accessToken: string): Promise<VoteToggleResult> {
    const response = await this.request<ApiEnvelope<VoteToggleResult>>(`/servers/${serverId}/vote`, {
      method: 'POST',
      token: accessToken,
    });

    return response.data;
  }

  async toggleFavorite(serverId: string, accessToken: string): Promise<FavoriteToggleResult> {
    const response = await this.request<ApiEnvelope<FavoriteToggleResult>>(
      `/servers/${serverId}/favorite`,
      {
        method: 'POST',
        token: accessToken,
      },
    );

    return response.data;
  }

  async addTag(serverId: string, tag: string, accessToken: string): Promise<AddTagResult> {
    const response = await this.request<ApiEnvelope<AddTagResult>>(`/servers/${serverId}/tags`, {
      method: 'POST',
      token: accessToken,
      body: { tag },
    });

    return response.data;
  }

  async getMyFavorites(
    accessToken: string,
    page = 1,
    perPage = 20,
  ): Promise<{ data: Server[]; meta: { page: number; per_page: number; total: number } }> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    return this.request<{ data: Server[]; meta: { page: number; per_page: number; total: number } }>(
      `/me/favorites?${params.toString()}`,
      { token: accessToken },
    );
  }

  async getMySubmissions(
    accessToken: string,
    page = 1,
    perPage = 20,
  ): Promise<{ data: Server[]; meta: { page: number; per_page: number; total: number } }> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    return this.request<{ data: Server[]; meta: { page: number; per_page: number; total: number } }>(
      `/me/submissions?${params.toString()}`,
      { token: accessToken },
    );
  }

  async listComments(
    serverId: string,
    page = 1,
    perPage = 20,
  ): Promise<{ data: Comment[]; meta: { page: number; per_page: number; total: number } }> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    return this.request<{ data: Comment[]; meta: { page: number; per_page: number; total: number } }>(
      `/servers/${serverId}/comments?${params.toString()}`,
    );
  }

  async createComment(
    serverId: string,
    body: string,
    accessToken: string,
    parentId?: string,
  ): Promise<Comment> {
    const response = await this.request<ApiEnvelope<Comment>>(
      `/servers/${serverId}/comments`,
      {
        method: 'POST',
        token: accessToken,
        body: { body, ...(parentId ? { parent_id: parentId } : {}) },
      },
    );
    return response.data;
  }

  async updateComment(commentId: string, body: string, accessToken: string): Promise<Comment> {
    const response = await this.request<ApiEnvelope<Comment>>(`/comments/${commentId}`, {
      method: 'PATCH',
      token: accessToken,
      body: { body },
    });
    return response.data;
  }

  async deleteComment(commentId: string, accessToken: string): Promise<void> {
    await this.request<unknown>(`/comments/${commentId}`, {
      method: 'DELETE',
      token: accessToken,
    });
  }

  async rateServer(serverId: string, score: number, accessToken: string): Promise<RatingResult> {
    const response = await this.request<ApiEnvelope<RatingResult>>(
      `/servers/${serverId}/rate`,
      { method: 'POST', token: accessToken, body: { score } },
    );
    return response.data;
  }

  async removeRating(serverId: string, accessToken: string): Promise<RatingResult> {
    const response = await this.request<ApiEnvelope<RatingResult>>(
      `/servers/${serverId}/rate`,
      { method: 'DELETE', token: accessToken },
    );
    return response.data;
  }

  async initOwnershipClaim(serverId: string, accessToken: string): Promise<ClaimInitResult> {
    const response = await this.request<ApiEnvelope<ClaimInitResult>>(
      `/servers/${serverId}/claim/init`,
      { method: 'POST', token: accessToken },
    );
    return response.data;
  }

  async verifyOwnershipClaim(serverId: string, accessToken: string): Promise<ClaimVerifyResult> {
    const response = await this.request<ApiEnvelope<ClaimVerifyResult>>(
      `/servers/${serverId}/claim/verify`,
      { method: 'POST', token: accessToken },
    );
    return response.data;
  }

  async updateServerListing(
    serverId: string,
    patch: { name?: string; description?: string },
    accessToken: string,
  ): Promise<Server> {
    const response = await this.request<ApiEnvelope<Server>>(
      `/servers/${serverId}`,
      { method: 'PATCH', token: accessToken, body: patch },
    );
    return response.data;
  }

  async getServerVersions(
    serverId: string,
    page = 1,
    perPage = 10,
  ): Promise<{ data: ServerVersion[]; meta: { page: number; per_page: number; total: number; total_pages: number } }> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    return this.request<{ data: ServerVersion[]; meta: { page: number; per_page: number; total: number; total_pages: number } }>(
      `/servers/${serverId}/versions?${params.toString()}`,
    );
  }

  async reportServer(serverId: string, reason: string, accessToken: string): Promise<{ id: string }> {
    const response = await this.request<ApiEnvelope<{ id: string }>>(
      `/servers/${serverId}/report`,
      { method: 'POST', token: accessToken, body: { reason } },
    );
    return response.data;
  }

  async adminFlagServer(serverId: string, accessToken: string): Promise<void> {
    await this.request<unknown>(`/admin/servers/${serverId}/flag`, {
      method: 'POST',
      token: accessToken,
    });
  }

  async adminRemoveServer(serverId: string, accessToken: string): Promise<void> {
    await this.request<unknown>(`/admin/servers/${serverId}`, {
      method: 'DELETE',
      token: accessToken,
    });
  }

  async adminDismissReport(reportId: string, accessToken: string): Promise<void> {
    await this.request<unknown>(`/admin/reports/${reportId}/dismiss`, {
      method: 'POST',
      token: accessToken,
    });
  }

  async adminListServers(accessToken: string): Promise<Server[]> {
    const response = await this.request<ApiEnvelope<Server[]>>('/admin/servers', {
      token: accessToken,
    });
    return response.data;
  }

  async getTrending(limit?: number): Promise<Server[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    const response = await this.request<ApiEnvelope<Server[]>>(`/trending${suffix}`);

    return response.data;
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.request<ApiEnvelope<Category[]>>('/categories');
      return response.data;
    } catch {
      // Fallback for deployments where categories endpoint is not available yet.
      const servers = await this.listServers({ perPage: 100, sort: 'trending' });
      const seen = new Set<string>();

      return servers.items
        .flatMap((server) => server.categories)
        .filter((name) => {
          const slug = name.toLowerCase().trim();
          if (!slug || seen.has(slug)) return false;
          seen.add(slug);
          return true;
        })
        .map((name) => {
          const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          return {
            id: slug,
            name,
            slug,
            description: `${name} servers`,
          };
        });
    }
  }

  private getBaseUrl(): string {
    return this.options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  }

  private async request<TResponse>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      token?: string;
      body?: unknown;
    } = {},
  ): Promise<TResponse> {
    const requestInit: RequestInit = {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    };

    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      ...requestInit,
    });

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const payload = (await response.json()) as TResponse | ErrorEnvelope;

    if (!response.ok) {
      const fallbackError = {
        error: {
          code: 'request_failed',
          message: `Request failed with status ${response.status}`,
        },
      };
      const errorPayload = (payload as ErrorEnvelope).error ? (payload as ErrorEnvelope) : fallbackError;

      throw new Error(`${errorPayload.error.code}: ${errorPayload.error.message}`);
    }

    return payload as TResponse;
  }
}

export const apiClient = new ApiClient();
