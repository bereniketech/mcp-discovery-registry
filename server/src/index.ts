import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { db } from './db/index.js';
import { errorHandler } from './middleware/error.js';
import healthRouter from './routes/health.js';
import createServersRouter from './routes/servers.js';
import createServerActionsRouter from './routes/server-actions.js';
import createMeRouter from './routes/me.js';
import { GitHubFetcherService } from './services/github-fetcher.js';
import { ServerService } from './services/server.js';
import { VoteService } from './services/vote.js';
import { FavoriteService } from './services/favorite.js';
import { TagService } from './services/tag.js';

const app = express();

// Body parsing
app.use(express.json());

// CORS — allow configured origin with credentials
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
);

// Public rate limiter — 100 req/min per IP
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(publicLimiter);

// Write rate limiter — 30 req/min per user; exported for route-level use
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/v1/health', healthRouter);
const githubFetcherService = new GitHubFetcherService();
const serverService = new ServerService(githubFetcherService);
const voteService = new VoteService();
const favoriteService = new FavoriteService();
const tagService = new TagService();
app.use('/api/v1/servers', createServersRouter(serverService));
app.use('/api/v1/servers', createServerActionsRouter(voteService, favoriteService, tagService));
app.use('/api/v1/me', createMeRouter({
  listFavoritesByUser: favoriteService.listFavoritesByUser.bind(favoriteService),
  listByAuthor: serverService.listByAuthor.bind(serverService),
}));

// Make db available to request handlers via app.locals
app.locals['db'] = db;

// Centralized error handler — must be registered last
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
