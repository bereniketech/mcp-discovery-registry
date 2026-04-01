import { z } from 'zod';

const githubUrlPattern =
  /^https?:\/\/(?:www\.)?github\.com\/[^/?#]+\/[^/?#]+(?:\.git)?\/?$/i;

export const createServerSchema = z.object({
  github_url: z
    .string()
    .trim()
    .url('github_url must be a valid URL')
    .regex(githubUrlPattern, 'github_url must be a GitHub repository URL'),
  categories: z.array(z.string().trim().min(1)).max(10).optional().default([]),
});

export const previewServerSchema = z.object({
  github_url: z
    .string()
    .trim()
    .url('github_url must be a valid URL')
    .regex(githubUrlPattern, 'github_url must be a GitHub repository URL'),
});

export const listServersQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) =>
      val === undefined ? undefined : Array.isArray(val) ? val : [val],
    ),
  sort: z.enum(['trending', 'newest', 'stars', 'votes']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
});

export const addTagSchema = z.object({
  tag: z.string().trim().min(1).max(64),
});
