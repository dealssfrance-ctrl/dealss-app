import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, MessageCircle, Star } from 'lucide-react';
import { Button } from '../components/Button';
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
  const [imageError, setImageError] = useState(false);
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
    return <OfferDetailSkeleton />;
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Offre introuvable</p>
        <button onClick={() => navigate('/')} className="text-[#1FA774] font-medium">
          Retour à l'accueil
        </button>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto"
      >
        {/* Desktop: side-by-side layout */}
        <div className="md:flex md:gap-0">
        {/* Store Image */}
        <div className="w-full md:w-1/2 h-72 md:h-auto md:min-h-[500px] bg-gray-100 overflow-hidden md:rounded-2xl md:m-8 md:mr-0 md:sticky md:top-20 md:self-start">
          {offer.imageUrl && !imageError ? (
            <img
              src={offer.imageUrl}
              alt={offer.storeName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              Image indisponible
            </div>
          )}
        </div>

        {/* Offer Details */}
        <div className="p-6 md:p-8 space-y-6 md:flex-1 md:max-w-xl">
          {/* Store Name & Discount */}
          <div>
            <div className="flex items-start justify-between mb-3 gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{offer.storeName}</h1>
              <span className="text-3xl md:text-4xl font-bold text-[#1FA774] shrink-0">{offer.discount}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                {offer.category}
              </span>
              {!isOwnOffer && (
                <StarRating
                  rating={offerRating.average}
                  reviewCount={offerRating.count}
                  size={16}
                  showNumber={offerRating.count > 0}
                />
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white md:bg-gray-50 rounded-2xl md:p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
            <p className="text-gray-600 leading-relaxed">{offer.description}</p>
          </div>

          {/* Seller Info */}
          {offer.userName && !isOwnOffer && (
            <div className="bg-white md:bg-gray-50 rounded-2xl p-4 md:p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Vendeur</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1FA774]/10 flex items-center justify-center">
                  <span className="text-[#1FA774] font-bold text-lg">
                    {offer.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{offer.userName}</h3>
                  <p className="text-xs text-gray-500 mb-1">
                    {(offer as any).userProfession || 'Particulier'}
                  </p>
                  <StarRating
                    rating={offerRating.average}
                    reviewCount={offerRating.count}
                    size={14}
                    showNumber={offerRating.count > 0}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Button */}
          {!isOwnOffer && (
            <div>
              <Button onClick={handleContactClick}>
                <span className="flex items-center justify-center gap-2">
                  <MessageCircle size={22} />
                  Envoyer un message
                </span>
              </Button>
            </div>
          )}

          {/* Reviews Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Avis {offerRating.count > 0 && `(${offerRating.count})`}
              </h2>
              {!isOwnOffer && (
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error('Connectez-vous pour laisser un avis');
                      navigate('/signin');
                      return;
                    }
                    setIsOfferReviewModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-sm text-[#1FA774] font-medium hover:underline"
                >
                  <Star size={16} />
                  Donner un avis
                </button>
              )}
            </div>

            {/* Review Input */}
            {!isOwnOffer && (
              user ? (
                <ReviewInput
                  onSubmit={handleOfferReviewSubmit}
                  userName={user.name}
                />
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">Connectez-vous pour laisser un commentaire</p>
                  <button
                    onClick={() => navigate('/signin')}
                    className="shrink-0 text-sm font-semibold text-white bg-[#1FA774] px-4 py-2 rounded-full hover:bg-[#16865c] transition-colors"
                  >
                    Se connecter
                  </button>
                </div>
              )
            )}

            {/* Reviews List */}
            <ReviewsList reviews={reviews} />
          </div>
        </div>
        </div> {/* end desktop flex */}

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
  );
}
