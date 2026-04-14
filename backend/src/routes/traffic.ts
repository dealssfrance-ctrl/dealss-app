import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import { TrafficData } from '../types/index.js';

const router = Router();

// Get all traffic data
router.get('/', async (req: Request, res: Response) => {
  try {
    const trafficData = await db.getAllTrafficData();
    return res.status(200).json({
      success: true,
      data: trafficData
    });
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching traffic data'
    });
  }
});

// Get traffic data by date
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const date = req.params.date as string;
    const trafficData = await db.getTrafficDataByDate(date);

    if (!trafficData) {
      return res.status(404).json({
        success: false,
        message: 'Traffic data not found for this date'
      });
    }

    return res.status(200).json({
      success: true,
      data: trafficData
    });
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching traffic data'
    });
  }
});

// Create or update traffic data
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, visits, pageViews, uniqueUsers, bounceRate, avgSessionDuration } = req.body;

    // Validation
    if (!date || visits === undefined || pageViews === undefined || uniqueUsers === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Date, visits, pageViews, and uniqueUsers are required'
      });
    }

    const trafficData: TrafficData = {
      id: `traffic-${Date.now()}`,
      date,
      visits: Number(visits),
      pageViews: Number(pageViews),
      uniqueUsers: Number(uniqueUsers),
      bounceRate: bounceRate ? Number(bounceRate) : 0.35,
      avgSessionDuration: avgSessionDuration ? Number(avgSessionDuration) : 180
    };

    const createdData = await db.createOrUpdateTrafficData(trafficData);

    return res.status(201).json({
      success: true,
      message: 'Traffic data saved successfully',
      data: createdData
    });
  } catch (error) {
    console.error('Error saving traffic data:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while saving traffic data'
    });
  }
});

// Update traffic data
router.put('/:date', async (req: Request, res: Response) => {
  try {
    const date = req.params.date as string;
    const { visits, pageViews, uniqueUsers, bounceRate, avgSessionDuration } = req.body;

    const existingData = await db.getTrafficDataByDate(date);
    if (!existingData) {
      return res.status(404).json({
        success: false,
        message: 'Traffic data not found for this date'
      });
    }

    const updates: Partial<TrafficData> = {};
    if (visits !== undefined) updates.visits = Number(visits);
    if (pageViews !== undefined) updates.pageViews = Number(pageViews);
    if (uniqueUsers !== undefined) updates.uniqueUsers = Number(uniqueUsers);
    if (bounceRate !== undefined) updates.bounceRate = Number(bounceRate);
    if (avgSessionDuration !== undefined) updates.avgSessionDuration = Number(avgSessionDuration);

    const updatedData = { ...existingData, ...updates };
    const savedData = await db.createOrUpdateTrafficData(updatedData);

    return res.status(200).json({
      success: true,
      message: 'Traffic data updated successfully',
      data: savedData
    });
  } catch (error) {
    console.error('Error updating traffic data:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating traffic data'
    });
  }
});

export default router;