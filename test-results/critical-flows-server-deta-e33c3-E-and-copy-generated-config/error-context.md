# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flows.spec.ts >> server detail flow: view README and copy generated config
- Location: e2e\critical-flows.spec.ts:69:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/servers/registry-agent
Call log:
  - navigating to "http://127.0.0.1:4173/servers/registry-agent", waiting until "load"

```

# Test source

```ts
  12  |   authorId: 'user-1',
  13  |   votesCount: 10,
  14  |   favoritesCount: 5,
  15  |   readmeContent: '# Registry Agent\n\nThis README is loaded in detail view.',
  16  |   githubStars: 240,
  17  |   githubForks: 15,
  18  |   openIssues: 2,
  19  |   lastCommitAt: '2026-03-25T00:00:00.000Z',
  20  |   createdAt: '2026-01-01T00:00:00.000Z',
  21  |   updatedAt: '2026-03-25T00:00:00.000Z',
  22  | };
  23  | 
  24  | async function mockCommonApi(page: Parameters<typeof test>[0]['page']) {
  25  |   await page.route('**/api/v1/categories', async (route) => {
  26  |     await route.fulfill({
  27  |       contentType: 'application/json',
  28  |       body: JSON.stringify({
  29  |         data: [
  30  |           { id: 'cat-1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' },
  31  |           { id: 'cat-2', name: 'Agents', slug: 'agents', description: 'Agent servers' },
  32  |         ],
  33  |       }),
  34  |     });
  35  |   });
  36  | 
  37  |   await page.route('**/api/v1/trending**', async (route) => {
  38  |     await route.fulfill({
  39  |       contentType: 'application/json',
  40  |       body: JSON.stringify({ data: [baseServer] }),
  41  |     });
  42  |   });
  43  | 
  44  |   await page.route('**/api/v1/servers?**', async (route) => {
  45  |     const url = new URL(route.request().url());
  46  |     const query = url.searchParams.get('q')?.toLowerCase() ?? '';
  47  |     const filtered = query ? [baseServer].filter((server) => server.name.toLowerCase().includes(query)) : [baseServer];
  48  | 
  49  |     await route.fulfill({
  50  |       contentType: 'application/json',
  51  |       body: JSON.stringify({
  52  |         data: filtered,
  53  |         meta: { page: 1, per_page: 24, total: filtered.length, total_pages: 1 },
  54  |       }),
  55  |     });
  56  |   });
  57  | }
  58  | 
  59  | test('search flow: query to visible result', async ({ page }) => {
  60  |   await mockCommonApi(page);
  61  | 
  62  |   await page.goto('/');
  63  |   await page.getByPlaceholder('Search by name, description, or tag').fill('Registry');
  64  |   await page.waitForTimeout(400);
  65  | 
  66  |   await expect(page.getByRole('heading', { name: 'Registry Agent' })).toBeVisible();
  67  | });
  68  | 
  69  | test('server detail flow: view README and copy generated config', async ({ page }) => {
  70  |   await page.addInitScript(() => {
  71  |     Object.defineProperty(navigator, 'clipboard', {
  72  |       value: {
  73  |         writeText: async (text: string) => {
  74  |           (window as Window & { __copiedConfig?: string }).__copiedConfig = text;
  75  |         },
  76  |       },
  77  |       configurable: true,
  78  |     });
  79  |   });
  80  | 
  81  |   await page.route('**/api/v1/servers/registry-agent', async (route) => {
  82  |     await route.fulfill({
  83  |       contentType: 'application/json',
  84  |       body: JSON.stringify({ data: baseServer }),
  85  |     });
  86  |   });
  87  | 
  88  |   await page.route('**/api/v1/servers?**', async (route) => {
  89  |     await route.fulfill({
  90  |       contentType: 'application/json',
  91  |       body: JSON.stringify({
  92  |         data: [baseServer],
  93  |         meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
  94  |       }),
  95  |     });
  96  |   });
  97  | 
  98  |   await page.route('**/api/v1/servers/server-1/vote', async (route) => {
  99  |     await route.fulfill({
  100 |       contentType: 'application/json',
  101 |       body: JSON.stringify({ data: { voted: true, votesCount: 11 } }),
  102 |     });
  103 |   });
  104 | 
  105 |   await page.route('**/api/v1/servers/server-1/favorite', async (route) => {
  106 |     await route.fulfill({
  107 |       contentType: 'application/json',
  108 |       body: JSON.stringify({ data: { favorited: true, favoritesCount: 6 } }),
  109 |     });
  110 |   });
  111 | 
> 112 |   await page.goto('/servers/registry-agent');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/servers/registry-agent
  113 | 
  114 |   await expect(page.getByRole('tab', { name: 'README' })).toBeVisible();
  115 |   await expect(page.getByText('This README is loaded in detail view.')).toBeVisible();
  116 | 
  117 |   await page.getByRole('tab', { name: 'Claude Desktop' }).click();
  118 |   await page.getByRole('button', { name: 'Copy' }).click();
  119 |   await expect(page.getByText('Config copied to clipboard.')).toBeVisible();
  120 | 
  121 |   await page.getByRole('button', { name: 'Vote (10)' }).click();
  122 |   await expect(page.getByRole('button', { name: 'Undo vote (11)' })).toBeVisible();
  123 | 
  124 |   await page.getByRole('button', { name: 'Favorite (5)' }).click();
  125 |   await expect(page.getByRole('button', { name: 'Unfavorite (6)' })).toBeVisible();
  126 | });
  127 | 
  128 | test('submit flow: preview and confirm submission', async ({ page }) => {
  129 |   await page.route('**/api/v1/categories', async (route) => {
  130 |     await route.fulfill({
  131 |       contentType: 'application/json',
  132 |       body: JSON.stringify({
  133 |         data: [{ id: 'cat-1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' }],
  134 |       }),
  135 |     });
  136 |   });
  137 | 
  138 |   await page.route('**/api/v1/servers/preview', async (route) => {
  139 |     await route.fulfill({
  140 |       contentType: 'application/json',
  141 |       body: JSON.stringify({
  142 |         data: {
  143 |           name: 'New Server',
  144 |           description: 'Previewed metadata',
  145 |           githubUrl: 'https://github.com/org/new-server',
  146 |           githubStars: 42,
  147 |           githubForks: 7,
  148 |           openIssues: 1,
  149 |           lastCommitAt: '2026-03-20T00:00:00.000Z',
  150 |         },
  151 |       }),
  152 |     });
  153 |   });
  154 | 
  155 |   await page.route('**/api/v1/servers', async (route) => {
  156 |     if (route.request().method() === 'POST') {
  157 |       await route.fulfill({
  158 |         contentType: 'application/json',
  159 |         body: JSON.stringify({ data: { ...baseServer, slug: 'new-server', name: 'New Server' } }),
  160 |       });
  161 |       return;
  162 |     }
  163 | 
  164 |     await route.fulfill({
  165 |       contentType: 'application/json',
  166 |       body: JSON.stringify({ data: [baseServer], meta: { page: 1, per_page: 24, total: 1, total_pages: 1 } }),
  167 |     });
  168 |   });
  169 | 
  170 |   await page.route('**/api/v1/servers/new-server', async (route) => {
  171 |     await route.fulfill({
  172 |       contentType: 'application/json',
  173 |       body: JSON.stringify({ data: { ...baseServer, slug: 'new-server', name: 'New Server' } }),
  174 |     });
  175 |   });
  176 | 
  177 |   await page.goto('/submit');
  178 |   await page.getByLabel('GitHub URL').fill('https://github.com/org/new-server');
  179 |   await page.getByRole('button', { name: 'Fetch metadata preview' }).click();
  180 | 
  181 |   await expect(page.getByRole('heading', { name: 'New Server', exact: true })).toBeVisible();
  182 |   await page.getByRole('button', { name: 'Confirm submission' }).click();
  183 | 
  184 |   await expect(page).toHaveURL(/\/servers\/new-server$/);
  185 | });
  186 | 
  187 | test('vote/favorite flow: counters update after toggles', async ({ page }) => {
  188 |   let voteCount = 10;
  189 |   let favoriteCount = 5;
  190 | 
  191 |   await page.route('**/api/v1/servers/registry-agent', async (route) => {
  192 |     await route.fulfill({
  193 |       contentType: 'application/json',
  194 |       body: JSON.stringify({ data: { ...baseServer, votesCount: voteCount, favoritesCount: favoriteCount } }),
  195 |     });
  196 |   });
  197 | 
  198 |   await page.route('**/api/v1/servers?**', async (route) => {
  199 |     await route.fulfill({
  200 |       contentType: 'application/json',
  201 |       body: JSON.stringify({
  202 |         data: [{ ...baseServer, votesCount: voteCount, favoritesCount: favoriteCount }],
  203 |         meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
  204 |       }),
  205 |     });
  206 |   });
  207 | 
  208 |   await page.route('**/api/v1/servers/server-1/vote', async (route) => {
  209 |     voteCount += 1;
  210 |     await route.fulfill({
  211 |       contentType: 'application/json',
  212 |       body: JSON.stringify({ data: { voted: true, votesCount: voteCount } }),
```