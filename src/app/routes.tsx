import { createBrowserRouter, Navigate } from 'react-router';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { SignInScreen } from './screens/SignInScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { EmailVerificationScreen } from './screens/EmailVerificationScreen';
import { EmailConfirmedScreen } from './screens/EmailConfirmedScreen';
import { Home } from './screens/Home';
import { SearchScreen } from './screens/SearchScreen';
import { AddOfferScreen } from './screens/AddOfferScreen';
import { EditOfferScreen } from './screens/EditOfferScreen';
import { OfferDetailScreen } from './screens/OfferDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ChatListScreen } from './screens/ChatListScreen';
import { ChatScreen } from './screens/ChatScreen';
import { PublicProfileScreen } from './screens/PublicProfileScreen';
import { AuthRoute, ProtectedRoute, WelcomeGate, VerificationGate } from './context/ProtectedRoute';
import { getRouterBasename } from './utils/env';

export const router = createBrowserRouter([
  {
    path: '/welcome',
    Component: () => <AuthRoute><WelcomeScreen /></AuthRoute>,
  },
  {
    path: '/signup',
    Component: () => <AuthRoute><SignUpScreen /></AuthRoute>,
  },
  {
    path: '/signin',
    Component: () => <AuthRoute><SignInScreen /></AuthRoute>,
  },
  {
    path: '/forgot-password',
    Component: () => <AuthRoute><ForgotPasswordScreen /></AuthRoute>,
  },
  {
    path: '/verify-email',
    Component: () => <VerificationGate><EmailVerificationScreen /></VerificationGate>,
  },
  {
    path: '/reset-password',
    Component: () => <ResetPasswordScreen />,
  },
  {
    path: '/email-confirmed',
    Component: () => <EmailConfirmedScreen />,
  },
  {
    path: '/',
    Component: () => <WelcomeGate><Home /></WelcomeGate>,
  },
  {
    path: '/search',
    Component: () => <WelcomeGate><SearchScreen /></WelcomeGate>,
  },
  {
    path: '/add-offer',
    Component: () => <ProtectedRoute requireAuth><AddOfferScreen /></ProtectedRoute>,
  },
  {
    path: '/edit-offer/:id',
    Component: () => <ProtectedRoute requireAuth><EditOfferScreen /></ProtectedRoute>,
  },
  {
    path: '/offer/:id',
    Component: () => <WelcomeGate><OfferDetailScreen /></WelcomeGate>,
  },
  {
    path: '/profile',
    Component: () => <ProtectedRoute requireAuth><ProfileScreen /></ProtectedRoute>,
  },
  {
    path: '/profile/:userId',
    Component: () => <WelcomeGate><PublicProfileScreen /></WelcomeGate>,
  },
  {
    path: '/messages',
    Component: () => <WelcomeGate><ChatListScreen /></WelcomeGate>,
  },
  {
    path: '/chat/:id',
    Component: () => <ProtectedRoute requireAuth><ChatScreen /></ProtectedRoute>,
  },
  {
    path: '*',
    Component: () => <Navigate to="/" replace />,
  },
], {
  basename: getRouterBasename(),
});
