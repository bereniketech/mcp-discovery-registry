import express from 'express';
import { describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import healthRouter from './health.js';

describe('health route', () => {
  it('returns status ok', async () => {
    const app = express();
    app.use('/api/v1/health', healthRouter);

    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    const json = await response.json();

    server.close();

    expect(response.status).toBe(200);
    expect(json).toEqual({ status: 'ok' });
  });
});
