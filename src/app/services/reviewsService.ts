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

  async createReview(review: {
    offerId: string;
    userId: string;
    userName: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; data: Review }> {
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
