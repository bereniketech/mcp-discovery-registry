import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ConfigGenerator } from '../components/ConfigGenerator.js';
import { Seo } from '../components/Seo.js';
import { TagInput } from '../components/TagInput.js';
import { CommentThread } from '../components/CommentThread.js';
import { StarRating } from '../components/StarRating.js';
import { OwnershipClaim } from '../components/OwnershipClaim.js';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient, type HealthStatus, type Server, type ServerVersion, type ToolSchema } from '../lib/api.js';

const STALE_DAYS_THRESHOLD = 90;
const DEFAULT_SERVER_OG_IMAGE = 'https://avatars.githubusercontent.com/u/9919?s=400&v=4';

const HEALTH_BADGE_STYLES: Record<HealthStatus, { background: string; color: string; label: string }> = {
  healthy: { background: '#dcfce7', color: '#166534', label: 'Healthy' },
  stale: { background: '#fef9c3', color: '#854d0e', label: 'Possibly stale' },
  dead: { background: '#fee2e2', color: '#991b1b', label: 'Archived / not found' },
  unknown: { background: '#f3f4f6', color: '#374151', label: 'Status unknown' },
};

function parseToolSchemasFromReadme(readmeContent: string | null | undefined): ToolSchema[] {
  if (!readmeContent) {
    return [];
  }

  const blockMatcher = /```json\s*([\s\S]*?)```/gi;
  const discovered: ToolSchema[] = [];
  let blockMatch: RegExpExecArray | null = blockMatcher.exec(readmeContent);

  while (blockMatch) {
    const payload = blockMatch[1] ?? '';

    try {
      const parsed = JSON.parse(payload) as unknown;
      discovered.push(...extractToolSchemas(parsed));
    } catch {
      // Ignore malformed blocks and keep scanning for valid schemas.
    }

    blockMatch = blockMatcher.exec(readmeContent);
  }

  const deduped = new Map<string, ToolSchema>();
  for (const schema of discovered) {
    deduped.set(schema.name, schema);
  }

  return Array.from(deduped.values());
}

function extractToolSchemas(payload: unknown): ToolSchema[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as Record<string, unknown>;
  const directTools = normalizeTools(data.tools);
  if (directTools.length > 0) {
    return directTools;
  }

  const mcpServers = data.mcpServers;
  if (!mcpServers || typeof mcpServers !== 'object') {
    return [];
  }

  const aggregated: ToolSchema[] = [];
  for (const serverConfig of Object.values(mcpServers as Record<string, unknown>)) {
    if (!serverConfig || typeof serverConfig !== 'object') {
      continue;
    }

    const serverTools = normalizeTools((serverConfig as Record<string, unknown>).tools);
    aggregated.push(...serverTools);
  }

  return aggregated;
}

function normalizeTools(value: unknown): ToolSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const name = typeof entry.name === 'string' ? entry.name : null;

      if (!name) {
        return null;
      }

      const schema: ToolSchema = {
        name,
        inputSchema: entry.inputSchema,
        outputSchema: entry.outputSchema,
      };

      if (typeof entry.description === 'string') {
        schema.description = entry.description;
      }

      return schema;
    })
    .filter((item): item is ToolSchema => item !== null);
}

function isStale(lastCommitAt: string | null | undefined): boolean {
  if (!lastCommitAt) {
    return false;
  }

  const commitTime = new Date(lastCommitAt).getTime();
  if (Number.isNaN(commitTime)) {
    return false;
  }

  const elapsedDays = (Date.now() - commitTime) / (1000 * 60 * 60 * 24);
  return elapsedDays > STALE_DAYS_THRESHOLD;
}

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) {
    return 'Unknown';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString();
}

function getServerOgImage(server: Server): string {
  try {
    const parsedUrl = new URL(server.githubUrl);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const owner = segments[0];
      const repo = segments[1];
      return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
    }
  } catch {
    // Ignore malformed repository URLs and use default image.
  }

  return DEFAULT_SERVER_OG_IMAGE;
}

type DetailTab = 'readme' | 'versions';

