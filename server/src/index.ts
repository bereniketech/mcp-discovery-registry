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
import createTrendingRouter from './routes/trending.js';
import createCategoriesRouter from './routes/categories.js';
import createTagsRouter from './routes/tags.js';
import { GitHubFetcherService } from './services/github-fetcher.js';
import { ServerService } from './services/server.js';
import { VoteService } from './services/vote.js';
import { FavoriteService } from './services/favorite.js';
import { TagService } from './services/tag.js';
import { TrendingService } from './services/trending.js';
import { CommentService } from './services/comment.js';
import { RatingService } from './services/rating.js';
import { OwnershipService } from './services/ownership.js';
import { createCommentsRouter, createCommentActionsRouter } from './routes/comments.js';
import { createOwnershipRouter } from './routes/ownership.js';
import { createVersionsRouter } from './routes/versions.js';
import { createAdminRouter, createReportRouter } from './routes/admin.js';
import { createFeedsRouter } from './routes/feeds.js';
import { startGitHubMetadataCron } from './jobs/refresh-github-metadata.js';

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
const trendingService = new TrendingService();
const commentService = new CommentService();
const ratingService = new RatingService();
const ownershipService = new OwnershipService();
app.use('/api/v1/servers', createServersRouter(serverService));
app.use('/api/v1/servers', createServerActionsRouter(voteService, favoriteService, tagService, ratingService));
app.use('/api/v1/servers', createCommentsRouter(commentService));
app.use('/api/v1/servers', createOwnershipRouter(ownershipService));
app.use('/api/v1/servers/:id/versions', createVersionsRouter());
app.use('/api/v1/servers/:id/report', createReportRouter());
app.use('/api/v1/admin', createAdminRouter());
app.use('/api/v1/comments', createCommentActionsRouter(commentService));
app.use('/api/v1/me', createMeRouter({
  listFavoritesByUser: (userId, pagination) =>
    favoriteService.listFavoritesByUser(userId, pagination),
  listByAuthor: (userId, pagination) =>
    serverService.listByAuthor(userId, pagination),
}));
app.use('/api/v1/trending', createTrendingRouter(trendingService));
app.use('/api/v1/categories', createCategoriesRouter());
app.use('/api/v1/tags', createTagsRouter());
app.use('/feeds', createFeedsRouter());

// Make db available to request handlers via app.locals
app.locals['db'] = db;

// Centralized error handler — must be registered last
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start the GitHub metadata refresh cron (every 6 hours).
// startGitHubMetadataCron() guards internally against a missing GITHUB_TOKEN.
startGitHubMetadataCron();

export default app;
