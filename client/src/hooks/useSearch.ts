import { useEffect, useMemo, useState } from 'react';
import { apiClient, type Server } from '../lib/api.js';

const SEARCH_DEBOUNCE_MS = 300;

interface UseSearchOptions {
  initialCategory?: string;
  initialQuery?: string;
}

interface UseSearchState {
  query: string;
  setQuery: (query: string) => void;
  category: string;
  setCategory: (category: string) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  results: Server[];
  availableTags: string[];
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchState {
  const [query, setQuery] = useState(options.initialQuery ?? '');
  const [category, setCategory] = useState(options.initialCategory ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [results, setResults] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const queryParams: {
          q?: string;
          category?: string;
          tags?: string[];
          sort: 'trending';
          perPage: number;
        } = {
          sort: 'trending',
          perPage: 24,
        };

        if (debouncedQuery) {
          queryParams.q = debouncedQuery;
        }
        if (category) {
          queryParams.category = category;
        }
        if (selectedTags.length > 0) {
          queryParams.tags = selectedTags;
        }

        const response = await apiClient.listServers(queryParams);

        if (!cancelled) {
          setResults(response.items);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load results.');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, category, selectedTags]);

  const availableTags = useMemo(
    () =>
      Array.from(new Set(results.flatMap((server) => server.tags))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [results],
  );

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  const hasActiveFilters = Boolean(debouncedQuery || category || selectedTags.length > 0);

  return {
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
  };
}
