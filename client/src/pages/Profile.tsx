import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo.js';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient, type Server } from '../lib/api.js';

export function Profile() {
  const { user, session, loading, signInWithGitHub } = useAuth();
  const [favorites, setFavorites] = useState<Server[]>([]);
  const [submissions, setSubmissions] = useState<Server[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileData() {
      if (!session?.access_token) {
        setFavorites([]);
        setSubmissions([]);
        return;
      }

      setDataLoading(true);
      setError(null);

      try {
        const [favoriteResponse, submissionResponse] = await Promise.all([
          apiClient.getMyFavorites(session.access_token),
          apiClient.getMySubmissions(session.access_token),
        ]);

        if (cancelled) {
          return;
        }

        setFavorites(favoriteResponse.data);
        setSubmissions(submissionResponse.data);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load profile activity.');
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    }

    void loadProfileData();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  if (loading) {
    return (
      <>
        <Seo
          title="Profile | MCP Discovery Registry"
          description="View your submitted and favorited MCP servers."
          path="/profile"
          noIndex
        />
        <section className="page-card">
          <p className="status-text">Loading account...</p>
        </section>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Seo
          title="Profile | MCP Discovery Registry"
          description="Sign in to view your submitted and favorited MCP servers."
          path="/profile"
          noIndex
        />
        <section className="page-card">
          <p className="page-kicker">Profile</p>
          <h1 className="page-title">Sign in to view your profile</h1>
          <p className="page-copy">
            You need an authenticated session to load your favorites and submissions.
          </p>
          <div className="page-actions">
            <button
              type="button"
              className="action-button primary"
              onClick={() => {
                void signInWithGitHub();
              }}
            >
              Continue with GitHub
            </button>
          </div>
        </section>
      </>
    );
  }

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;
  const username = typeof metadata?.user_name === 'string' ? metadata.user_name : 'GitHub user';

  return (
    <>
      <Seo
        title="Your Profile | MCP Discovery Registry"
        description="Manage your favorites and submissions in MCP Discovery Registry."
        path="/profile"
        noIndex
      />
      <section className="home-page">
        <article className="page-card">
          <p className="page-kicker">Profile</p>
          <h1 className="page-title">Your activity</h1>
          <div className="profile-summary">
            {avatarUrl ? (
              <img alt="Profile avatar" className="profile-avatar" referrerPolicy="no-referrer" src={avatarUrl} />
            ) : null}
            <div>
              <p className="status-text">Username: {username}</p>
              <p className="status-text">Email: {user.email ?? 'Unknown'}</p>
            </div>
          </div>
          {dataLoading ? <p className="status-text">Loading favorites and submissions...</p> : null}
          {error ? <p className="status-text">{error}</p> : null}
        </article>

        <article className="detail-section" aria-label="Your favorites">
          <div className="detail-section-header">
            <h2>Favorites</h2>
          </div>
          {favorites.length === 0 ? (
            <p className="status-text">No favorites yet.</p>
          ) : (
            <ul className="profile-list">
              {favorites.map((server) => (
                <li key={server.id}>
                  <Link to={`/servers/${server.slug}`}>{server.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="detail-section" aria-label="Your submissions">
          <div className="detail-section-header">
            <h2>Submissions</h2>
          </div>
          {submissions.length === 0 ? (
            <p className="status-text">No submissions yet.</p>
          ) : (
            <ul className="profile-list">
              {submissions.map((server) => (
                <li key={server.id}>
                  <Link to={`/servers/${server.slug}`}>{server.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
