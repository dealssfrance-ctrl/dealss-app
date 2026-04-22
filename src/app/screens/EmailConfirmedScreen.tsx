import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/Button';

export function EmailConfirmedScreen() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/signin', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center max-w-md"
      >
        {/* Big green check */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 250 }}
          className="w-24 h-24 bg-gradient-to-br from-[#1FA774] to-[#16865c] rounded-full mx-auto mb-8 flex items-center justify-center"
        >
          <CheckCircle size={56} className="text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Compte vérifié !
        </h1>
        <p className="text-gray-500 text-lg mb-8">
          Votre adresse email a été confirmée avec succès.
          <br />
          Vous pouvez maintenant vous connecter.
        </p>

        <Button onClick={() => navigate('/signin', { replace: true })}>
          Se connecter maintenant
        </Button>

        <p className="text-sm text-gray-400 mt-6">
          Redirection automatique dans {countdown}s…
        </p>
      </motion.div>
    </div>
  );
}
