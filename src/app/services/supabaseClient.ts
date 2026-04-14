import { createClient } from '@supabase/supabase-js';
import { authLog } from '../utils/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables');
}

authLog('Initializing Supabase client', { url: supabaseUrl });

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Auto-detect PKCE code and hash fragments
    flowType: 'pkce',         // Secure PKCE flow for email redirects
    storageKey: 'dealss-auth',
  },
});
