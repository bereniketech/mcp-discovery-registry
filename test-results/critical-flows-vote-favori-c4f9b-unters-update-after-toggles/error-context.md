# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flows.spec.ts >> vote/favorite flow: counters update after toggles
- Location: e2e\critical-flows.spec.ts:187:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/servers/registry-agent
Call log:
  - navigating to "http://127.0.0.1:4173/servers/registry-agent", waiting until "load"

```

# Test source

```ts
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
  213 |     });
  214 |   });
  215 | 
  216 |   await page.route('**/api/v1/servers/server-1/favorite', async (route) => {
  217 |     favoriteCount += 1;
  218 |     await route.fulfill({
  219 |       contentType: 'application/json',
  220 |       body: JSON.stringify({ data: { favorited: true, favoritesCount: favoriteCount } }),
  221 |     });
  222 |   });
  223 | 
> 224 |   await page.goto('/servers/registry-agent');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/servers/registry-agent
  225 | 
  226 |   await page.getByRole('button', { name: 'Vote (10)' }).click();
  227 |   await expect(page.getByRole('button', { name: 'Undo vote (11)' })).toBeVisible();
  228 | 
  229 |   await page.getByRole('button', { name: 'Favorite (5)' }).click();
  230 |   await expect(page.getByRole('button', { name: 'Unfavorite (6)' })).toBeVisible();
  231 | });
  232 | 
```