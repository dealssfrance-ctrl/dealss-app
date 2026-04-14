import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { Toaster, toast } from 'sonner';
import { useEffect } from 'react';
import { getRouterBasename, authLog } from './utils/env';
import { supabase } from './services/supabaseClient';

/**
 * Handle Supabase auth callbacks:
 * - PKCE `?code=xxx` from email verification / password reset
 * - Hash `#error=xxx` from failed auth redirects
 */
function AuthCallbackHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const hash = window.location.hash;

    // Handle PKCE code exchange (email verification / password reset redirect)
    if (code) {
      authLog('PKCE code detected in URL, attempting exchange…');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        // Clean the code from URL regardless of outcome
        url.searchParams.delete('code');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);

        if (error) {
          authLog('PKCE exchange failed', error.message);
          // Verifier missing (different browser) or code expired
          // The email IS verified server-side even if the exchange fails
          localStorage.removeItem('pending_verification_email');
          toast.success(
            'Email vérifié avec succès ! Connectez-vous avec vos identifiants.',
            { duration: 6000 },
          );
          // Redirect to sign-in
          const base = getRouterBasename();
          const signinPath = `${base === '/' ? '' : base}/signin`;
          window.location.replace(signinPath);
        } else if (data.session) {
          authLog('PKCE exchange succeeded, session created');
          localStorage.removeItem('pending_verification_email');
          toast.success('Compte vérifié ! Bienvenue 🎉', { duration: 4000 });
        }
      });
      return; // Don't process hash errors if we have a code
    }

    // Handle hash errors (e.g. otp_expired)
    if (hash.includes('error=') && hash.includes('error_code=')) {
      authLog('Auth error in URL hash', hash);
      const pending = localStorage.getItem('pending_verification_email');
      if (pending) {
        const base = getRouterBasename();
        const target = `${base === '/' ? '' : base}/verify-email${hash}`;
        window.location.replace(target);
      }
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AuthCallbackHandler />
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}