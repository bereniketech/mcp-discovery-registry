import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section className="page-card">
      <p className="page-kicker">Discovery</p>
      <h1 className="page-title">Explore MCP servers</h1>
      <p className="page-copy">
        Browse curated servers, open details, and quickly jump into categories.
      </p>
      <div className="page-actions">
        <Link className="action-button primary" to="/servers/registry-explorer">
          Open sample server
        </Link>
        <Link className="action-button" to="/category/automation">
          Browse automation
        </Link>
      </div>
    </section>
  );
}
