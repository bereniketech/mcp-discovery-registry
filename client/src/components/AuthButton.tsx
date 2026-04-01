import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function resolveDisplayName(email: string | undefined, username: unknown): string {
  if (typeof username === 'string' && username.trim()) {
    return username;
  }

  if (email) {
    return email;
  }

  return 'Account';
}

export function AuthButton() {
  const { user, loading, signInWithGitHub, signOut } = useAuth();

  if (loading) {
    return (
      <button className="auth-button" disabled type="button">
        Checking session...
      </button>
    );
  }

  if (!user) {
    return (
      <button
        className="auth-button"
        onClick={() => {
          void signInWithGitHub();
        }}
        type="button"
      >
        Sign in with GitHub
      </button>
    );
  }

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;
  const displayName = resolveDisplayName(user.email, metadata?.user_name);

  return (
    <div className="auth-button-group">
      <Link className="auth-profile-link" to="/profile">
        {avatarUrl ? (
          <img alt="User avatar" className="auth-avatar" referrerPolicy="no-referrer" src={avatarUrl} />
        ) : null}
        <span>{displayName}</span>
      </Link>
      <button
        className="auth-button auth-button-secondary"
        onClick={() => {
          void signOut();
        }}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
