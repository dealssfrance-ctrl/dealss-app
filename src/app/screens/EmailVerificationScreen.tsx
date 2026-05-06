import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '../components/Button';
import { Mail, RefreshCw, LogOut, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function EmailVerificationScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { clearPendingVerification, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [urlError, setUrlError] = useState<string | null>(null);

  const pendingEmail = localStorage.getItem('pending_verification_email') || '';

  // Parse URL hash errors (e.g. otp_expired from Supabase redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description')?.replace(/\+/g, ' ');

      if (errorCode === 'otp_expired') {
        setUrlError(t('auth.verify_link_expired_desc'));
      } else if (errorDescription) {
        setUrlError(errorDescription);
      }

      // Clean the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Listen for successful email confirmation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Email confirmed — clear pending state and go home
          clearPendingVerification();
          navigate('/', { replace: true });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [clearPendingVerification, navigate]);

  // Auto-check session on mount (user may have confirmed and been redirected back)
  useEffect(() => {
    const autoCheck = async () => {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          clearPendingVerification();
          navigate('/', { replace: true });
        }
      }
    };
    autoCheck();
  }, []);

  // Poll backend every 5s to check if email was verified (works across browsers)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!pendingEmail) return;

    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/check-verification?email=${encodeURIComponent(pendingEmail)}`);
        const data = await res.json();
        if (data.verified) {
          clearPendingVerification();
          toast.success(t('auth.verify_email_verified_login'));
          navigate('/signin', { replace: true });
        }
      } catch {
        // silent — will retry on next interval
      }
    };

    // Check immediately
    checkBackend();
    // Then every 5 seconds
    pollingRef.current = setInterval(checkBackend, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pendingEmail, clearPendingVerification, navigate]);

  const checkSession = async () => {
    try {
      setChecking(true);
      // First try refreshing the existing session (works if confirmed in same browser)
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          clearPendingVerification();
          toast.success(t('auth.verify_email_verified_welcome'));
          navigate('/', { replace: true });
          return;
        }
      }
      // Fallback: check via backend (cross-browser)
      const res = await fetch(`${API_URL}/auth/check-verification?email=${encodeURIComponent(pendingEmail)}`);
      const data = await res.json();
      if (data.verified) {
        clearPendingVerification();
        toast.success(t('auth.verify_email_verified_login'));
        navigate('/signin', { replace: true });
        return;
      }
      toast.error(t('auth.verify_not_yet'));
    } catch {
      toast.error(t('common.error_generic'));
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || cooldown > 0) return;

    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success(t('auth.verify_resent'));
      setCooldown(60);
      setUrlError(null);
    } catch (err: any) {
      toast.error(err.message || t('common.error_generic'));
    } finally {
      setResending(false);
    }
  };

  const handleCancel = () => {
    clearPendingVerification();
    logout();
    navigate('/signin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          {/* Mail Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-[#1FA774] to-[#16865c] rounded-full mx-auto mb-8 flex items-center justify-center"
          >
            <Mail size={48} className="text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {t('auth.verify_title')}
          </h1>
          <p className="text-gray-500 mb-2">
            {t('auth.verify_email_sent_to')}
          </p>
          <p className="text-[#1FA774] font-semibold text-lg mb-6">
            {pendingEmail}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 text-left">
            <p className="text-sm text-gray-600 leading-relaxed">
              <Trans i18nKey="auth.verify_click_link" components={{ strong: <strong /> }} />
            </p>
          </div>

          {/* URL Error Banner */}
          {urlError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3"
            >
              <AlertTriangle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-orange-800">{t('auth.verify_link_expired')}</p>
                <p className="text-sm text-orange-600 mt-1">{urlError}</p>
              </div>
            </motion.div>
          )}

          {/* Resend Button */}
          <Button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={18} className={resending ? 'animate-spin' : ''} />
              {cooldown > 0
                ? t('auth.verify_resend_in', { count: cooldown })
                : resending
                  ? t('auth.sending')
                  : t('auth.verify_resend_action')
              }
            </span>
          </Button>

          {/* Already verified Button */}
          <Button
            onClick={checkSession}
            disabled={checking}
            className="mb-4 !bg-white !text-[#1FA774] border border-[#1FA774] hover:!bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <CheckCircle size={18} className={checking ? 'animate-pulse' : ''} />
              {checking ? t('auth.verify_checking') : t('auth.verify_already_verified_action')}
            </span>
          </Button>

          {/* Cancel / Use different account */}
          <button
            onClick={handleCancel}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut size={16} />
            {t('auth.verify_use_another')}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
