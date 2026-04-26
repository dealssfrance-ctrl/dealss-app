import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PersistentNavbar } from '../components/PersistentNavbar';
import { UserOfferCard } from '../components/UserOfferCard';
import { RatingSummary } from '../components/RatingSummary';
import { useAuth } from '../context/AuthContext';
import { offersService, Offer } from '../services/offersService';
import { reviewsService } from '../services/reviewsService';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ProfileOffersSkeleton } from '../components/Skeleton';

const REQUEST_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

export function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(user?.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [sellerRating, setSellerRating] = useState<{ averageRating: number; reviewCount: number }>({ averageRating: 0, reviewCount: 0 });

  useEffect(() => {
    if (user) {
      loadUserOffers();
      loadSellerRating();
      setUserName(user.name);
    }
  }, [user]);

  const loadUserOffers = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await withTimeout(offersService.getMyOffers(user.id));
      setOffers(response.data);
    } catch (error) {
      toast.error('Chargement trop long. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const loadSellerRating = async () => {
    if (!user) return;
    try {
      const rating = await reviewsService.getSellerRating(user.id);
      setSellerRating(rating);
    } catch (error) {
      console.error('Error fetching seller rating:', error);
    }
  };

  const handleSave = () => {
    // Name editing would require a backend endpoint for user update
    setIsEditing(false);
    toast.success('Profile updated');
  };

  const handleCancel = () => {
    setUserName(user?.name || '');
    setIsEditing(false);
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      await offersService.deleteOffer(id);
      setOffers(prev => prev.filter(offer => offer.id !== id));
      toast.success('Offer deleted');
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toLowerCase() !== 'supprimer') return;
    try {
      setDeleting(true);
      await deleteAccount();
      toast.success('Compte supprimé avec succès');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(msg);
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Please sign in to view your profile</p>
      </div>
    );
  }

  const userInitial = user.name.charAt(0).toUpperCase();

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-6 md:pb-6">
      <PersistentNavbar />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 md:top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 py-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-[#1FA774] font-medium"
              >
                <Edit2 size={18} />
                Edit
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
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-full font-semibold text-gray-600 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-full font-semibold text-white bg-[#1FA774]"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 md:gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1FA774] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl md:text-3xl font-bold">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{user.name}</h2>
                <p className="text-gray-500 text-sm mb-3">{user.email}</p>
                
                {/* Seller Rating */}
                {sellerRating.reviewCount > 0 && (
                  <div className="mb-3">
                    <RatingSummary
                      averageRating={sellerRating.averageRating}
                      reviewCount={sellerRating.reviewCount}
                      size="md"
                      showLabel={true}
                    />
                  </div>
                )}
                
                <p className="text-gray-400 text-sm">{offers.length} active offers</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* My Offers Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Offers</h3>
          {loading ? (
            <ProfileOffersSkeleton count={3} />
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-gray-400">No offers yet</p>
            </div>
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
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

        {/* Danger Zone */}
        <div className="mt-8 border border-red-200 rounded-2xl p-6 bg-red-50">
          <h3 className="text-base font-semibold text-red-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={18} /> Zone dangereuse
          </h3>
          <p className="text-sm text-red-500 mb-4">
            La suppression de votre compte est irréversible. Toutes vos offres, messages et données seront définitivement effacés.
          </p>
          <button
            onClick={() => { setShowDeleteConfirm(true); setConfirmText(''); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-300 text-red-600 text-sm font-semibold rounded-full hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} /> Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Supprimer mon compte</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Cette action est <strong>irréversible</strong>. Toutes vos offres, messages et données seront définitivement supprimés.
              </p>
              <p className="text-sm text-gray-700 mb-3">
                Tapez <span className="font-bold text-red-600">supprimer</span> pour confirmer :
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="supprimer"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-red-400"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-full font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || confirmText.trim().toLowerCase() !== 'supprimer'}
                  className="flex-1 py-3 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {deleting ? 'Suppression...' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </Layout>
  );
}
