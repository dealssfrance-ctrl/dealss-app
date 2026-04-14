import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../services/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const router = Router();

// Admin client — uses service role key to access auth.users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper: verify Supabase access token and return user info
async function verifySupabaseToken(token: string) {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Sync profile after Supabase Auth signup
router.post('/sync-profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization header missing' });
    }

    const token = authHeader.substring(7);
    const supaUser = await verifySupabaseToken(token);
    if (!supaUser) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { name } = req.body;

    // Check if profile already exists
    const existing = await db.getUserById(supaUser.id);
    if (existing) {
      return res.status(200).json({ success: true, message: 'Profile already exists', user: existing });
    }

    // Create profile row
    const user = await db.createUser({
      id: supaUser.id,
      email: supaUser.email || '',
      password: '', // No password stored — handled by Supabase Auth
      name: name || supaUser.user_metadata?.name || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({ success: true, message: 'Profile created', user: userWithoutPassword });
  } catch (error) {
    console.error('Sync profile error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// Verify token — validates Supabase access token
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const supaUser = await verifySupabaseToken(token);
    if (!supaUser) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Get profile from users table
    let profile = await db.getUserById(supaUser.id);
    if (!profile) {
      // Auto-create profile if missing
      profile = await db.createUser({
        id: supaUser.id,
        email: supaUser.email || '',
        password: '',
        name: supaUser.user_metadata?.name || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const { password: _, ...userWithoutPassword } = profile;
    return res.status(200).json({ success: true, message: 'Token is valid', user: userWithoutPassword });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization header missing' });
    }

    const token = authHeader.substring(7);
    const supaUser = await verifySupabaseToken(token);
    if (!supaUser) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    let profile = await db.getUserById(supaUser.id);
    if (!profile) {
      profile = await db.createUser({
        id: supaUser.id,
        email: supaUser.email || '',
        password: '',
        name: supaUser.user_metadata?.name || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const { password: _, ...userWithoutPassword } = profile;
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// Check if an email has been verified in Supabase Auth (no auth required — used by verification screen)
router.get('/check-verification', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, verified: false, message: 'Email is required' });
    }

    // Query auth.users directly via the service role client
    const { data, error } = await supabaseAdmin
      .from('auth_users_view')
      .select('email_confirmed_at')
      .eq('email', email)
      .single();

    // If the view doesn't exist, fall back to admin API
    if (error) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('Admin listUsers error:', listError);
        return res.status(500).json({ success: false, verified: false });
      }
      const foundUser = users.find(u => u.email === email);
      if (!foundUser) {
        return res.status(404).json({ success: false, verified: false, message: 'User not found' });
      }
      return res.status(200).json({ success: true, verified: !!foundUser.email_confirmed_at });
    }

    return res.status(200).json({ success: true, verified: !!data?.email_confirmed_at });
  } catch (error) {
    console.error('Check verification error:', error);
    return res.status(500).json({ success: false, verified: false, message: 'An error occurred' });
  }
});

export default router;
