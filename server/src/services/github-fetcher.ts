import { getGitHubAuthHeader, loadGitHubConfig } from '../config/github.js';
import { AppError } from '../utils/app-error.js';

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200;

interface GitHubRepoResponse {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
}

interface GitHubCommitResponse {
  commit?: {
    author?: { date?: string };
    committer?: { date?: string };
  };
}

interface GitHubReadmeResponse {
  content: string;
  encoding: string;
}

export interface GitHubRepositoryMetadata {
  name: string;
  description: string;
  githubUrl: string;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt: Date | null;
  readmeContent: string | null;
}

export class GitHubFetcherService {
  private readonly headers: Record<string, string>;

  constructor() {
    const config = loadGitHubConfig();
    const authHeader = getGitHubAuthHeader(config);

    if (!authHeader) {
      throw new AppError('GitHub authentication is not configured correctly', 500, 'github_config_error');
    }

    this.headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'mcp-discovery-registry',
      ...authHeader,
    };
  }

  parseGitHubUrl(githubUrl: string): { owner: string; repo: string; normalizedUrl: string } {
    const normalizedInput = githubUrl.trim();
    const match = normalizedInput.match(
      /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i,
    );

    if (!match) {
      throw new AppError('Invalid GitHub repository URL', 400, 'invalid_github_url');
    }

    const owner = match[1];
    const repo = match[2];

    if (!owner || !repo) {
      throw new AppError('Invalid GitHub repository URL', 400, 'invalid_github_url');
    }

    return {
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  async fetchRepositoryMetadata(githubUrl: string): Promise<GitHubRepositoryMetadata> {
    const { owner, repo, normalizedUrl } = this.parseGitHubUrl(githubUrl);

    const repoData = await this.fetchJsonWithRetry<GitHubRepoResponse>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
    );

    const [lastCommitAt, readmeContent] = await Promise.all([
      this.fetchLatestCommitDate(owner, repo),
      this.fetchReadmeContent(owner, repo),
    ]);

    return {
      name: repoData.name,
      description: repoData.description ?? '',
      githubUrl: normalizedUrl,
      githubStars: repoData.stargazers_count,
      githubForks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      lastCommitAt,
      readmeContent,
    };
  }

  private async fetchLatestCommitDate(owner: string, repo: string): Promise<Date | null> {
    try {
      const commits = await this.fetchJsonWithRetry<GitHubCommitResponse[]>(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=1`,
      );

      const dateRaw = commits[0]?.commit?.author?.date ?? commits[0]?.commit?.committer?.date;
      return dateRaw ? new Date(dateRaw) : null;
    } catch {
      return null;
    }
  }

  private async fetchReadmeContent(owner: string, repo: string): Promise<string | null> {
    try {
      const readme = await this.fetchJsonWithRetry<GitHubReadmeResponse>(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      );

      if (readme.encoding !== 'base64') {
        return null;
      }

      return Buffer.from(readme.content, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }

  private async fetchJsonWithRetry<T>(url: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(url, { headers: this.headers });

        if (response.ok) {
          return (await response.json()) as T;
        }

        if (!this.shouldRetry(response.status) || attempt === MAX_RETRIES) {
          throw this.mapGitHubHttpError(response.status);
        }

        await this.wait(attempt * RETRY_DELAY_MS);
      } catch (error) {
        lastError = error;

        if (error instanceof AppError) {
          throw error;
        }

        if (attempt === MAX_RETRIES) {
          throw new AppError('GitHub API is unavailable', 502, 'github_api_unavailable');
        }

        await this.wait(attempt * RETRY_DELAY_MS);
      }
    }

    throw (lastError as Error) ?? new AppError('GitHub API is unavailable', 502, 'github_api_unavailable');
  }

  private shouldRetry(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private mapGitHubHttpError(status: number): AppError {
    if (status === 404) {
      return new AppError('Repository not found or is inaccessible', 400, 'github_repo_not_found');
    }

    if (status === 429) {
      return new AppError('GitHub API rate limit exceeded', 502, 'github_rate_limited');
    }

    if (status >= 500) {
      return new AppError('GitHub API is temporarily unavailable', 502, 'github_api_unavailable');
    }

    return new AppError('Failed to fetch repository metadata from GitHub', 502, 'github_fetch_failed');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
