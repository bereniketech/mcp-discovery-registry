import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthButton } from './AuthButton.js';

const mockUseAuth = vi.fn();

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AuthButton', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }

    if (container) {
      container.remove();
      container = null;
    }

    vi.clearAllMocks();
  });

  it('renders sign in button when user is signed out', () => {
    const signInWithGitHub = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGitHub,
      signOut: vi.fn(),
    });

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const currentRoot = root;

    act(() => {
      currentRoot.render(
        <MemoryRouter>
          <AuthButton />
        </MemoryRouter>,
      );
    });

    const button = container.querySelector('button');
    expect(button?.textContent).toContain('Sign in with GitHub');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(signInWithGitHub).toHaveBeenCalledTimes(1);
  });

  it('renders avatar, profile link, and sign out action when signed in', () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: {
        email: 'test@example.com',
        user_metadata: {
          avatar_url: 'https://example.com/avatar.png',
          user_name: 'octocat',
        },
      },
      loading: false,
      signInWithGitHub: vi.fn(),
      signOut,
    });

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const currentRoot = root;

    act(() => {
      currentRoot.render(
        <MemoryRouter>
          <AuthButton />
        </MemoryRouter>,
      );
    });

    const profileLink = container.querySelector('a[href="/profile"]');
    const signOutButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('Sign out'),
    );

    expect(profileLink?.textContent).toContain('octocat');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.png');

    act(() => {
      signOutButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
