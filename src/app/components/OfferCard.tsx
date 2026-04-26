import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import type { Offer } from '../services/offersService';
import { RatingSummary } from './RatingSummary';

export type { Offer };

interface OfferCardProps {
  offer: Offer;
}

export function OfferCard({ offer }: OfferCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

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

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/offer/${offer.id}`)}
      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm active:shadow-md transition-shadow"
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
    </motion.button>
  );
}
