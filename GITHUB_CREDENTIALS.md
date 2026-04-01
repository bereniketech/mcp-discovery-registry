# GitHub Credentials Setup

This repository uses GitHub credentials for:
- Fetching server metadata (README, topics, stars)
- Validating webhook payloads from GitHub
- (Optional) GitHub App authentication for rate limit increases

## Setup Options

### Option 1: Personal Access Token (Simplest)

1. Go to GitHub Settings → [Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select these scopes:
   - `public_repo` (read public repositories)
   - `read:user` (read user profile)
4. Copy the token
5. Add to `.env.local`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   ```

**Rate limits:** 60 requests/hour (unauthenticated), 5,000 requests/hour (authenticated)

### Option 2: GitHub App (Recommended for Production)

For higher rate limits and more control:

1. Go to [Developer settings → GitHub Apps](https://github.com/settings/apps)
2. Click "New GitHub App"
3. Fill in:
   - **App name:** mcp-discovery-registry
   - **Homepage URL:** (your domain)
   - **Permissions:**
     - Repository: `Contents` (read-only)
     - Repository: `Metadata` (read-only)
4. Create the app → Generate a private key
5. Note the **App ID**
6. Add to `.env.local`:
   ```
   GITHUB_APP_ID=123456
   GITHUB_APP_SECRET=ghp_xxxxxxxxxxxxxxxxxxxx
   GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
   ```

### Option 3: Webhook Validation (Optional)

If you plan to receive GitHub webhooks:

1. Generate a secure random secret:
   ```bash
   openssl rand -hex 32
   ```
2. Add to `.env.local`:
   ```
   GITHUB_WEBHOOK_SECRET=your_secret_here
   ```
3. Configure the webhook in your GitHub App/Repository settings
4. The server will validate all incoming webhook payloads using HMAC-SHA256

## Usage in Code

```typescript
import { loadGitHubConfig, getGitHubAuthHeader } from '@/config/github';

const config = loadGitHubConfig();
const headers = getGitHubAuthHeader(config);

// Fetch server metadata from GitHub
const response = await fetch('https://api.github.com/repos/owner/repo', {
  headers: headers ? headers : {},
});
```

## Rate Limits

| Method | Unauthenticated | Authenticated (Token) | GitHub App |
|--------|-----------------|----------------------|------------|
| REST API | 60/hour | 5,000/hour | 10,000/hour per user |
| GraphQL | N/A | 5,000/hour | 15,000/hour per user |

## Security Notes

- **Never commit `.env.local` to version control** — it's in `.gitignore`
- Treat tokens as secrets — use a secure vault in production
- Personal access tokens can access all repositories the user has access to
- GitHub App private keys should be stored securely (AWS Secrets Manager, HashiCorp Vault, etc.)
- Webhook secrets prevent unauthorized webhook deliveries

## Troubleshooting

**"No GitHub authentication configured"**
- Ensure either `GITHUB_TOKEN` OR (`GITHUB_APP_ID` + `GITHUB_APP_SECRET`) is set in `.env.local`

**"API rate limit exceeded"**
- Personal token: 5,000 requests/hour (check `X-RateLimit-Remaining` header)
- GitHub App: 10,000 requests/hour per user
- Consider implementing request caching or queuing

**"Invalid webhook signature"**
- Verify `GITHUB_WEBHOOK_SECRET` matches the one configured in GitHub
- Ensure the webhook is sending `application/json` content type
