import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Mail, RefreshCw, LogOut, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { getRedirectUrl } from '../utils/env';
import { toast } from 'sonner';

export function EmailVerificationScreen() {
  const navigate = useNavigate();
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
        setUrlError('Le lien de vérification a expiré. Veuillez en demander un nouveau.');
      } else if (errorDescription) {
        setUrlError(errorDescription);
      }

      // Clean the hash from URL
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Listen for successful email confirmation (same-browser flow)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearPendingVerification();
          navigate('/', { replace: true });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [clearPendingVerification, navigate]);

  // Auto-check session on mount (user may have confirmed in same browser)
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

  const checkSession = async () => {
    try {
      setChecking(true);
      // Try refreshing the existing session
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          clearPendingVerification();
          toast.success('Email vérifié ! Bienvenue 🎉');
          navigate('/', { replace: true });
          return;
        }
      }
      toast.error('Email pas encore vérifié. Vérifiez votre boîte mail.');
    } catch {
      toast.error('Erreur lors de la vérification');
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
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) throw error;

      toast.success('Email de vérification renvoyé !');
      setCooldown(60);
      setUrlError(null);
    } catch (err: any) {
      toast.error(err.message || 'Échec de l\'envoi');
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
            Vérifiez votre email
          </h1>
          <p className="text-gray-500 mb-2">
            Un email de confirmation a été envoyé à
          </p>
          <p className="text-[#1FA774] font-semibold text-lg mb-6">
            {pendingEmail}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 text-left">
            <p className="text-sm text-gray-600 leading-relaxed">
              Cliquez sur le lien dans l'email pour activer votre compte.
              Si vous ne trouvez pas l'email, vérifiez votre dossier <strong>spam</strong>.
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
                <p className="text-sm font-medium text-orange-800">Lien expiré</p>
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
                ? `Renvoyer dans ${cooldown}s`
                : resending
                  ? 'Envoi...'
                  : 'Renvoyer l\'email de vérification'
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
              {checking ? 'Vérification...' : 'J\'ai déjà vérifié → Se connecter'}
            </span>
          </Button>

          {/* Cancel / Use different account */}
          <button
            onClick={handleCancel}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut size={16} />
            Utiliser un autre compte
          </button>
        </motion.div>
      </div>
    </div>
  );
}
