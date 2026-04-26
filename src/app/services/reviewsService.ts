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

export interface SellerRating {
  averageRating: number;
  reviewCount: number;
}

function toReview(r: any): Review {
  return {
    id: r.id,
    offerId: r.offer_id,
    userId: r.user_id,
    userName: r.user_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

export const reviewsService = {
  async getOfferReviews(offerId: string): Promise<ReviewsResponse> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const reviews = (data || []).map(toReview);
    const avg = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
    return { success: true, data: reviews, rating: { average: avg, count: reviews.length } };
  },

  // Get seller rating by aggregating all reviews for offers from a specific seller
  async getSellerRating(sellerId: string): Promise<SellerRating> {
    try {
      // Get all offers from this seller
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .eq('user_id', sellerId);
      
      if (offersError || !offers || offers.length === 0) {
        return { averageRating: 0, reviewCount: 0 };
      }

      const offerIds = offers.map((o) => o.id);

      // Get all reviews for these offers
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .in('offer_id', offerIds);

      if (reviewsError || !reviews || reviews.length === 0) {
        return { averageRating: 0, reviewCount: 0 };
      }

      const avg = Math.round(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
      ) / 10;

      return { averageRating: avg, reviewCount: reviews.length };
    } catch (error) {
      console.error('Error getting seller rating:', error);
      return { averageRating: 0, reviewCount: 0 };
    }
  },

  // Check if user has already reviewed an offer
  async hasUserReviewedOffer(
    offerId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('offer_id', offerId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking review:', error);
      return false;
    }
  },

  async createReview(review: {
    offerId: string;
    userId: string;
    userName: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; data: Review }> {
    // Check for duplicate review
    const hasReviewed = await this.hasUserReviewedOffer(
      review.offerId,
      review.userId
    );
    if (hasReviewed) {
      throw new Error('Vous avez déjà évalué cette offre');
    }

    const row = {
      id: `rev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      offer_id: review.offerId,
      user_id: review.userId,
      user_name: review.userName,
      rating: review.rating,
      comment: review.comment || null,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('reviews').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to create review');
    return { success: true, data: toReview(data) };
  },

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};
