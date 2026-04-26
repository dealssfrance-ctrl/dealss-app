import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

export interface ReviewRequestPayload {
  offerId: string;
  offerTitle: string;
  offerImageUrl?: string;
  discount?: string;
}

interface ReviewRequestCardProps {
  payload: ReviewRequestPayload;
  onReviewClick: () => void;
  isReceiver: boolean;
}

export function ReviewRequestCard({
  payload,
  onReviewClick,
  isReceiver,
}: ReviewRequestCardProps) {
  const showImage = Boolean(payload.offerImageUrl) && payload.offerImageUrl.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={isReceiver ? { scale: 0.98 } : {}}
      onClick={isReceiver ? onReviewClick : undefined}
      className={`rounded-2xl p-3 overflow-hidden cursor-${isReceiver ? 'pointer' : 'default'} ${
        isReceiver
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:shadow-md transition-shadow'
          : 'bg-gradient-to-br from-[#1FA774]/10 to-emerald-50 border border-[#1FA774]/25'
      }`}
    >
      <div className="flex gap-2 items-stretch">
        {/* Image */}
        {showImage && (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gray-100 overflow-hidden">
            <img
              src={payload.offerImageUrl}
              alt={payload.offerTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">
              Demande d'avis
            </p>
            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {payload.offerTitle}
            </h4>
            {payload.discount && (
              <p className="text-xs text-[#1FA774] font-medium mt-0.5">
                {payload.discount}
              </p>
            )}
          </div>

          {/* CTA Button for receiver */}
          {isReceiver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-700"
            >
              <span>Évaluer</span>
              <ChevronRight size={12} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
