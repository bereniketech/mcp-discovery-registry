import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock db before importing the job module
vi.mock('../db/index.js', () => ({ db: {} }));
vi.mock('../services/github-fetcher.js');
vi.mock('../services/health-checker.js');
vi.mock('../services/install-config.js', () => ({
  deriveInstallConfig: vi.fn().mockReturnValue({}),
}));

import { refreshGitHubMetadata } from './refresh-github-metadata.js';
import { GitHubFetcherService } from '../services/github-fetcher.js';
import { HealthCheckerService } from '../services/health-checker.js';

const mockFetchRepositoryMetadata = vi.fn();
const mockFetchReleases = vi.fn().mockResolvedValue([]);
const mockCheckAll = vi.fn().mockResolvedValue({ checked: 0, updated: 0 });

// Replace the constructor so every `new GitHubFetcherService()` returns our mock.
vi.mocked(GitHubFetcherService).mockImplementation(() => {
  return {
    fetchRepositoryMetadata: mockFetchRepositoryMetadata,
    fetchReleases: mockFetchReleases,
    parseGitHubUrl: vi.fn(),
  } as unknown as GitHubFetcherService;
});

// Mock the HealthCheckerService so it doesn't make real DB/network calls.
vi.mocked(HealthCheckerService).mockImplementation(() => {
  return {
    checkAll: mockCheckAll,
    checkServer: vi.fn(),
  } as unknown as HealthCheckerService;
});

// We import db AFTER the mock is set up so we can mutate its select/update methods.
import { db } from '../db/index.js';

describe('refreshGitHubMetadata', () => {
  const originalToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });

  it('logs a warning and returns early when GITHUB_TOKEN is not set', async () => {
    delete process.env.GITHUB_TOKEN;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await refreshGitHubMetadata();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('GITHUB_TOKEN is not set'),
    );
    expect(mockFetchRepositoryMetadata).not.toHaveBeenCalled();
  });

  it('logs info and returns early when no stale servers are found', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    // db.select().from().where() → []
    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db as unknown as Record<string, unknown>).select = vi.fn().mockReturnValue(mockSelectChain);

    await refreshGitHubMetadata();

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('No stale servers found'),
    );
    expect(mockFetchRepositoryMetadata).not.toHaveBeenCalled();
  });

  it('fetches metadata and updates stale servers', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    vi.spyOn(console, 'info').mockImplementation(() => {});

    const staleServer = {
      id: 'server-uuid-1',
      githubUrl: 'https://github.com/owner/repo',
    };

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([staleServer]),
    };
    (db as unknown as Record<string, unknown>).select = vi.fn().mockReturnValue(mockSelectChain);

    mockFetchRepositoryMetadata.mockResolvedValueOnce({
      name: 'repo',
      githubUrl: staleServer.githubUrl,
      githubStars: 42,
      githubForks: 7,
      openIssues: 3,
      lastCommitAt: new Date('2026-01-01T00:00:00Z'),
      readmeContent: null,
      rootFiles: [],
    });

    const mockUpdateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db as unknown as Record<string, unknown>).update = vi.fn().mockReturnValue(mockUpdateChain);

    await refreshGitHubMetadata();

    expect(mockFetchRepositoryMetadata).toHaveBeenCalledWith(staleServer.githubUrl);
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        githubStars: 42,
        githubForks: 7,
        openIssues: 3,
      }),
    );
  });

  it('logs an error and continues when one server fetch fails', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const staleServer = {
      id: 'server-uuid-fail',
      githubUrl: 'https://github.com/owner/broken-repo',
    };

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([staleServer]),
    };
    (db as unknown as Record<string, unknown>).select = vi.fn().mockReturnValue(mockSelectChain);

    mockFetchRepositoryMetadata.mockRejectedValueOnce(new Error('GitHub API error'));

    await refreshGitHubMetadata();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to refresh server server-uuid-fail'),
    );
  });
});
