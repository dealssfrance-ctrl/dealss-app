import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  MessageCircle,
  Share2,
  Tag,
  Clock,
  ShieldCheck,
  Store,
  Briefcase,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
import { supabase } from '../services/supabaseClient';
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

/** Returns a French relative time label like "il y a 3 jours" / "aujourd'hui". */
function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 1) return "aujourd'hui";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

function formatJoined(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

interface SellerInfo {
  joinedAt?: string;
  name?: string;
  company?: string;
  jobTitle?: string;
  showWorkInfo?: boolean;
  activeOffersCount: number;
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
  const [sellerInfo, setSellerInfo] = useState<SellerInfo>({ activeOffersCount: 0 });
  const [descExpanded, setDescExpanded] = useState(false);

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

  const fetchSellerInfo = async (sellerId: string, currentOfferId: string) => {
    if (!sellerId) return;
    try {
      // Best-effort fetch; we silently ignore failures so the page still renders.
      const [{ data: userRow }, offersResp] = await Promise.all([
        supabase
          .from('users')
          .select('name, company, job_title, show_work_info, created_at')
          .eq('id', sellerId)
          .maybeSingle(),
        offersService.getMyOffers(sellerId),
      ]);
      const activeOthers = (offersResp.data || []).filter(
        (o) => o.status === 'active' && o.id !== currentOfferId,
      ).length;
      const u: any = userRow || {};
      setSellerInfo({
        joinedAt: u?.created_at,
        name: u?.name,
        company: u?.company,
        jobTitle: u?.job_title,
        showWorkInfo: u?.show_work_info,
        activeOffersCount: activeOthers,
      });
    } catch (error) {
      console.error('Error fetching seller info:', error);
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
          await Promise.all([
            fetchReviews(id),
            fetchSellerRating(response.data.userId),
            fetchSellerInfo(response.data.userId, id),
          ]);
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
        offer.userId,
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

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${offer.storeName} — ${offer.discount}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: offer.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié');
      }
    } catch (err) {
      // User dismissed share sheet — silent.
    }
  };

  const sellerInitial = (sellerInfo.name || offer.userName || '?').charAt(0).toUpperCase();
  const longDescription = (offer.description || '').length > 280;

  return (
    <Layout>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f4fbf8_0%,#f8fafc_45%,#f1f5f9_100%)] pb-28 md:pb-12">
        <PersistentNavbar
          title="Détail offre"
          showBackButton={true}
          onBackClick={() => navigate(-1)}
        />

        {/* Desktop Header */}
        <div className="hidden md:block bg-white/75 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Share2 size={18} />
              Partager
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
            {/* Gallery */}
            <div className="relative w-full md:w-1/2 h-80 md:h-auto md:min-h-[600px] bg-gray-100 overflow-hidden md:rounded-3xl md:m-8 md:mr-0 md:sticky md:top-20 md:self-start md:shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <OfferGallery imageUrl={offer.imageUrl} storeName={offer.storeName} />

              {/* Mobile share button overlay */}
              <button
                onClick={handleShare}
                className="md:hidden absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-gray-800 hover:bg-white transition-colors"
                aria-label="Partager"
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Offer Details */}
            <div className="p-5 md:p-8 space-y-5 md:flex-1 md:max-w-xl">
              {/* Headline card */}
              <div className="bg-white/95 backdrop-blur rounded-3xl p-6 border border-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-full border border-emerald-100 mb-2">
                      {offer.category}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                      {offer.storeName}
                    </h1>
                  </div>
                  {/* Discount badge */}
                  <div className="flex flex-col items-center justify-center min-w-[88px] py-3 px-4 bg-gradient-to-br from-[#1FA774] to-[#16865c] text-white rounded-2xl shadow-md shadow-[#1FA774]/30 shrink-0">
                    <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                      Réduc.
                    </span>
                    <span className="text-2xl md:text-3xl font-extrabold leading-none mt-0.5">
                      {offer.discount}
                    </span>
                  </div>
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full border border-gray-200">
                    <Clock size={13} className="text-gray-500" />
                    Publié {formatRelative(offer.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full border border-gray-200">
                    <Tag size={13} className="text-gray-500" />
                    {offer.category}
                  </span>
                  {offerRating.count > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                      ⭐ {offerRating.average.toFixed(1)} ({offerRating.count})
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/95 rounded-3xl p-5 md:p-6 border border-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#1FA774] rounded-full" />
                  Description
                </h2>
                <p
                  className={`text-gray-600 leading-relaxed whitespace-pre-line ${
                    longDescription && !descExpanded ? 'line-clamp-5' : ''
                  }`}
                >
                  {offer.description}
                </p>
                {longDescription && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1FA774] hover:underline"
                  >
                    {descExpanded ? (
                      <>
                        Voir moins <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        Lire la suite <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Seller card */}
              {!isOwnOffer && (
                <div className="bg-white/95 rounded-3xl p-5 md:p-6 border border-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#1FA774] rounded-full" />
                    À propos du vendeur
                  </h2>
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shadow-md ring-4 ring-white">
                        <span className="text-white font-bold text-xl">{sellerInitial}</span>
                      </div>
                      {/* Trust badge if rating ≥ 4 */}
                      {sellerRating.reviewCount >= 3 && sellerRating.averageRating >= 4 && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                          <ShieldCheck size={14} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900 truncate">
                          {sellerInfo.name || offer.userName || 'Vendeur'}
                        </h3>
                        {sellerRating.reviewCount >= 3 && sellerRating.averageRating >= 4 && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Vérifié
                          </span>
                        )}
                      </div>
                      {/* Work info — only when seller has opted in */}
                      {sellerInfo.showWorkInfo && (sellerInfo.company || sellerInfo.jobTitle) && (
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5 truncate">
                          <Briefcase size={12} className="text-gray-400 shrink-0" />
                          <span className="truncate">
                            {[sellerInfo.jobTitle, sellerInfo.company].filter(Boolean).join(' · ')}
                          </span>
                        </p>
                      )}
                      {sellerRating.reviewCount > 0 ? (
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <RatingSummary
                            averageRating={sellerRating.averageRating}
                            reviewCount={sellerRating.reviewCount}
                            size="sm"
                            showLabel={true}
                          />
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            {sellerRating.reviewCount} avis
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-2">Aucun avis pour le moment</p>
                      )}
                    </div>
                  </div>

                  {/* Seller stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#1FA774]/10 flex items-center justify-center shrink-0">
                        <Store size={16} className="text-[#1FA774]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {sellerInfo.activeOffersCount}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {sellerInfo.activeOffersCount <= 1
                            ? 'autre offre'
                            : 'autres offres'}
                        </p>
                      </div>
                    </div>
                    {sellerInfo.joinedAt && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                          <Clock size={16} className="text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                            {formatJoined(sellerInfo.joinedAt)}
                          </p>
                          <p className="text-[11px] text-gray-500 leading-tight">Membre depuis</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desktop Contact Button */}
              {!isOwnOffer && (
                <div className="hidden md:block">
                  <Button onClick={handleContactClick}>
                    <span className="flex items-center justify-center gap-2">
                      <MessageCircle size={22} />
                      Envoyer un message
                    </span>
                  </Button>
                </div>
              )}

              {/* Reviews Section */}
              <div className="bg-white/95 rounded-3xl p-5 md:p-6 border border-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-5 bg-amber-400 rounded-full" />
                    Avis {offerRating.count > 0 && `(${offerRating.count})`}
                  </h2>
                  {offerRating.count > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-amber-500">⭐</span>
                      <span className="font-bold text-gray-900">
                        {offerRating.average.toFixed(1)}
                      </span>
                      <span className="text-gray-400">/ 5</span>
                    </div>
                  )}
                </div>
                <ReviewsList reviews={reviews} />
              </div>
            </div>
          </div>
          {/* end desktop flex */}
        </motion.div>

        {/* Mobile sticky CTA */}
        {!isOwnOffer && (
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
            <button
              onClick={handleContactClick}
              className="w-full flex items-center justify-center gap-2 bg-[#1FA774] text-white py-3.5 rounded-full font-bold text-[15px] shadow-md shadow-[#1FA774]/30 hover:bg-[#16865c] transition-colors"
            >
              <MessageCircle size={20} />
              Contacter {offer.userName?.split(' ')[0] || 'le vendeur'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
