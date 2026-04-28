-- Migration: track per-user "last seen" timestamp for presence indicators.
-- Idempotent: safe to run multiple times.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at);

-- Allow authenticated users to update their own last_seen_at via the anon key.
-- The existing RLS policy on users likely already permits self-update; this is
-- a safety net in case the project tightened it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_update_own_presence'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY users_update_own_presence ON users
        FOR UPDATE TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id)
    $POL$;
  END IF;
END $$;
