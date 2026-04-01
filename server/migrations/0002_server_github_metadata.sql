ALTER TABLE "servers"
  RENAME COLUMN "repository_url" TO "github_url";

ALTER TABLE "servers"
  ADD COLUMN IF NOT EXISTS "github_stars" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "github_forks" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "open_issues" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_commit_at" timestamp with time zone;

ALTER TABLE "servers"
  ADD CONSTRAINT "servers_github_url_unique" UNIQUE ("github_url");
