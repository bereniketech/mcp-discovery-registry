import { Link } from 'react-router-dom';
import type { HealthStatus, Server } from '../lib/api.js';

interface ServerCardProps {
  server: Server;
}

const HEALTH_DOT_COLORS: Record<HealthStatus, string> = {
  healthy: '#22c55e',
  stale: '#f59e0b',
  dead: '#ef4444',
  unknown: '#9ca3af',
};

const HEALTH_DOT_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  stale: 'Possibly stale',
  dead: 'Archived or not found',
  unknown: 'Status unknown',
};

export function ServerCard({ server }: ServerCardProps) {
  const health = (server.healthStatus ?? 'unknown') as HealthStatus;
  const dotColor = HEALTH_DOT_COLORS[health];
  const dotLabel = HEALTH_DOT_LABELS[health];

  return (
    <article className="server-card">
      <div className="server-card-top">
        <h3 className="server-card-title">
          <Link to={`/servers/${server.slug}`}>{server.name}</Link>
          {' '}
          <span
            className="health-dot"
            aria-label={dotLabel}
            title={dotLabel}
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: dotColor,
              verticalAlign: 'middle',
              marginLeft: '4px',
            }}
          />
        </h3>
        <p className="server-card-description">{server.description}</p>
      </div>

      <div className="server-metrics" aria-label={`${server.name} metrics`}>
        <span>⭐ {server.githubStars.toLocaleString()}</span>
        <span>▲ {server.votesCount.toLocaleString()} upvotes</span>
        {server.latestVersion ? (
          <span className="version-badge">{server.latestVersion}</span>
        ) : null}
      </div>

      <div className="server-taxonomy">
        {server.categories.map((category) => (
          <span key={`${server.id}-${category}`} className="category-badge">
            {category}
          </span>
        ))}
        {server.tags.map((tag) => (
          <span key={`${server.id}-${tag}`} className="tag-badge">
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}
