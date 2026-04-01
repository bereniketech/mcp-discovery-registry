import { z } from 'zod';

const githubUrlPattern =
  /^https?:\/\/(?:www\.)?github\.com\/[^/?#]+\/[^/?#]+(?:\.git)?\/?$/i;

export const createServerSchema = z.object({
  github_url: z
    .string()
    .trim()
    .url('github_url must be a valid URL')
    .regex(githubUrlPattern, 'github_url must be a GitHub repository URL'),
});

export const listServersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
});
