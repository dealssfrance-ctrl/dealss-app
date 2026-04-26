import { Star } from 'lucide-react';
import type { Review } from '../services/reviewsService';

interface ReviewsListProps {
  reviews: Review[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Aujourd’hui';
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    return d.toLocaleDateString('fr-FR');
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 font-medium">Aucun avis pour le moment</p>
        <p className="text-sm text-gray-400 mt-1">Les retours clients apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1FA774]/10 flex-shrink-0 flex items-center justify-center">
              <span className="text-[#1FA774] font-bold text-sm">
                {review.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-gray-900 truncate">{review.userName}</h4>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>
            </div>
          </div>
          {review.comment && (
            <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}
