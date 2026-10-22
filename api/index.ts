import express from 'express';
import cors from 'cors';
import authRoutes from '../server/routes/auth.js';
import productRoutes from '../server/routes/products.js';
import cartRoutes from '../server/routes/cart.js';
import orderRoutes from '../server/routes/orders.js';
import sellerRoutes from '../server/routes/seller.js';
import notificationRoutes from '../server/routes/notifications.js';
import reviewsRoutes from '../server/routes/reviews.js';
import couponsRoutes from '../server/routes/coupons.js';
import accountRoutes from '../server/routes/account.js';
import demoRoutes from '../server/routes/demo.js';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Khởi tạo Database singleton đảm bảo hoàn thành trước khi xử lý bất kỳ request nào
let initPromise: Promise<void> | null = null;
async function ensureDbInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await getDb();
      await seedDatabase(false);
    })();
  }
  return initPromise;
}

// Middleware chờ DB sẵn sàng
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err: any) {
    console.error('Lỗi khởi tạo Database trên Vercel Serverless:', err);
    return res.status(500).json({
      message: 'Lỗi khởi động máy chủ cơ sở dữ liệu',
      error: err?.message || String(err)
    });
  }
});

// Gắn các API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/demo', demoRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    service: 'Đồ Cũ Còn Thương E-Commerce API'
  });
});

export default app;
