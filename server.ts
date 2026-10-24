import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/auth.js';
import productRoutes from './server/routes/products.js';
import cartRoutes from './server/routes/cart.js';
import orderRoutes from './server/routes/orders.js';
import sellerRoutes from './server/routes/seller.js';
import notificationRoutes from './server/routes/notifications.js';
import reviewsRoutes from './server/routes/reviews.js';
import couponsRoutes from './server/routes/coupons.js';
import accountRoutes from './server/routes/account.js';
import demoRoutes from './server/routes/demo.js';
import offersRoutes from './server/routes/offers.js';
import chatRoutes from './server/routes/chat.js';
import returnsRoutes from './server/routes/returns.js';
import uploadRoutes from './server/routes/upload.js';
import { seedDatabase } from './server/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

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
app.use('/api/offers', offersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/upload', uploadRoutes);

// Endpoint kiểm tra sức khỏe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Đồ Cũ Còn Thương E-Commerce API'
  });
});

async function startServer() {
  try {
    // Tự động kiểm tra và seed dữ liệu mẫu
    await seedDatabase(false);

    if (process.env.NODE_ENV !== 'production') {
      // Chế độ phát triển: Tích hợp Vite middleware vào Express
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true'
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } else {
      // Chế độ production: Phục vụ thư mục dist
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Đồ Cũ Còn Thương server đang chạy tại: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Lỗi khởi động máy chủ:', error);
    process.exit(1);
  }
}

startServer();
