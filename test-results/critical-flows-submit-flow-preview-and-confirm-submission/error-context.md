# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flows.spec.ts >> submit flow: preview and confirm submission
- Location: e2e\critical-flows.spec.ts:127:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'New Server' })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: 'New Server' }) resolved to 2 elements:
    1) <h1 class="page-title">Add a new server</h1> aka getByRole('heading', { name: 'Add a new server' })
    2) <h2>New Server</h2> aka getByRole('heading', { name: 'New Server', exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'New Server' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "MCP Registry" [ref=e6] [cursor=pointer]:
      - /url: /
    - generic [ref=e7]:
      - generic [ref=e8]: Search
      - searchbox "Search" [ref=e9]
    - generic [ref=e10]:
      - link "e2e-user" [ref=e11] [cursor=pointer]:
        - /url: /profile
        - generic [ref=e12]: e2e-user
      - button "Sign out" [ref=e13] [cursor=pointer]
  - generic [ref=e14]:
    - complementary "Primary navigation" [ref=e16]:
      - navigation "Main routes" [ref=e17]:
        - link "Home" [ref=e18] [cursor=pointer]:
          - /url: /
        - link "Submit" [ref=e19] [cursor=pointer]:
          - /url: /submit
        - link "Profile" [ref=e20] [cursor=pointer]:
          - /url: /profile
      - navigation "Categories" [ref=e21]:
        - paragraph [ref=e22]: Categories
        - link "All categories" [ref=e23] [cursor=pointer]:
          - /url: /
        - link "Utilities" [ref=e24] [cursor=pointer]:
          - /url: /?category=utilities
    - main [ref=e25]:
      - generic [ref=e26]:
        - paragraph [ref=e27]: Submit
        - heading "Add a new server" [level=1] [ref=e28]
        - paragraph [ref=e29]: Paste a GitHub repository URL and we will import metadata, README content, and tags.
        - generic [ref=e30]:
          - generic [ref=e31]:
            - generic [ref=e32]: GitHub URL
            - textbox "GitHub URL" [ref=e33]:
              - /placeholder: https://github.com/org/repo
              - text: https://github.com/org/new-server
          - generic [ref=e34]:
            - button "Fetch metadata preview" [ref=e35] [cursor=pointer]
            - button "Confirm submission" [ref=e36] [cursor=pointer]
          - region "Submission preview" [ref=e37]:
            - heading "New Server" [level=2] [ref=e39]
            - paragraph [ref=e40]: Previewed metadata
            - generic [ref=e41]:
              - generic [ref=e42]: "Stars: 42"
              - generic [ref=e43]: "Forks: 7"
              - generic [ref=e44]: "Open issues: 1"
            - generic [ref=e45]:
              - generic [ref=e46]: Categories
              - button "Utilities" [ref=e48] [cursor=pointer]
```

# Test source

```ts
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
  112 |   await page.goto('/servers/registry-agent');
  113 | 
  114 |   await expect(page.getByRole('heading', { name: 'README' })).toBeVisible();
  115 |   await expect(page.getByText('This README is loaded in detail view.')).toBeVisible();
  116 | 
  117 |   await page.getByRole('button', { name: 'Copy JSON' }).click();
  118 |   await expect(page.getByText('Config copied to clipboard.')).toBeVisible();
  119 | 
  120 |   await page.getByRole('button', { name: 'Vote (10)' }).click();
  121 |   await expect(page.getByRole('button', { name: 'Undo vote (11)' })).toBeVisible();
  122 | 
  123 |   await page.getByRole('button', { name: 'Favorite (5)' }).click();
  124 |   await expect(page.getByRole('button', { name: 'Unfavorite (6)' })).toBeVisible();
  125 | });
  126 | 
  127 | test('submit flow: preview and confirm submission', async ({ page }) => {
  128 |   await page.route('**/api/v1/categories', async (route) => {
  129 |     await route.fulfill({
  130 |       contentType: 'application/json',
  131 |       body: JSON.stringify({
  132 |         data: [{ id: 'cat-1', name: 'Utilities', slug: 'utilities', description: 'Utilities servers' }],
  133 |       }),
  134 |     });
  135 |   });
  136 | 
  137 |   await page.route('**/api/v1/servers/preview', async (route) => {
  138 |     await route.fulfill({
  139 |       contentType: 'application/json',
  140 |       body: JSON.stringify({
  141 |         data: {
  142 |           name: 'New Server',
  143 |           description: 'Previewed metadata',
  144 |           githubUrl: 'https://github.com/org/new-server',
  145 |           githubStars: 42,
  146 |           githubForks: 7,
  147 |           openIssues: 1,
  148 |           lastCommitAt: '2026-03-20T00:00:00.000Z',
  149 |         },
  150 |       }),
  151 |     });
  152 |   });
  153 | 
  154 |   await page.route('**/api/v1/servers', async (route) => {
  155 |     if (route.request().method() === 'POST') {
  156 |       await route.fulfill({
  157 |         contentType: 'application/json',
  158 |         body: JSON.stringify({ data: { ...baseServer, slug: 'new-server', name: 'New Server' } }),
  159 |       });
  160 |       return;
  161 |     }
  162 | 
  163 |     await route.fulfill({
  164 |       contentType: 'application/json',
  165 |       body: JSON.stringify({ data: [baseServer], meta: { page: 1, per_page: 24, total: 1, total_pages: 1 } }),
  166 |     });
  167 |   });
  168 | 
  169 |   await page.route('**/api/v1/servers/new-server', async (route) => {
  170 |     await route.fulfill({
  171 |       contentType: 'application/json',
  172 |       body: JSON.stringify({ data: { ...baseServer, slug: 'new-server', name: 'New Server' } }),
  173 |     });
  174 |   });
  175 | 
  176 |   await page.goto('/submit');
  177 |   await page.getByLabel('GitHub URL').fill('https://github.com/org/new-server');
  178 |   await page.getByRole('button', { name: 'Fetch metadata preview' }).click();
  179 | 
> 180 |   await expect(page.getByRole('heading', { name: 'New Server' })).toBeVisible();
      |                                                                   ^ Error: expect(locator).toBeVisible() failed
  181 |   await page.getByRole('button', { name: 'Confirm submission' }).click();
  182 | 
  183 |   await expect(page).toHaveURL(/\/servers\/new-server$/);
  184 | });
  185 | 
  186 | test('vote/favorite flow: counters update after toggles', async ({ page }) => {
  187 |   let voteCount = 10;
  188 |   let favoriteCount = 5;
  189 | 
  190 |   await page.route('**/api/v1/servers/registry-agent', async (route) => {
  191 |     await route.fulfill({
  192 |       contentType: 'application/json',
  193 |       body: JSON.stringify({ data: { ...baseServer, votesCount: voteCount, favoritesCount: favoriteCount } }),
  194 |     });
  195 |   });
  196 | 
  197 |   await page.route('**/api/v1/servers?**', async (route) => {
  198 |     await route.fulfill({
  199 |       contentType: 'application/json',
  200 |       body: JSON.stringify({
  201 |         data: [{ ...baseServer, votesCount: voteCount, favoritesCount: favoriteCount }],
  202 |         meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
  203 |       }),
  204 |     });
  205 |   });
  206 | 
  207 |   await page.route('**/api/v1/servers/server-1/vote', async (route) => {
  208 |     voteCount += 1;
  209 |     await route.fulfill({
  210 |       contentType: 'application/json',
  211 |       body: JSON.stringify({ data: { voted: true, votesCount: voteCount } }),
  212 |     });
  213 |   });
  214 | 
  215 |   await page.route('**/api/v1/servers/server-1/favorite', async (route) => {
  216 |     favoriteCount += 1;
  217 |     await route.fulfill({
  218 |       contentType: 'application/json',
  219 |       body: JSON.stringify({ data: { favorited: true, favoritesCount: favoriteCount } }),
  220 |     });
  221 |   });
  222 | 
  223 |   await page.goto('/servers/registry-agent');
  224 | 
  225 |   await page.getByRole('button', { name: 'Vote (10)' }).click();
  226 |   await expect(page.getByRole('button', { name: 'Undo vote (11)' })).toBeVisible();
  227 | 
  228 |   await page.getByRole('button', { name: 'Favorite (5)' }).click();
  229 |   await expect(page.getByRole('button', { name: 'Unfavorite (6)' })).toBeVisible();
  230 | });
  231 | 
```