import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/app-error.js';
import { GitHubFetcherService } from './github-fetcher.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('GitHubFetcherService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env = { ...originalEnv, GITHUB_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('fetches repository metadata including README and latest commit date', async () => {
    const readme = Buffer.from('# Hello world', 'utf8').toString('base64');
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'repo-name',
          description: 'A demo repository',
          stargazers_count: 10,
          forks_count: 3,
          open_issues_count: 2,
          html_url: 'https://github.com/org/repo-name',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            commit: {
              author: { date: '2026-03-01T00:00:00Z' },
            },
          },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse({ content: readme, encoding: 'base64' }));

    const service = new GitHubFetcherService();
    const result = await service.fetchRepositoryMetadata('https://github.com/org/repo-name');

    expect(result).toMatchObject({
      name: 'repo-name',
      description: 'A demo repository',
      githubUrl: 'https://github.com/org/repo-name',
      githubStars: 10,
      githubForks: 3,
      openIssues: 2,
      readmeContent: '# Hello world',
    });
    expect(result.lastCommitAt?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('retries transient failures and succeeds', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response('temporary', { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'repo-name',
          description: null,
          stargazers_count: 1,
          forks_count: 1,
          open_issues_count: 0,
          html_url: 'https://github.com/org/repo-name',
        }),
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response('missing readme', { status: 404 }));

    const service = new GitHubFetcherService();
    const result = await service.fetchRepositoryMetadata('https://github.com/org/repo-name');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.readmeContent).toBeNull();
    expect(result.lastCommitAt).toBeNull();
  });

  it('returns 400 when repository is not found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404 }));

    const service = new GitHubFetcherService();

    await expect(service.fetchRepositoryMetadata('https://github.com/org/missing-repo')).rejects.toMatchObject({
      status: 400,
      code: 'github_repo_not_found',
    } satisfies Partial<AppError>);
  });

  it('returns 502 when rate-limited after retries', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('limited', { status: 429 }));

    const service = new GitHubFetcherService();

    await expect(service.fetchRepositoryMetadata('https://github.com/org/repo-name')).rejects.toMatchObject({
      status: 502,
      code: 'github_rate_limited',
    } satisfies Partial<AppError>);
  });
});
