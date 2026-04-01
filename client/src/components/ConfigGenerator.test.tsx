import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConfigGenerator } from './ConfigGenerator.js';

describe('ConfigGenerator', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderComponent() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <ConfigGenerator
          server={{
            id: 'server-1',
            name: 'Registry Agent',
            slug: 'registry-agent',
            description: 'desc',
            githubUrl: 'https://github.com/org/registry-agent.git',
            categories: [],
            tags: [],
            authorId: 'user-1',
            votesCount: 0,
            favoritesCount: 0,
            githubStars: 0,
            githubForks: 0,
            openIssues: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          }}
        />,
      );
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

    vi.restoreAllMocks();
  });

  it('generates Claude Desktop config JSON from GitHub URL', () => {
    renderComponent();

    const preview = container?.querySelector('pre.config-preview');
    expect(preview?.textContent).toContain('"registry-agent"');
    expect(preview?.textContent).toContain('"args": [');
    expect(preview?.textContent).toContain('"org/registry-agent"');
    expect(preview?.textContent).not.toContain('"transport": "stdio"');
  });

  it('generates Cursor config with stdio transport when target changes', () => {
    renderComponent();

    const select = container?.querySelector<HTMLSelectElement>('#config-target');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    act(() => {
      descriptor?.set?.call(select, 'cursor');
      select?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const preview = container?.querySelector('pre.config-preview');
    expect(preview?.textContent).toContain('"transport": "stdio"');
  });

  it('copies generated JSON to clipboard and shows success state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });

    renderComponent();

    const copyButton = Array.from(container?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Copy JSON'),
    );

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Config copied to clipboard.');
  });
});
