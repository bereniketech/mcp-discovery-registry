import { useEffect, useState } from 'react';
import { apiClient, type Server } from '../lib/api.js';

interface UseTrendingState {
  trending: Server[];
  loading: boolean;
  error: string | null;
}

export function useTrending(limit = 10): UseTrendingState {
  const [trending, setTrending] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getTrending(limit);

        if (!cancelled) {
          setTrending(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load trending servers.');
          setTrending([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTrending();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return {
    trending,
    loading,
    error,
  };
}
