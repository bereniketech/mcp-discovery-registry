import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiClient, type Server } from '../lib/api.js';

export function AdminPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFlaggedServers() {
      const token = session?.access_token;

      if (!token) {
        void navigate('/');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.adminListServers(token);
        if (!cancelled) {
          setServers(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : 'Failed to load admin data.';
          if (message.includes('forbidden') || message.includes('403')) {
            void navigate('/');
            return;
          }
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFlaggedServers();

    return () => {
      cancelled = true;
    };
  }, [session, navigate]);

  async function handleFlag(serverId: string) {
    const token = session?.access_token;
    if (!token) return;

    setActionStatus(null);
    try {
      await apiClient.adminFlagServer(serverId, token);
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, moderationStatus: 'flagged' } : s)),
      );
      setActionStatus(`Server ${serverId} flagged.`);
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  async function handleRemove(serverId: string) {
    const token = session?.access_token;
    if (!token) return;

    setActionStatus(null);
    try {
      await apiClient.adminRemoveServer(serverId, token);
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, moderationStatus: 'removed' } : s)),
      );
      setActionStatus(`Server ${serverId} removed.`);
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  if (loading) {
    return (
      <section className="page-card">
        <p className="status-text">Loading admin panel...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1 className="page-title">Admin Panel</h1>
        <p className="status-text">{error}</p>
      </section>
    );
  }

  return (
    <section className="page-card">
      <h1 className="page-title">Admin Moderation Panel</h1>
      {actionStatus ? <p className="status-text">{actionStatus}</p> : null}

      {servers.length === 0 ? (
        <p className="status-text">No flagged or removed servers.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>GitHub</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <tr key={server.id}>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{server.name}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em',
                      background: server.moderationStatus === 'removed' ? '#fee2e2' : '#fef9c3',
                      color: server.moderationStatus === 'removed' ? '#991b1b' : '#854d0e',
                    }}
                  >
                    {server.moderationStatus}
                  </span>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <a href={server.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.875em' }}>
                    {server.githubUrl}
                  </a>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {server.moderationStatus !== 'flagged' ? (
                      <button
                        type="button"
                        className="action-button"
                        style={{ fontSize: '0.8em', padding: '4px 10px' }}
                        onClick={() => handleFlag(server.id)}
                      >
                        Flag
                      </button>
                    ) : null}
                    {server.moderationStatus !== 'removed' ? (
                      <button
                        type="button"
                        className="action-button"
                        style={{ fontSize: '0.8em', padding: '4px 10px', color: '#991b1b' }}
                        onClick={() => handleRemove(server.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
