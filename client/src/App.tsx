import { Link, Route, Routes } from 'react-router-dom';
import type { ApiResponse, Server } from '@mcp-registry/shared';

const featuredServers: Server[] = [
  {
    id: 'registry-server-1',
    name: 'Registry Explorer',
    slug: 'registry-explorer',
    description:
      'Indexes MCP servers and exposes metadata for discovery workflows.',
    repositoryUrl: 'https://github.com/example/registry-explorer',
    websiteUrl: 'https://example.com/registry-explorer',
    categories: ['discovery', 'analytics'],
    tags: ['mcp', 'search'],
    authorId: 'user-1',
    votesCount: 12,
    favoritesCount: 4,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
];

const responsePreview: ApiResponse<Server[]> = {
  success: true,
  data: featuredServers,
};

function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Initial build</p>
        <h1>Monorepo foundation for the MCP Discovery Registry</h1>
        <p className="hero-copy">
          Shared types, package workspaces, and validation tooling are wired so
          client and server can evolve on the same contract.
        </p>
        <div className="hero-actions">
          <Link className="primary-action" to="/preview">
            Preview shared types
          </Link>
        </div>
      </section>
    </main>
  );
}

function PreviewPage() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Shared contract</p>
        <h1>Client imports shared API shapes directly</h1>
        <pre className="response-preview">
          {JSON.stringify(responsePreview, null, 2)}
        </pre>
        <div className="hero-actions">
          <Link className="secondary-action" to="/">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<PreviewPage />} path="/preview" />
    </Routes>
  );
}
