import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SubmitPage } from './SubmitPage.js';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());
const mockApiClient = vi.hoisted(() => ({
  previewServer: vi.fn(),
  createServer: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../lib/api.js', () => ({
  apiClient: mockApiClient,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SubmitPage', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderPage() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <MemoryRouter>
          <SubmitPage />
        </MemoryRouter>,
      );
    });
  }

  function setInputValue(value: string) {
    const input = container?.querySelector<HTMLInputElement>('#submit-github-url');
    if (!input) {
      throw new Error('Input not found');
    }

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function submitForm() {
    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  }

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

  it('shows validation error for invalid GitHub URL', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'token' },
      loading: false,
      signInWithGitHub: vi.fn(),
    });
    mockApiClient.getCategories.mockResolvedValue([]);

    renderPage();
    setInputValue('https://example.com/not-github');
    await submitForm();

    expect(container?.textContent).toContain(
      'Enter a valid GitHub repository URL, for example https://github.com/org/repo.',
    );
    expect(mockApiClient.previewServer).not.toHaveBeenCalled();
  });

  it('shows loading state while metadata preview is being fetched', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'token' },
      loading: false,
      signInWithGitHub: vi.fn(),
    });
    mockApiClient.getCategories.mockResolvedValue([]);

    let resolvePreview: ((value: unknown) => void) | null = null;
    mockApiClient.previewServer.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve;
        }),
    );

    renderPage();
    setInputValue('https://github.com/org/repo');

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(container?.textContent).toContain('Fetching metadata...');

    await act(async () => {
      resolvePreview?.({
        name: 'repo',
        description: 'desc',
        githubUrl: 'https://github.com/org/repo',
        githubStars: 12,
        githubForks: 4,
        openIssues: 1,
        lastCommitAt: null,
      });
      await Promise.resolve();
    });
  });

  it('renders preview details after successful metadata fetch', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'token' },
      loading: false,
      signInWithGitHub: vi.fn(),
    });
    mockApiClient.getCategories.mockResolvedValue([
      { id: '1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' },
    ]);
    mockApiClient.previewServer.mockResolvedValue({
      name: 'repo',
      description: 'desc',
      githubUrl: 'https://github.com/org/repo',
      githubStars: 20,
      githubForks: 3,
      openIssues: 2,
      lastCommitAt: null,
    });

    renderPage();
    setInputValue('https://github.com/org/repo');
    await submitForm();

    expect(container?.textContent).toContain('repo');
    expect(container?.textContent).toContain('Stars: 20');
    expect(container?.textContent).toContain('Utilities');
    expect(container?.textContent).toContain('Confirm submission');
  });

  it('shows duplicate server error from API', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'token' },
      loading: false,
      signInWithGitHub: vi.fn(),
    });
    mockApiClient.getCategories.mockResolvedValue([]);
    mockApiClient.previewServer.mockRejectedValue(new Error('duplicate_server: This server is already registered.'));

    renderPage();
    setInputValue('https://github.com/org/repo');
    await submitForm();

    expect(container?.textContent).toContain('This server is already registered');
  });

  it('redirects unauthenticated user to sign-in', async () => {
    const signInWithGitHub = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      session: null,
      loading: false,
      signInWithGitHub,
    });
    mockApiClient.getCategories.mockResolvedValue([]);

    renderPage();
    setInputValue('https://github.com/org/repo');
    await submitForm();

    expect(signInWithGitHub).toHaveBeenCalledTimes(1);
    expect(mockApiClient.previewServer).not.toHaveBeenCalled();
  });
});
