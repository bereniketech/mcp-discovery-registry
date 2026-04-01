import { expect, test } from '@playwright/test';

const baseServer = {
  id: 'server-1',
  name: 'Registry Agent',
  slug: 'registry-agent',
  description: 'Fast MCP registry search and ranking.',
  githubUrl: 'https://github.com/org/registry-agent',
  websiteUrl: null,
  categories: ['utilities'],
  tags: ['cli', 'sse'],
  authorId: 'user-1',
  votesCount: 10,
  favoritesCount: 5,
  readmeContent: '# Registry Agent\n\nThis README is loaded in detail view.',
  githubStars: 240,
  githubForks: 15,
  openIssues: 2,
  lastCommitAt: '2026-03-25T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-03-25T00:00:00.000Z',
};

async function mockCommonApi(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/v1/categories', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'cat-1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' },
          { id: 'cat-2', name: 'Agents', slug: 'agents', description: 'Agent servers' },
        ],
      }),
    });
  });

  await page.route('**/api/v1/trending**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [baseServer] }),
    });
  });

  await page.route('**/api/v1/servers?**', async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q')?.toLowerCase() ?? '';
    const filtered = query ? [baseServer].filter((server) => server.name.toLowerCase().includes(query)) : [baseServer];

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: filtered,
        meta: { page: 1, per_page: 24, total: filtered.length, total_pages: 1 },
      }),
    });
  });
}

test('search flow: query to visible result', async ({ page }) => {
  await mockCommonApi(page);

  await page.goto('/');
  await page.getByPlaceholder('Search by name, description, or tag').fill('Registry');
  await page.waitForTimeout(400);

  await expect(page.getByRole('heading', { name: 'Registry Agent' })).toBeVisible();
});

test('server detail flow: view README and copy generated config', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as Window & { __copiedConfig?: string }).__copiedConfig = text;
        },
      },
      configurable: true,
    });
  });

  await page.route('**/api/v1/servers/registry-agent', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: baseServer }),
    });
  });

  await page.route('**/api/v1/servers?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [baseServer],
        meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
      }),
    });
  });

  await page.route('**/api/v1/servers/server-1/vote', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { voted: true, votesCount: 11 } }),
    });
  });

  await page.route('**/api/v1/servers/server-1/favorite', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { favorited: true, favoritesCount: 6 } }),
    });
  });

  await page.goto('/servers/registry-agent');

  await expect(page.getByRole('heading', { name: 'README' })).toBeVisible();
  await expect(page.getByText('This README is loaded in detail view.')).toBeVisible();

  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(page.getByText('Config copied to clipboard.')).toBeVisible();

  await page.getByRole('button', { name: 'Vote (10)' }).click();
  await expect(page.getByRole('button', { name: 'Undo vote (11)' })).toBeVisible();

  await page.getByRole('button', { name: 'Favorite (5)' }).click();
  await expect(page.getByRole('button', { name: 'Unfavorite (6)' })).toBeVisible();
});

test('submit flow: preview and confirm submission', async ({ page }) => {
  await page.route('**/api/v1/categories', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'cat-1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' }],
      }),
    });
  });

  await page.route('**/api/v1/servers/preview', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          name: 'New Server',
          description: 'Previewed metadata',
          githubUrl: 'https://github.com/org/new-server',
          githubStars: 42,
          githubForks: 7,
          openIssues: 1,
          lastCommitAt: '2026-03-20T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/v1/servers', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...baseServer, slug: 'new-server', name: 'New Server' } }),
      });
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [baseServer], meta: { page: 1, per_page: 24, total: 1, total_pages: 1 } }),
    });
  });

  await page.route('**/api/v1/servers/new-server', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...baseServer, slug: 'new-server', name: 'New Server' } }),
    });
  });

  await page.goto('/submit');
  await page.getByLabel('GitHub URL').fill('https://github.com/org/new-server');
  await page.getByRole('button', { name: 'Fetch metadata preview' }).click();

  await expect(page.getByRole('heading', { name: 'New Server' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm submission' }).click();

  await expect(page).toHaveURL(/\/servers\/new-server$/);
});

test('vote/favorite flow: counters update after toggles', async ({ page }) => {
  let voteCount = 10;
  let favoriteCount = 5;

  await page.route('**/api/v1/servers/registry-agent', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...baseServer, votesCount: voteCount, favoritesCount: favoriteCount } }),
    });
  });

  await page.route('**/api/v1/servers?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ ...baseServer, votesCount: voteCount, favoritesCount: favoriteCount }],
        meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
      }),
    });
  });

  await page.route('**/api/v1/servers/server-1/vote', async (route) => {
    voteCount += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { voted: true, votesCount: voteCount } }),
    });
  });

  await page.route('**/api/v1/servers/server-1/favorite', async (route) => {
    favoriteCount += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { favorited: true, favoritesCount: favoriteCount } }),
    });
  });

  await page.goto('/servers/registry-agent');

  await page.getByRole('button', { name: 'Vote (10)' }).click();
  await expect(page.getByRole('button', { name: 'Undo vote (11)' })).toBeVisible();

  await page.getByRole('button', { name: 'Favorite (5)' }).click();
  await expect(page.getByRole('button', { name: 'Unfavorite (6)' })).toBeVisible();
});
