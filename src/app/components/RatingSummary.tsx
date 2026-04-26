import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface RatingSummaryProps {
  averageRating?: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RatingSummary({
  averageRating = 0,
  reviewCount = 0,
  size = 'md',
  showLabel = true,
}: RatingSummaryProps) {
  const stars = Math.round(averageRating);
  
  const sizeConfig = {
    sm: {
      starSize: 14,
      textSize: 'text-xs',
      gapSize: 'gap-1',
    },
    md: {
      starSize: 16,
      textSize: 'text-sm',
      gapSize: 'gap-1.5',
    },
    lg: {
      starSize: 20,
      textSize: 'text-base',
      gapSize: 'gap-2',
    },
  };

  const config = sizeConfig[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center ${config.gapSize}`}
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.div
            key={star}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: star * 0.05 }}
          >
            <Star
              size={config.starSize}
              className={
                star <= stars
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300 fill-gray-200'
              }
            />
          </motion.div>
        ))}
      </div>

      {/* Rating & Count */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-baseline gap-1 ${config.textSize}`}
        >
          <span className="font-semibold text-gray-900">
            {averageRating.toFixed(1)}
          </span>
          {reviewCount > 0 && (
            <span className="text-gray-500">
              ({reviewCount} {reviewCount === 1 ? 'avis' : 'avis'})
            </span>
          )}
          {reviewCount === 0 && (
            <span className="text-gray-400 text-[11px]">Pas encore d'avis</span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
