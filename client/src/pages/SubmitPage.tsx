import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo.js';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient, type Category, type ServerPreview } from '../lib/api.js';

const GITHUB_REPOSITORY_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

function mapSubmissionError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unable to submit server.';
  }

  if (error.message.includes('duplicate_server')) {
    return 'This server is already registered';
  }

  if (error.message.includes('invalid_github_url') || error.message.includes('validation_error')) {
    return 'Enter a valid GitHub repository URL, for example https://github.com/org/repo.';
  }

  if (
    error.message.includes('github_api_unavailable') ||
    error.message.includes('github_fetch_failed') ||
    error.message.includes('github_rate_limited')
  ) {
    return 'GitHub is temporarily unreachable. Please try again.';
  }

  return error.message;
}

export function SubmitPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signInWithGitHub } = useAuth();
  const [githubUrl, setGithubUrl] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);
  const [preview, setPreview] = useState<ServerPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await apiClient.getCategories();
        if (!cancelled) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCategory(slug: string) {
    setSelectedCategorySlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  async function ensureAuthenticated(): Promise<string | null> {
    if (session?.access_token) {
      return session.access_token;
    }

    await signInWithGitHub();
    return null;
  }

  async function handlePreviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedUrl = githubUrl.trim();
    if (!GITHUB_REPOSITORY_PATTERN.test(trimmedUrl)) {
      setError('Enter a valid GitHub repository URL, for example https://github.com/org/repo.');
      return;
    }

    const accessToken = await ensureAuthenticated();
    if (!accessToken) {
      return;
    }

    setLoadingPreview(true);

    try {
      const previewData = await apiClient.previewServer(trimmedUrl, accessToken);
      setPreview(previewData);
      setSelectedCategorySlugs([]);
    } catch (submitError) {
      setError(mapSubmissionError(submitError));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirmSubmit() {
    setError(null);

    const accessToken = await ensureAuthenticated();
    if (!accessToken) {
      return;
    }

    const trimmedUrl = githubUrl.trim();
    setConfirming(true);

    try {
      const server = await apiClient.createServer(trimmedUrl, accessToken, selectedCategorySlugs);
      navigate(`/servers/${server.slug}`);
    } catch (submitError) {
      setError(mapSubmissionError(submitError));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <Seo
        title="Submit MCP Server | MCP Discovery Registry"
        description="Submit a GitHub repository to add a new MCP server to the registry."
        path="/submit"
      />
      <section className="page-card">
        <p className="page-kicker">Submit</p>
        <h1 className="page-title">Add a new server</h1>
        <p className="page-copy">
          Paste a GitHub repository URL and we will import metadata, README content, and tags.
        </p>

        <form className="search-panel" onSubmit={handlePreviewSubmit}>
          <label className="search-panel-field" htmlFor="submit-github-url">
            <span className="search-panel-label">GitHub URL</span>
            <input
              id="submit-github-url"
              className="search-panel-input"
              placeholder="https://github.com/org/repo"
              type="url"
              value={githubUrl}
              onChange={(event) => {
                setGithubUrl(event.target.value);
                setPreview(null);
              }}
              disabled={loadingPreview || confirming || authLoading}
            />
          </label>

          <div className="page-actions">
            <button className="action-button primary" disabled={loadingPreview || confirming || authLoading} type="submit">
              {loadingPreview ? 'Fetching metadata...' : 'Fetch metadata preview'}
            </button>
            {preview ? (
              <button
                className="action-button primary"
                type="button"
                disabled={confirming || authLoading}
                onClick={handleConfirmSubmit}
              >
                {confirming ? 'Submitting...' : 'Confirm submission'}
              </button>
            ) : null}
          </div>

          {!session?.access_token && !authLoading ? (
            <p className="status-text">You will be redirected to GitHub sign-in before submitting.</p>
          ) : null}

          {preview ? (
            <section className="detail-section" aria-label="Submission preview">
              <div className="detail-section-header">
                <h2>{preview.name}</h2>
              </div>
              <p className="status-text">{preview.description || 'No description provided.'}</p>
              <div className="server-metrics">
                <span>Stars: {preview.githubStars}</span>
                <span>Forks: {preview.githubForks}</span>
                <span>Open issues: {preview.openIssues}</span>
              </div>
              <div className="search-panel-field">
                <span className="search-panel-label">Categories</span>
                <div className="search-panel-tags">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="tag-chip"
                      data-active={selectedCategorySlugs.includes(category.slug)}
                      onClick={() => toggleCategory(category.slug)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {error ? <p className="status-text">{error}</p> : null}
        </form>
      </section>
    </>
  );
}
