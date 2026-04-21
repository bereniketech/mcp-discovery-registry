import { useState } from 'react';
import { apiClient } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

interface Props {
  serverId: string;
  ratingAvg?: string | null | undefined;
  ratingCount?: number | undefined;
  onUpdate?: ((avg: number | null, count: number) => void) | undefined;
}

const STAR_COUNT = 5;

export function StarRating({ serverId, ratingAvg, ratingCount = 0, onUpdate }: Props) {
  const { session, signInWithGitHub } = useAuth();
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [optimisticAvg, setOptimisticAvg] = useState<string | null | undefined>(ratingAvg);
  const [optimisticCount, setOptimisticCount] = useState(ratingCount);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAvg = optimisticAvg != null ? Number(optimisticAvg) : null;
  const filledStars = hoveredStar ?? userRating ?? (displayAvg ? Math.round(displayAvg) : 0);

  async function handleStarClick(star: number) {
    if (!session?.access_token) {
      await signInWithGitHub();
      return;
    }

    setError(null);
    const previousUserRating = userRating;
    const previousAvg = optimisticAvg;
    const previousCount = optimisticCount;

    if (userRating === star) {
      // Clicking same star = remove rating
      setUserRating(null);
      setSubmitting(true);
      try {
        const result = await apiClient.removeRating(serverId, session.access_token);
        setOptimisticAvg(result.avg != null ? String(result.avg.toFixed(2)) : null);
        setOptimisticCount(result.count);
        onUpdate?.(result.avg, result.count);
      } catch (err) {
        setUserRating(previousUserRating);
        setOptimisticAvg(previousAvg);
        setOptimisticCount(previousCount);
        setError(err instanceof Error ? err.message : 'Failed to remove rating.');
      } finally {
        setSubmitting(false);
      }
    } else {
      setUserRating(star);
      setSubmitting(true);
      try {
        const result = await apiClient.rateServer(serverId, star, session.access_token);
        setOptimisticAvg(result.avg != null ? String(result.avg.toFixed(2)) : null);
        setOptimisticCount(result.count);
        onUpdate?.(result.avg, result.count);
      } catch (err) {
        setUserRating(previousUserRating);
        setOptimisticAvg(previousAvg);
        setOptimisticCount(previousCount);
        setError(err instanceof Error ? err.message : 'Failed to submit rating.');
      } finally {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="star-rating" aria-label="Star rating">
      <div
        className="star-row"
        onMouseLeave={() => setHoveredStar(null)}
        aria-label={`Rate this server out of ${STAR_COUNT} stars`}
      >
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const star = i + 1;
          const filled = star <= filledStars;
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              className={`star-btn ${filled ? 'star-filled' : 'star-empty'}`}
              onClick={() => void handleStarClick(star)}
              onMouseEnter={() => setHoveredStar(star)}
              disabled={submitting}
            >
              {filled ? '★' : '☆'}
            </button>
          );
        })}
      </div>
      <div className="star-meta">
        {displayAvg != null ? (
          <span>{displayAvg.toFixed(1)} avg ({optimisticCount} {optimisticCount === 1 ? 'rating' : 'ratings'})</span>
        ) : (
          <span>No ratings yet</span>
        )}
      </div>
      {error && <p className="comment-error">{error}</p>}
      {!session && (
        <p className="status-text" style={{ fontSize: '0.85em', marginTop: '0.25rem' }}>
          <button type="button" onClick={() => void signInWithGitHub()} className="action-button" style={{ fontSize: 'inherit' }}>
            Sign in
          </button>{' '}
          to rate this server.
        </p>
      )}
    </div>
  );
}
