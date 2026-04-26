import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PersistentNavbar } from '../components/PersistentNavbar';
import { UserOfferCard } from '../components/UserOfferCard';
import { RatingSummary } from '../components/RatingSummary';
import { useAuth } from '../context/AuthContext';
import { offersService, Offer } from '../services/offersService';
import { reviewsService } from '../services/reviewsService';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, LogOut, Trash2, AlertTriangle, Plus, Briefcase, Store, MapPin, BadgeCheck, Star } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ProfileOffersSkeleton } from '../components/Skeleton';
import { supabase } from '../services/supabaseClient';

const DEFAULT_COMPANY = 'Freelance';

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
  const [company, setCompany] = useState<string>(DEFAULT_COMPANY);
  // Merchant-specific profile fields
  const isMerchant = user?.accountType === 'merchant';
  const [storeName, setStoreName] = useState<string>('');
  const [storeLocation, setStoreLocation] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [sellerRating, setSellerRating] = useState<{ averageRating: number; reviewCount: number }>({ averageRating: 0, reviewCount: 0 });

  useEffect(() => {
    if (user) {
      loadUserOffers();
      loadSellerRating();
      loadProfileExtras();
      setUserName(user.name);
    }
  }, [user]);

  const loadProfileExtras = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('company, store_name, store_location, is_verified')
        .eq('id', user.id)
        .maybeSingle();
      const c = ((data as any)?.company || '').trim();
      setCompany(c || DEFAULT_COMPANY);
      setStoreName(((data as any)?.store_name || user.storeName || '').trim());
      setStoreLocation(((data as any)?.store_location || user.storeLocation || '').trim());
      setIsVerified(Boolean((data as any)?.is_verified));
    } catch (err) {
      console.error('Error loading profile extras:', err);
      setCompany(DEFAULT_COMPANY);
    }
  };

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

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = userName.trim();
    const trimmedCompany = company.trim() || DEFAULT_COMPANY;
    const trimmedStoreName = storeName.trim();
    const trimmedStoreLocation = storeLocation.trim();
    if (!trimmedName) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }
    if (isMerchant && !trimmedStoreName) {
      toast.error('Le nom du magasin ne peut pas être vide');
      return;
    }
    setSavingProfile(true);
    try {
      const patch: Record<string, unknown> = {
        name: trimmedName,
        updated_at: new Date().toISOString(),
      };
      if (isMerchant) {
        patch.store_name = trimmedStoreName;
        patch.store_location = trimmedStoreLocation;
      } else {
        patch.company = trimmedCompany;
      }
      const { error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', user.id);
      if (error) throw error;
      // Best-effort sync of auth metadata so info is reflected on next session.
      const meta: Record<string, unknown> = { name: trimmedName };
      if (isMerchant) {
        meta.store_name = trimmedStoreName;
        meta.store_location = trimmedStoreLocation;
      }
      await supabase.auth.updateUser({ data: meta }).catch(() => undefined);
      if (!isMerchant) setCompany(trimmedCompany);
      else {
        setStoreName(trimmedStoreName);
        setStoreLocation(trimmedStoreLocation);
      }
      setIsEditing(false);
      toast.success('Profil mis à jour');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => {
    setUserName(user?.name || '');
    setIsEditing(false);
    loadProfileExtras();
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
    <div className="min-h-screen bg-gradient-to-b from-[#f4fbf8] via-white to-gray-50 pb-6 md:pb-6">
      <PersistentNavbar />

      {/* Gradient hero header */}
      <div className="relative bg-gradient-to-br from-[#1FA774] to-[#16865c] text-white overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.6) 0, transparent 40%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.4) 0, transparent 40%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-5 md:px-8 lg:px-10 pt-7 pb-20 md:pb-24">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 mb-0.5">Mon espace</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profil</h1>
            </div>
            <div className="flex items-center gap-1">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3.5 py-2 text-white/95 font-medium text-sm rounded-full hover:bg-white/15 transition-colors"
                >
                  <Edit2 size={16} />
                  <span className="hidden sm:inline">Modifier</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                aria-label="Se déconnecter"
                className="flex items-center gap-2 p-2 text-white/95 rounded-full hover:bg-white/15 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 lg:px-10 -mt-16 md:-mt-20">
        {/* User Info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white rounded-3xl px-6 pb-6 pt-14 md:pt-16 md:px-8 md:pb-8 shadow-lg shadow-gray-200/60 ring-1 ring-gray-100 mb-6"
        >
          {isEditing ? (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-24 h-24 ${isMerchant ? 'rounded-2xl' : 'rounded-full'} bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shadow-md`}>
                  {isMerchant ? (
                    <Store className="text-white" size={36} strokeWidth={1.8} />
                  ) : (
                    <span className="text-white text-3xl font-bold">{userInitial}</span>
                  )}
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

              {/* Company / Store Edit */}
              {isMerchant ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du magasin
                    </label>
                    <div className="relative">
                      <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Zara Bruxelles"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Localisation
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={storeLocation}
                        onChange={(e) => setStoreLocation(e.target.value)}
                        placeholder="Centre-ville, Bruxelles"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entreprise
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={DEFAULT_COMPANY}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Par défaut : {DEFAULT_COMPANY}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  disabled={savingProfile}
                  className="flex-1 py-3 rounded-full font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={savingProfile}
                  className="flex-1 py-3 rounded-full font-semibold text-white bg-[#1FA774] hover:bg-[#16865c] transition-colors disabled:opacity-60"
                >
                  {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Floating avatar (overlaps top of card) */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-12 md:-top-14">
                <div className={`w-24 h-24 md:w-28 md:h-28 ${isMerchant ? 'rounded-2xl' : 'rounded-full'} bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shadow-xl ring-4 ring-white overflow-hidden`}>
                  {isMerchant ? (
                    <Store className="text-white" size={44} strokeWidth={1.8} />
                  ) : (
                    <span className="text-white text-3xl md:text-4xl font-bold">{userInitial}</span>
                  )}
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center gap-1.5">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                    {isMerchant ? (storeName || user.name) : user.name}
                  </h2>
                  {isMerchant && isVerified && (
                    <span title="Compte vérifié" className="inline-flex items-center text-[#1FA774]">
                      <BadgeCheck size={20} />
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mb-1 truncate">{user.email}</p>
                {isMerchant ? (
                  storeLocation && (
                    <p className="text-gray-600 text-sm mb-3 inline-flex items-center justify-center gap-1.5">
                      <MapPin size={13} className="text-gray-400" />
                      <span className="truncate">{storeLocation}</span>
                    </p>
                  )
                ) : (
                  <p className="text-gray-600 text-sm mb-3 inline-flex items-center justify-center gap-1.5">
                    <Briefcase size={13} className="text-gray-400" />
                    <span className="truncate">{company || DEFAULT_COMPANY}</span>
                  </p>
                )}

                {/* Reputation: rating + review count + verified pill */}
                {isMerchant ? (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm font-semibold">
                      <Star size={14} className="fill-yellow-500 text-yellow-500" />
                      {sellerRating.reviewCount > 0
                        ? sellerRating.averageRating.toFixed(1)
                        : '—'}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                      {sellerRating.reviewCount} avis
                    </span>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e6f6ef] text-[#1FA774] text-sm font-semibold">
                        <BadgeCheck size={14} />
                        Vérifié
                      </span>
                    )}
                  </div>
                ) : (
                  sellerRating.reviewCount > 0 && (
                    <div className="flex justify-center">
                      <RatingSummary
                        averageRating={sellerRating.averageRating}
                        reviewCount={sellerRating.reviewCount}
                        size="md"
                        showLabel={true}
                      />
                    </div>
                  )
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                    {offers.length <= 1 ? 'Offre active' : 'Offres actives'}
                  </p>
                </div>
                <div className="text-center border-l border-gray-100">
                  <p className="text-2xl font-bold text-gray-900">
                    {sellerRating.reviewCount > 0
                      ? sellerRating.averageRating.toFixed(1)
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                    Note moyenne
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* My Offers Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Mes offres</h3>
            {offers.length > 0 && (
              <button
                onClick={() => navigate('/add-offer')}
                className="flex items-center gap-1.5 text-[#1FA774] text-sm font-semibold hover:underline"
              >
                <Plus size={16} />
                Nouvelle
              </button>
            )}
          </div>
          {loading ? (
            <ProfileOffersSkeleton count={3} />
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center flex flex-col items-center gap-4 ring-1 ring-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#1FA774]/10 flex items-center justify-center">
                <Plus size={28} className="text-[#1FA774]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Vous n'avez pas encore d'offre</p>
                <p className="text-sm text-gray-500">
                  Publiez votre première réduction et commencez à échanger.
                </p>
              </div>
              <button
                onClick={() => navigate('/add-offer')}
                className="flex items-center gap-2 bg-[#1FA774] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#16865c] transition-colors shadow-md shadow-[#1FA774]/30"
              >
                <Plus size={18} />
                <span>Ajouter une offre</span>
              </button>
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
        <div className="mt-10 border border-red-200 rounded-3xl p-6 bg-red-50/60">
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
