import 'dotenv/config';
import express from 'express';
import type {
  ApiResponse,
  Server as RegistryServer,
} from '@mcp-registry/shared';

const app = express();

const sampleServer: RegistryServer = {
  id: 'server-1',
  name: 'MCP Directory API',
  slug: 'mcp-directory-api',
  description:
    'Seed data for verifying shared package imports from the server package.',
  repositoryUrl: 'https://github.com/example/mcp-directory-api',
  websiteUrl: 'https://example.com/mcp-directory-api',
  categories: ['directory'],
  tags: ['mcp', 'registry'],
  authorId: 'user-1',
  votesCount: 0,
  favoritesCount: 0,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

app.get('/health', (_request, response) => {
  const payload: ApiResponse<RegistryServer> = {
    success: true,
    data: sampleServer,
  };

  response.json(payload);
});

export default app;
