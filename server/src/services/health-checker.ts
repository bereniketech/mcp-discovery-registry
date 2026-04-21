import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { servers } from '../db/schema.js';

export type HealthStatus = 'healthy' | 'stale' | 'dead' | 'unknown';

export interface HealthResult {
  status: HealthStatus;
  reason?: string;
  checkedAt: Date;
}

const STALE_DAYS = 180;
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubRepoData {
  archived: boolean;
}

interface GitHubCommitData {
  commit?: {
    author?: { date?: string };
    committer?: { date?: string };
  };
}

interface GitHubTreeData {
  tree: Array<{ path: string }>;
}

function parseGitHubUrl(githubUrl: string): { owner: string; repo: string } | null {
  const match = githubUrl.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i,
  );

  if (!match || !match[1] || !match[2]) {
    return null;
  }

  return { owner: match[1], repo: match[2] };
}

async function fetchGitHub<T>(url: string, token: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'mcp-discovery-registry',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }

    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function checkServerHealth(githubUrl: string, token: string): Promise<HealthResult> {
  const checkedAt = new Date();
  const parsed = parseGitHubUrl(githubUrl);

  if (!parsed) {
    return { status: 'dead', reason: 'Invalid GitHub URL', checkedAt };
  }

  const { owner, repo } = parsed;

  // Check if the repository exists and is not archived.
  const repoResult = await fetchGitHub<GitHubRepoData>(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
    token,
  );

  if (!repoResult.ok) {
    if (repoResult.status === 404) {
      return { status: 'dead', reason: 'Repository not found or archived', checkedAt };
    }
    // For rate limits or server errors, return unknown rather than marking dead.
    return { status: 'unknown', reason: 'GitHub API unavailable', checkedAt };
  }

  if (repoResult.data?.archived === true) {
    return { status: 'dead', reason: 'Repository is archived', checkedAt };
  }

  // Check last commit date.
  const commitsResult = await fetchGitHub<GitHubCommitData[]>(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=1`,
    token,
  );

  if (commitsResult.ok && commitsResult.data) {
    const commit = commitsResult.data[0];
    const dateRaw = commit?.commit?.author?.date ?? commit?.commit?.committer?.date;

    if (dateRaw) {
      const commitDate = new Date(dateRaw);
      const daysSinceCommit = (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCommit > STALE_DAYS) {
        return {
          status: 'stale',
          reason: `Last commit ${Math.floor(daysSinceCommit)} days ago — may be inactive`,
          checkedAt,
        };
      }
    }
  }

  // Check for a manifest file at the root.
  const treeResult = await fetchGitHub<GitHubTreeData>(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=0`,
    token,
  );

  const MANIFEST_FILES = ['package.json', 'pyproject.toml', 'setup.py', 'Cargo.toml', 'Dockerfile'];

  if (treeResult.ok && treeResult.data) {
    const paths = treeResult.data.tree.map((item) => item.path);
    const hasManifest = MANIFEST_FILES.some((file) => paths.includes(file));

    if (!hasManifest) {
      return { status: 'stale', reason: 'No recognized manifest file at repository root', checkedAt };
    }
  }

  return { status: 'healthy', checkedAt };
}

export class HealthCheckerService {
  constructor(
    private readonly database: typeof db = db,
    private readonly githubToken: string = process.env.GITHUB_TOKEN ?? '',
  ) {}

  async checkServer(serverId: string): Promise<HealthResult> {
    const rows = await this.database
      .select({ id: servers.id, githubUrl: servers.githubUrl })
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    const server = rows[0];
    if (!server) {
      return { status: 'unknown', reason: 'Server not found', checkedAt: new Date() };
    }

    const result = await checkServerHealth(server.githubUrl, this.githubToken);

    await this.database
      .update(servers)
      .set({
        healthStatus: result.status,
        healthCheckedAt: result.checkedAt,
        healthReason: result.reason ?? null,
      })
      .where(eq(servers.id, serverId));

    return result;
  }

  async checkAll(): Promise<{ checked: number; updated: number }> {
    const allServers = await this.database
      .select({ id: servers.id, githubUrl: servers.githubUrl })
      .from(servers)
      .where(sql`moderation_status = 'active'`);

    let updated = 0;

    for (const server of allServers) {
      try {
        const result = await checkServerHealth(server.githubUrl, this.githubToken);

        await this.database
          .update(servers)
          .set({
            healthStatus: result.status,
            healthCheckedAt: result.checkedAt,
            healthReason: result.reason ?? null,
          })
          .where(eq(servers.id, server.id));

        updated += 1;
      } catch (error) {
        console.error(`[health-checker] Failed to check server ${server.id}: ${String(error)}`);
      }
    }

    return { checked: allServers.length, updated };
  }
}
