import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export type AccountType = 'individual' | 'merchant';

export interface MerchantSignupFields {
  storeName?: string;
  storeLocation?: string;
  storeLogoUrl?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  accountType?: AccountType;
  storeName?: string;
  storeLogoUrl?: string;
  storeLocation?: string;
  isVerified?: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasSeenWelcome: boolean;
  pendingVerification: boolean;
  signup: (
    email: string,
    password: string,
    confirmPassword: string,
    name: string,
    accountType?: AccountType,
    merchant?: MerchantSignupFields,
  ) => Promise<void>;
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
  const accountType: AccountType =
    meta.account_type === 'merchant' ? 'merchant' : 'individual';
  return {
    id: u.id,
    email: u.email || '',
    name: meta.name || meta.full_name || '',
    createdAt: u.created_at || '',
    updatedAt: u.updated_at || '',
    accountType,
    storeName: meta.store_name || undefined,
    storeLogoUrl: meta.store_logo_url || undefined,
    storeLocation: meta.store_location || undefined,
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
              // Recover any pending merchant profile saved at signup time
              // (in case email verification was required).
              let pendingProfile:
                | { accountType?: AccountType; merchant?: MerchantSignupFields | null }
                | null = null;
              try {
                const raw = localStorage.getItem('pending_signup_profile');
                if (raw) pendingProfile = JSON.parse(raw);
              } catch {}

              const accountType: AccountType =
                pendingProfile?.accountType ||
                (meta.account_type === 'merchant' ? 'merchant' : 'individual');
              const m = pendingProfile?.merchant || undefined;

              const { data: existing } = await supabase
                .from('users')
                .select('id, account_type')
                .eq('id', session.user.id)
                .single();

              if (!existing) {
                const row: Record<string, unknown> = {
                  id: session.user.id,
                  email: session.user.email || '',
                  password: '',
                  name: meta.name || meta.full_name || '',
                  account_type: accountType,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                if (accountType === 'merchant') {
                  if (m?.storeName || meta.store_name) row.store_name = (m?.storeName || meta.store_name || '').toString().trim();
                  if (m?.storeLocation || meta.store_location) row.store_location = (m?.storeLocation || meta.store_location || '').toString().trim();
                  if (m?.storeLogoUrl || meta.store_logo_url) row.store_logo_url = (m?.storeLogoUrl || meta.store_logo_url || '').toString().trim();
                }
                await supabase.from('users').insert(row);
              } else if (pendingProfile && accountType === 'merchant') {
                // Existing row but we just collected merchant data — patch it.
                const patch: Record<string, unknown> = {
                  account_type: 'merchant',
                  updated_at: new Date().toISOString(),
                };
                if (m?.storeName) patch.store_name = m.storeName.trim();
                if (m?.storeLocation) patch.store_location = m.storeLocation.trim();
                if (m?.storeLogoUrl) patch.store_logo_url = m.storeLogoUrl.trim();
                await supabase.from('users').update(patch).eq('id', session.user.id);
              }

              // Clear the one-shot pending profile.
              if (pendingProfile) localStorage.removeItem('pending_signup_profile');
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

  const signup = async (
    email: string,
    password: string,
    confirmPassword: string,
    name: string,
    accountType: AccountType = 'individual',
    merchant?: MerchantSignupFields,
  ) => {
    if (password !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }
    if (accountType === 'merchant') {
      if (!merchant?.storeName?.trim()) {
        throw new Error('Le nom du magasin est requis');
      }
    }

    const metadata: Record<string, unknown> = {
      name,
      account_type: accountType,
    };
    if (accountType === 'merchant' && merchant) {
      if (merchant.storeName) metadata.store_name = merchant.storeName.trim();
      if (merchant.storeLocation) metadata.store_location = merchant.storeLocation.trim();
      if (merchant.storeLogoUrl) metadata.store_logo_url = merchant.storeLogoUrl.trim();
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
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
      // Email confirmation required — save pending state.
      // Persist intended profile so we can write it to the users table after
      // the user confirms their email and signs in for the first time.
      localStorage.setItem('pending_verification_email', email);
      try {
        localStorage.setItem(
          'pending_signup_profile',
          JSON.stringify({ accountType, merchant: merchant || null }),
        );
      } catch {}
      setPendingVerification(true);
      return;
    }

    // Ensure user row exists in users table
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('id', data.session.user.id).single();
      const baseRow: Record<string, unknown> = {
        id: data.session.user.id,
        email: data.session.user.email || '',
        password: '',
        name,
        account_type: accountType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (accountType === 'merchant' && merchant) {
        if (merchant.storeName) baseRow.store_name = merchant.storeName.trim();
        if (merchant.storeLocation) baseRow.store_location = merchant.storeLocation.trim();
        if (merchant.storeLogoUrl) baseRow.store_logo_url = merchant.storeLogoUrl.trim();
      }
      if (!existing) {
        await supabase.from('users').insert(baseRow);
      } else {
        // Row already there (race) — patch the type-related fields.
        const patch: Record<string, unknown> = {
          account_type: accountType,
          updated_at: new Date().toISOString(),
        };
        if (accountType === 'merchant' && merchant) {
          if (merchant.storeName) patch.store_name = merchant.storeName.trim();
          if (merchant.storeLocation) patch.store_location = merchant.storeLocation.trim();
          if (merchant.storeLogoUrl) patch.store_logo_url = merchant.storeLogoUrl.trim();
        }
        await supabase.from('users').update(patch).eq('id', data.session.user.id);
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
      'https://rylxeslhdpyewtfexzll.supabase.co/functions/v1/delete-account',
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
