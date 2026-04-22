import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import { useEffect } from 'react';

function HashErrorHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=') && hash.includes('error_code=')) {
      // Supabase redirected with an auth error — preserve the hash and send to verify-email
      const pending = localStorage.getItem('pending_verification_email');
      if (pending) {
        window.location.replace(`/verify-email${hash}`);
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