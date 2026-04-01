import { z } from 'zod';

/**
 * GitHub credentials and configuration schema.
 * Supports both personal access tokens and GitHub App authentication.
 */
const GitHubConfigSchema = z.object({
  // Personal access token for GitHub API (simplest approach)
  token: z.string().optional(),

  // GitHub App credentials (for advanced OAuth flows)
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  appPrivateKey: z.string().optional(),

  // Webhook secret for validating GitHub webhook payloads
  webhookSecret: z.string().optional(),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Load and validate GitHub credentials from environment.
 * At least one authentication method must be provided.
 */
export function loadGitHubConfig(): GitHubConfig {
  const config = {
    token: process.env.GITHUB_TOKEN,
    appId: process.env.GITHUB_APP_ID,
    appSecret: process.env.GITHUB_APP_SECRET,
    appPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  };

  const validated = GitHubConfigSchema.parse(config);

  // Validate that at least one auth method is provided
  const hasTokenAuth = validated.token;
  const hasAppAuth = validated.appId && validated.appSecret;
  const hasWebhook = validated.webhookSecret;

  if (!hasTokenAuth && !hasAppAuth) {
    throw new Error(
      'No GitHub authentication configured. ' +
        'Set either GITHUB_TOKEN or GITHUB_APP_ID + GITHUB_APP_SECRET.'
    );
  }

  return validated;
}

/**
 * Get the appropriate Authorization header for GitHub API requests.
 */
export function getGitHubAuthHeader(config: GitHubConfig): { Authorization: string } | undefined {
  if (config.token) {
    return {
      Authorization: `Bearer ${config.token}`,
    };
  }

  // TODO: Implement GitHub App JWT token generation if needed
  if (config.appId && config.appPrivateKey) {
    // This would require generating a JWT and exchanging it for an access token
    console.warn('GitHub App authentication not yet implemented');
    return undefined;
  }

  return undefined;
}

/**
 * Validate webhook signature from GitHub.
 * Uses HMAC-SHA256 to verify the X-Hub-Signature-256 header.
 */
export function validateGitHubWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const crypto = require('crypto');
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedSignature = `sha256=${hash}`;

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}
