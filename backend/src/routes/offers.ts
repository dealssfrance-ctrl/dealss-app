import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { db } from '../services/database.js';
import { Offer, OfferSearchParams } from '../types/index.js';

const router = Router();

// Multer config — memory storage, 5 MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    }
  },
});

// Upload image to Supabase Storage
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;

    const publicUrl = await db.uploadOfferImage(req.file.buffer, fileName, req.file.mimetype);

    return res.status(200).json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
    });
  }
});

// Get all offers with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const allOffers = await db.getAllOffers();
    const total = allOffers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOffers = allOffers.slice(startIndex, endIndex);
    
    return res.status(200).json({
      success: true,
      data: paginatedOffers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching offers'
    });
  }
});

// Search offers
router.get('/search', async (req: Request, res: Response) => {
  try {
    const params: OfferSearchParams = {
      query: req.query.q as string,
      category: req.query.category as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: (req.query.sortBy as 'createdAt' | 'discount' | 'storeName') || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const result = await db.searchOffers(params);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching offers:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while searching offers'
    });
  }
});

// Get categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await db.getCategories();
    return res.status(200).json({
      success: true,
      data: ['All', ...categories]
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching categories'
    });
  }
});

// Get offers by user ID - MUST be before /:id route
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const offers = await db.getOffersByUserId(userId);

    return res.status(200).json({
      success: true,
      data: offers
    });
  } catch (error) {
    console.error('Error fetching user offers:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user offers'
    });
  }
});

// Get offer by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const offer = await db.getOfferById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching offer'
    });
  }
});

// Create new offer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { storeName, discount, description, category, imageUrl, userId } = req.body;

    // Validation
    if (!storeName || !discount || !description || !category || !userId) {
      return res.status(400).json({
        success: false,
        message: 'storeName, discount, description, category, and userId are required'
      });
    }

    // Check if user exists
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const offer: Offer = {
      id: `offer_${crypto.randomBytes(8).toString('hex')}`,
      storeName,
      discount,
      description,
      category,
      imageUrl: imageUrl || '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      userName: user.name
    };

    const createdOffer = await db.createOffer(offer);

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: createdOffer
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating offer'
    });
  }
});

// Update offer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { storeName, discount, description, category, imageUrl, status } = req.body;

    const existingOffer = await db.getOfferById(id);
    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    const updates: Partial<Offer> = {};
    if (storeName) updates.storeName = storeName;
    if (discount) updates.discount = discount;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (imageUrl) updates.imageUrl = imageUrl;
    if (status) updates.status = status;

    const updatedOffer = await db.updateOffer(id, updates);

    return res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: updatedOffer
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating offer'
    });
  }
});

// Delete offer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const deleted = await db.deleteOffer(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting offer'
    });
  }
});

export default router;
