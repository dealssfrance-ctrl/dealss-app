import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { motion } from 'motion/react';

interface ReviewInputProps {
  onSubmit: (rating: number, comment: string) => void;
  userName: string;
}

export function ReviewInput({ onSubmit, userName }: ReviewInputProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0 && comment.trim()) {
      onSubmit(rating, comment);
      setRating(0);
      setComment('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-2xl p-4 mb-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1FA774]/10 flex-shrink-0 flex items-center justify-center">
          <span className="text-[#1FA774] font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 mb-2">Write a review</p>

          {/* Star Rating */}
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={24}
                  className={
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-sm text-gray-600 ml-2">
                {rating === 1 && 'Not worth it'}
                {rating === 2 && 'Could be better'}
                {rating === 3 && 'Good deal'}
                {rating === 4 && 'Great deal!'}
                {rating === 5 && 'Excellent deal!'}
              </span>
            )}
          </div>

          {/* Comment Input */}
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this offer..."
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || !comment.trim()}
              className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                rating > 0 && comment.trim()
                  ? 'bg-[#1FA774] text-white hover:bg-[#16865c]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
