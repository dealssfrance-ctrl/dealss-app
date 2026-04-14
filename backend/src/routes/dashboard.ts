import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';

const router = Router();

// Get dashboard stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await db.getDashboardStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching dashboard stats'
    });
  }
});

// Get offers grouped by category
router.get('/offers-by-category', async (req: Request, res: Response) => {
  try {
    const offers = await db.getAllOffers();
    const categoryMap: Record<string, number> = {};
    offers.forEach(offer => {
      categoryMap[offer.category] = (categoryMap[offer.category] || 0) + 1;
    });
    const data = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Get recent activity (recent offers + users combined)
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const offers = (await db.getAllOffers()).slice(0, 5);
    const users = (await db.getAllUsersSafe()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 5);

    const activity = [
      ...offers.map(o => ({
        type: 'offer' as const,
        id: o.id,
        message: `New offer: ${o.storeName} (${o.discount})`,
        date: o.createdAt,
        user: o.userName || 'Unknown'
      })),
      ...users.map(u => ({
        type: 'user' as const,
        id: u.id,
        message: `New user registered: ${u.name}`,
        date: u.createdAt,
        user: u.name
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    return res.status(200).json({ success: true, data: activity });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Get traffic chart data
router.get('/traffic-chart', async (req: Request, res: Response) => {
  try {
    const traffic = (await db.getAllTrafficData()).sort((a, b) => a.date.localeCompare(b.date));
    return res.status(200).json({ success: true, data: traffic });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Get offers by status
router.get('/offers-by-status', async (req: Request, res: Response) => {
  try {
    const offers = await db.getAllOffers();
    const statusMap: Record<string, number> = { active: 0, inactive: 0, pending: 0 };
    offers.forEach(offer => {
      statusMap[offer.status] = (statusMap[offer.status] || 0) + 1;
    });
    const data = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Get users over time (for chart)
router.get('/users-over-time', async (req: Request, res: Response) => {
  try {
    const users = (await db.getAllUsersSafe()).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let cumulative = 0;
    const data = users.map(u => {
      cumulative++;
      return {
        date: new Date(u.createdAt).toISOString().split('T')[0],
        name: u.name,
        total: cumulative
      };
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Get offers over time (for chart)
router.get('/offers-over-time', async (req: Request, res: Response) => {
  try {
    const offers = (await db.getAllOffers()).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let cumulative = 0;
    const data = offers.map(o => {
      cumulative++;
      return {
        date: new Date(o.createdAt).toISOString().split('T')[0],
        storeName: o.storeName,
        total: cumulative
      };
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

export default router;
