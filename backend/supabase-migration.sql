-- ============================================
-- Dealss Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Offers table
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  store_name TEXT NOT NULL,
  discount TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Traffic data table
CREATE TABLE IF NOT EXISTS traffic_data (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  visits INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  bounce_rate DOUBLE PRECISION DEFAULT 0,
  avg_session_duration DOUBLE PRECISION DEFAULT 0
);

-- 4. Reset tokens table
CREATE TABLE IF NOT EXISTS reset_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 5. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  offer_id TEXT REFERENCES offers(id) ON DELETE SET NULL,
  participants TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  offer_id TEXT REFERENCES offers(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_traffic_data_date ON traffic_data(date);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_reviews_offer_id ON reviews(offer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Disable RLS for development (enable and add policies for production)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow full access via service role / anon key for backend usage
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for offers" ON offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for traffic_data" ON traffic_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reset_tokens" ON reset_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Storage: "offers" bucket for offer images
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offers',
  'offers',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read offer images (public bucket)
CREATE POLICY "Public read for offers bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'offers');

-- Allow authenticated/anon uploads to offers bucket
CREATE POLICY "Allow uploads to offers bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'offers');

-- Allow deletes from offers bucket
CREATE POLICY "Allow deletes from offers bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'offers');

-- ============================================
-- Supabase Auth Migration
-- The app now uses Supabase Authentication.
-- Users table `id` column will store Supabase Auth UUIDs.
-- The `password` column is kept for backward compatibility
-- but is no longer used (set to empty string for new users).
-- The `reset_tokens` table is no longer needed (Supabase handles password resets).
-- ============================================

-- Make password column optional for new Supabase Auth users
ALTER TABLE users ALTER COLUMN password SET DEFAULT '';

-- Optional: Drop reset_tokens table (no longer used)
-- DROP TABLE IF EXISTS reset_tokens;
