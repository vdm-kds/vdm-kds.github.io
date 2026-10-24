import { Router } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';

const router = Router();

// 1. GET /api/returns/my - Buyer's return requests
router.get('/my', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== 'buyer') {
    return res.status(403).json({ error: 'Chỉ khách mua mới xem được yêu cầu trả hàng cá nhân' });
  }

  const returns = queryAll(`
    SELECT r.*, 
           o.code AS order_code, o.payment_method, o.payment_status,
           p.name AS product_name, p.image_url AS product_image
    FROM return_requests r
    JOIN orders o ON r.order_id = o.id
    JOIN products p ON r.product_id = p.id
    WHERE r.buyer_id = ?
    ORDER BY r.created_at DESC
  `, [req.user.id]);

  res.json({ returns, return_requests: returns });
});

// 2. GET /api/returns/seller - Seller's return requests
router.get('/seller', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ người bán mới có quyền quản trị yêu cầu trả hàng' });
  }

  const returns = queryAll(`
    SELECT r.*, 
           o.code AS order_code, o.payment_method, o.payment_status,
           p.name AS product_name, p.image_url AS product_image,
           u.full_name AS buyer_name, u.phone AS buyer_phone
    FROM return_requests r
    JOIN orders o ON r.order_id = o.id
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.buyer_id = u.id
    ORDER BY r.created_at DESC
  `);

  const pendingCount = returns.filter(r => r.status === 'pending').length;

  res.json({ returns, return_requests: returns, pendingCount });
});

// 3. POST /api/returns - Buyer creates return request
router.post('/', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== 'buyer') {
    return res.status(403).json({ error: 'Chỉ người mua mới được tạo yêu cầu trả hàng' });
  }

  let { order_id, product_id, reason, description, images } = req.body;
  let targetProductId = Number(product_id);

  if (!targetProductId || isNaN(targetProductId)) {
    const firstItem = queryOne(`SELECT product_id FROM order_items WHERE order_id = ? LIMIT 1`, [order_id]);
    if (firstItem) {
      targetProductId = firstItem.product_id;
    }
  }

  if (!order_id || !targetProductId || !reason || !description) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ lý do và mô tả trả hàng' });
  }

  const order = queryOne(`
    SELECT * FROM orders WHERE id = ? AND buyer_id = ?
  `, [order_id, req.user.id]);

  if (!order) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng tương ứng' });
  }

  if (order.status !== 'delivered' && order.status !== 'completed') {
    return res.status(400).json({ error: 'Chỉ có thể yêu cầu trả hàng cho đơn đã giao thành công' });
  }

  // Check 3 days window: date difference between now and updated_at
  const orderDate = new Date(order.updated_at || order.created_at).getTime();
  const diffDays = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 3) {
    return res.status(400).json({ error: 'Đã quá thời hạn 3 ngày đổi trả đồng kiểm theo chính sách của tiệm' });
  }

  // Check existing return for this product in this order
  const existing = queryOne(`
    SELECT * FROM return_requests WHERE order_id = ? AND product_id = ?
  `, [order_id, targetProductId]);

  if (existing) {
    return res.status(400).json({ error: 'Bạn đã gửi yêu cầu trả hàng cho sản phẩm này trong đơn' });
  }

  const orderItem = queryOne(`
    SELECT * FROM order_items WHERE order_id = ? AND product_id = ?
  `, [order_id, targetProductId]);

  const refundAmount = orderItem ? (orderItem.price * orderItem.quantity) : order.total;
  const refundMethod = order.payment_method === 'card' 
    ? 'Hoàn tiền thẻ (mô phỏng)' 
    : 'Chuyển khoản ngân hàng (mô phỏng)';

  const insertRes = run(`
    INSERT INTO return_requests (
      order_id, buyer_id, product_id, reason, description, images, status, refund_amount, refund_method, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))
  `, [
    order_id,
    req.user.id,
    targetProductId,
    reason,
    description,
    Array.isArray(images) ? JSON.stringify(images) : '[]',
    refundAmount,
    refundMethod
  ]);

  const createdReturn = queryOne('SELECT * FROM return_requests WHERE id = ?', [insertRes.lastInsertRowid]);

  // Notify seller
  const seller = queryOne('SELECT id FROM users WHERE role = "seller" LIMIT 1');
  if (seller) {
    createNotification(
      seller.id,
      order_id,
      'return',
      'Yêu cầu trả hàng mới!',
      `Khách ${req.user.full_name} gửi yêu cầu trả hàng đơn ${order.code}. Lý do: ${reason}`
    );
  }

  res.json({
    success: true,
    message: 'Đã gửi yêu cầu trả hàng thành công. Chủ shop sẽ phản hồi trong vòng 24 giờ!',
    returnId: insertRes.lastInsertRowid,
    return_request: createdReturn
  });
});

