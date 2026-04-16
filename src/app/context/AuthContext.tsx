import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { getRedirectUrl, authLog } from '../utils/env';
import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  jobTitle: string;
  isProfilePublic: boolean;
  showWorkInfo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasSeenWelcome: boolean;
  pendingVerification: boolean;
  signup: (email: string, password: string, confirmPassword: string, name: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  markWelcomeSeen: () => void;
  clearPendingVerification: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'company' | 'jobTitle' | 'isProfilePublic' | 'showWorkInfo'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function sessionToUser(session: Session): User {
  const u = session.user;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email || '',
    name: meta.name || meta.full_name || '',
    company: '',
    jobTitle: '',
    isProfilePublic: true,
    showWorkInfo: true,
    createdAt: u.created_at || '',
    updatedAt: u.updated_at || '',
  };
}

/** Fetch full user profile from `users` table */
async function fetchUserProfile(userId: string): Promise<Partial<User>> {
  const { data, error } = await supabase
    .from('users')
    .select('name, company, job_title, is_profile_public, show_work_info')
    .eq('id', userId)
    .single();

  if (error || !data) return {};
  return {
    name: data.name || '',
    company: data.company || '',
    jobTitle: data.job_title || '',
    isProfilePublic: data.is_profile_public ?? true,
    showWorkInfo: data.show_work_info ?? true,
  };
}

/** Upsert user profile in the `users` table directly via Supabase. */
async function syncUserProfile(session: Session): Promise<Partial<User>> {
  const meta = session.user.user_metadata || {};
  const { error } = await supabase.from('users').upsert(
    {
      id: session.user.id,
      email: session.user.email,
      name: meta.name || meta.full_name || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: false },
  );
  if (error) {
    console.error('User profile sync error:', error.message);
  } else {
    authLog('User profile synced', session.user.id);
  }
  // Fetch full profile (including company, job_title etc.)
  return fetchUserProfile(session.user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  useEffect(() => {
    const savedWelcome = localStorage.getItem('seen_welcome') === 'true';
    const savedPending = localStorage.getItem('pending_verification_email');
    setHasSeenWelcome(savedWelcome);
    if (savedPending) setPendingVerification(true);

    authLog('Environment', {
      origin: window.location.origin,
      base: import.meta.env.BASE_URL,
      redirectHome: getRedirectUrl(),
    });

    // Get initial session (also exchanges PKCE code if present in URL)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      authLog('Initial session', session ? 'found' : 'none');
      if (session) {
        const baseUser = sessionToUser(session);
        const profile = await fetchUserProfile(session.user.id);
        setUser({ ...baseUser, ...profile });
        setToken(session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLog('Auth event', event);
        if (session) {
          const baseUser = sessionToUser(session);
          setToken(session.access_token);

          // Email confirmed — clear pending verification
          if (event === 'SIGNED_IN' && localStorage.getItem('pending_verification_email')) {
            localStorage.removeItem('pending_verification_email');
            setPendingVerification(false);
          }

          // Sync user profile to `users` table on sign-in
          if (event === 'SIGNED_IN') {
            const profile = await syncUserProfile(session);
            setUser({ ...baseUser, ...profile });
          } else {
            const profile = await fetchUserProfile(session.user.id);
            setUser({ ...baseUser, ...profile });
          }
        } else {
          setUser(null);
          setToken(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (email: string, password: string, confirmPassword: string, name: string) => {
    if (password !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    authLog('Signup redirect URL', getRedirectUrl());

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: getRedirectUrl(),
      },
    });

    if (error) throw new Error(error.message);

    // Supabase returns a user with empty identities when the email already exists
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('Un compte avec cet email existe déjà. Essayez de vous connecter.');
    }

    if (!data.session) {
      // Email confirmation required
      localStorage.setItem('pending_verification_email', email);
      setPendingVerification(true);
      return;
    }

    // Sync profile directly via Supabase
    const profile = await syncUserProfile(data.session);

    setUser({ ...sessionToUser(data.session), ...profile });
    setToken(data.session.access_token);
    localStorage.setItem('seen_welcome', 'true');
  };

  const signin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Échec de la connexion');

    // Sync profile directly via Supabase
    const profile = await syncUserProfile(data.session);

    setUser({ ...sessionToUser(data.session), ...profile });
    setToken(data.session.access_token);
    localStorage.setItem('seen_welcome', 'true');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  const forgotPassword = async (email: string): Promise<void> => {
    const redirectTo = getRedirectUrl('reset-password');
    authLog('Password reset redirect URL', redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw new Error(error.message);
  };

  const resetPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  };

  const markWelcomeSeen = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('seen_welcome', 'true');
  };

  const clearPendingVerification = () => {
    localStorage.removeItem('pending_verification_email');
    setPendingVerification(false);
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'company' | 'jobTitle' | 'isProfilePublic' | 'showWorkInfo'>>) => {
    if (!user) throw new Error('Non connecté');

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
    if (updates.isProfilePublic !== undefined) dbUpdates.is_profile_public = updates.isProfilePublic;
    if (updates.showWorkInfo !== undefined) dbUpdates.show_work_info = updates.showWorkInfo;

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) throw new Error(error.message);

    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        hasSeenWelcome,
        pendingVerification,
        signup,
        signin,
        logout,
        forgotPassword,
        resetPassword,
        markWelcomeSeen,
        clearPendingVerification,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
