const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

export const reviewsService = {
  async getOfferReviews(offerId: string): Promise<ReviewsResponse> {
    const res = await fetch(`${API_URL}/reviews/offer/${offerId}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async createReview(review: { offerId: string; userId: string; userName: string; rating: number; comment?: string }): Promise<{ success: boolean; data: Review }> {
    const res = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    if (!res.ok) throw new Error('Failed to create review');
    return res.json();
  },

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/reviews/${reviewId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete review');
    return res.json();
  },
};
