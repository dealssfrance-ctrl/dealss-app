import { supabase } from './supabaseClient';

export interface Review {
  id: string;
  offerId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ReviewsResponse {
  success: boolean;
  data: Review[];
  rating: { average: number; count: number };
}

function toReview(row: any): Review {
  return {
    id: row.id,
    offerId: row.offer_id,
    userId: row.user_id,
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function computeRating(reviews: Review[]): { average: number; count: number } {
  const count = reviews.length;
  const average = count > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : 0;
  return { average, count };
}

// ── localStorage persistence (fallback when DB is unavailable) ──

const STORAGE_KEY = 'dealss_reviews';

function getLocalStore(): Record<string, Review[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalStore(store: Record<string, Review[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable
  }
}

function getLocalReviewsForOffer(offerId: string): Review[] {
  return getLocalStore()[offerId] || [];
}

function addLocalReview(review: Review) {
  const store = getLocalStore();
  const existing = store[review.offerId] || [];
  if (!existing.some(r => r.id === review.id)) {
    store[review.offerId] = [review, ...existing];
    saveLocalStore(store);
  }
}

function removeLocalReview(reviewId: string) {
  const store = getLocalStore();
  for (const offerId in store) {
    store[offerId] = store[offerId].filter(r => r.id !== reviewId);
  }
  saveLocalStore(store);
}

function clearLocalReviewsForOffer(offerId: string) {
  const store = getLocalStore();
  delete store[offerId];
  saveLocalStore(store);
}

export const reviewsService = {
  async getOfferReviews(offerId: string): Promise<ReviewsResponse> {
    let dbReviews: Review[] = [];

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        dbReviews = data.map(toReview);
      }
    } catch {
      // DB unavailable — will use local fallback
    }

    if (dbReviews.length > 0) {
      // DB is source of truth — clear local cache for this offer
      clearLocalReviewsForOffer(offerId);
      return { success: true, data: dbReviews, rating: computeRating(dbReviews) };
    }

    // No DB reviews — fall back to localStorage
    const localReviews = getLocalReviewsForOffer(offerId);
    return { success: true, data: localReviews, rating: computeRating(localReviews) };
  },

  async createReview(review: {
    offerId: string;
    userId: string;
    userName: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; data: Review }> {
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const newReview: Review = {
      id,
      offerId: review.offerId,
      userId: review.userId,
      userName: review.userName || 'Utilisateur',
      rating: review.rating,
      comment: review.comment,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to localStorage immediately (instant, never throws)
    try {
      addLocalReview(newReview);
    } catch {
      // localStorage full or unavailable — continue anyway
    }

    // 2. Fire-and-forget DB persistence
    try {
      supabase
        .from('reviews')
        .insert({
          id,
          offer_id: review.offerId,
          user_id: review.userId,
          user_name: review.userName || 'Utilisateur',
          rating: review.rating,
          comment: review.comment || null,
          created_at: newReview.createdAt,
        })
        .select()
        .single()
        .then(({ error }) => {
          if (error) {
            console.warn('[Reviews] DB persist failed:', error.message);
          }
        })
        .catch(() => {
          console.warn('[Reviews] DB unreachable, review saved locally');
        });
    } catch {
      // Supabase client error — review is still in localStorage
    }

    return { success: true, data: newReview };
  },

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    removeLocalReview(reviewId);

    try {
      await supabase.from('reviews').delete().eq('id', reviewId);
    } catch {
      // DB delete failed but local is already removed
    }

    return { success: true };
  },
};
