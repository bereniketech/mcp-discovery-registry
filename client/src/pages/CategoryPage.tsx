import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo.js';
import { ServerCard } from '../components/ServerCard.js';
import { apiClient, type Category, type Server } from '../lib/api.js';

const PER_PAGE = 20;

function toTitleCase(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const resolvedSlug = slug ?? '';

  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get('page') ?? '1');
  const currentPage = pageParam > 0 ? pageParam : 1;

  const [servers, setServers] = useState<Server[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState<string>(toTitleCase(resolvedSlug));

  // Resolve human-readable category name from /categories endpoint
  useEffect(() => {
    if (!resolvedSlug) return;

    let cancelled = false;

    async function loadCategoryName() {
      try {
        const categories = await apiClient.getCategories();
        if (!cancelled) {
          const match = categories.find((c: Category) => c.slug === resolvedSlug);
          if (match) {
            setCategoryName(match.name);
          }
        }
      } catch {
        // Keep the derived name as fallback
      }
    }

    void loadCategoryName();
    return () => {
      cancelled = true;
    };
  }, [resolvedSlug]);

  // Load servers for this category
  useEffect(() => {
    if (!resolvedSlug) return;

    let cancelled = false;

    async function loadServers() {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.listServers({
          category: resolvedSlug,
          sort: 'votes',
          page: currentPage,
          perPage: PER_PAGE,
        });

        if (!cancelled) {
          setServers(result.items);
          setTotalPages(result.totalPages);
          setTotalItems(result.totalItems);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error ? fetchError.message : 'Unable to load servers.',
          );
          setServers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServers();

    return () => {
      cancelled = true;
    };
  }, [resolvedSlug, currentPage]);

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showPagination = totalPages > 1;

  return (
    <>
      <Seo
        title={`${categoryName} MCP Servers | MCP Discovery Registry`}
        description={`Browse MCP servers in the ${categoryName} category. Discover tools and integrations.`}
        path={`/category/${resolvedSlug}`}
      />

      <section className="page-card">
        <p className="page-kicker">Category</p>
        <h1 className="page-title">{categoryName}</h1>
        {!loading && !error && (
          <p className="page-copy">
            {totalItems > 0
              ? `${totalItems.toLocaleString()} server${totalItems === 1 ? '' : 's'} in this category`
              : 'No servers found in this category yet.'}
          </p>
        )}
      </section>

      <section className="results-section" aria-label={`${categoryName} servers`}>
        {loading && (
          <div className="server-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="server-card server-card--skeleton" aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="status-text" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && servers.length > 0 && (
          <div className="server-grid">
            {servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}

        {!loading && !error && servers.length === 0 && (
          <div className="no-results">
            <h3>No servers in this category yet</h3>
            <p>Be the first to submit an MCP server in the {categoryName} category.</p>
          </div>
        )}

        {showPagination && !loading && !error && (
          <nav className="pagination" aria-label="Page navigation">
            <button
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              type="button"
            >
              Previous
            </button>

            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              type="button"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
