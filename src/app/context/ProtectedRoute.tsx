import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';
import { ReactNode } from 'react';
import { FullPageSkeleton } from '../components/Skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

// Route that requires authentication
export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { isAuthenticated, loading, hasSeenWelcome, pendingVerification } = useAuth();

  if (loading) {
    return <FullPageSkeleton />;
  }

  // If there's a pending email verification, redirect to verification screen
  if (pendingVerification && !isAuthenticated) {
    return <Navigate to="/verify-email" replace />;
  }

  // If user hasn't seen welcome and is not authenticated, redirect to welcome
  if (!isAuthenticated && !hasSeenWelcome) {
    return <Navigate to="/welcome" replace />;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

// Redirect authenticated users away from auth screens (welcome, signin, signup)
export function AuthRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, pendingVerification } = useAuth();

  if (loading) {
    return <FullPageSkeleton />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If there's a pending email verification, redirect to verification screen
  if (pendingVerification) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

// Gate for the verification screen — only show if pending verification
export function VerificationGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, pendingVerification } = useAuth();

  if (loading) {
    return <FullPageSkeleton />;
  }

  // If already authenticated, go home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If no pending verification, go to signin
  if (!pendingVerification) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

// Gate for public pages: redirect to welcome if not authenticated and haven't seen welcome
export function WelcomeGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, hasSeenWelcome, pendingVerification } = useAuth();

  if (loading) {
    return <FullPageSkeleton />;
  }

  // If there's a pending email verification, redirect to verification screen
  if (pendingVerification && !isAuthenticated) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!isAuthenticated && !hasSeenWelcome) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}
