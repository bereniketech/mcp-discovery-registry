import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createTrendingRouter } from './trending.js';
import { errorHandler } from '../middleware/error.js';

function createTestApp(service: {
  getTopTrending: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use('/api/v1/trending', createTrendingRouter(service));
  app.use(errorHandler);
  return app;
}

describe('trending routes', () => {
  it('uses default limit of 10', async () => {
    const service = {
      getTopTrending: vi.fn().mockResolvedValue([]),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/trending`);
    server.close();

    expect(response.status).toBe(200);
    expect(service.getTopTrending).toHaveBeenCalledWith(10);
  });

  it('accepts configurable limit query param', async () => {
    const service = {
      getTopTrending: vi.fn().mockResolvedValue([]),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/trending?limit=5`);
    server.close();

    expect(response.status).toBe(200);
    expect(service.getTopTrending).toHaveBeenCalledWith(5);
  });

  it('returns 422 for invalid limit', async () => {
    const service = {
      getTopTrending: vi.fn().mockResolvedValue([]),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/trending?limit=0`);
    server.close();

    expect(response.status).toBe(422);
    expect(service.getTopTrending).not.toHaveBeenCalled();
  });

  it('caches response for repeated requests with same limit', async () => {
    const trendingResult = [
      { slug: 'recent-server', trendingScore: 100 },
      { slug: 'old-server', trendingScore: 80 },
    ];

    const service = {
      getTopTrending: vi.fn().mockResolvedValue(trendingResult),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const responseOne = await fetch(`http://127.0.0.1:${port}/api/v1/trending?limit=2`);
    const bodyOne = await responseOne.json();

    const responseTwo = await fetch(`http://127.0.0.1:${port}/api/v1/trending?limit=2`);
    const bodyTwo = await responseTwo.json();

    server.close();

    expect(responseOne.status).toBe(200);
    expect(responseTwo.status).toBe(200);
    expect(bodyOne).toEqual({ data: trendingResult });
    expect(bodyTwo).toEqual({ data: trendingResult });
    expect(service.getTopTrending).toHaveBeenCalledTimes(1);
  });
});
