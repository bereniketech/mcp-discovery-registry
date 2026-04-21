import { createContext, useContext } from 'react';

export interface AuthUser {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token?: string;
  user?: AuthUser;
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider.');
  }

  return context;
}
