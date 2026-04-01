import { useParams } from 'react-router-dom';
import { Seo } from '../components/Seo.js';

export function CategoryPage() {
  const { slug } = useParams();
  const resolvedSlug = slug ?? 'unknown-category';
  const prettyName = resolvedSlug.replace(/-/g, ' ');

  return (
    <>
      <Seo
        title={`MCP Category: ${prettyName} | MCP Discovery Registry`}
        description={`Browse MCP servers in the ${prettyName} category.`}
        path={`/category/${resolvedSlug}`}
      />
      <section className="page-card">
        <p className="page-kicker">Category</p>
        <h1 className="page-title">{resolvedSlug}</h1>
        <p className="page-copy">
          Placeholder category listing for filtering servers by topic.
        </p>
      </section>
    </>
  );
}
