import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { ArrowLeft, Eye, EyeOff, User, Mail, Lock, AlertCircle, Store, MapPin } from 'lucide-react';
import { useAuth, AccountType } from '../context/AuthContext';
import { toast } from 'sonner';

export function SignUpScreen() {
  const navigate = useNavigate();
  const { signup, pendingVerification, isAuthenticated } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeLocation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      toast.error(accountType === 'merchant' ? 'Le nom du gérant est requis' : 'Le nom est requis');
      return;
    }

    if (accountType === 'merchant' && !formData.storeName.trim()) {
      toast.error('Le nom du magasin est requis');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);
      await signup(
        formData.email,
        formData.password,
        formData.confirmPassword,
        formData.name,
        accountType,
        accountType === 'merchant'
          ? {
              storeName: formData.storeName,
              storeLocation: formData.storeLocation,
            }
          : undefined,
      );
    } catch (err: any) {
      toast.error(err.message || 'Échec de la création du compte');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  // Redirect after state updates
  if (pendingVerification) {
    navigate('/verify-email', { replace: true });
    return null;
  }
  if (isAuthenticated) {
    navigate('/', { replace: true });
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
            <h1 className="text-xl font-semibold text-gray-900">Create Account</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-5 md:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Troqly</h2>
            <p className="text-gray-500">Create your account to get started</p>
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
            {/* Account type toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de compte
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    accountType === 'individual'
                      ? 'bg-white text-[#1FA774] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <User size={16} />
                  Particulier
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('merchant')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    accountType === 'merchant'
                      ? 'bg-white text-[#1FA774] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Store size={16} />
                  Magasin
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {accountType === 'merchant'
                  ? 'Créez une vitrine pour votre boutique et publiez vos offres.'
                  : 'Compte personnel pour profiter et partager des deals.'}
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {accountType === 'merchant' ? 'Nom du gérant' : 'Full Name'}
              </label>
              <div className="relative">
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Merchant-only fields */}
            {accountType === 'merchant' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du magasin
                  </label>
                  <div className="relative">
                    <Store size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => handleChange('storeName', e.target.value)}
                      placeholder="Zara Bruxelles"
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localisation
                  </label>
                  <div className="relative">
                    <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.storeLocation}
                      onChange={(e) => handleChange('storeLocation', e.target.value)}
                      placeholder="Centre-ville, Bruxelles"
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Optionnel — modifiable plus tard</p>
                </div>
              </>
            )}

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                  required
                  minLength={6}
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
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent disabled:bg-gray-100"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{' '}
              <button type="button" className="text-[#1FA774] font-medium">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-[#1FA774] font-medium">
                Privacy Policy
              </button>
            </p>

            {/* Submit Button */}
            <div className="pt-2">
              <Button 
                type="submit"
                disabled={loading}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>

            {/* Sign In Link */}
            <p className="text-center text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="text-[#1FA774] font-semibold hover:underline disabled:opacity-50"
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
