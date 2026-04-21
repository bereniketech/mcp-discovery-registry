-- Migration 0005: Drop dead votes.value column
-- votes are a boolean toggle (present = upvote, absent = no vote).
-- The value column was never read or used in any query.

ALTER TABLE "votes" DROP COLUMN IF EXISTS "value";
