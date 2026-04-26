import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import type { Offer } from '../services/offersService';

export type { Offer };

interface OfferCardProps {
  offer: Offer;
}

export function OfferCard({ offer }: OfferCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(offer.imageUrl) && !imageError;

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
              src={offer.imageUrl}
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
          {offer.userName && (
            <span className="text-xs text-gray-400">by {offer.userName}</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
