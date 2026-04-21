import { useEffect, useRef, useState } from 'react';
import { apiClient, type Comment } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

interface Props {
  serverId: string;
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean | undefined;
  onReply: (parentId: string) => void;
  onDeleted: (commentId: string) => void;
  onEdited: (updated: Comment) => void;
  currentUserId?: string | undefined;
}

function CommentItem({ comment, isReply = false, onReply, onDeleted, onEdited, currentUserId }: CommentItemProps) {
  const { session } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isDeleted = comment.body === '[deleted]';
  const isOwn = currentUserId === comment.userId;

  async function handleSaveEdit() {
    if (!session?.access_token) return;
    setSaving(true);
    setEditError(null);
    try {
      const updated = await apiClient.updateComment(comment.id, editBody, session.access_token);
      onEdited(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save edit.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!session?.access_token) return;
    try {
      await apiClient.deleteComment(comment.id, session.access_token);
      onDeleted(comment.id);
    } catch {
      // Silently fail — user sees no change
    }
  }

  return (
    <div className={isReply ? 'comment-reply' : 'comment-item'}>
      <div className="comment-header">
        <span className="comment-author">{comment.author.displayName || comment.author.username}</span>
        <span className="comment-date">{new Date(comment.createdAt).toLocaleDateString()}</span>
        {isOwn && !isDeleted && (
          <span className="comment-actions">
            <button type="button" onClick={() => setEditing((v) => !v)} className="comment-action-btn">
              Edit
            </button>
            <button type="button" onClick={() => void handleDelete()} className="comment-action-btn">
              Delete
            </button>
          </span>
        )}
      </div>

      {editing ? (
        <div className="comment-edit">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="comment-textarea"
            maxLength={2000}
          />
          {editError && <p className="comment-error">{editError}</p>}
          <div className="comment-edit-actions">
            <button type="button" onClick={() => void handleSaveEdit()} disabled={saving} className="comment-submit-btn">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setEditing(false); setEditBody(comment.body); }} className="comment-action-btn">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="comment-body">{comment.body}</p>
      )}

      {!isDeleted && !isReply && session && (
        <button type="button" onClick={() => onReply(comment.id)} className="comment-reply-btn">
          Reply
        </button>
      )}
    </div>
  );
}

export function CommentThread({ serverId }: Props) {
  const { session, signInWithGitHub } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  const perPage = 20;
  const currentUserId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await apiClient.listComments(serverId, page, perPage);
        if (!cancelled) {
          setComments(result.data);
          setTotal(result.meta.total);
        }
      } catch {
        // Silently handle — comments are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [serverId, page]);

  useEffect(() => {
    if (replyingTo) {
      replyRef.current?.focus();
    }
  }, [replyingTo]);

  async function handleSubmit() {
    if (!newBody.trim()) return;
    if (!session?.access_token) {
      await signInWithGitHub();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await apiClient.createComment(serverId, newBody.trim(), session.access_token);
      setComments((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setNewBody('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplySubmit() {
    if (!replyBody.trim() || !replyingTo) return;
    if (!session?.access_token) {
      await signInWithGitHub();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await apiClient.createComment(serverId, replyBody.trim(), session.access_token, replyingTo);
      setComments((prev) => [...prev, created]);
      setReplyingTo(null);
      setReplyBody('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdited(updated: Comment) {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleDeleted(commentId: string) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, body: '[deleted]' } : c,
      ),
    );
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId !== null);
  const totalPages = Math.ceil(total / perPage);

  return (
    <section className="detail-section" aria-label="Comments">
      <div className="detail-section-header">
        <h2>Comments {total > 0 ? `(${total})` : ''}</h2>
      </div>

      {session ? (
        <div className="comment-compose">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            className="comment-textarea"
            maxLength={2000}
          />
          {submitError && <p className="comment-error">{submitError}</p>}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !newBody.trim()}
            className="comment-submit-btn"
          >
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      ) : (
        <p className="status-text">
          <button type="button" onClick={() => void signInWithGitHub()} className="action-button">
            Sign in
          </button>{' '}
          to leave a comment.
        </p>
      )}

      {loading ? (
        <p className="status-text">Loading comments…</p>
      ) : topLevel.length === 0 ? (
        <p className="status-text">No comments yet. Be the first!</p>
      ) : (
        <div className="comment-list">
          {topLevel.map((comment) => {
            const commentReplies = replies.filter((r) => r.parentId === comment.id);
            return (
              <div key={comment.id} className="comment-thread-item">
                <CommentItem
                  comment={comment}
                  onReply={setReplyingTo}
                  onDeleted={handleDeleted}
                  onEdited={handleEdited}
                  currentUserId={currentUserId}
                />
                {commentReplies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    isReply
                    onReply={setReplyingTo}
                    onDeleted={handleDeleted}
                    onEdited={handleEdited}
                    currentUserId={currentUserId}
                  />
                ))}
                {replyingTo === comment.id && (
                  <div className="comment-reply-compose">
                    <textarea
                      ref={replyRef}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                      className="comment-textarea"
                      maxLength={2000}
                    />
                    <div className="comment-edit-actions">
                      <button
                        type="button"
                        onClick={() => void handleReplySubmit()}
                        disabled={submitting || !replyBody.trim()}
                        className="comment-submit-btn"
                      >
                        {submitting ? 'Posting…' : 'Post reply'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(null); setReplyBody(''); }}
                        className="comment-action-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="action-button"
          >
            Previous
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="action-button"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
