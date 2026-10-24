import { Router, Response } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireBuyer, AuthenticatedRequest } from '../auth.js';
import { calculateShippingFee } from './cart.js';
import { isPresentationModeActive } from './demo.js';

const router = Router();


// Hàm sinh mã đơn hàng chuẩn: DCT + YYYYMMDD + 3 số (vd: DCT20261022001)
function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `DCT${year}${month}${day}`;

  const latestToday = queryOne(`
    SELECT code FROM orders 
    WHERE code LIKE ? 
    ORDER BY id DESC LIMIT 1
  `, [`${datePrefix}%`]);

  let seq = 1;
  if (latestToday && latestToday.code) {
    const numPart = latestToday.code.replace(datePrefix, '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      seq = parsed + 1;
    }
  }

  return `${datePrefix}${String(seq).padStart(3, '0')}`;
}

// Lấy danh sách đơn hàng của khách (hỗ trợ tab Shopee: all | pending | confirmed | shipping | delivered | completed | cancelled)
router.get('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { status } = req.query;

    let sql = 'SELECT * FROM orders WHERE buyer_id = ?';
    const params: any[] = [buyerId];

    if (status && status !== 'all' && status !== 'Tất cả') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC';

    const orders = queryAll(sql, params);

    // Kèm danh sách sản phẩm và thông tin yêu cầu trả hàng cho mỗi đơn hàng
    const ordersWithItems = orders.map(order => {
      const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      const return_request = queryOne('SELECT * FROM return_requests WHERE order_id = ?', [order.id]);
      return {
        ...order,
        items,
        return_request: return_request || null
      };
    });

    return res.json({ orders: ordersWithItems });
  } catch (error: any) {
    console.error('Get orders error:', error);
    return res.status(500).json({ message: 'Lỗi tải danh sách đơn hàng' });
  }
});

