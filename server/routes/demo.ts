import { Router } from 'express';
import { queryOne } from '../db.js';
import { generateToken } from '../auth.js';
import { resetDatabase } from '../seed.js';

const router = Router();

// Chuyển nhanh sang vai trò Khách hàng (Buyer: 0987654321 / nguoidung)
router.post('/switch-buyer', (req, res) => {
  try {
    const user = queryOne('SELECT * FROM users WHERE role = "buyer" AND phone = "0987654321"');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản người mua mẫu' });
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone
    });

    return res.json({
      message: 'Đã chuyển sang vai Khách hàng mẫu (Nguyễn Văn A)',
      token,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi chuyển vai người mua' });
  }
});

// Chuyển nhanh sang vai trò Người bán (Seller: admin / admin)
router.post('/switch-seller', (req, res) => {
  try {
    const user = queryOne('SELECT * FROM users WHERE role = "seller" AND username = "admin"');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản người bán mẫu' });
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone
    });

    return res.json({
      message: 'Đã chuyển sang vai Chủ tiệm người bán (admin)',
      token,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi chuyển vai người bán' });
  }
});

// Reset dữ liệu demo về trạng thái ban đầu
router.post('/reset', async (req, res) => {
  try {
    await resetDatabase();
    return res.json({
      message: 'Khôi phục dữ liệu mẫu ban đầu thành công! (2 tài khoản mẫu, 10 sản phẩm, 2 mã giảm giá, giỏ hàng & đơn hàng trống)'
    });
  } catch (error: any) {
    console.error('Reset database error:', error);
    return res.status(500).json({ message: 'Lỗi khi khôi phục cơ sở dữ liệu' });
  }
});

export default router;
