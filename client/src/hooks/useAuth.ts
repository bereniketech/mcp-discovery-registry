import { useAuthContext } from '../contexts/auth-context.js';

export function useAuth() {
  return useAuthContext();
}
