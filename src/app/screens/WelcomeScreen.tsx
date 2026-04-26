import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Repeat, MapPin, Star } from 'lucide-react';
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

  const features = [
    {
      icon: Repeat,
      iconBg: 'bg-indigo-500/90',
      title: 'Troc entre employés',
      description: "Échange ta réduc Zara contre une réduc McDonald's et plus encore",
    },
    {
      icon: MapPin,
      iconBg: 'bg-rose-500/90',
      title: 'En magasin, près de toi',
      description: 'Les échanges se font physiquement dans ton quartier',
    },
    {
      icon: Star,
      iconBg: 'bg-amber-400/95',
      title: 'Communauté fiable',
      description: 'Profils notés et échanges confirmés mutuellement',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1FA774] to-[#16865c] flex flex-col overflow-y-auto relative">
      {/* Subtle pattern overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(45deg, rgba(255,255,255,0.4) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.4) 25%, transparent 25%)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Skip (top right) */}
      <button
        onClick={() => {
          markWelcomeSeen();
          navigate('/');
        }}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-10 px-4 py-2 rounded-full text-sm font-semibold text-white/90 hover:text-white hover:bg-white/15 transition-colors"
      >
        Passer
      </button>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight">Hyvis</h1>
          <p className="text-xl md:text-2xl text-white font-semibold leading-snug max-w-md mx-auto">
            Troque ta réduction employeur
            <br />
            contre une autre, près de chez toi
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-8 w-full max-w-md"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-4 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20"
              >
                <div
                  className={`w-12 h-12 ${feature.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}
                >
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg leading-tight mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/85 leading-snug">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative px-6 pb-8"
      >
        <div className="w-full max-w-md mx-auto space-y-3">
          <Button
            onClick={() => {
              markWelcomeSeen();
              navigate('/signup');
            }}
            className="bg-white !text-[#1FA774] hover:bg-gray-100"
          >
            Créer un compte
          </Button>
          <button
            onClick={() => {
              markWelcomeSeen();
              navigate('/signin');
            }}
            className="w-full py-4 rounded-full font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
          >
            Se connecter
          </button>
          <button
            onClick={() => {
              markWelcomeSeen();
              navigate('/');
            }}
            className="w-full py-3 rounded-full font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm flex items-center justify-center gap-2"
          >
            Continuer en invité
          </button>
        </div>
      </motion.div>
    </div>
  );
}
