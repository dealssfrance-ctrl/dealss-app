import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import usersRoutes from './routes/users.js';
import offersRoutes from './routes/offers.js';
import trafficRoutes from './routes/traffic.js';
import chatRoutes from './routes/chat.js';
import reviewsRoutes from './routes/reviews.js';
import { db } from './services/database.js';

const app = express();
const PORT = process.env.PORT || 5001;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));

// Traffic tracking middleware — records visits per day from non-dashboard API calls
app.use(async (req, res, next) => {
  // Only track frontend API calls (not dashboard/traffic/health)
  const path = req.path;
  if (
    path.startsWith('/api/offers') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/chat')
  ) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existing = await db.getTrafficDataByDate(today);
      if (existing) {
        existing.visits += 1;
        existing.pageViews += 1;
        await db.createOrUpdateTrafficData(existing);
      } else {
        await db.createOrUpdateTrafficData({
          id: `traffic-live-${today}`,
          date: today,
          visits: 1,
          pageViews: 1,
          uniqueUsers: 1,
          bounceRate: 0.3,
          avgSessionDuration: 200
        });
      }
    } catch (err) {
      console.error('Traffic tracking error:', err);
    }
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'Troqly API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      users: '/api/users',
      offers: '/api/offers',
      traffic: '/api/traffic',
      chat: '/api/chat'
    }
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api/auth`);
  console.log(`📊 Dashboard API at http://localhost:${PORT}/api/dashboard`);
  console.log(`👥 Users API at http://localhost:${PORT}/api/users`);
  console.log(`📦 Offers API at http://localhost:${PORT}/api/offers`);
  console.log(`📈 Traffic API at http://localhost:${PORT}/api/traffic`);
  console.log(`💬 Chat API at http://localhost:${PORT}/api/chat`);
  console.log(`🔗 CORS enabled for: ${CORS_ORIGINS.join(', ')}`);

  // Ensure Supabase storage bucket exists
  try {
    await db.ensureStorageBucket();
  } catch (err) {
    console.error('⚠️ Storage bucket init error:', err);
  }
});
