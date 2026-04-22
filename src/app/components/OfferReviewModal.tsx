import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star } from 'lucide-react';
import { Button } from './Button';

interface OfferReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerName: string;
  offerImage: string;
  onSubmit: (rating: number, comment: string) => void;
}

export function OfferReviewModal({ isOpen, onClose, offerName, offerImage, onSubmit }: OfferReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment);
      setRating(0);
      setComment('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Rate this Offer</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              {/* Offer Info */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={offerImage}
                    alt={offerName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{offerName}</h3>
                  <p className="text-sm text-gray-500">Share your experience</p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={40}
                      className={
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }
                    />
                  </button>
                ))}
              </div>

              {/* Rating Text */}
              <div className="text-center mb-6">
                {rating === 0 && <p className="text-gray-400">Tap a star to rate</p>}
                {rating === 1 && <p className="text-gray-700 font-medium">Not worth it</p>}
                {rating === 2 && <p className="text-gray-700 font-medium">Could be better</p>}
                {rating === 3 && <p className="text-gray-700 font-medium">Good deal</p>}
                {rating === 4 && <p className="text-gray-700 font-medium">Great deal!</p>}
                {rating === 5 && <p className="text-gray-700 font-medium">Excellent deal!</p>}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell others about this offer..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-full font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSubmit}
                  className={`flex-1 ${rating === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Submit Review
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
