-- Migration: Exchange validation & reputation system for Troc/Échange offers.
-- Idempotent: safe to run multiple times.
--
-- NOTE: This project uses TEXT primary keys for users and offers (not UUID).
--       All foreign keys here are TEXT to match.

----------------------------------------------------------------------------
-- 1. Columns on users
----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS successful_exchanges INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reported_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked           BOOLEAN NOT NULL DEFAULT FALSE;

----------------------------------------------------------------------------
-- 2. exchanges
----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchanges (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  offer_id                 TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  -- Always store with participant_a_id < participant_b_id to keep uniqueness.
  participant_a_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_a_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  participant_b_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'disputed')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at             TIMESTAMPTZ,
  CONSTRAINT exchanges_participants_ordered CHECK (participant_a_id < participant_b_id),
  CONSTRAINT exchanges_unique UNIQUE (offer_id, participant_a_id, participant_b_id)
);

CREATE INDEX IF NOT EXISTS exchanges_offer_idx           ON exchanges (offer_id);
CREATE INDEX IF NOT EXISTS exchanges_participant_a_idx   ON exchanges (participant_a_id);
CREATE INDEX IF NOT EXISTS exchanges_participant_b_idx   ON exchanges (participant_b_id);
CREATE INDEX IF NOT EXISTS exchanges_status_idx          ON exchanges (status);

----------------------------------------------------------------------------
-- 3. exchange_reports
----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchange_reports (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exchange_id   TEXT NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  reporter_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exchange_reports_distinct CHECK (reporter_id <> reported_id),
  CONSTRAINT exchange_reports_unique UNIQUE (exchange_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS exchange_reports_exchange_idx ON exchange_reports (exchange_id);
CREATE INDEX IF NOT EXISTS exchange_reports_reported_idx ON exchange_reports (reported_id);

----------------------------------------------------------------------------
-- 4. Triggers
----------------------------------------------------------------------------

-- 4.1 When both confirm: mark confirmed & bump counters.
CREATE OR REPLACE FUNCTION fn_exchanges_after_confirm() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.participant_a_confirmed
     AND NEW.participant_b_confirmed
     AND NEW.status <> 'confirmed' THEN
    NEW.status := 'confirmed';
    NEW.confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exchanges_before_update ON exchanges;
CREATE TRIGGER trg_exchanges_before_update
  BEFORE UPDATE ON exchanges
  FOR EACH ROW
  EXECUTE FUNCTION fn_exchanges_after_confirm();

DROP TRIGGER IF EXISTS trg_exchanges_before_insert ON exchanges;
CREATE TRIGGER trg_exchanges_before_insert
  BEFORE INSERT ON exchanges
  FOR EACH ROW
  EXECUTE FUNCTION fn_exchanges_after_confirm();

-- Bump counters when status transitions to 'confirmed'.
CREATE OR REPLACE FUNCTION fn_exchanges_after_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    UPDATE users
       SET successful_exchanges = successful_exchanges + 1
     WHERE id IN (NEW.participant_a_id, NEW.participant_b_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exchanges_after_update ON exchanges;
CREATE TRIGGER trg_exchanges_after_update
  AFTER UPDATE ON exchanges
  FOR EACH ROW
  EXECUTE FUNCTION fn_exchanges_after_status_change();

DROP TRIGGER IF EXISTS trg_exchanges_after_insert ON exchanges;
CREATE TRIGGER trg_exchanges_after_insert
  AFTER INSERT ON exchanges
  FOR EACH ROW
  EXECUTE FUNCTION fn_exchanges_after_status_change();

-- 4.2 On report insert: bump reported_count, mark exchange disputed,
--     auto-block at >= 5 reports.
CREATE OR REPLACE FUNCTION fn_exchange_reports_after_insert() RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE users
     SET reported_count = reported_count + 1
   WHERE id = NEW.reported_id
   RETURNING reported_count INTO v_count;

  IF v_count >= 5 THEN
    UPDATE users SET is_blocked = TRUE WHERE id = NEW.reported_id;
  END IF;

  UPDATE exchanges
     SET status = 'disputed'
   WHERE id = NEW.exchange_id
     AND status <> 'confirmed';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exchange_reports_after_insert ON exchange_reports;
CREATE TRIGGER trg_exchange_reports_after_insert
  AFTER INSERT ON exchange_reports
  FOR EACH ROW
  EXECUTE FUNCTION fn_exchange_reports_after_insert();

----------------------------------------------------------------------------
-- 5. RLS
----------------------------------------------------------------------------
ALTER TABLE exchanges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_reports ENABLE ROW LEVEL SECURITY;

-- exchanges: a participant can SELECT/INSERT/UPDATE their own row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='exchanges' AND policyname='exchanges_select_own'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY exchanges_select_own ON exchanges
        FOR SELECT TO authenticated
        USING (auth.uid()::text = participant_a_id
            OR auth.uid()::text = participant_b_id)
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='exchanges' AND policyname='exchanges_insert_own'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY exchanges_insert_own ON exchanges
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid()::text = participant_a_id
                 OR auth.uid()::text = participant_b_id)
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='exchanges' AND policyname='exchanges_update_own'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY exchanges_update_own ON exchanges
        FOR UPDATE TO authenticated
        USING (auth.uid()::text = participant_a_id
            OR auth.uid()::text = participant_b_id)
        WITH CHECK (auth.uid()::text = participant_a_id
                 OR auth.uid()::text = participant_b_id)
    $POL$;
  END IF;

  -- exchange_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='exchange_reports' AND policyname='exchange_reports_select_own'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY exchange_reports_select_own ON exchange_reports
        FOR SELECT TO authenticated
        USING (auth.uid()::text = reporter_id
            OR auth.uid()::text = reported_id)
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='exchange_reports' AND policyname='exchange_reports_insert_self'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY exchange_reports_insert_self ON exchange_reports
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid()::text = reporter_id)
    $POL$;
  END IF;
END $$;
