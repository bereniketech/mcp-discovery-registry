import { useMemo, useState } from 'react';
import type { Server } from '../lib/api.js';

type ConfigTarget = 'claude-desktop' | 'cursor';

interface ConfigGeneratorProps {
  server: Server;
}

function extractRepositoryPath(githubUrl: string): string {
  try {
    const parsed = new URL(githubUrl);
    return parsed.pathname.replace(/^\/+/, '').replace(/\.git$/i, '');
  } catch {
    return githubUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  }
}

function buildConfig(server: Server, target: ConfigTarget) {
  const repositoryPath = extractRepositoryPath(server.githubUrl);

  const baseConfig = {
    command: 'npx',
    args: ['-y', repositoryPath],
    env: {},
  };

  if (target === 'cursor') {
    return {
      mcpServers: {
        [server.slug]: {
          ...baseConfig,
          transport: 'stdio',
        },
      },
    };
  }

  return {
    mcpServers: {
      [server.slug]: baseConfig,
    },
  };
}

export function ConfigGenerator({ server }: ConfigGeneratorProps) {
  const [target, setTarget] = useState<ConfigTarget>('claude-desktop');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const generatedConfig = useMemo(() => buildConfig(server, target), [server, target]);
  const generatedJson = useMemo(() => JSON.stringify(generatedConfig, null, 2), [generatedConfig]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedJson);
      setCopyStatus('Config copied to clipboard.');
    } catch {
      setCopyStatus('Clipboard copy failed. Copy manually from the text box.');
    }
  }

  return (
    <section className="detail-section" aria-label="Config generator">
      <div className="detail-section-header">
        <h2>Config Generator</h2>
      </div>

      <label className="config-target-label" htmlFor="config-target">
        Target app
      </label>
      <select
        id="config-target"
        className="search-panel-select"
        value={target}
        onChange={(event) => {
          setTarget(event.target.value as ConfigTarget);
          setCopyStatus(null);
        }}
      >
        <option value="claude-desktop">Claude Desktop</option>
        <option value="cursor">Cursor</option>
      </select>

      <pre className="config-preview">{generatedJson}</pre>

      <div className="page-actions">
        <button type="button" className="action-button primary" onClick={handleCopy}>
          Copy JSON
        </button>
      </div>

      {copyStatus ? <p className="status-text">{copyStatus}</p> : null}
    </section>
  );
}
