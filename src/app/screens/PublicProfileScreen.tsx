import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { OfferCard } from '../components/OfferCard';
import { offersService, Offer } from '../services/offersService';
import { supabase } from '../services/supabaseClient';
import { motion } from 'motion/react';
import { ArrowLeft, Package, Briefcase, EyeOff } from 'lucide-react';
import { ProfileOffersSkeleton } from '../components/Skeleton';

interface PublicUser {
  id: string;
  name: string;
  company: string;
  jobTitle: string;
  isProfilePublic: boolean;
  showWorkInfo: boolean;
  createdAt: string;
}

export function PublicProfileScreen() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Fetch user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, company, job_title, is_profile_public, show_work_info, created_at')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        navigate('/', { replace: true });
        return;
      }

      // If profile is hidden, redirect away
      if (userData.is_profile_public === false) {
        navigate('/', { replace: true });
        return;
      }

      setUser({
        id: userData.id,
        name: userData.name,
        company: userData.company || '',
        jobTitle: userData.job_title || '',
        isProfilePublic: userData.is_profile_public ?? true,
        showWorkInfo: userData.show_work_info ?? true,
        createdAt: userData.created_at,
      });

      // Fetch user's active offers
      const response = await offersService.getMyOffers(userId!);
      setOffers(response.data.filter(o => o.status === 'active'));
    } catch {
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6 flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-gray-600">
                <ArrowLeft size={22} />
              </button>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6">
            <ProfileOffersSkeleton count={3} />
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const userInitial = user.name.charAt(0).toUpperCase();
  const joinDate = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Profil</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6 md:py-8">
          {/* User Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 md:p-8 shadow-sm mb-6"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1FA774] flex items-center justify-center">
                <span className="text-white text-2xl md:text-3xl font-bold">{userInitial}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
                {user.showWorkInfo && (user.jobTitle || user.company) && (
                  <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                    <Briefcase size={14} />
                    {user.jobTitle}{user.jobTitle && user.company ? ' à ' : ''}{user.company}
                  </p>
                )}
                <p className="text-gray-400 text-sm">Membre depuis {joinDate}</p>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                  <Package size={14} />
                  {offers.length} offre{offers.length !== 1 ? 's' : ''} active{offers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Offers Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Offres</h3>
            {offers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <p className="text-gray-400">Aucune offre active</p>
              </div>
            ) : (
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {offers.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <OfferCard offer={offer} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
