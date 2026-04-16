import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Clock } from 'lucide-react';
import type { Offer } from '../services/offersService';
import { getCategoryName } from '../utils/categories';

export type { Offer };

interface OfferCardProps {
  offer: Offer;
}

export function OfferCard({ offer }: OfferCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/offer/${offer.id}`)}
      className="w-full bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 group"
    >
      <div className="flex gap-3.5 p-3.5">
        <div className="w-[88px] h-[88px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
          <img
            src={offer.imageUrl}
            alt={offer.storeName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 text-left min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate text-[15px]">{offer.storeName}</h3>
            <span className="text-[#1FA774] font-bold text-base flex-shrink-0 bg-[#1FA774]/10 px-2 py-0.5 rounded-lg">{offer.discount}</span>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">{offer.description}</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-semibold rounded-md">
              {getCategoryName(offer.category)}
            </span>
            {offer.userName && (
              <span className="text-[10px] text-gray-300 font-medium">par {offer.userName}</span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
