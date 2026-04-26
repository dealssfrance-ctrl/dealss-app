import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, CheckCircle } from 'lucide-react';

interface ReviewRequestModalProps {
  isOpen: boolean;
  offerId: string;
  offerTitle: string;
  offerImageUrl?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  isLoading?: boolean;
}

export function ReviewRequestModal({
  isOpen,
  offerId,
  offerTitle,
  offerImageUrl,
  onClose,
  onSubmit,
  isLoading = false,
}: ReviewRequestModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    try {
      await onSubmit(rating, comment);
      setSubmitted(true);
      setTimeout(() => {
        setRating(0);
        setComment('');
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setRating(0);
      setComment('');
      setSubmitted(false);
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-50 md:fixed md:inset-0 md:flex md:items-center md:justify-center"
          >
            <div className="w-full md:w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-lg md:shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Évaluer cette offre</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  disabled={isLoading}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={24} className="text-gray-600" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4 max-h-96 md:max-h-none overflow-y-auto">
                {/* Offer Info */}
                {offerImageUrl && (
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-100 overflow-hidden">
                      <img
                        src={offerImageUrl}
                        alt={offerTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">
                        Offre
                      </p>
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {offerTitle}
                      </h3>
                    </div>
                  </div>
                )}

                {!submitted ? (
                  <>
                    {/* Star Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Votre note
                      </label>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.button
                            key={star}
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.1 }}
                            type="button"
                            onMouseEnter={() => !isLoading && setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => !isLoading && setRating(star)}
                            disabled={isLoading}
                          >
                            <Star
                              size={32}
                              className={`transition-colors ${
                                star <= (hoverRating || rating)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300 fill-gray-200'
                              }`}
                            />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commentaire <span className="text-gray-400">(optionnel)</span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 500))}
                        placeholder="Partagez votre expérience..."
                        rows={4}
                        disabled={isLoading}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] focus:bg-white disabled:opacity-50 resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-400 text-right">
                        {comment.length}/500
                      </p>
                    </div>
                  </>
                ) : (
                  /* Success State */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 flex flex-col items-center gap-3 text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.6 }}
                    >
                      <CheckCircle
                        size={48}
                        className="text-[#1FA774] fill-[#1FA774]"
                      />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Merci pour votre avis !
                      </h3>
                      <p className="text-sm text-gray-600">
                        Votre évaluation a bien été enregistrée
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {!submitted && (
                <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={rating === 0 || isLoading}
                    className="flex-1 px-4 py-3 bg-[#1FA774] text-white font-medium rounded-xl hover:bg-[#16A15C] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Envoi...' : 'Confirmer'}
                  </motion.button>
                </div>
              )}

              {submitted && (
                <div className="px-5 py-4 border-t border-gray-100">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    className="w-full px-4 py-3 bg-[#1FA774] text-white font-medium rounded-xl"
                  >
                    Fermer
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
