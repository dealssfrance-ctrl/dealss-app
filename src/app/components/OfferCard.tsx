import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Offer } from '../services/offersService';
import { RatingSummary } from './RatingSummary';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';

export type { Offer };

interface OfferCardProps {
  offer: Offer;
  hideContact?: boolean;
}

export function OfferCard({ offer, hideContact = false }: OfferCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [contacting, setContacting] = useState(false);

  const isOwnOffer = user?.id === offer.userId;

  // Parse first image from potentially multi-image URL
  const getFirstImage = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;

    const extractFirst = (value: string): string | undefined => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;

      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstItem = parsed.find((item) => typeof item === 'string' && item.trim().length > 0);
            if (typeof firstItem === 'string') {
              const firstTrimmed = firstItem.trim();
              return firstTrimmed.startsWith('[') ? extractFirst(firstTrimmed) : firstTrimmed;
            }
          }
        } catch {
          // Fall through to URL parsing
        }
      }

      return trimmed;
    };

    const candidate = extractFirst(imageUrl);
    if (candidate && /^(https?:\/\/|data:image\/)/i.test(candidate)) {
      return candidate;
    }

    return undefined;
  };

  const imageUrl = getFirstImage(offer.imageUrl);
  const showImage = Boolean(imageUrl) && !imageError;

  const handleContact = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Connectez-vous pour envoyer un message');
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/signin?redirect=${redirect}`);
      return;
    }
    try {
      setContacting(true);
      const existing = await chatService.findExistingConversation(offer.id, user.id, offer.userId);
      if (existing) {
        navigate(`/chat/${existing.id}`);
        return;
      }
      const params = new URLSearchParams({
        offerId: offer.id,
        receiverId: offer.userId,
        storeName: offer.storeName || '',
        otherName: offer.userName || '',
      });
      navigate(`/chat/new?${params.toString()}`);
    } catch {
      toast.error("Erreur lors de l'ouverture de la conversation");
    } finally {
      setContacting(false);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/offer/${offer.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/offer/${offer.id}`);
        }
      }}
      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm active:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex gap-3 p-3">
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          {showImage ? (
            <img
              src={imageUrl}
              alt={offer.storeName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 px-2 text-center">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{offer.storeName}</h3>
            <span className="text-[#1FA774] font-bold text-lg flex-shrink-0">{offer.discount}</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{offer.description}</p>
          <div className="flex items-center justify-between">
            {offer.userName && (
              <span className="text-xs text-gray-400">by {offer.userName}</span>
            )}
            {/* Seller Rating */}
            {offer.reviewCount !== undefined && offer.reviewCount > 0 && (
              <RatingSummary
                averageRating={offer.averageRating || 0}
                reviewCount={offer.reviewCount}
                size="sm"
                showLabel={true}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action: Contacter */}
      {!isOwnOffer && !hideContact && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={handleContact}
            disabled={contacting}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#1FA774] hover:bg-[#16865c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            <MessageCircle size={16} />
            Contacter
          </button>
        </div>
      )}
    </motion.div>
  );
}
