-- Migration: add merchant/store account support to users table.
-- Idempotent: safe to run multiple times.

-- Account type: 'individual' (default, existing users) | 'merchant'
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual';

-- Defensive: enforce allowed values (drop+recreate so re-run works).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_account_type_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_account_type_check;
  END IF;
END $$;

ALTER TABLE users
  ADD CONSTRAINT users_account_type_check
  CHECK (account_type IN ('individual', 'merchant'));

-- Merchant-specific fields (nullable for individuals).
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_logo_url  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_location  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified     BOOLEAN NOT NULL DEFAULT FALSE;
