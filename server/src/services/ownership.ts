import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../db/index.js';
import { servers } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';

type DbClient = typeof db;

const CLAIM_TTL_HOURS = 24;

export interface ClaimInitResult {
  token: string;
  instructions: string;
}

export interface ClaimVerifyResult {
  claimed: boolean;
}

export interface ServerPatch {
  name?: string | undefined;
  description?: string | undefined;
}

function buildRawUrl(githubUrl: string): string {
  // Convert https://github.com/owner/repo to https://raw.githubusercontent.com/owner/repo/HEAD
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(githubUrl);
  if (!match) {
    throw new AppError('Invalid GitHub URL on server record', 500, 'invalid_github_url');
  }
  return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/HEAD`;
}

async function fetchGitHubTopics(githubUrl: string): Promise<string[]> {
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(githubUrl);
  if (!match) return [];

  const apiUrl = `https://api.github.com/repos/${match[1]}/${match[2]}`;
  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { topics?: string[] };
    return data.topics ?? [];
  } catch {
    return [];
  }
}

async function fetchClaimFile(githubUrl: string, token: string): Promise<boolean> {
  const rawBase = buildRawUrl(githubUrl);
  try {
    const res = await fetch(`${rawBase}/mcp-claim.txt`);
    if (!res.ok) return false;
    const text = await res.text();
    return text.trim() === token;
  } catch {
    return false;
  }
}

export class OwnershipService {
  constructor(private readonly database: DbClient = db) {}

  async initClaim(serverId: string, userId: string): Promise<ClaimInitResult> {
    const serverRows = await this.database
      .select({ id: servers.id, githubUrl: servers.githubUrl, ownerId: servers.ownerId })
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    const server = serverRows[0];
    if (!server) {
      throw new AppError('Server not found', 404, 'server_not_found');
    }

    if (server.ownerId === userId) {
      throw new AppError('You already own this server', 409, 'already_owner');
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + CLAIM_TTL_HOURS * 60 * 60 * 1000);

    await this.database
      .update(servers)
      .set({ claimToken: token, claimExpiresAt: expiresAt })
      .where(eq(servers.id, serverId));

    const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(server.githubUrl);
    const repoPath = match ? `${match[1]}/${match[2]}` : server.githubUrl;

    const instructions = [
      `To verify ownership of ${repoPath}, choose ONE of the following methods:`,
      '',
      'Method 1 — Add a GitHub topic:',
      `  Add the topic "mcp-claim-${token}" to your repository at:`,
      `  https://github.com/${repoPath}/settings`,
      '',
      'Method 2 — Add a verification file:',
      `  Create a file named "mcp-claim.txt" at the root of your repository`,
      `  containing exactly: ${token}`,
      '',
      `This token expires in ${CLAIM_TTL_HOURS} hours.`,
    ].join('\n');

    return { token, instructions };
  }

  async verifyClaim(serverId: string, userId: string): Promise<ClaimVerifyResult> {
    const serverRows = await this.database
      .select({
        id: servers.id,
        githubUrl: servers.githubUrl,
        ownerId: servers.ownerId,
        claimToken: servers.claimToken,
        claimExpiresAt: servers.claimExpiresAt,
      })
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    const server = serverRows[0];
    if (!server) {
      throw new AppError('Server not found', 404, 'server_not_found');
    }

    if (server.ownerId === userId) {
      return { claimed: true };
    }

    if (!server.claimToken || !server.claimExpiresAt) {
      throw new AppError('No active claim token. Call /claim/init first.', 400, 'no_claim_token');
    }

    if (new Date() > server.claimExpiresAt) {
      throw new AppError('Claim token has expired. Call /claim/init to get a new one.', 400, 'claim_token_expired');
    }

    const token = server.claimToken;

    // Check GitHub topics first (no file download needed)
    const topics = await fetchGitHubTopics(server.githubUrl);
    const topicMatch = topics.includes(`mcp-claim-${token}`);

    // Check verification file if topic not found
    const fileMatch = topicMatch ? false : await fetchClaimFile(server.githubUrl, token);

    if (!topicMatch && !fileMatch) {
      throw new AppError(
        'Verification token not found in repository. Please follow the instructions from /claim/init.',
        400,
        'claim_verification_failed',
      );
    }

    // Mark as claimed and clear the token
    await this.database
      .update(servers)
      .set({ ownerId: userId, claimToken: null, claimExpiresAt: null })
      .where(eq(servers.id, serverId));

    return { claimed: true };
  }

  async updateListing(
    serverId: string,
    userId: string,
    patch: ServerPatch,
  ): Promise<typeof servers.$inferSelect> {
    const serverRows = await this.database
      .select()
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    const server = serverRows[0];
    if (!server) {
      throw new AppError('Server not found', 404, 'server_not_found');
    }

    if (server.ownerId !== userId) {
      throw new AppError('Forbidden: only the verified owner can edit this listing', 403, 'forbidden');
    }

    const updates: Partial<typeof servers.$inferInsert> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.description !== undefined) updates.description = patch.description;
    updates.updatedAt = new Date();

    const [updated] = await this.database
      .update(servers)
      .set(updates)
      .where(eq(servers.id, serverId))
      .returning();

    if (!updated) {
      throw new AppError('Failed to update server', 500, 'server_update_failed');
    }

    return updated;
  }
}
