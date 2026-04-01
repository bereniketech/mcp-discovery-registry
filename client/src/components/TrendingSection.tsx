import { Link } from 'react-router-dom';
import type { Server } from '../lib/api.js';

interface TrendingSectionProps {
  servers: Server[];
  loading: boolean;
  error: string | null;
}

export function TrendingSection({ servers, loading, error }: TrendingSectionProps) {
  return (
    <section className="trending-section" aria-label="Trending servers">
      <div className="trending-header">
        <p className="page-kicker">Trending</p>
        <h2 className="trending-title">Top picks right now</h2>
      </div>

      {loading ? <p className="status-text">Loading trending servers...</p> : null}
      {error ? <p className="status-text">{error}</p> : null}

      {!loading && !error ? (
        <div className="trending-list">
          {servers.map((server, index) => (
            <Link
              key={server.id}
              className="trending-item"
              style={{ animationDelay: `${index * 60}ms` }}
              to={`/servers/${server.slug}`}
            >
              <strong>{server.name}</strong>
              <span>{server.githubStars.toLocaleString()} stars</span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
