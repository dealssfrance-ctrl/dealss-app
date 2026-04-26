import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { OfferGallery } from '../components/OfferGallery';
import { Layout } from '../components/Layout';
import { PersistentNavbar } from '../components/PersistentNavbar';
import { RatingSummary } from '../components/RatingSummary';
import { ReviewsList } from '../components/ReviewsList';
import { useAuth } from '../context/AuthContext';
import { offersService, Offer } from '../services/offersService';
import { chatService } from '../services/chatService';
import { reviewsService } from '../services/reviewsService';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { OfferDetailSkeleton } from '../components/Skeleton';

const REQUEST_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

export function OfferDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [offerRating, setOfferRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [sellerRating, setSellerRating] = useState<{ averageRating: number; reviewCount: number }>({ averageRating: 0, reviewCount: 0 });

  const isOwnOffer = offer?.userId === user?.id;

  const fetchReviews = async (offerId: string) => {
    try {
      const res = await withTimeout(reviewsService.getOfferReviews(offerId));
      if (res.success) {
        setReviews(res.data);
        setOfferRating(res.rating);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchSellerRating = async (sellerId: string) => {
    try {
      const rating = await reviewsService.getSellerRating(sellerId);
      setSellerRating(rating);
    } catch (error) {
      console.error('Error fetching seller rating:', error);
    }
  };

  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await withTimeout(offersService.getOfferById(id));
        if (response.success) {
          setOffer(response.data);
          await fetchReviews(id);
          await fetchSellerRating(response.data.userId);
        }
      } catch (error) {
        console.error('Error fetching offer:', error);
        toast.error('Chargement trop long. Réessayez.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <OfferDetailSkeleton />
      </Layout>
    );
  }

  if (!offer) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400">Offre introuvable</p>
          <button onClick={() => navigate('/')} className="text-[#1FA774] font-medium">
            Retour à l'accueil
          </button>
        </div>
      </Layout>
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
      // Don't persist a conversation row until the first message is actually sent.
      const existing = await chatService.findExistingConversation(
        offer.id,
        user.id,
        offer.userId
      );
      if (existing) {
        navigate(`/chat/${existing.id}`);
        return;
      }
      // Draft mode: navigate with offer/receiver context as query params.
      const params = new URLSearchParams({
        offerId: offer.id,
        receiverId: offer.userId,
        storeName: offer.storeName || '',
        otherName: offer.userName || '',
      });
      navigate(`/chat/new?${params.toString()}`);
    } catch (error) {
      toast.error('Erreur lors de l\u2019ouverture de la conversation');
    }
  };

  return (
    <Layout>
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f4fbf8_0%,#f8fafc_45%,#f1f5f9_100%)]">
      <PersistentNavbar title="Détail offre" showBackButton={true} onBackClick={() => navigate(-1)} />

      {/* Desktop Header */}
      <div className="hidden md:block bg-white/75 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
        <div className="md:flex md:gap-0 pb-8 md:pb-12">
        {/* Gallery */}
        <div className="w-full md:w-1/2 h-72 md:h-auto md:min-h-[560px] bg-gray-100 overflow-hidden md:rounded-3xl md:m-8 md:mr-0 md:sticky md:top-20 md:self-start md:shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <OfferGallery 
            imageUrl={offer.imageUrl} 
            storeName={offer.storeName}
          />
        </div>

        {/* Offer Details */}
        <div className="p-6 md:p-8 space-y-6 md:flex-1 md:max-w-xl">
          {/* Store Name & Discount */}
          <div className="bg-white/90 backdrop-blur rounded-3xl p-5 md:p-6 border border-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between mb-3 gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{offer.storeName}</h1>
              <span className="text-3xl md:text-4xl font-extrabold text-[#1FA774] shrink-0">{offer.discount}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-full border border-emerald-100">
                {offer.category}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/95 rounded-3xl p-5 border border-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
            <p className="text-gray-600 leading-relaxed">{offer.description}</p>
          </div>

          {/* Offer Rating */}
          {!isOwnOffer && offerRating.count > 0 && (
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-amber-200 rounded-3xl p-4 md:p-5 shadow-[0_8px_24px_rgba(251,146,60,0.18)]">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Avis pour cette offre</h2>
              <RatingSummary
                averageRating={offerRating.average}
                reviewCount={offerRating.count}
                size="md"
                showLabel={true}
              />
            </div>
          )}

          {/* Seller Info */}
          {offer.userName && !isOwnOffer && (
            <div className="bg-white/95 rounded-3xl p-4 md:p-5 border border-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Vendeur</h2>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1FA774]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#1FA774] font-bold text-lg">
                    {offer.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{offer.userName}</h3>
                  <RatingSummary
                    averageRating={sellerRating.averageRating}
                    reviewCount={sellerRating.reviewCount}
                    size="sm"
                    showLabel={true}
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
          <div className="border-t border-gray-200/70 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Avis {offerRating.count > 0 && `(${offerRating.count})`}
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-500">
                Liste des avis
              </span>
            </div>

            {/* Reviews List */}
            <ReviewsList reviews={reviews} />
          </div>
        </div>
        </div> {/* end desktop flex */}
      </motion.div>
    </div>
    </Layout>
  );
}
