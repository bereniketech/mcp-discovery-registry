import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finalizing sign-in...');

  useEffect(() => {
    let mounted = true;

    async function finalizeAuth() {
      if (!supabase) {
        if (mounted) {
          setMessage('Authentication is not configured for this environment.');
        }
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (!code) {
        navigate('/profile', { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (mounted) {
          setMessage(error.message);
        }
        return;
      }

      navigate('/profile', { replace: true });
    }

    void finalizeAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <section className="page-card">
      <p className="page-kicker">Authentication</p>
      <h1 className="page-title">Completing OAuth callback</h1>
      <p className="page-copy">{message}</p>
    </section>
  );
}
