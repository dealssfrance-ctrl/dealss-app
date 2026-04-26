import { createBrowserRouter, Navigate } from 'react-router';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { SignInScreen } from './screens/SignInScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { EmailVerificationScreen } from './screens/EmailVerificationScreen';
import { Home } from './screens/Home';
import { SearchScreen } from './screens/SearchScreen';
import { AddOfferScreen } from './screens/AddOfferScreen';
import { EditOfferScreen } from './screens/EditOfferScreen';
import { OfferDetailScreen } from './screens/OfferDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PublicProfileScreen } from './screens/PublicProfileScreen';
import { ChatListScreen } from './screens/ChatListScreen';
import { ChatScreen } from './screens/ChatScreen';
import { AuthRoute, ProtectedRoute, VerificationGate } from './context/ProtectedRoute';

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
    path: '/',
    Component: Home,
  },
  {
    path: '/search',
    Component: SearchScreen,
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
    Component: OfferDetailScreen,
  },
  {
    path: '/profile',
    Component: () => <ProtectedRoute requireAuth><ProfileScreen /></ProtectedRoute>,
  },
  {
    path: '/user/:userId',
    Component: PublicProfileScreen,
  },
  {
    path: '/messages',
    Component: ChatListScreen,
  },
  {
    path: '/chat/:id',
    Component: () => <ProtectedRoute requireAuth><ChatScreen /></ProtectedRoute>,
  },
  {
    path: '*',
    Component: () => <Navigate to="/" replace />,
  },
]);