// Chi tiết đơn hàng và timeline vận chuyển
router.get('/:id', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { id } = req.params;

    const order = queryOne('SELECT * FROM orders WHERE id = ? AND buyer_id = ?', [id, buyerId]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const shipment_events = queryAll('SELECT * FROM shipment_events WHERE order_id = ? ORDER BY id ASC', [order.id]);
    const status_logs = queryAll('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY id ASC', [order.id]);
    const return_request = queryOne('SELECT * FROM return_requests WHERE order_id = ?', [order.id]);

    return res.json({
      order: {
        ...order,
        items,
        shipment_events,
        status_logs,
        return_request: return_request || null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải chi tiết đơn hàng' });
  }
});

// Đặt hàng (Checkout)
router.post('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    if (isPresentationModeActive() && !req.user?.is_owner) {
      return res.status(403).json({ message: 'Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!' });
    }
    const {
      recipient_name,
      phone,
      address,
      note,
      payment_method, // 'card' | 'napas' | 'cod'
      card_last4,
      card_type,
      direct_items, // Tuỳ chọn mua ngay 1 món mà không qua giỏ
      coupon_code
    } = req.body;

    if (!recipient_name || !phone || !address || !payment_method) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin nhận hàng và thanh toán' });
    }

    let itemsToBuy: Array<{
      product_id: number;
      quantity: number;
      name: string;
      price: number;
      condition_pct: number;
      image_url: string;
      stock: number;
      is_negotiated: number;
      negotiated_price: number | null;
      offer_id: number | null;
    }> = [];

    if (direct_items && Array.isArray(direct_items) && direct_items.length > 0) {
      for (const item of direct_items) {
        const prod = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (!prod) {
          return res.status(400).json({ message: `Sản phẩm #${item.product_id} không tồn tại` });
        }

        let isNegotiated = 0;
        let finalPrice = prod.price;
        let offerId = null;

        // Check if buyer has a valid accepted offer
        if (item.offer_id) {
          const offer = queryOne(`
            SELECT * FROM offers
            WHERE id = ? AND buyer_id = ? AND product_id = ? AND status = 'accepted' AND datetime('now') <= datetime(expires_at)
          `, [item.offer_id, buyerId, prod.id]);
          if (offer) {
            isNegotiated = 1;
            finalPrice = offer.offered_price;
            offerId = offer.id;
          }
        }

        itemsToBuy.push({
          product_id: prod.id,
          quantity: Number(item.quantity) || 1,
          name: prod.name,
          price: finalPrice,
          condition_pct: prod.condition_pct,
          image_url: prod.image_url,
          stock: prod.stock,
          is_negotiated: isNegotiated,
          negotiated_price: isNegotiated ? finalPrice : null,
          offer_id: offerId
        });
      }
    } else {
      // Lấy từ giỏ hàng
      const cartItems = queryAll(`
        SELECT c.id as cart_id, c.quantity, c.is_negotiated, c.negotiated_price, c.offer_id, 
               p.id as product_id, p.name, p.price, p.condition_pct, p.image_url, p.stock
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
      `, [buyerId]);

      if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Giỏ hàng của bạn đang trống' });
      }

      itemsToBuy = cartItems.map(c => {
        let isNegotiated = 0;
        let finalPrice = c.price;
        let offerId = null;

        if (c.is_negotiated && c.offer_id) {
          const offer = queryOne(`
            SELECT * FROM offers
            WHERE id = ? AND buyer_id = ? AND product_id = ? AND status = 'accepted' AND datetime('now') <= datetime(expires_at)
          `, [c.offer_id, buyerId, c.product_id]);
          if (offer) {
            isNegotiated = 1;
            finalPrice = offer.offered_price;
            offerId = offer.id;
          }
        }

        return {
          product_id: c.product_id,
          quantity: c.quantity,
          name: c.name,
          price: finalPrice,
          condition_pct: c.condition_pct,
          image_url: c.image_url,
          stock: c.stock,
          is_negotiated: isNegotiated,
          negotiated_price: isNegotiated ? finalPrice : null,
          offer_id: offerId
        };
      });
    }

    // 1. Kiểm tra tồn kho tất cả sản phẩm
    for (const item of itemsToBuy) {
      if (item.quantity > item.stock) {
        return res.status(400).json({ 
          message: `Sản phẩm "${item.name}" chỉ còn tồn kho ${item.stock} món (yêu cầu ${item.quantity})` 
        });
      }
    }

    // 2. Tính toán tài chính
    const subtotal = itemsToBuy.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping_fee = calculateShippingFee(subtotal);

    // Xử lý mã giảm giá (Server tính toán độc lập bảo đảm tính toàn vẹn)
    let appliedCouponCode: string | null = null;
    let discount_amount = 0;

    if (coupon_code && String(coupon_code).trim()) {
      const cleanCode = String(coupon_code).trim().toUpperCase();
      const coupon = queryOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [cleanCode]);
      if (!coupon) {
        return res.status(400).json({ message: `Mã giảm giá "${cleanCode}" không hợp lệ hoặc đã hết hạn` });
      }

      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        return res.status(400).json({ 
          message: `Mã "${cleanCode}" yêu cầu đơn hàng tối thiểu ${coupon.min_order_amount.toLocaleString('vi-VN')}đ` 
        });
      }

      if (coupon.type === 'percent') {
        discount_amount = Math.round((subtotal * coupon.value) / 100);
        if (coupon.max_discount && discount_amount > coupon.max_discount) {
          discount_amount = coupon.max_discount;
        }
      } else if (coupon.type === 'fixed') {
        discount_amount = Math.min(coupon.value, subtotal);
      } else if (coupon.type === 'shipping') {
        discount_amount = Math.round((shipping_fee * coupon.value) / 100);
        if (coupon.max_discount && discount_amount > coupon.max_discount) {
          discount_amount = coupon.max_discount;
        }
      }

      appliedCouponCode = cleanCode;
      // Tăng số lượt dùng của mã
      run('UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?', [cleanCode]);
    }

    const total = Math.max(0, subtotal + shipping_fee - discount_amount);

    // Trạng thái thanh toán
    let payment_status: 'unpaid' | 'paid' = 'unpaid';
    if (payment_method === 'card' || payment_method === 'napas') {
      payment_status = 'paid';
    }

    const orderCode = generateOrderCode();

    // 3. Tạo đơn hàng
    const orderInsert = run(`
      INSERT INTO orders (
        code, buyer_id, subtotal, shipping_fee, total, status,
        payment_method, payment_status, card_last4, card_type,
        recipient_name, phone, address, note, coupon_code, discount_amount
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderCode,
      buyerId,
      subtotal,
      shipping_fee,
      total,
      payment_method,
      payment_status,
      card_last4 || null,
      card_type || null,
      recipient_name,
      phone,
      address,
      note || '',
      appliedCouponCode,
      discount_amount
    ]);

    const orderId = orderInsert.lastInsertRowid;

    // 4. Tạo chi tiết đơn hàng & trừ tồn kho
    for (const item of itemsToBuy) {
      run(`
        INSERT INTO order_items (
          order_id, product_id, product_name, price, quantity, condition_pct, image_url,
          is_negotiated, negotiated_price, offer_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, 
        item.product_id, 
        item.name, 
        item.price, 
        item.quantity, 
        item.condition_pct, 
        item.image_url,
        item.is_negotiated,
        item.negotiated_price,
        item.offer_id
      ]);

      // Trừ tồn kho
      run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    // 5. Xóa các sản phẩm đã mua khỏi giỏ hàng
    if (!direct_items || direct_items.length === 0) {
      run('DELETE FROM cart_items WHERE user_id = ?', [buyerId]);
    } else {
      for (const item of direct_items) {
        run('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [buyerId, item.product_id]);
      }
    }

    // 6. Ghi log trạng thái & sự kiện vận chuyển ban đầu
    run(`
      INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
      VALUES (?, NULL, 'pending', 'buyer', ?, 'Khách hàng tạo đơn thành công')
    `, [orderId, req.user!.full_name]);

    run(`
      INSERT INTO shipment_events (order_id, status, location, note)
      VALUES (?, 'Chờ xác nhận', 'Hệ thống Đồ Cũ Còn Thương', 'Đơn hàng đã được khởi tạo, người bán đang chuẩn bị đóng gói')
    `, [orderId]);

    // Thông báo cho Người bán khi có đơn mới
    const sellerUser = queryOne<{ id: number }>('SELECT id FROM users WHERE role = "seller" LIMIT 1');
    if (sellerUser) {
      createNotification(
        sellerUser.id,
        orderId,
        'order_created',
        `Đơn hàng mới #${orderCode}`,
        `Khách hàng ${recipient_name} vừa đặt đơn #${orderCode} (${total.toLocaleString('vi-VN')}đ) · Phương thức: ${payment_method === 'cod' ? 'COD' : 'Thẻ'}`
      );
    }

    const createdOrder = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    const createdItems = queryAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    return res.status(201).json({
      message: 'Đặt hàng thành công!',
      order: {
        ...createdOrder,
        items: createdItems
      }
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ message: 'Lỗi trong quá trình tạo đơn hàng' });
  }
});

