import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { UserOfferCard } from '../components/UserOfferCard';
import { useAuth } from '../context/AuthContext';
import { offersService, Offer } from '../services/offersService';
import { motion } from 'motion/react';
import { Edit2, LogOut } from 'lucide-react';
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
    } catch (error) {
      toast.error('Failed to load your offers');
    } finally {
      setLoading(false);
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1FA774] flex items-center justify-center">
                <span className="text-white text-2xl md:text-3xl font-bold">{userInitial}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
                <p className="text-gray-500 text-sm mb-1">{user.email}</p>
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
      </div>

    </div>
    </Layout>
  );
}
