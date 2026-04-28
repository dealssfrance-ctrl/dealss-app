import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { OfferCard } from '../components/OfferCard';
import { offersService, Offer } from '../services/offersService';
import { reviewsService } from '../services/reviewsService';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { motion } from 'motion/react';
import { ArrowLeft, Package, Briefcase, EyeOff, Star, Store, MapPin, BadgeCheck, MessageCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { ProfileOffersSkeleton } from '../components/Skeleton';
import { Logo } from '../components/Logo';
import { PresenceIndicator } from '../components/PresenceIndicator';
import { useUserPresence } from '../hooks/useUserPresence';
import { getCategoryLabel } from '../utils/categories';
import { toast } from 'sonner';

interface PublicUser {
  id: string;
  name: string;
  company: string;
  jobTitle: string;
  isProfilePublic: boolean;
  showWorkInfo: boolean;
  createdAt: string;
  accountType: 'individual' | 'merchant';
  storeName: string;
  storeLocation: string;
  storeLogoUrl: string;
  isVerified: boolean;
}

export function PublicProfileScreen() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [rating, setRating] = useState<{ averageRating: number; reviewCount: number }>({ averageRating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Fetch user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, company, job_title, is_profile_public, show_work_info, created_at, account_type, store_name, store_location, store_logo_url, is_verified')
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
        accountType: (userData as any).account_type === 'merchant' ? 'merchant' : 'individual',
        storeName: (userData as any).store_name || '',
        storeLocation: (userData as any).store_location || '',
        storeLogoUrl: (userData as any).store_logo_url || '',
        isVerified: Boolean((userData as any).is_verified),
      });

      // Fetch user's offers (all statuses for stats) + aggregated seller rating
      const [response, sellerRating] = await Promise.all([
        offersService.getMyOffers(userId!),
        reviewsService.getSellerRating(userId!),
      ]);
      setAllOffers(response.data);
      setOffers(response.data.filter(o => o.status === 'active'));
      setRating(sellerRating);
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

  const isOwnProfile = currentUser?.id === user.id;

  const handleContactClick = async () => {
    if (!user) return;
    if (!currentUser) {
      toast.error('Connectez-vous pour envoyer un message');
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/signin?redirect=${redirect}`);
      return;
    }
    try {
      setContacting(true);
      const sibs = await chatService.findSiblingConversations(currentUser.id, user.id);
      if (sibs.length > 0) {
        navigate(`/chat/${sibs[0]}`);
        return;
      }
      const firstOffer = offers[0];
      if (!firstOffer) {
        toast.info("Cet utilisateur n'a pas d'offre active pour démarrer une conversation");
        return;
      }
      const params = new URLSearchParams({
        offerId: firstOffer.id,
        receiverId: user.id,
        storeName: firstOffer.storeName || '',
        otherName: user.accountType === 'merchant' ? (user.storeName || user.name) : user.name,
      });
      navigate(`/chat/new?${params.toString()}`);
    } catch {
      toast.error("Erreur lors de l'ouverture de la conversation");
    } finally {
      setContacting(false);
    }
  };

  const userInitial = user.name.charAt(0).toUpperCase();
  const joinDate = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  // Number of completed exchanges = offers no longer active (sold/closed).
  const completedExchanges = allOffers.filter((o) => o.status === 'inactive').length;

  // Specialty = top 1–2 categories by frequency among the user's offers.
  const specialty = (() => {
    const counts = new Map<string, number>();
    for (const o of allOffers) {
      const cat = (o.category || '').trim();
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    if (counts.size === 0) return '';
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    return sorted.map(([key]) => getCategoryLabel(key)).join(' / ');
  })();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={22} />
            </button>
            <Logo className="h-8 w-auto justify-self-center" />
            <div aria-hidden="true" className="w-[22px]" />
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
              {user.accountType === 'merchant' ? (
                user.storeLogoUrl ? (
                  <img
                    src={user.storeLogoUrl}
                    alt=""
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center">
                    <Store size={36} className="text-white" strokeWidth={1.8} />
                  </div>
                )
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1FA774] flex items-center justify-center">
                  <span className="text-white text-2xl md:text-3xl font-bold">{userInitial}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                    {user.accountType === 'merchant' ? (user.storeName || user.name) : user.name}
                  </h2>
                  {user.accountType === 'merchant' && user.isVerified && (
                    <span title="Compte vérifié" className="inline-flex items-center text-[#1FA774]">
                      <BadgeCheck size={20} />
                    </span>
                  )}
                  <PresenceDot userId={user.id} />
                </div>

                {user.accountType === 'merchant' ? (
                  user.storeLocation && (
                    <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                      <MapPin size={14} />
                      {user.storeLocation}
                    </p>
                  )
                ) : (
                  user.showWorkInfo && (user.jobTitle || user.company) && (
                    <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                      <Briefcase size={14} />
                      {user.jobTitle}{user.jobTitle && user.company ? ' à ' : ''}{user.company}
                    </p>
                  )
                )}

                <p className="text-gray-400 text-sm">Membre depuis {joinDate}</p>

                <ul className="text-sm mt-2 space-y-1">
                  <li className="text-gray-700 flex items-center gap-2">
                    <Package size={14} className="text-gray-400" />
                    <span>
                      <span className="font-semibold text-gray-900">{offers.length}</span> offre{offers.length !== 1 ? 's' : ''} active{offers.length !== 1 ? 's' : ''}
                    </span>
                  </li>
                  <li className="text-gray-700 flex items-center gap-2">
                    <Star size={14} className={rating.reviewCount > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                    {rating.reviewCount > 0 ? (
                      <span>
                        <span className="font-semibold text-gray-900">{rating.averageRating.toFixed(1)}</span>{' '}
                        <span className="text-gray-500">({rating.reviewCount} avis)</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Aucun avis</span>
                    )}
                  </li>
                  {completedExchanges > 0 && (
                    <li className="text-gray-700 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[#1FA774]" />
                      <span>
                        <span className="font-semibold text-gray-900">{completedExchanges}</span> échange{completedExchanges !== 1 ? 's' : ''} réussi{completedExchanges !== 1 ? 's' : ''}
                      </span>
                    </li>
                  )}
                  {specialty && (
                    <li className="text-gray-700 flex items-center gap-2">
                      <Sparkles size={14} className="text-gray-400" />
                      <span>
                        Spécialité&nbsp;:&nbsp;
                        <span className="font-medium text-gray-900">{specialty}</span>
                      </span>
                    </li>
                  )}
                  <PresenceListItem userId={user.id} />
                </ul>
              </div>
            </div>

            {!isOwnProfile && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleContactClick}
                  disabled={contacting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1FA774] hover:bg-[#16865c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-colors"
                >
                  <MessageCircle size={18} />
                  Contacter
                </button>
              </div>
            )}
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
                    <OfferCard offer={offer} hideContact />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile sticky CTA above bottom nav */}
        {!isOwnProfile && (
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
            <button
              onClick={handleContactClick}
              disabled={contacting}
              className="w-full flex items-center justify-center gap-2 bg-[#1FA774] text-white py-3.5 rounded-full font-bold text-[15px] shadow-md shadow-[#1FA774]/30 hover:bg-[#16865c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <MessageCircle size={20} />
              Contacter {(user.accountType === 'merchant' ? (user.storeName || user.name) : user.name).split(' ')[0]}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function PresenceDot({ userId }: { userId: string }) {
  const presence = useUserPresence(userId);
  return <PresenceIndicator presence={presence} size={11} />;
}

function PresenceListItem({ userId }: { userId: string }) {
  const presence = useUserPresence(userId);
  const color =
    presence.status === 'online'
      ? 'text-[#1FA774]'
      : presence.status === 'recent'
      ? 'text-amber-600'
      : 'text-gray-500';
  const label =
    presence.status === 'recent'
      ? 'Actif récemment'
      : presence.label || 'Hors ligne';
  return (
    <li className={`flex items-center gap-2 text-sm ${color}`}>
      <PresenceIndicator presence={presence} size={10} />
      <span>{label}</span>
    </li>
  );
}
