import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { TrendingUp, Users, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, markWelcomeSeen } = useAuth();

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1FA774] to-[#16865c] flex flex-col overflow-y-auto">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-bold text-white mb-4">Hyvis</h1>
          <p className="text-xl text-white/90 max-w-md">
            Share and discover exclusive employee discounts
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-5 mb-8 max-w-sm"
        >
          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <TrendingUp size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Hot Deals</h3>
              <p className="text-sm text-white/80">Up to 40% off on top brands</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Users size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Community</h3>
              <p className="text-sm text-white/80">Connect with other employees</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Shield size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Trusted</h3>
              <p className="text-sm text-white/80">Verified sellers and reviews</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-6 pb-8 space-y-3"
      >
        <Button
          onClick={() => {
            markWelcomeSeen();
            navigate('/signup');
          }}
          className="bg-white !text-[#1FA774] hover:bg-gray-100"
        >
          Create Account
        </Button>
        <button
          onClick={() => {
            markWelcomeSeen();
            navigate('/signin');
          }}
          className="w-full py-4 rounded-full font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => {
            markWelcomeSeen();
            navigate('/');
          }}
          className="w-full py-4 rounded-full font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          Continue as Guest
        </button>
      </motion.div>
    </div>
  );
}
