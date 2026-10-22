import { Router, Response } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { requireSeller, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Hàm dùng chung tính giá trị giảm giá một cách an toàn và chính xác
export function calculateCouponDiscount(coupon: any, subtotal: number, shippingFee: number): {
  valid: boolean;
  message?: string;
  discount_amount: number;
} {
  if (!coupon || !coupon.is_active) {
    return { valid: false, message: 'Mã giảm giá không tồn tại hoặc đã ngưng áp dụng', discount_amount: 0 };
  }

  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu ${coupon.min_order_amount.toLocaleString('vi-VN')}đ để sử dụng mã này`,
      discount_amount: 0
    };
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, subtotal);
  } else if (coupon.type === 'shipping') {
    discount = Math.round((shippingFee * coupon.value) / 100);
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  }

  return {
    valid: true,
    discount_amount: Math.max(0, discount)
  };
}

// Kiểm tra mã giảm giá (áp dụng cho khách hàng khi checkout)
router.post('/validate', (req, res) => {
  try {
    const { code, subtotal = 0, shipping_fee = 0 } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Vui lòng nhập mã giảm giá' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const coupon = queryOne('SELECT * FROM coupons WHERE code = ?', [cleanCode]);

    if (!coupon) {
      return res.status(404).json({ message: 'Mã giảm giá không hợp lệ hoặc không tồn tại' });
    }

    const check = calculateCouponDiscount(coupon, Number(subtotal), Number(shipping_fee));
    if (!check.valid) {
      return res.status(400).json({ message: check.message });
    }

    return res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        max_discount: coupon.max_discount,
        min_order_amount: coupon.min_order_amount,
        description: coupon.type === 'shipping' 
          ? 'Miễn phí vận chuyển' 
          : coupon.type === 'percent'
          ? `Giảm ${coupon.value}% (tối đa ${(coupon.max_discount || 0).toLocaleString('vi-VN')}đ)`
          : `Giảm ${(coupon.value || 0).toLocaleString('vi-VN')}đ`
      },
      discount_amount: check.discount_amount
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi kiểm tra mã giảm giá' });
  }
});

// Lấy danh sách các mã đang hoạt động để hiển thị gợi ý
router.get('/public', (req, res) => {
  try {
    const coupons = queryAll(`
      SELECT id, code, type, value, max_discount, min_order_amount
      FROM coupons
      WHERE is_active = 1
      ORDER BY id ASC
    `);
    return res.json({ coupons });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi lấy danh sách mã giảm giá' });
  }
});

// Dành cho Người bán (Seller) quản lý mã giảm giá
router.get('/seller/list', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const coupons = queryAll('SELECT * FROM coupons ORDER BY id DESC');
    return res.json({ coupons });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi lấy danh sách mã giảm giá' });
  }
});

router.post('/seller/create', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, type, value, max_discount, min_order_amount } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ message: 'Vui lòng điền mã code, loại và giá trị giảm' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = queryOne('SELECT id FROM coupons WHERE code = ?', [cleanCode]);
    if (existing) {
      return res.status(400).json({ message: `Mã "${cleanCode}" đã tồn tại` });
    }

    run(`
      INSERT INTO coupons (code, type, value, max_discount, min_order_amount, is_active, usage_count)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `, [
      cleanCode,
      type,
      Number(value),
      max_discount ? Number(max_discount) : null,
      min_order_amount ? Number(min_order_amount) : 0
    ]);

    const created = queryOne('SELECT * FROM coupons WHERE code = ?', [cleanCode]);
    return res.status(201).json({ message: 'Tạo mã giảm giá thành công!', coupon: created });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tạo mã giảm giá' });
  }
});

router.patch('/seller/:id/toggle', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const coupon = queryOne('SELECT * FROM coupons WHERE id = ?', [id]);
    if (!coupon) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
    }

    const newStatus = coupon.is_active ? 0 : 1;
    run('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, id]);

    return res.json({ 
      message: `Đã ${newStatus ? 'kích hoạt' : 'tắt'} mã ${coupon.code}`,
      is_active: newStatus 
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật trạng thái mã' });
  }
});

router.delete('/seller/:id', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    run('DELETE FROM coupons WHERE id = ?', [id]);
    return res.json({ message: 'Đã xóa mã giảm giá thành công' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi xóa mã giảm giá' });
  }
});

export default router;
