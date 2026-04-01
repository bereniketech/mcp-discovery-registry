import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar.js';
import { ServerCard } from '../components/ServerCard.js';
import { Seo } from '../components/Seo.js';
import { TrendingSection } from '../components/TrendingSection.js';
import { useSearch } from '../hooks/useSearch.js';
import { useTrending } from '../hooks/useTrending.js';
import { apiClient, type Category } from '../lib/api.js';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const categoryFromUrl = searchParams.get('category') ?? '';

  const {
    query,
    setQuery,
    category,
    setCategory,
    selectedTags,
    toggleTag,
    results,
    availableTags,
    loading,
    error,
    hasActiveFilters,
  } = useSearch({ initialCategory: categoryFromUrl });

  const { trending, loading: trendingLoading, error: trendingError } = useTrending(10);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        setCategoriesError(null);
        const data = await apiClient.getCategories();
        if (!cancelled) {
          setCategories(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setCategoriesError(
            fetchError instanceof Error ? fetchError.message : 'Unable to load categories.',
          );
          setCategories([]);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (categoryFromUrl !== category) {
      setCategory(categoryFromUrl);
    }
  }, [categoryFromUrl, category, setCategory]);

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);

    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory) {
      nextParams.set('category', nextCategory);
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams, { replace: true });
  }

  const suggestedCategories = categories.slice(0, 4);

  return (
    <>
      <Seo
        title="MCP Discovery Registry | Explore MCP Servers"
        description="Search MCP servers by category and tags, compare repositories, and discover what is trending."
        path="/"
      />
      <section className="home-page">
        <div className="page-card">
          <p className="page-kicker">Discovery</p>
          <h1 className="page-title">Explore MCP servers</h1>
          <p className="page-copy">
            Search in real-time, filter by category and tags, and track what is trending this week.
          </p>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            category={category}
            categories={categories}
            onCategoryChange={handleCategoryChange}
            availableTags={availableTags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
          />
          {categoriesError ? <p className="status-text">{categoriesError}</p> : null}
        </div>

        <TrendingSection servers={trending} loading={trendingLoading} error={trendingError} />

        <section className="results-section" aria-label="Search results">
          <div className="results-header">
            <h2 className="trending-title">Results</h2>
            {loading ? <p className="status-text">Searching...</p> : null}
            {error ? <p className="status-text">{error}</p> : null}
          </div>

          {!loading && !error && results.length > 0 ? (
            <div className="server-grid">
              {results.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          ) : null}

          {!loading && !error && results.length === 0 && hasActiveFilters ? (
            <div className="no-results">
              <h3>No servers match your filters</h3>
              <p>Try clearing one filter or jump into a suggested category:</p>
              <div className="suggestion-list">
                {suggestedCategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="tag-chip"
                    onClick={() => handleCategoryChange(item.slug)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </>
  );
}
