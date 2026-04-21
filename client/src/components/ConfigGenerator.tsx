import { useMemo, useState } from 'react';
import type { Server } from '../lib/api.js';

type ConfigTarget = 'claude-desktop' | 'cursor' | 'npm' | 'pip' | 'cargo' | 'docker';

interface ConfigGeneratorProps {
  server: Server;
}

interface InstallTab {
  id: ConfigTarget;
  label: string;
  content: string;
}

function extractRepositoryPath(githubUrl: string): string {
  try {
    const parsed = new URL(githubUrl);
    return parsed.pathname.replace(/^\/+/, '').replace(/\.git$/i, '');
  } catch {
    return githubUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  }
}

function buildConfig(server: Server, target: 'claude-desktop' | 'cursor') {
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

function buildInstallTabs(server: Server): InstallTab[] {
  const tabs: InstallTab[] = [
    {
      id: 'claude-desktop',
      label: 'Claude Desktop',
      content: JSON.stringify(buildConfig(server, 'claude-desktop'), null, 2),
    },
    {
      id: 'cursor',
      label: 'Cursor',
      content: JSON.stringify(buildConfig(server, 'cursor'), null, 2),
    },
  ];

  const template = server.configTemplate as Record<string, unknown> | null | undefined;
  if (!template) {
    return tabs;
  }

  const npm = template.npm as { install?: string; run?: string } | undefined;
  if (npm?.install) {
    tabs.push({
      id: 'npm',
      label: 'npm',
      content: `# Install\n${npm.install}\n\n# Run\n${npm.run ?? ''}`,
    });
  }

  const pip = template.pip as { install?: string; run?: string } | undefined;
  if (pip?.install) {
    tabs.push({
      id: 'pip',
      label: 'pip',
      content: `# Install\n${pip.install}\n\n# Run\n${pip.run ?? ''}`,
    });
  }

  const cargo = template.cargo as { install?: string; run?: string } | undefined;
  if (cargo?.install) {
    tabs.push({
      id: 'cargo',
      label: 'cargo',
      content: `# Install\n${cargo.install}\n\n# Run\n${cargo.run ?? ''}`,
    });
  }

  const docker = template.docker as { pull?: string; run?: string } | undefined;
  if (docker?.pull) {
    tabs.push({
      id: 'docker',
      label: 'Docker',
      content: `# Pull\n${docker.pull}\n\n# Run\n${docker.run ?? ''}`,
    });
  }

  return tabs;
}

export function ConfigGenerator({ server }: ConfigGeneratorProps) {
  const tabs = useMemo(() => buildInstallTabs(server), [server]);
  const [activeTab, setActiveTab] = useState<ConfigTarget>('claude-desktop');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const content = currentTab?.content ?? '';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
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

      <div className="config-tabs" role="tablist" aria-label="Installation targets">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`config-tab-button${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setCopyStatus(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <pre className="config-preview">{content}</pre>

      <div className="page-actions">
        <button type="button" className="action-button primary" onClick={handleCopy}>
          Copy
        </button>
      </div>

      {copyStatus ? <p className="status-text">{copyStatus}</p> : null}
    </section>
  );
}
