import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ServerCard } from './ServerCard.js';

describe('ServerCard', () => {
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
  });

  it('renders server core fields, metrics, categories, tags, and detail link', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ServerCard
            server={{
              id: 'server-1',
              name: 'Registry Agent',
              slug: 'registry-agent',
              description: 'Fast MCP registry search and ranking.',
              githubUrl: 'https://github.com/org/registry-agent',
              categories: ['utilities', 'search'],
              tags: ['cli', 'sse'],
              authorId: 'user-1',
              votesCount: 1234,
              favoritesCount: 10,
              githubStars: 5678,
              githubForks: 12,
              openIssues: 3,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
            }}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Registry Agent');
    expect(container.textContent).toContain('Fast MCP registry search and ranking.');
    expect(container.textContent).toContain('⭐ 5,678');
    expect(container.textContent).toContain('▲ 1,234 upvotes');
    expect(container.textContent).toContain('utilities');
    expect(container.textContent).toContain('#cli');

    const detailLink = container.querySelector('a[href="/servers/registry-agent"]');
    expect(detailLink).toBeTruthy();
  });
});
