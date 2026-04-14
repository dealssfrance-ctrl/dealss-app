import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, MessageCircle, Star, Share2, Heart, Clock, Tag, MapPin, ExternalLink, ShieldCheck, TrendingDown } from 'lucide-react';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { StarRating } from '../components/StarRating';
import { OfferReviewModal } from '../components/OfferReviewModal';
import { ReviewsList } from '../components/ReviewsList';
import { ReviewInput } from '../components/ReviewInput';
import { useAuth } from '../context/AuthContext';
import { offersService, Offer } from '../services/offersService';
import { chatService } from '../services/chatService';
import { reviewsService, Review } from '../services/reviewsService';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { OfferDetailSkeleton } from '../components/Skeleton';

export function OfferDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfferReviewModalOpen, setIsOfferReviewModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offerRating, setOfferRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });

  const isOwnOffer = offer?.userId === user?.id;

  const fetchReviews = async (offerId: string) => {
    try {
      const res = await reviewsService.getOfferReviews(offerId);
      if (res.success) {
        setReviews(res.data);
        setOfferRating(res.rating);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await offersService.getOfferById(id);
        if (response.success) {
          setOffer(response.data);
          await fetchReviews(id);
        }
      } catch (error) {
        console.error('Error fetching offer:', error);
        toast.error('Erreur lors du chargement de l\'offre');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  if (loading) {
    return <Layout><OfferDetailSkeleton /></Layout>;
  }

  if (!offer) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400 text-lg">Offre introuvable</p>
          <button onClick={() => navigate('/')} className="text-[#1FA774] font-medium hover:underline">
            Retour à l'accueil
          </button>
        </div>
      </Layout>
    );
  }

  const timeAgo = (() => {
    const diff = Date.now() - new Date(offer.createdAt).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    return `Il y a ${Math.floor(days / 30)} mois`;
  })();

  const handleShare = async () => {
    const shareData = {
      title: `${offer.storeName} — ${offer.discount}`,
      text: offer.description,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Lien copié !');
      }
    } catch {
      // user cancelled share
    }
  };

  const handleContactClick = async () => {
    if (!user) {
      toast.error('Connectez-vous pour envoyer un message');
      navigate('/signin');
      return;
    }
    if (!offer) return;

    try {
      const response = await chatService.createOrGetConversation(
        offer.id,
        user.id,
        offer.userId
      );
      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      toast.error('Erreur lors de la création de la conversation');
    }
  };

  const handleOfferReviewSubmit = async (rating: number, comment: string) => {
    if (!user || !offer) return;
    try {
      await reviewsService.createReview({
        offerId: offer.id,
        userId: user.id,
        userName: user.name,
        rating,
        comment,
      });
      toast.success('Merci pour votre avis ! ⭐');
      await fetchReviews(offer.id);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'avis');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar — mobile only */}
        <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={22} className="text-gray-900" />
            </button>
            <h1 className="font-semibold text-gray-900 truncate mx-4">{offer.storeName}</h1>
            <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share2 size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-8"
        >
          {/* Desktop back nav */}
          <div className="hidden md:flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <span className="text-sm text-gray-400">Retour</span>
          </div>

          <div className="md:flex md:gap-8">
            {/* ─── LEFT: Image + Gallery ─── */}
            <div className="md:w-[55%] md:shrink-0">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] md:aspect-[3/2] shadow-sm">
                <img
                  src={offer.imageUrl}
                  alt={offer.storeName}
                  className="w-full h-full object-cover"
                />
                {/* Discount badge overlay */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1.5 bg-[#1FA774] text-white px-4 py-2 rounded-full shadow-lg">
                    <TrendingDown size={18} />
                    <span className="text-lg font-bold">{offer.discount}</span>
                  </div>
                </div>
                {/* Share button overlay — desktop */}
                <div className="hidden md:flex absolute top-4 right-4 gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow hover:bg-white transition-colors"
                  >
                    <Share2 size={18} className="text-gray-700" />
                  </button>
                </div>
              </div>

              {/* Tags row under image — desktop */}
              <div className="hidden md:flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
                  <Tag size={13} />
                  {offer.category}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
                  <Clock size={13} />
                  {timeAgo}
                </span>
                {offer.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-full">
                    <ShieldCheck size={13} />
                    Offre active
                  </span>
                )}
              </div>
            </div>

            {/* ─── RIGHT: Details ─── */}
            <div className="flex-1 min-w-0 mt-5 md:mt-0 space-y-5">
              {/* Store name + rating */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{offer.storeName}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Mobile category + time */}
                  <span className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    <Tag size={13} />
                    {offer.category}
                  </span>
                  <span className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                    <Clock size={13} />
                    {timeAgo}
                  </span>
                  {offerRating.count > 0 && (
                    <StarRating rating={offerRating.average} reviewCount={offerRating.count} size={16} />
                  )}
                </div>
              </div>

              {/* Discount highlight card */}
              <div className="bg-gradient-to-r from-[#1FA774]/5 to-[#1FA774]/10 border border-[#1FA774]/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-[#1FA774]/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingDown size={28} className="text-[#1FA774]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Réduction</p>
                  <p className="text-2xl font-bold text-[#1FA774]">{offer.discount}</p>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{offer.description}</p>
              </div>

              {/* Seller card */}
              {offer.userName && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Vendeur</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white font-bold text-xl">
                        {offer.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base">{offer.userName}</h3>
                      <p className="text-sm text-gray-400">Membre Dealss</p>
                    </div>
                    {!isOwnOffer && (
                      <button
                        onClick={handleContactClick}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors flex items-center gap-1.5"
                      >
                        <MessageCircle size={16} />
                        Message
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isOwnOffer && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleContactClick}
                    className="flex-1"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <MessageCircle size={20} />
                      Contacter le vendeur
                    </span>
                  </Button>
                  <button
                    onClick={handleShare}
                    className="w-14 h-14 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
                  >
                    <Share2 size={20} className="text-gray-600" />
                  </button>
                </div>
              )}

              {/* ─── Reviews Section ─── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    Avis {offerRating.count > 0 && (
                      <span className="text-sm font-normal text-gray-400 ml-1">({offerRating.count})</span>
                    )}
                  </h2>
                  {!isOwnOffer && (
                    <button
                      onClick={() => setIsOfferReviewModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#1FA774] font-medium hover:bg-[#1FA774]/5 rounded-full transition-colors"
                    >
                      <Star size={15} />
                      Donner un avis
                    </button>
                  )}
                </div>
                <div className="p-5">
                  {/* Summary bar */}
                  {offerRating.count > 0 && (
                    <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gray-900">{offerRating.average.toFixed(1)}</p>
                        <StarRating rating={offerRating.average} size={14} />
                        <p className="text-xs text-gray-400 mt-1">{offerRating.count} avis</p>
                      </div>
                    </div>
                  )}

                  {/* Review Input */}
                  {!isOwnOffer && user && (
                    <ReviewInput
                      onSubmit={handleOfferReviewSubmit}
                      userName={user.name}
                    />
                  )}

                  {/* Reviews List */}
                  <ReviewsList reviews={reviews} />
                </div>
              </div>
            </div>
          </div>

          {/* Review Modal */}
          {offer && (
            <OfferReviewModal
              isOpen={isOfferReviewModalOpen}
              onClose={() => setIsOfferReviewModalOpen(false)}
              offerName={offer.storeName}
              offerImage={offer.imageUrl}
              onSubmit={handleOfferReviewSubmit}
            />
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
