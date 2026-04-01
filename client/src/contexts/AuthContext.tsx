import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue, type AuthSession } from './auth-context.js';
import { supabase } from '../lib/supabase.js';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let mounted = true;

    async function loadInitialSession() {
      const { data } = await client.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession((data.session ?? null) as AuthSession | null);
      setLoading(false);
    }

    void loadInitialSession();

    const { data: authSubscription } = client.auth.onAuthStateChange(
      (_event: unknown, nextSession: unknown) => {
        setSession((nextSession ?? null) as AuthSession | null);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  async function signInWithGitHub() {
    if (!supabase) {
      throw new Error('Authentication is not configured in this environment.');
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isAuthenticated: Boolean(session?.user),
      signInWithGitHub,
      signOut,
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

