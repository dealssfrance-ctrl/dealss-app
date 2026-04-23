import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
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
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function sessionToUser(session: Session): User {
  const u = session.user;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email || '',
    name: meta.name || meta.full_name || '',
    createdAt: u.created_at || '',
    updatedAt: u.updated_at || '',
  };
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(sessionToUser(session));
        setToken(session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(sessionToUser(session));
          setToken(session.access_token);
          // Email confirmed — clear pending verification
          if (event === 'SIGNED_IN' && localStorage.getItem('pending_verification_email')) {
            localStorage.removeItem('pending_verification_email');
            setPendingVerification(false);
          }
          // Ensure user row exists in users table
          if (event === 'SIGNED_IN') {
            try {
              const meta = session.user.user_metadata || {};
              const { data: existing } = await supabase.from('users').select('id').eq('id', session.user.id).single();
              if (!existing) {
                await supabase.from('users').insert({
                  id: session.user.id,
                  email: session.user.email || '',
                  password: '',
                  name: meta.name || meta.full_name || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
            } catch (err) {
              console.error('Auto sync-profile error:', err);
            }
          }
        } else {
          setUser(null);
          setToken(null);
        }
      }
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) throw new Error(error.message);

    // Supabase returns a user with empty identities when the email already exists
    // (unconfirmed or confirmed) — detect this to give proper feedback
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('Un compte avec cet email existe déjà. Essayez de vous connecter.');
    }

    if (!data.session) {
      // Email confirmation required — save pending state
      localStorage.setItem('pending_verification_email', email);
      setPendingVerification(true);
      return;
    }

    // Ensure user row exists in users table
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('id', data.session.user.id).single();
      if (!existing) {
        await supabase.from('users').insert({
          id: data.session.user.id,
          email: data.session.user.email || '',
          password: '',
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Profile sync error:', err);
    }

    setUser(sessionToUser(data.session));
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

    // Sync profile (ensures user row exists even after email confirmation)
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('id', data.session.user.id).single();
      if (!existing) {
        await supabase.from('users').insert({
          id: data.session.user.id,
          email: data.session.user.email || '',
          password: '',
          name: data.session.user.user_metadata?.name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Profile sync error:', err);
    }

    setUser(sessionToUser(data.session));
    setToken(data.session.access_token);
    setHasSeenWelcome(true);
    localStorage.setItem('seen_welcome', 'true');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  const forgotPassword = async (email: string): Promise<void> => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw new Error(error.message);
  };

  const resetPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  };

  const deleteAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const response = await fetch(
      'https://zkexqsaogphjbwkjtopq.supabase.co/functions/v1/delete-account',
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to delete account');
    }
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    localStorage.removeItem('seen_welcome');
    localStorage.removeItem('pending_verification_email');
  };

  const markWelcomeSeen = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('seen_welcome', 'true');
  };

  const clearPendingVerification = () => {
    localStorage.removeItem('pending_verification_email');
    setPendingVerification(false);
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
        deleteAccount,
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
