import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '../components/Button';
import { ArrowLeft, Mail, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      toast.error(t('auth.email_required'));
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email);
      setEmailSent(true);
      toast.success(t('auth.forgot_sent'));
    } catch (err: any) {
      toast.error(err.message || t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/signin')} className="p-1">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{t('auth.forgot_title')}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-5 md:px-8 py-8">
        {emailSent ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Check size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.forgot_email_sent_title')}</h2>
              <p className="text-gray-500">
                <Trans
                  i18nKey="auth.forgot_email_sent_subtitle"
                  values={{ email }}
                  components={{ strong: <strong /> }}
                />
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                {t('auth.forgot_check_spam')}
              </p>
            </div>

            <Button
              onClick={() => navigate('/signin')}
              className="bg-[#1FA774] text-white hover:bg-[#168659]"
            >
              {t('auth.verify_back_to_signin')}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1FA774] to-[#16865c] rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">
                🔑
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.forgot_title')}</h2>
              <p className="text-gray-500">
                {t('auth.forgot_subtitle')}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-gap-2"
              >
                <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email_label')}
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder={t('auth.email_placeholder')}
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('auth.sending') : t('auth.forgot_send')}
                </Button>
              </div>

              {/* Back to Sign In */}
              <p className="text-center text-gray-600">
                {t('auth.forgot_remember')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signin')}
                  className="text-[#1FA774] font-semibold hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  {t('auth.sign_in_link')}
                </button>
              </p>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
