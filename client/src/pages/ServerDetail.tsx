import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ConfigGenerator } from '../components/ConfigGenerator.js';
import { TagInput } from '../components/TagInput.js';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient, type Server, type ToolSchema } from '../lib/api.js';

const STALE_DAYS_THRESHOLD = 90;

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

export function ServerDetail() {
  const { slug } = useParams<{ slug: string }>();
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

    if (server.toolSchemas && server.toolSchemas.length > 0) {
      return server.toolSchemas;
    }

    return parseToolSchemasFromReadme(server.readmeContent);
  }, [server]);

  const staleRepository = isStale(server?.lastCommitAt);

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
      <section className="page-card">
        <p className="status-text">Loading server detail...</p>
      </section>
    );
  }

  if (error || !server) {
    return (
      <section className="page-card">
        <p className="page-kicker">Server Detail</p>
        <h1 className="page-title">Unable to load server</h1>
        <p className="page-copy">{error ?? 'The requested server was not found.'}</p>
      </section>
    );
  }

  return (
    <article className="server-detail-page">
      <section className="page-card">
        <p className="page-kicker">Server Detail</p>
        <h1 className="page-title">{server.name}</h1>
        <p className="page-copy">{server.description || 'No description available yet.'}</p>

        <div className="server-metrics" aria-label="Repository metrics">
          <span>Stars: {server.githubStars.toLocaleString()}</span>
          <span>Forks: {server.githubForks.toLocaleString()}</span>
          <span>Open issues: {server.openIssues.toLocaleString()}</span>
          <span>Last commit: {formatDate(server.lastCommitAt)}</span>
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
        </div>

        {actionError ? <p className="status-text">{actionError}</p> : null}
      </section>

      <section className="detail-section" aria-label="README">
        <div className="detail-section-header">
          <h2>README</h2>
        </div>
        {sanitizedReadme ? (
          <div className="readme-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {sanitizedReadme}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="status-text">No README content available.</p>
        )}
      </section>

      <section className="detail-section" aria-label="Tool schemas">
        <div className="detail-section-header">
          <h2>Tool Schemas</h2>
        </div>
        {toolSchemas.length === 0 ? (
          <p className="status-text">No tool schemas were detected for this server.</p>
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
    </article>
  );
}
