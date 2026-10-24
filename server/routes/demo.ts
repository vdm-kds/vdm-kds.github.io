import { Router } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { generateToken } from '../auth.js';
import { seedDatabase } from '../seed.js';

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
    await seedDatabase(true);
    return res.json({
      message: 'Khôi phục dữ liệu mẫu ban đầu thành công!'
    });
  } catch (error: any) {
    console.error('Reset database error:', error);
    return res.status(500).json({ message: error.message || 'Lỗi khi khôi phục cơ sở dữ liệu' });
  }
});

// Lấy danh sách các đơn hàng có thể tua nhanh vận chuyển (chưa hoàn thành/hủy)
router.get('/eligible-orders', (req, res) => {
  try {
    const orders = queryAll(`
      SELECT id, code, recipient_name, total, status, carrier, tracking_code, payment_method, payment_status, created_at
      FROM orders
      WHERE status IN ('pending', 'confirmed', 'shipping')
      ORDER BY id DESC
      LIMIT 10
    `);
    return res.json({ orders });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi lấy danh sách đơn' });
  }
});

// Tua từng bước vận chuyển (1 -> 2 -> 3 -> 4)
router.post('/advance-shipment-step', (req, res) => {
  try {
    const { order_id, step } = req.body;
    const orderId = Number(order_id);
    let stepNum = Number(step);

    const order = queryOne(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    }

    if (!stepNum || isNaN(stepNum) || stepNum < 1 || stepNum > 4) {
      const existingEvents = queryAll(`SELECT * FROM shipment_events WHERE order_id = ?`, [orderId]);
      stepNum = Math.min(4, existingEvents.length + 1);
    }

    const carrierName = order.carrier || 'Giao Hàng Nhanh';
    const trackingCode = order.tracking_code || `GHN-${Date.now().toString().slice(-8)}`;

    if (stepNum === 1) {
      // BƯỚC 1: Đã bàn giao cho ĐVVC
      run(`
        UPDATE orders 
        SET status = 'shipping', carrier = ?, tracking_code = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [carrierName, trackingCode, orderId]);

      run(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
        VALUES (?, ?, 'shipping', 'seller', 'Hệ thống Demo', 'Bàn giao kiện hàng cho bưu tá Giao Hàng Nhanh')
      `, [orderId, order.status]);

      run(`
        INSERT INTO shipment_events (order_id, status, location, note, created_at)
        VALUES (?, 'Đã bàn giao cho đơn vị vận chuyển', 'Kho Tiệm Còn Thương - Quận 1, TP.HCM', 'Kiện hàng đã bọc xốp chống sốc và bàn giao cho bưu tá', datetime('now'))
      `, [orderId]);

      createNotification(
        order.buyer_id,
        orderId,
        'shipping',
        `Đơn #${order.code} đã bàn giao vận chuyển 🚚`,
        `Đơn vị ${carrierName} đã tiếp nhận kiện hàng (Mã vận đơn: ${trackingCode}).`
      );

      return res.json({
        success: true,
        step: 1,
        step_title: 'Đã bàn giao cho ĐVVC',
        status: 'shipping'
      });
    } else if (stepNum === 2) {
      // BƯỚC 2: Đã đến kho phân loại
      run(`
        INSERT INTO shipment_events (order_id, status, location, note, created_at)
        VALUES (?, 'Đã đến kho phân loại', 'Kho Trung Chuyển Tân Bình, TP.HCM', 'Kiện hàng đã được scan mã vạch và đang phân luồng tuyến phát', datetime('now'))
      `, [orderId]);

      createNotification(
        order.buyer_id,
        orderId,
        'shipping',
        `Đơn #${order.code} đã đến kho trung chuyển 🏢`,
        'Kiện hàng đang được phân loại sang bưu cục phát gần bạn nhất.'
      );

      return res.json({
        success: true,
        step: 2,
        step_title: 'Đã đến kho phân loại',
        status: 'shipping'
      });
    } else if (stepNum === 3) {
      // BƯỚC 3: Đang giao hàng
      run(`
        INSERT INTO shipment_events (order_id, status, location, note, created_at)
        VALUES (?, 'Đang giao hàng', 'Bưu cục Quận 1, TP.HCM', 'Bưu tá Nguyễn Văn Shipper (0912345678) đang trên đường giao, vui lòng chú ý điện thoại', datetime('now'))
      `, [orderId]);

      createNotification(
        order.buyer_id,
        orderId,
        'shipping',
        `Đơn #${order.code} đang được giao tới bạn 🛵`,
        'Bưu tá đang trên đường di chuyển tới địa chỉ nhận. Vui lòng giữ máy liên lạc!'
      );

      return res.json({
        success: true,
        step: 3,
        step_title: 'Đang giao hàng',
        status: 'shipping'
      });
    } else if (stepNum === 4) {
      // BƯỚC 4: Giao hàng thành công (COD tự chuyển đã thanh toán)
      const newPaymentStatus = order.payment_method === 'cod' ? 'paid' : order.payment_status;

      run(`
        UPDATE orders 
        SET status = 'delivered', payment_status = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [newPaymentStatus, orderId]);

      run(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
        VALUES (?, 'shipping', 'delivered', 'seller', 'Hệ thống Demo', 'Giao hàng thành công - Khách đã nhận & đồng kiểm')
      `, [orderId]);

      run(`
        INSERT INTO shipment_events (order_id, status, location, note, created_at)
        VALUES (?, 'Giao hàng thành công', ?, 'Khách hàng đã ký nhận kiện hàng nguyên vẹn và hoàn tất đồng kiểm', datetime('now'))
      `, [orderId, order.address || 'Địa chỉ người nhận']);

      createNotification(
        order.buyer_id,
        orderId,
        'order_delivered',
        `Giao hàng thành công đơn #${order.code}! 📦🎉`,
        'Bạn có 3 ngày để kiểm tra trải nghiệm và yêu cầu đổi trả nếu tình trạng không đúng mô tả.'
      );

      return res.json({
        success: true,
        step: 4,
        step_title: 'Giao hàng thành công',
        status: 'delivered',
        payment_status: newPaymentStatus
      });
    }

    return res.status(400).json({ message: 'Bước không hợp lệ (1, 2, 3, 4)' });
  } catch (error: any) {
    console.error('Advance shipment error:', error);
    return res.status(500).json({ message: 'Lỗi tua nhanh vận chuyển' });
  }
});

export default router;
