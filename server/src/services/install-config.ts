export interface NpmInstallConfig {
  install: string;
  run: string;
}

export interface PipInstallConfig {
  install: string;
  run: string;
}

export interface CargoInstallConfig {
  install: string;
  run: string;
}

export interface DockerInstallConfig {
  pull: string;
  run: string;
}

export interface InstallConfig {
  npm?: NpmInstallConfig;
  pip?: PipInstallConfig;
  cargo?: CargoInstallConfig;
  docker?: DockerInstallConfig;
  manual?: string;
}

interface GitHubRepoMeta {
  name: string;
  githubUrl: string;
}

function extractRepoPath(githubUrl: string): string {
  try {
    const parsed = new URL(githubUrl);
    return parsed.pathname.replace(/^\/+/, '').replace(/\.git$/i, '');
  } catch {
    return githubUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  }
}

/**
 * Derives install configuration from the repository manifest files detected
 * during GitHub fetch. The repoFiles parameter is the list of root-level file
 * paths returned by the GitHub Trees API.
 */
export function deriveInstallConfig(
  repoMeta: GitHubRepoMeta,
  repoFiles: string[],
): InstallConfig {
  const config: InstallConfig = {};
  const repoPath = extractRepoPath(repoMeta.githubUrl);
  const packageName = repoPath.split('/').pop() ?? repoMeta.name;

  const filesSet = new Set(repoFiles);

  if (filesSet.has('package.json')) {
    config.npm = {
      install: `npm install -g ${packageName}`,
      run: `npx ${packageName}`,
    };
  }

  if (filesSet.has('pyproject.toml') || filesSet.has('setup.py')) {
    config.pip = {
      install: `pip install ${packageName}`,
      run: `python -m ${packageName.replace(/-/g, '_')}`,
    };
  }

  if (filesSet.has('Cargo.toml')) {
    config.cargo = {
      install: `cargo install ${packageName}`,
      run: packageName,
    };
  }

  if (filesSet.has('Dockerfile')) {
    config.docker = {
      pull: `docker pull ghcr.io/${repoPath}:latest`,
      run: `docker run --rm -i ghcr.io/${repoPath}:latest`,
    };
  }

  return config;
}

export class InstallConfigService {
  derive(repoMeta: GitHubRepoMeta, repoFiles: string[]): InstallConfig {
    return deriveInstallConfig(repoMeta, repoFiles);
  }
}