// Khách hàng hủy đơn (chỉ được hủy khi còn ở trạng thái "Chờ xác nhận")
router.post('/:id/cancel', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const order = queryOne('SELECT * FROM orders WHERE id = ? AND buyer_id = ?', [id, buyerId]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Chỉ có thể hủy đơn khi đơn còn ở trạng thái "Chờ xác nhận"' 
      });
    }

    const cancelReason = reason || 'Khách hàng đổi ý / không còn nhu cầu';

    // 1. Hoàn lại tồn kho
    const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    // 2. Nếu đã thanh toán thẻ, chuyển sang "Đã hoàn tiền"
    let newPaymentStatus = order.payment_status;
    if (order.payment_status === 'paid') {
      newPaymentStatus = 'refunded';
    }

    // 3. Cập nhật đơn hàng sang "cancelled"
    run(`
      UPDATE orders 
      SET status = 'cancelled', payment_status = ?, cancel_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newPaymentStatus, cancelReason, order.id]);

    // 4. Ghi log
    run(`
      INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
      VALUES (?, 'pending', 'cancelled', 'buyer', ?, ?)
    `, [order.id, req.user!.full_name, `Lý do hủy: ${cancelReason}`]);

    run(`
      INSERT INTO shipment_events (order_id, status, location, note)
      VALUES (?, 'Đã hủy', 'Khách hàng', ?)
    `, [order.id, `Đơn hàng đã được hủy bởi khách. Lý do: ${cancelReason}`]);

    // Thông báo cho Người bán
    const sellerUser = queryOne<{ id: number }>('SELECT id FROM users WHERE role = "seller" LIMIT 1');
    if (sellerUser) {
      createNotification(
        sellerUser.id,
        order.id,
        'cancelled',
        `Khách đã hủy đơn #${order.code}`,
        `Khách hàng ${req.user!.full_name} đã hủy đơn #${order.code} · Lý do: ${cancelReason}`
      );
    }

    const updated = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
    return res.json({
      message: 'Hủy đơn hàng thành công, tồn kho đã được hoàn lại',
      order: updated
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ message: 'Lỗi khi hủy đơn hàng' });
  }
});

// Khách hàng bấm "Đã nhận được hàng" (khi đơn ở trạng thái 'delivered')
router.post('/:id/complete', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { id } = req.params;

    const order = queryOne('SELECT * FROM orders WHERE id = ? AND buyer_id = ?', [id, buyerId]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Đơn hàng chưa ở trạng thái "Đã giao"' });
    }

    run(`
      UPDATE orders 
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [order.id]);

    run(`
      INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
      VALUES (?, 'delivered', 'completed', 'buyer', ?, 'Khách hàng xác nhận đã nhận hàng')
    `, [order.id, req.user!.full_name]);

    run(`
      INSERT INTO shipment_events (order_id, status, location, note)
      VALUES (?, 'Hoàn thành', 'Điểm nhận hàng', 'Khách hàng đã nhận được hàng và hoàn tất đơn')
    `, [order.id]);

    // Thông báo cho Người bán
    const sellerUserComplete = queryOne<{ id: number }>('SELECT id FROM users WHERE role = "seller" LIMIT 1');
    if (sellerUserComplete) {
      createNotification(
        sellerUserComplete.id,
        order.id,
        'completed',
        `Đơn #${order.code} đã hoàn tất`,
        `Khách hàng ${req.user!.full_name} đã xác nhận "Đã nhận được hàng". Đơn hàng đã hoàn tất!`
      );
    }

    const updated = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
    return res.json({
      message: 'Cảm ơn bạn đã xác nhận nhận hàng!',
      order: updated
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi xác nhận nhận hàng' });
  }
});

export default router;
