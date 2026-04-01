import { useParams } from 'react-router-dom';

export function CategoryPage() {
  const { slug } = useParams();

  return (
    <section className="page-card">
      <p className="page-kicker">Category</p>
      <h1 className="page-title">{slug ?? 'unknown-category'}</h1>
      <p className="page-copy">
        Placeholder category listing for filtering servers by topic.
      </p>
    </section>
  );
}
