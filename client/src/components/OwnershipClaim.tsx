import { useState } from 'react';
import { apiClient, type Server } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

interface Props {
  server: Server;
  onOwnershipClaimed: (updatedServer: Server) => void;
}

type ClaimStep = 'idle' | 'instructions' | 'verifying' | 'editing';

export function OwnershipClaim({ server, onOwnershipClaimed }: Props) {
  const { session, signInWithGitHub } = useAuth();
  const [step, setStep] = useState<ClaimStep>('idle');
  const [instructions, setInstructions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [editName, setEditName] = useState(server.name);
  const [editDescription, setEditDescription] = useState(server.description);
  const [saving, setSaving] = useState(false);

  const currentUserId = session?.user?.id;
  const isOwner = server.ownerId === currentUserId;

  async function handleInitClaim() {
    if (!session?.access_token) {
      await signInWithGitHub();
      return;
    }
    setError(null);
    try {
      const result = await apiClient.initOwnershipClaim(server.id, session.access_token);
      setInstructions(result.instructions);
      setStep('instructions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start claim process.');
    }
  }

  async function handleVerify() {
    if (!session?.access_token) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await apiClient.verifyOwnershipClaim(server.id, session.access_token);
      if (result.claimed) {
        onOwnershipClaimed({ ...server, ownerId: currentUserId ?? null });
        setStep('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSaveEdit() {
    if (!session?.access_token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateServerListing(
        server.id,
        { name: editName, description: editDescription },
        session.access_token,
      );
      onOwnershipClaimed({ ...server, ...updated });
      setStep('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (isOwner && step === 'idle') {
    return (
      <div className="ownership-section">
        <button
          type="button"
          onClick={() => setStep('editing')}
          className="action-button primary"
        >
          You own this — Edit listing
        </button>
      </div>
    );
  }

  if (isOwner && step === 'editing') {
    return (
      <div className="ownership-edit-form">
        <h3>Edit listing</h3>
        <label htmlFor="edit-name" className="form-label">Name</label>
        <input
          id="edit-name"
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="form-input"
          maxLength={200}
        />
        <label htmlFor="edit-description" className="form-label">Description</label>
        <textarea
          id="edit-description"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={4}
          className="comment-textarea"
          maxLength={1000}
        />
        {error && <p className="comment-error">{error}</p>}
        <div className="comment-edit-actions">
          <button
            type="button"
            onClick={() => void handleSaveEdit()}
            disabled={saving}
            className="action-button primary"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('idle'); setError(null); }}
            className="action-button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!isOwner && step === 'idle' && session) {
    return (
      <div className="ownership-section">
        <button
          type="button"
          onClick={() => void handleInitClaim()}
          className="action-button"
        >
          Claim this server
        </button>
        {error && <p className="comment-error">{error}</p>}
      </div>
    );
  }

  if (step === 'instructions' && instructions) {
    return (
      <div className="ownership-instructions">
        <h3>Verify ownership</h3>
        <pre className="schema-code">{instructions}</pre>
        {error && <p className="comment-error">{error}</p>}
        <div className="comment-edit-actions">
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={verifying}
            className="action-button primary"
          >
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('idle'); setInstructions(null); setError(null); }}
            className="action-button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
