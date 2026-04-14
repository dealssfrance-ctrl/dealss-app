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

export const reviewsService = {
  async getOfferReviews(offerId: string): Promise<ReviewsResponse> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch reviews');

    const reviews = (data || []).map(toReview);
    const count = reviews.length;
    const average = count > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return { success: true, data: reviews, rating: { average, count } };
  },

  async createReview(review: { offerId: string; userId: string; userName: string; rating: number; comment?: string }): Promise<{ success: boolean; data: Review }> {
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const { data, error } = await supabase.from('reviews').insert({
      id,
      offer_id: review.offerId,
      user_id: review.userId,
      user_name: review.userName,
      rating: review.rating,
      comment: review.comment || null,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw new Error('Failed to create review');
    return { success: true, data: toReview(data) };
  },

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) throw new Error('Failed to delete review');
    return { success: true };
  },
};
