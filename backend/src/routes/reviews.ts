import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import crypto from 'crypto';

const router = Router();

// Get reviews for an offer
router.get('/offer/:offerId', async (req: Request, res: Response) => {
  try {
    const offerId = req.params.offerId as string;
    const reviews = await db.getReviewsByOfferId(offerId);
    const rating = await db.getOfferAverageRating(offerId);

    return res.status(200).json({
      success: true,
      data: reviews,
      rating,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
});

// Get average rating for an offer
router.get('/offer/:offerId/rating', async (req: Request, res: Response) => {
  try {
    const offerId = req.params.offerId as string;
    const rating = await db.getOfferAverageRating(offerId);
    return res.status(200).json({ success: true, data: rating });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching rating' });
  }
});

// Create a review
router.post('/', async (req: Request, res: Response) => {
  try {
    const { offerId, userId, userName, rating, comment } = req.body;

    if (!offerId || !userId || !userName || !rating) {
      return res.status(400).json({ success: false, message: 'offerId, userId, userName, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const review = {
      id: `rev-${crypto.randomBytes(8).toString('hex')}`,
      offerId,
      userId,
      userName,
      rating: Number(rating),
      comment: comment || undefined,
      createdAt: new Date(),
    };

    const created = await db.createReview(review);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ success: false, message: 'Error creating review' });
  }
});

// Delete a review
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await db.deleteReview(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting review' });
  }
});

export default router;
