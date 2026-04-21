import { and, lt, sql, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { servers, serverVersions } from '../db/schema.js';
import { GitHubFetcherService } from '../services/github-fetcher.js';
import { HealthCheckerService } from '../services/health-checker.js';
import { deriveInstallConfig } from '../services/install-config.js';
import type { InstallConfig } from '../services/install-config.js';
import type { ConfigTemplate } from '../types/server-metadata.js';
import {
  detectMcpSpecVersions,
  extractToolSchemasFromReadme,
  extractToolSchemasFromMcpJson,
} from '../utils/mcp-spec.js';

const BATCH_SIZE = 10;

function buildConfigTemplate(installConfig: InstallConfig): ConfigTemplate | null {
  if (Object.keys(installConfig).length === 0) {
    return null;
  }

  const template: ConfigTemplate = { transport: 'stdio' };

  if (installConfig.npm) {
    template.npm = installConfig.npm;
  }
  if (installConfig.pip) {
    template.pip = installConfig.pip;
  }
  if (installConfig.cargo) {
    template.cargo = installConfig.cargo;
  }
  if (installConfig.docker) {
    template.docker = installConfig.docker;
  }

  return template;
}
const STALE_HOURS = 6;

/**
 * Refreshes GitHub metadata (stars, forks, open issues, last commit) for all
 * servers whose `updated_at` is older than STALE_HOURS hours.
 *
 * The function processes servers in batches of BATCH_SIZE to respect GitHub
 * rate limits.  It is designed to be called by a cron-like scheduler every
 * STALE_HOURS hours.
 *
 * It is a no-op when GITHUB_TOKEN is absent — a warning is logged instead so
 * the server still starts cleanly in environments without a token.
 */
export async function refreshGitHubMetadata(): Promise<void> {
  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      '[refresh-github-metadata] GITHUB_TOKEN is not set — skipping metadata refresh.',
    );
    return;
  }

  const fetcher = new GitHubFetcherService();

  const staleThreshold = sql`now() - interval '${sql.raw(String(STALE_HOURS))} hours'`;

  const staleServers = await db
    .select({
      id: servers.id,
      githubUrl: servers.githubUrl,
    })
    .from(servers)
    .where(and(lt(servers.updatedAt, staleThreshold)));

  if (staleServers.length === 0) {
    console.info('[refresh-github-metadata] No stale servers found.');
    return;
  }

  console.info(
    `[refresh-github-metadata] Refreshing metadata for ${staleServers.length} server(s).`,
  );

  const healthChecker = new HealthCheckerService();

  for (let i = 0; i < staleServers.length; i += BATCH_SIZE) {
    const batch = staleServers.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (server) => {
        try {
          const metadata = await fetcher.fetchRepositoryMetadata(server.githubUrl);

          // Derive install config from root files detected during fetch.
          const installConfig = deriveInstallConfig(
            { name: metadata.name, githubUrl: metadata.githubUrl },
            metadata.rootFiles,
          );

          // Derive tool schemas and MCP spec versions from refreshed metadata.
          const toolSchemas = (() => {
            if (metadata.mcpJsonContent) {
              const fromMcp = extractToolSchemasFromMcpJson(metadata.mcpJsonContent);
              if (fromMcp.length > 0) return fromMcp;
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

          await db
            .update(servers)
            .set({
              githubStars: metadata.githubStars,
              githubForks: metadata.githubForks,
              openIssues: metadata.openIssues,
              lastCommitAt: metadata.lastCommitAt,
              configTemplate: buildConfigTemplate(installConfig),
              ...(toolSchemas.length > 0 ? { toolSchemas } : {}),
              mcpSpecVersions,
              updatedAt: new Date(),
            })
            .where(sql`${servers.id} = ${server.id}`);

          // Fetch and store new releases.
          try {
            const releases = await fetcher.fetchReleases(server.githubUrl);

            if (releases.length > 0) {
              // Get already-stored versions to avoid duplicates.
              const existingVersionRows = await db
                .select({ version: serverVersions.version })
                .from(serverVersions)
                .where(eq(serverVersions.serverId, server.id));

              const existingVersionSet = new Set(existingVersionRows.map((r) => r.version));
              const newReleases = releases.filter((r) => !existingVersionSet.has(r.version));

              if (newReleases.length > 0) {
                await db.insert(serverVersions).values(
                  newReleases.map((r) => ({
                    serverId: server.id,
                    version: r.version,
                    releaseUrl: r.releaseUrl,
                    releasedAt: r.releasedAt,
                    changelog: r.changelog,
                  })),
                );
              }

              // Update latest_version to the most recent release.
              const sortedReleases = [...releases].sort(
                (a, b) => b.releasedAt.getTime() - a.releasedAt.getTime(),
              );
              const latestVersion = sortedReleases[0]?.version ?? null;

              if (latestVersion) {
                await db
                  .update(servers)
                  .set({ latestVersion })
                  .where(sql`${servers.id} = ${server.id}`);
              }
            }
          } catch (releaseError) {
            console.warn(
              `[refresh-github-metadata] Could not fetch releases for ${server.id}: ${String(releaseError)}`,
            );
          }

          console.info(
            `[refresh-github-metadata] Updated server ${server.id} (${server.githubUrl}).`,
          );
        } catch (error) {
          console.error(
            `[refresh-github-metadata] Failed to refresh server ${server.id}: ${String(error)}`,
          );
        }
      }),
    );
  }

  // Run health checks for all active servers once per daily cycle.
  try {
    const { checked, updated } = await healthChecker.checkAll();
    console.info(
      `[refresh-github-metadata] Health check complete — checked ${checked}, updated ${updated}.`,
    );
  } catch (healthError) {
    console.error(`[refresh-github-metadata] Health check failed: ${String(healthError)}`);
  }

  console.info('[refresh-github-metadata] Refresh cycle complete.');
}

/**
 * Registers a recurring cron-style job using setInterval.
 * Runs every STALE_HOURS hours and fires once immediately on startup.
 *
 * Returns the interval handle so callers can cancel it during graceful shutdown.
 */
export function startGitHubMetadataCron(): ReturnType<typeof setInterval> {
  const intervalMs = STALE_HOURS * 60 * 60 * 1000;

  // Run once at startup, then on the interval.
  void refreshGitHubMetadata();

  return setInterval(() => {
    void refreshGitHubMetadata();
  }, intervalMs);
}
