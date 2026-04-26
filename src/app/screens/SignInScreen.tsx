import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function SignInScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { signin, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await signin(formData.email, formData.password);
      toast.success('Connexion réussie !');
      // Navigation is handled by the isAuthenticated render check below
    } catch (err: any) {
      const message = err.message || 'Échec de la connexion';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Redirect once React has applied the auth state update (same pattern as SignUpScreen)
  if (isAuthenticated) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/welcome')} className="p-1">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Sign In</h1>
          </div>
        </div>
      </div>

      {/* Conten */}
      <div className="max-w-md mx-auto px-5 md:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1FA774] to-[#16865c] rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">
              🎁
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Sign in to continue to Troqly</p>
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
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-[#1FA774] font-medium hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit"
                disabled={loading}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-[#1FA774] font-semibold hover:underline disabled:opacity-50"
                disabled={loading}
              >
                Sign Up
              </button>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
