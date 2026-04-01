import { Link } from 'react-router-dom';
import type { Server } from '../lib/api.js';

interface ServerCardProps {
  server: Server;
}

export function ServerCard({ server }: ServerCardProps) {
  return (
    <article className="server-card">
      <div className="server-card-top">
        <h3 className="server-card-title">
          <Link to={`/servers/${server.slug}`}>{server.name}</Link>
        </h3>
        <p className="server-card-description">{server.description}</p>
      </div>

      <div className="server-metrics" aria-label={`${server.name} metrics`}>
        <span>⭐ {server.githubStars.toLocaleString()}</span>
        <span>▲ {server.votesCount.toLocaleString()} upvotes</span>
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
