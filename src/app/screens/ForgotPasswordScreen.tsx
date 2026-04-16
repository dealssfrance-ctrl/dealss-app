import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { ArrowLeft, Mail, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      toast.error('L\'email est requis');
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email);
      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé !');
    } catch (err: any) {
      toast.error(err.message || 'Échec de l\'envoi de l\'email de réinitialisation');
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
            <h1 className="text-xl font-semibold text-gray-900">Mot de passe oublié</h1>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Email envoyé</h2>
              <p className="text-gray-500">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Si vous ne trouvez pas l'email, vérifiez votre dossier spam.
                Le lien expirera après un certain temps.
              </p>
            </div>

            <Button
              onClick={() => navigate('/signin')}
              className="bg-[#1FA774] text-white hover:bg-[#168659]"
            >
              Retour à la connexion
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
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Mot de passe oublié ?</h2>
              <p className="text-gray-500">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
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
                  Adresse email
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
                    placeholder="your@email.com"
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
                  {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </Button>
              </div>

              {/* Back to Sign In */}
              <p className="text-center text-gray-600">
                Vous vous souvenez de votre mot de passe ?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signin')}
                  className="text-[#1FA774] font-semibold hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  Se connecter
                </button>
              </p>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