export function ServerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const detailPath = slug ? `/servers/${slug}` : null;
  const { session, signInWithGitHub } = useAuth();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isVoted, setIsVoted] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('readme');
  const [versions, setVersions] = useState<ServerVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServer() {
      if (!slug) {
        setError('Server slug is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getServerBySlug(slug);

        if (cancelled) {
          return;
        }

        setServer(response);
        setVoteCount(response.votesCount);
        setFavoritesCount(response.favoritesCount);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load server detail.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServer();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadTagSuggestions() {
      try {
        const response = await apiClient.listServers({ sort: 'trending', perPage: 100 });
        if (cancelled) {
          return;
        }

        const aggregatedTags = Array.from(new Set(response.items.flatMap((item) => item.tags))).sort(
          (left, right) => left.localeCompare(right),
        );
        setKnownTags(aggregatedTags);
      } catch {
        if (!cancelled) {
          setKnownTags([]);
        }
      }
    }

    void loadTagSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  const sanitizedReadme = useMemo(() => {
    const raw = server?.readmeContent ?? '';
    return DOMPurify.sanitize(raw, {
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
  }, [server?.readmeContent]);

  const toolSchemas = useMemo(() => {
    if (!server) {
      return [];
    }

    return server.toolSchemas ?? [];
  }, [server]);

  const staleRepository = isStale(server?.lastCommitAt);

  useEffect(() => {
    let cancelled = false;

    async function loadVersions() {
      if (!server || activeTab !== 'versions') {
        return;
      }

      setVersionsLoading(true);

      try {
        const result = await apiClient.getServerVersions(server.id);
        if (!cancelled) {
          setVersions(result.data);
        }
      } catch {
        if (!cancelled) {
          setVersions([]);
        }
      } finally {
        if (!cancelled) {
          setVersionsLoading(false);
        }
      }
    }

    void loadVersions();

    return () => {
      cancelled = true;
    };
  }, [server, activeTab]);

  async function handleReport() {
    if (!server) {
      return;
    }

    const token = session?.access_token;
    if (!token) {
      await signInWithGitHub();
      return;
    }

    setReportStatus(null);

    try {
      await apiClient.reportServer(server.id, reportReason, token);
      setReportStatus('Report submitted. Thank you.');
      setReportReason('');
      setReportModalOpen(false);
    } catch (reportError) {
      setReportStatus(reportError instanceof Error ? reportError.message : 'Failed to submit report.');
    }
  }

  async function handleVoteToggle() {
    if (!server) {
      return;
    }

    const previousCount = voteCount;
    const previousState = isVoted;
    const nextState = !previousState;

    setActionError(null);
    setIsVoted(nextState);
    setVoteCount((count) => Math.max(0, count + (nextState ? 1 : -1)));

    try {
      const token = session?.access_token;
      if (!token) {
        await signInWithGitHub();
        throw new Error('Redirecting to GitHub sign-in.');
      }

      const result = await apiClient.toggleVote(server.id, token);
      setIsVoted(result.voted);
      setVoteCount(result.votesCount);
    } catch (toggleError) {
      setIsVoted(previousState);
      setVoteCount(previousCount);
      setActionError(toggleError instanceof Error ? toggleError.message : 'Unable to update vote.');
    }
  }

  async function handleFavoriteToggle() {
    if (!server) {
      return;
    }

    const previousCount = favoritesCount;
    const previousState = isFavorited;
    const nextState = !previousState;

    setActionError(null);
    setIsFavorited(nextState);
    setFavoritesCount((count) => Math.max(0, count + (nextState ? 1 : -1)));

    try {
      const token = session?.access_token;
      if (!token) {
        await signInWithGitHub();
        throw new Error('Redirecting to GitHub sign-in.');
      }

      const result = await apiClient.toggleFavorite(server.id, token);
      setIsFavorited(result.favorited);
      setFavoritesCount(result.favoritesCount);
    } catch (toggleError) {
      setIsFavorited(previousState);
      setFavoritesCount(previousCount);
      setActionError(
        toggleError instanceof Error ? toggleError.message : 'Unable to update favorites.',
      );
    }
  }

  async function handleTagAdd(tag: string) {
    if (!server) {
      return;
    }

    setActionError(null);

    const token = session?.access_token;
    if (!token) {
      await signInWithGitHub();
      throw new Error('Redirecting to GitHub sign-in.');
    }

    await apiClient.addTag(server.id, tag, token);

    setServer((current) => {
      if (!current) {
        return current;
      }

      const nextTags = Array.from(new Set([...current.tags, tag]));
      return {
        ...current,
        tags: nextTags,
      };
    });

    setKnownTags((current) => (current.includes(tag) ? current : [...current, tag].sort()));
  }

  if (loading) {
    return (
      <>
        <Seo
          title="Loading Server | MCP Discovery Registry"
          description="Loading server details and metadata."
          {...(detailPath ? { path: detailPath } : {})}
        />
        <section className="page-card">
          <p className="status-text">Loading server detail...</p>
        </section>
      </>
    );
  }

  if (error || !server) {
    return (
      <>
        <Seo
          title="Server Not Found | MCP Discovery Registry"
          description={error ?? 'The requested server was not found.'}
          {...(detailPath ? { path: detailPath } : {})}
        />
        <section className="page-card">
          <p className="page-kicker">Server Detail</p>
          <h1 className="page-title">Unable to load server</h1>
          <p className="page-copy">{error ?? 'The requested server was not found.'}</p>
        </section>
      </>
    );
  }

  const metaTitle = `${server.name} | MCP Server Registry`;
  const metaDescription = server.description || `Explore ${server.name} on MCP Discovery Registry.`;
  const ogImage = getServerOgImage(server);

  return (
    <>
      <Seo
        title={metaTitle}
        description={metaDescription}
        image={ogImage}
        path={`/servers/${server.slug}`}
        type="article"
      />
      <article className="server-detail-page">
        <section className="page-card">
          <p className="page-kicker">Server Detail</p>
          <h1 className="page-title">
            {server.name}
            {' '}
            {(() => {
              const health = (server.healthStatus ?? 'unknown') as HealthStatus;
              const badge = HEALTH_BADGE_STYLES[health];
              return (
                <span
                  className="health-badge"
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7em',
                    fontWeight: 500,
                    background: badge.background,
                    color: badge.color,
                    verticalAlign: 'middle',
                    marginLeft: '8px',
                  }}
                  aria-label={`Health status: ${badge.label}`}
                >
                  {badge.label}
                </span>
              );
            })()}
            {server.latestVersion ? (
              <span
                className="version-badge"
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7em',
                  fontWeight: 500,
                  background: '#e0f2fe',
                  color: '#0c4a6e',
                  verticalAlign: 'middle',
                  marginLeft: '6px',
                }}
              >
                {server.latestVersion}
              </span>
            ) : null}
          </h1>

          {server.healthStatus === 'dead' ? (
            <div className="dead-banner" role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
              Repository not found or archived. {server.healthReason ? `(${server.healthReason})` : ''}
            </div>
          ) : null}

          <p className="page-copy">{server.description || 'No description available yet.'}</p>

          <div className="server-metrics" aria-label="Repository metrics">
            <span>Stars: {server.githubStars.toLocaleString()}</span>
            <span>Forks: {server.githubForks.toLocaleString()}</span>
            <span>Open issues: {server.openIssues.toLocaleString()}</span>
            <span>Last commit: {formatDate(server.lastCommitAt)}</span>
            {server.healthStatus === 'stale' && server.healthReason ? (
              <span className="stale-note" style={{ color: '#854d0e' }}>{server.healthReason}</span>
            ) : null}
          </div>

          {staleRepository ? (
            <div className="stale-warning" role="status">
              Potentially unmaintained: this repository has not been updated in over {STALE_DAYS_THRESHOLD}{' '}
              days.
            </div>
          ) : null}

          <div className="server-taxonomy" aria-label="Server taxonomy">
            {server.categories.map((category) => (
              <span key={category} className="category-badge">
                {category}
              </span>
            ))}
            {server.tags.map((tag) => (
              <span key={tag} className="tag-badge">
                #{tag}
              </span>
            ))}
          </div>

          <div className="page-actions">
            <button type="button" className="action-button" onClick={handleVoteToggle}>
              {isVoted ? 'Undo vote' : 'Vote'} ({voteCount.toLocaleString()})
            </button>
            <button type="button" className="action-button" onClick={handleFavoriteToggle}>
              {isFavorited ? 'Unfavorite' : 'Favorite'} ({favoritesCount.toLocaleString()})
            </button>
            <a
              className="action-button primary"
              href={server.githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
            {session ? (
              <button
                type="button"
                className="action-button"
                style={{ color: '#b91c1c' }}
                onClick={() => setReportModalOpen(true)}
              >
                Report
              </button>
            ) : null}
          </div>

          {actionError ? <p className="status-text">{actionError}</p> : null}
          {reportStatus ? <p className="status-text">{reportStatus}</p> : null}

          {reportModalOpen ? (
            <div
              className="report-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Report server"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '480px',
                  width: '100%',
                }}
              >
                <h2 style={{ marginTop: 0 }}>Report this server</h2>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe the issue (malicious content, spam, etc.)"
                  rows={4}
                  style={{ width: '100%', marginBottom: '12px', padding: '8px', boxSizing: 'border-box' }}
                />
                <div className="page-actions">
                  <button
                    type="button"
                    className="action-button primary"
                    onClick={handleReport}
                    disabled={reportReason.trim().length === 0}
                  >
                    Submit report
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => {
                      setReportModalOpen(false);
                      setReportReason('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="detail-section" aria-label="README and Versions">
          <div className="detail-section-header">
            <div className="config-tabs" role="tablist" aria-label="Content tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'readme'}
                className={`config-tab-button${activeTab === 'readme' ? ' active' : ''}`}
                onClick={() => setActiveTab('readme')}
              >
                README
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'versions'}
                className={`config-tab-button${activeTab === 'versions' ? ' active' : ''}`}
                onClick={() => setActiveTab('versions')}
              >
                Versions
              </button>
            </div>
          </div>

          {activeTab === 'readme' ? (
            sanitizedReadme ? (
              <div className="readme-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {sanitizedReadme}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="status-text">No README content available.</p>
            )
          ) : (
            <div className="versions-timeline">
              {versionsLoading ? (
                <p className="status-text">Loading versions...</p>
              ) : versions.length === 0 ? (
                <p className="status-text">No release history found for this server.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      style={{ borderLeft: '3px solid #e5e7eb', paddingLeft: '16px', marginBottom: '16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700 }}>{v.version}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875em' }}>
                          {formatDate(v.releasedAt)}
                        </span>
                        {v.releaseUrl ? (
                          <a
                            href={v.releaseUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.875em' }}
                          >
                            Release notes
                          </a>
                        ) : null}
                      </div>
                      {v.changelog ? (
                        <details style={{ marginTop: '8px' }}>
                          <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '0.875em' }}>
                            Changelog
                          </summary>
                          <pre
                            style={{
                              whiteSpace: 'pre-wrap',
                              fontSize: '0.8em',
                              marginTop: '8px',
                              background: '#f9fafb',
                              padding: '8px',
                              borderRadius: '4px',
                            }}
                          >
                            {v.changelog}
                          </pre>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="detail-section" aria-label="Tool schemas">
          <div className="detail-section-header">
            <h2>Tool Schemas</h2>
          </div>
          {toolSchemas.length === 0 ? (
            <p className="status-text">No tool schemas detected — the server may not document its tools.</p>
          ) : (
            <div className="schema-list">
              {toolSchemas.map((schema) => (
                <details className="schema-item" key={schema.name}>
                  <summary>{schema.name}</summary>
                  {schema.description ? <p className="status-text">{schema.description}</p> : null}
                  <h3 className="schema-subtitle">Input schema</h3>
                  <pre className="schema-code">
                    {JSON.stringify(schema.inputSchema ?? { type: 'object' }, null, 2)}
                  </pre>
                  <h3 className="schema-subtitle">Output schema</h3>
                  <pre className="schema-code">
                    {JSON.stringify(schema.outputSchema ?? { type: 'object' }, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </section>

        <ConfigGenerator server={server} />
        <TagInput currentTags={server.tags} suggestions={knownTags} onAddTag={handleTagAdd} />

        <section className="detail-section" aria-label="Rating">
          <div className="detail-section-header">
            <h2>Rating</h2>
          </div>
          <StarRating
            serverId={server.id}
            ratingAvg={server.ratingAvg}
            ratingCount={server.ratingCount}
          />
        </section>

        <OwnershipClaim
          server={server}
          onOwnershipClaimed={(updated) => setServer(updated)}
        />

        <CommentThread serverId={server.id} />
      </article>
    </>
  );
}