// 4. POST & PUT /api/returns/:id/status - Update return status
router.all('/:id/status', requireAuth, (req: AuthRequest, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }
  const returnId = Number(req.params.id);
  const { status, seller_note } = req.body;
  const isSeller = req.user?.role === 'seller';
  const userId = req.user?.id;

  const ret = queryOne(`
    SELECT r.*, o.code AS order_code, o.payment_method, p.name AS product_name, p.id AS p_id
    FROM return_requests r
    JOIN orders o ON r.order_id = o.id
    JOIN products p ON r.product_id = p.id
    WHERE r.id = ?
  `, [returnId]);

  if (!ret) {
    return res.status(404).json({ error: 'Yêu cầu trả hàng không tồn tại' });
  }

  // Allowed transitions
  if (status === 'approved' || status === 'rejected' || status === 'received' || status === 'refunded') {
    if (!isSeller) {
      return res.status(403).json({ error: 'Chỉ người bán mới có quyền thực hiện thao tác này' });
    }
  } else if (status === 'shipping_back') {
    if (ret.buyer_id !== userId && !isSeller) {
      return res.status(403).json({ error: 'Chỉ người mua mới được cập nhật gửi trả hàng' });
    }
  }

  // Execute update
  run(`
    UPDATE return_requests
    SET status = ?, seller_note = coalesce(?, seller_note), updated_at = datetime('now')
    WHERE id = ?
  `, [status, seller_note || null, returnId]);

  // Handle side-effects of refund
  if (status === 'refunded') {
    // 1. Mark order payment_status = refunded
    run(`
      UPDATE orders
      SET payment_status = 'refunded', updated_at = datetime('now')
      WHERE id = ?
    `, [ret.order_id]);

    // 2. Restock product back into inventory
    run(`
      UPDATE products
      SET stock = stock + 1, updated_at = datetime('now')
      WHERE id = ?
    `, [ret.p_id]);

    // 3. Notify Buyer
    createNotification(
      ret.buyer_id,
      ret.order_id,
      'return',
      'Đã hoàn tiền thành công! 💵',
      `Đơn ${ret.order_code} đã được xử lý hoàn trả ${ret.refund_amount.toLocaleString('vi-VN')}đ qua hình thức ${ret.refund_method}. Cảm ơn bạn đã tin tưởng Đồ Cũ Còn Thương!`
    );
  } else if (status === 'approved') {
    createNotification(
      ret.buyer_id,
      ret.order_id,
      'return',
      'Shop đã đồng ý yêu cầu trả hàng! 📦',
      `Yêu cầu trả hàng cho món "${ret.product_name}" đã được duyệt. Vui lòng đóng gói và bàn giao lại cho bưu tá.`
    );
  } else if (status === 'rejected') {
    createNotification(
      ret.buyer_id,
      ret.order_id,
      'return',
      'Yêu cầu trả hàng bị từ chối',
      `Shop không thể chấp nhận yêu cầu trả hàng đơn ${ret.order_code}. Lý do: ${seller_note || 'Sản phẩm không thuộc diện bảo hành/đổi trả'}`
    );
  } else if (status === 'shipping_back') {
    const seller = queryOne('SELECT id FROM users WHERE role = "seller" LIMIT 1');
    if (seller) {
      createNotification(
        seller.id,
        ret.order_id,
        'return',
        'Khách đang gửi trả hàng',
        `Kiện hàng trả lại cho đơn ${ret.order_code} đang trên đường gửi về kho.`
      );
    }
  } else if (status === 'received') {
    createNotification(
      ret.buyer_id,
      ret.order_id,
      'return',
      'Shop đã nhận kiện hàng hoàn trả',
      `Shop đã kiểm tra kiện hàng hoàn của đơn ${ret.order_code} và đang tiến hành lệnh hoàn tiền.`
    );
  }

  const updatedReturn = queryOne('SELECT * FROM return_requests WHERE id = ?', [returnId]);
  res.json({ success: true, message: 'Đã cập nhật trạng thái yêu cầu trả hàng thành công', return_request: updatedReturn });
});

export default router;
