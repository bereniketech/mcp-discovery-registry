import { useParams } from 'react-router-dom';

export function ServerDetailPage() {
  const { slug } = useParams();

  return (
    <section className="page-card">
      <p className="page-kicker">Server Detail</p>
      <h1 className="page-title">/{slug ?? 'unknown-server'}</h1>
      <p className="page-copy">
        Placeholder detail page for server metadata, README preview, and actions.
      </p>
    </section>
  );
}
