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
  hasSubmitted?: boolean;
}

// Extract a single usable image URL from a value that may be a single URL,
// a JSON-stringified array, or a CSV (back-compat with legacy stored payloads).
function firstUrl(value?: string): string {
  if (!value) return '';
  let raw = value.trim();
  if (!raw) return '';
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const first = parsed.find((v) => typeof v === 'string' && v.trim().length > 0);
        raw = String(first ?? '').trim();
      }
    } catch { /* fall through */ }
  }
  raw = raw.replace(/^['"]+|['"]+$/g, '').trim();
  if (raw.startsWith('%22http')) {
    try { raw = decodeURIComponent(raw).replace(/^['"]+|['"]+$/g, '').trim(); } catch { return ''; }
  }
  if (raw.includes(',') && /^https?:\/\//i.test(raw.split(',')[0].trim())) {
    raw = raw.split(',')[0].trim();
  }
  return /^(https?:\/\/|data:image\/)/i.test(raw) ? raw : '';
}

export function ReviewRequestCard({
  payload,
  onReviewClick,
  isReceiver,
  hasSubmitted = false,
}: ReviewRequestCardProps) {
  const safeImage = firstUrl(payload.offerImageUrl);
  const showImage = safeImage.length > 0;
  const canReview = isReceiver && !hasSubmitted;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={canReview ? { scale: 0.98 } : {}}
      onClick={canReview ? onReviewClick : undefined}
      className={`rounded-2xl p-3 overflow-hidden cursor-${canReview ? 'pointer' : 'default'} ${
        canReview
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:shadow-md transition-shadow'
          : 'bg-gradient-to-br from-[#1FA774]/10 to-emerald-50 border border-[#1FA774]/25'
      }`}
    >
      <div className="flex gap-2 items-stretch">
        {/* Image */}
        {showImage && (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gray-100 overflow-hidden">
            <img
              src={safeImage}
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
          {canReview && (
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

          {hasSubmitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-xs font-semibold text-[#1FA774]"
            >
              Review submitted ✅
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
