import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { getRouterBasename, authLog } from './utils/env';

function HashErrorHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=') && hash.includes('error_code=')) {
      authLog('Auth error in URL hash', hash);
      // Supabase redirected with an auth error — preserve the hash and send to verify-email
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
        <HashErrorHandler />
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}