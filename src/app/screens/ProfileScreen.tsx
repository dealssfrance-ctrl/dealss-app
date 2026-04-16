import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { UserOfferCard } from '../components/UserOfferCard';
import { useAuth } from '../context/AuthContext';
import { offersService, Offer } from '../services/offersService';
import { reviewsService } from '../services/reviewsService';
import { motion } from 'motion/react';
import { Edit2, LogOut, Eye, EyeOff, Star, MessageSquare, Building2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ProfileOffersSkeleton } from '../components/Skeleton';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(user?.name || '');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [showWorkInfo, setShowWorkInfo] = useState(true);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    if (user) {
      loadUserOffers();
      setUserName(user.name);
    }
  }, [user]);

  const loadUserOffers = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await offersService.getMyOffers(user.id);
      setOffers(response.data);
      // Load stats from all user's offers reviews
      let totalRating = 0;
      let totalReviews = 0;
      for (const offer of response.data) {
        try {
          const reviewsRes = await reviewsService.getOfferReviews(offer.id);
          totalReviews += reviewsRes.rating.count;
          totalRating += reviewsRes.rating.average * reviewsRes.rating.count;
        } catch { /* ignore */ }
      }
      setStats({
        averageRating: totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0,
        totalReviews,
      });
    } catch (error) {
      toast.error('Impossible de charger vos offres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Name editing would require a backend endpoint for user update
    setIsEditing(false);
    toast.success('Profil mis à jour');
  };

  const handleCancel = () => {
    setUserName(user?.name || '');
    // Reset company/job to saved values (would come from backend)
    setIsEditing(false);
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      await offersService.deleteOffer(id);
      setOffers(prev => prev.filter(offer => offer.id !== id));
      toast.success('Offre supprimée');
    } catch (error) {
      toast.error('Impossible de supprimer l\'offre');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Veuillez vous connecter pour voir votre profil</p>
      </div>
    );
  }

  const userInitial = user.name.charAt(0).toUpperCase();

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Profil</h1>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-[#1FA774] font-medium"
              >
                <Edit2 size={18} />
                Modifier
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-500 font-medium"
            >
              <LogOut size={18} />
            </button>
          </div>
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
          {isEditing ? (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-[#1FA774] flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">{userInitial}</span>
                </div>
              </div>

              {/* Name Edit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise
                </label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="ex: Air France, SNCF..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poste
                </label>
                <div className="relative">
                  <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="ex: Hôtesse de l'air, Ingénieur..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-full font-semibold text-gray-600 bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-full font-semibold text-white bg-[#1FA774]"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1FA774] flex items-center justify-center">
                <span className="text-white text-2xl md:text-3xl font-bold">{userInitial}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
                {showWorkInfo && (company || jobTitle) && (
                  <p className="text-gray-600 text-sm mb-1">
                    {jobTitle}{jobTitle && company ? ' · ' : ''}{company}
                  </p>
                )}
                <p className="text-gray-500 text-sm mb-1">{user.email}</p>
                <p className="text-gray-400 text-sm">{offers.length} offres actives</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 md:p-6 shadow-sm mb-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Statistiques</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={18} className="text-yellow-400 fill-yellow-400" />
                <span className="text-xl font-bold text-gray-900">
                  {stats.averageRating > 0 ? stats.averageRating : '—'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Note moyenne</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MessageSquare size={18} className="text-[#1FA774]" />
                <span className="text-xl font-bold text-gray-900">{stats.totalReviews}</span>
              </div>
              <p className="text-xs text-gray-500">Commentaires</p>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-gray-900">{offers.length}</span>
              <p className="text-xs text-gray-500">Offres publiées</p>
            </div>
          </div>
        </motion.div>

        {/* Profile Visibility Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 md:p-6 shadow-sm mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isProfilePublic ? (
                <Eye size={20} className="text-[#1FA774]" />
              ) : (
                <EyeOff size={20} className="text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {isProfilePublic ? 'Profil public' : 'Profil masqué'}
                </p>
                <p className="text-xs text-gray-500">
                  {isProfilePublic
                    ? 'Votre profil est visible par tous les utilisateurs'
                    : 'Votre profil est masqué des autres utilisateurs'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsProfilePublic(!isProfilePublic);
                toast.success(isProfilePublic ? 'Profil masqué' : 'Profil publié');
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                isProfilePublic ? 'bg-[#1FA774]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  isProfilePublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </motion.div>

        {/* Work Info Visibility Toggle */}
        {(company || jobTitle) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 md:p-6 shadow-sm mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase size={20} className={showWorkInfo ? 'text-[#1FA774]' : 'text-gray-400'} />
                <div>
                  <p className="font-medium text-gray-900">
                    {showWorkInfo ? 'Infos pro visibles' : 'Infos pro masquées'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {showWorkInfo
                      ? 'Votre entreprise et poste sont visibles'
                      : 'Votre entreprise et poste sont masqués'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWorkInfo(!showWorkInfo);
                  toast.success(showWorkInfo ? 'Infos pro masquées' : 'Infos pro visibles');
                }}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  showWorkInfo ? 'bg-[#1FA774]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    showWorkInfo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </motion.div>
        )}

        {/* My Offers Section */}}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes offres</h3>
          {loading ? (
            <ProfileOffersSkeleton count={3} />
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-gray-400">Aucune offre pour le moment</p>
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
                  <UserOfferCard offer={offer} onDelete={handleDeleteOffer} />
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
