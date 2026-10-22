import { Router, Response } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireSeller, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Hợp lệ hóa luồng trạng thái đơn hàng:
// pending -> confirmed -> shipping -> delivered -> completed
// pending/confirmed -> cancelled
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: []
};

// 1. Thống kê Dashboard Người Bán
router.get('/stats', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalOrders = queryOne('SELECT COUNT(*) as count FROM orders')?.count || 0;
    
    const statusCounts = queryAll(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);

    const countMap: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0
    };
    statusCounts.forEach((row: any) => {
      countMap[row.status] = row.count;
    });

    // Doanh thu (tính từ các đơn đã thanh toán hoặc đã giao/hoàn tất)
    const revenueRow = queryOne(`
      SELECT SUM(total) as revenue 
      FROM orders 
      WHERE (payment_status = 'paid' OR status IN ('delivered', 'completed')) 
        AND status != 'cancelled'
    `);
    const totalRevenue = revenueRow?.revenue || 0;

    // Sản phẩm sắp hết hàng (tồn kho <= 1)
    const lowStockCount = queryOne('SELECT COUNT(*) as count FROM products WHERE stock <= 1')?.count || 0;

    // Đơn hàng mới nhất
    const recentOrders = queryAll(`
      SELECT o.*, u.full_name as buyer_name, u.phone as buyer_phone
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ORDER BY o.id DESC
      LIMIT 5
    `);

    const recentOrdersWithItems = recentOrders.map((ord: any) => ({
      ...ord,
      items: queryAll('SELECT * FROM order_items WHERE order_id = ?', [ord.id])
    }));

    return res.json({
      stats: {
        total_orders: totalOrders,
        status_counts: countMap,
        total_revenue: totalRevenue,
        low_stock_count: lowStockCount,
        recent_orders: recentOrdersWithItems
      }
    });
  } catch (error: any) {
    console.error('Seller stats error:', error);
    return res.status(500).json({ message: 'Lỗi tải dữ liệu bảng điều khiển người bán' });
  }
});

// 2. Danh sách đơn hàng phía Người bán (có lọc trạng thái)
router.get('/orders', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT o.*, u.full_name as buyer_name, u.phone as buyer_phone
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all' && status !== 'Tất cả') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.id DESC';

    const orders = queryAll(sql, params);
    const ordersWithItems = orders.map((ord: any) => ({
      ...ord,
      items: queryAll('SELECT * FROM order_items WHERE order_id = ?', [ord.id]),
      shipment_events: queryAll('SELECT * FROM shipment_events WHERE order_id = ? ORDER BY id ASC', [ord.id]),
      status_logs: queryAll('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY id ASC', [ord.id])
    }));

    return res.json({ orders: ordersWithItems });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải danh sách đơn hàng người bán' });
  }
});

// 3. Chi tiết một đơn hàng
router.get('/orders/:id', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = queryOne(`
      SELECT o.*, u.full_name as buyer_name, u.phone as buyer_phone
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE o.id = ?
    `, [id]);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const shipment_events = queryAll('SELECT * FROM shipment_events WHERE order_id = ? ORDER BY id ASC', [order.id]);
    const status_logs = queryAll('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY id ASC', [order.id]);

    return res.json({
      order: {
        ...order,
        items,
        shipment_events,
        status_logs
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải chi tiết đơn hàng' });
  }
});

// 4. Chuyển trạng thái đơn hàng (Duyệt đơn, Chuyển giao, Hủy đơn...)
router.post('/orders/:id/status', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { target_status, note, cancel_reason } = req.body;

    const order = queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const currentStatus = order.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(target_status)) {
      return res.status(400).json({
        message: `Chuyển trạng thái không hợp lệ: không thể chuyển từ "${currentStatus}" sang "${target_status}"`
      });
    }

    let newPaymentStatus = order.payment_status;

    // Trường hợp 1: HỦY ĐƠN
    if (target_status === 'cancelled') {
      const finalCancelReason = cancel_reason || note || 'Người bán hủy đơn (hết hàng hoặc lý do kỹ thuật)';

      // Hoàn lại tồn kho
      const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      // Nếu đã thanh toán thẻ, chuyển sang "Đã hoàn tiền"
      if (order.payment_status === 'paid') {
        newPaymentStatus = 'refunded';
      }

      run(`
        UPDATE orders 
        SET status = 'cancelled', payment_status = ?, cancel_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newPaymentStatus, finalCancelReason, order.id]);

      run(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
        VALUES (?, ?, 'cancelled', 'seller', ?, ?)
      `, [order.id, currentStatus, req.user!.full_name, `Người bán hủy đơn: ${finalCancelReason}`]);

      run(`
        INSERT INTO shipment_events (order_id, status, location, note)
        VALUES (?, 'Đã hủy', 'Kho Đồ Cũ Còn Thương', ?)
      `, [order.id, `Đơn hàng đã được hủy bởi người bán. Lý do: ${finalCancelReason}`]);

      // Gửi thông báo đến người mua
      createNotification(
        order.buyer_id,
        order.id,
        'order_cancelled',
        'Đơn hàng đã bị hủy bởi tiệm',
        `Đơn hàng #${order.code} đã bị hủy bởi tiệm. Lý do: ${finalCancelReason}`
      );

      const updated = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
      return res.json({
        message: 'Đã hủy đơn hàng và hoàn lại tồn kho sản phẩm',
        order: updated
      });
    }

    // Trường hợp 2: Với đơn COD, khi giao thành công thì tự chuyển thành "Đã thanh toán"
    if (target_status === 'delivered' && order.payment_method === 'cod') {
      newPaymentStatus = 'paid';
    }

    // Cập nhật trạng thái mới
    run(`
      UPDATE orders 
      SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [target_status, newPaymentStatus, order.id]);

    const logNote = note || (
      target_status === 'confirmed' ? 'Người bán đã duyệt đơn và chuẩn bị hàng' :
      target_status === 'shipping' ? 'Đã bàn giao cho đơn vị vận chuyển' :
      target_status === 'delivered' ? 'Đã giao hàng thành công' :
      target_status === 'completed' ? 'Đơn hàng hoàn tất' : ''
    );

    run(`
      INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
      VALUES (?, ?, ?, 'seller', ?, ?)
    `, [order.id, currentStatus, target_status, req.user!.full_name, logNote]);

    // Đồng thời tạo sự kiện vận chuyển tương ứng nếu phù hợp
    let eventTitle = '';
    if (target_status === 'confirmed') eventTitle = 'Chờ lấy hàng';
    else if (target_status === 'shipping') eventTitle = 'Đang giao hàng';
    else if (target_status === 'delivered') eventTitle = 'Giao hàng thành công';
    else if (target_status === 'completed') eventTitle = 'Hoàn tất đơn hàng';

    if (eventTitle) {
      run(`
        INSERT INTO shipment_events (order_id, status, location, note)
        VALUES (?, ?, 'Kho hàng / Tuyến giao', ?)
      `, [order.id, eventTitle, logNote]);
    }

    // Gửi thông báo đến người mua tương ứng với trạng thái
    if (target_status === 'confirmed') {
      createNotification(
        order.buyer_id,
        order.id,
        'order_confirmed',
        'Đơn hàng đã được duyệt',
        `Đơn hàng #${order.code} của bạn đã được tiệm xác nhận và đang đóng gói cẩn thận.`
      );
    } else if (target_status === 'shipping') {
      createNotification(
        order.buyer_id,
        order.id,
        'order_shipping',
        'Đơn hàng đang trên đường giao',
        `Đơn hàng #${order.code} đã xuất kho và đang trên đường vận chuyển tới địa chỉ của bạn.`
      );
    } else if (target_status === 'delivered') {
      createNotification(
        order.buyer_id,
        order.id,
        'order_delivered',
        'Giao hàng thành công',
        `Đơn hàng #${order.code} đã được giao thành công! Bạn hãy kiểm tra kiện hàng và bấm "Đã nhận được hàng" nhé.`
      );
    }

    const updated = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
    return res.json({
      message: 'Cập nhật trạng thái đơn hàng thành công',
      order: updated
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật trạng thái đơn hàng' });
  }
});

// 5. Chọn đơn vị vận chuyển & sinh mã vận đơn
router.post('/orders/:id/carrier', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { carrier } = req.body;

    const allowedCarriers = [
      'Giao Hàng Nhanh',
      'Giao Hàng Tiết Kiệm',
      'Viettel Post',
      'J&T Express',
      'SPX Express'
    ];

    if (!carrier || !allowedCarriers.includes(carrier)) {
      return res.status(400).json({ 
        message: 'Đơn vị vận chuyển không hợp lệ. Vui lòng chọn 1 trong: Giao Hàng Nhanh, Giao Hàng Tiết Kiệm, Viettel Post, J&T Express, SPX Express' 
      });
    }

    const order = queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Sinh mã vận đơn tự động
    const carrierPrefixes: Record<string, string> = {
      'Giao Hàng Nhanh': 'GHN',
      'Giao Hàng Tiết Kiệm': 'GHTK',
      'Viettel Post': 'VTP',
      'J&T Express': 'JNT',
      'SPX Express': 'SPX'
    };
    const prefix = carrierPrefixes[carrier] || 'DCT';
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    const trackingCode = `${prefix}${randomDigits}VN`;

    run(`
      UPDATE orders 
      SET carrier = ?, tracking_code = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [carrier, trackingCode, order.id]);

    run(`
      INSERT INTO shipment_events (order_id, status, location, note)
      VALUES (?, 'Gán vận chuyển', 'Hệ thống điều phối', ?)
    `, [order.id, `Đã chọn đối tác vận chuyển: ${carrier} (Mã vận đơn: ${trackingCode})`]);

    const updated = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
    return res.json({
      message: 'Đã gán đơn vị vận chuyển thành công',
      order: updated,
      carrier,
      tracking_code: trackingCode
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi gán đơn vị vận chuyển' });
  }
});

// 6. Bàn giao cho ĐVVC (Hành động từ Kanban Vận chuyển)
router.post('/orders/:id/handover', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { carrier, location, note } = req.body;

    const allowedCarriers = [
      'Giao Hàng Nhanh',
      'Giao Hàng Tiết Kiệm',
      'Viettel Post',
      'J&T Express',
      'SPX Express'
    ];

    const chosenCarrier = carrier || 'Giao Hàng Nhanh';
    if (!allowedCarriers.includes(chosenCarrier)) {
      return res.status(400).json({ message: 'Đơn vị vận chuyển không hợp lệ' });
    }

    const order = queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    if (order.status !== 'confirmed' && order.status !== 'pending') {
      return res.status(400).json({ message: `Không thể bàn giao đơn hàng đang ở trạng thái: ${order.status}` });
    }

    // Sinh mã vận đơn nếu chưa có
    let trackingCode = order.tracking_code;
    if (!trackingCode) {
      const carrierPrefixes: Record<string, string> = {
        'Giao Hàng Nhanh': 'GHN',
        'Giao Hàng Tiết Kiệm': 'GHTK',
        'Viettel Post': 'VTP',
        'J&T Express': 'JNT',
        'SPX Express': 'SPX'
      };
      const prefix = carrierPrefixes[chosenCarrier] || 'DCT';
      const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
      trackingCode = `${prefix}${randomDigits}VN`;
    }

    const pickupLocation = location || 'Bưu cục Quận 1, TP. Hồ Chí Minh';
    const handoverNote = note || `Đã bàn giao kiện hàng cho bưu tá ${chosenCarrier}`;

    // Cập nhật trạng thái đơn thành "shipping"
    run(`
      UPDATE orders 
      SET status = 'shipping', carrier = ?, tracking_code = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [chosenCarrier, trackingCode, order.id]);

    run(`
      INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
      VALUES (?, ?, 'shipping', 'seller', ?, ?)
    `, [order.id, order.status, req.user!.full_name, `Bàn giao cho ${chosenCarrier}. Mã vận đơn: ${trackingCode}`]);

    run(`
      INSERT INTO shipment_events (order_id, status, location, note)
      VALUES (?, 'Đã bàn giao ĐVVC', ?, ?)
    `, [order.id, pickupLocation, handoverNote]);

    // Gửi thông báo đến khách hàng
    createNotification(
      order.buyer_id,
      order.id,
      'order_shipping',
      'Đơn hàng đã được bàn giao cho vận chuyển',
      `Đơn #${order.code} đã được giao cho ${chosenCarrier} · Mã vận đơn: ${trackingCode} · ${handoverNote}`
    );

    const updated = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
    const events = queryAll('SELECT * FROM shipment_events WHERE order_id = ? ORDER BY id ASC', [order.id]);

    return res.json({
      message: `Đã bàn giao đơn hàng cho ${chosenCarrier} thành công!`,
      order: updated,
      shipment_events: events
    });
  } catch (error: any) {
    console.error('Handover order error:', error);
    return res.status(500).json({ message: 'Lỗi thực hiện bàn giao cho đơn vị vận chuyển' });
  }
});

// 7. Gửi báo cáo tình trạng giao hàng (Thêm sự kiện vận chuyển / cập nhật hành trình)
router.post('/orders/:id/shipment-events', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, location, note } = req.body;

    if (!status || !location) {
      return res.status(400).json({ message: 'Vui lòng nhập trạng thái và vị trí sự kiện' });
    }

    const order = queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    run(`
      INSERT INTO shipment_events (order_id, status, location, note)
      VALUES (?, ?, ?, ?)
    `, [order.id, status, location, note || '']);

    // Tự động đồng bộ trạng thái đơn nếu sự kiện là "Giao hàng thành công"
    if (status.includes('Giao hàng thành công') || status === 'Đã giao') {
      let newPaymentStatus = order.payment_status;
      if (order.payment_method === 'cod') {
        newPaymentStatus = 'paid';
      }

      run(`
        UPDATE orders 
        SET status = 'delivered', payment_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newPaymentStatus, order.id]);

      run(`
        INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
        VALUES (?, ?, 'delivered', 'seller', ?, 'Tự động cập nhật qua sự kiện vận chuyển: Giao hàng thành công')
      `, [order.id, order.status, req.user!.full_name]);

      createNotification(
        order.buyer_id,
        order.id,
        'order_delivered',
        'Giao hàng thành công!',
        `Đơn hàng #${order.code} đã được giao thành công tại ${location}. Bạn hãy kiểm tra kiện hàng và bấm "Đã nhận được hàng" nhé.`
      );
    } else if (status.includes('Đang giao')) {
      if (order.status === 'confirmed' || order.status === 'pending') {
        run(`
          UPDATE orders 
          SET status = 'shipping', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [order.id]);

        run(`
          INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
          VALUES (?, ?, 'shipping', 'seller', ?, 'Tự động cập nhật qua sự kiện vận chuyển: Đang giao hàng')
        `, [order.id, order.status, req.user!.full_name]);
      }

      createNotification(
        order.buyer_id,
        order.id,
        'shipment_update',
        `Cập nhật lộ trình: ${status}`,
        `Đơn #${order.code}: ${status} tại ${location}${note ? ' (' + note + ')' : ''}`
      );
    } else {
      createNotification(
        order.buyer_id,
        order.id,
        'shipment_update',
        `Lộ trình đơn #${order.code}: ${status}`,
        `Vị trí: ${location}${note ? ' · ' + note : ''}`
      );
    }

    const events = queryAll('SELECT * FROM shipment_events WHERE order_id = ? ORDER BY id ASC', [order.id]);
    const updatedOrder = queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);

    return res.status(201).json({
      message: 'Đã thêm báo cáo vận chuyển mới',
      shipment_events: events,
      order: updatedOrder
    });
  } catch (error: any) {
    console.error('Shipment event error:', error);
    return res.status(500).json({ message: 'Lỗi thêm sự kiện vận chuyển' });
  }
});

// 7. Duyệt hàng loạt đơn hàng (pending -> confirmed)
router.post('/orders/bulk-confirm', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_ids } = req.body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 đơn hàng để duyệt' });
    }

    let successCount = 0;
    for (const orderId of order_ids) {
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (order && order.status === 'pending') {
        run(`
          UPDATE orders 
          SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [orderId]);

        run(`
          INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
          VALUES (?, 'pending', 'confirmed', 'seller', ?, 'Người bán duyệt đơn hàng loạt')
        `, [orderId, req.user!.full_name]);

        run(`
          INSERT INTO shipment_events (order_id, status, location, note)
          VALUES (?, 'Đã xác nhận đơn', 'Kho Tiệm Còn Thương', 'Tiệm đã xác nhận và đang đóng gói sản phẩm')
        `, [orderId]);

        createNotification(
          order.buyer_id,
          order.id,
          'order_confirmed',
          'Đơn hàng đã được xác nhận!',
          `Đơn hàng #${order.code} của bạn đã được tiệm xác nhận và đang tiến hành đóng gói cẩn thận.`
        );

        successCount++;
      }
    }

    return res.json({ 
      message: `Đã duyệt thành công ${successCount} đơn hàng!`,
      confirmed_count: successCount 
    });
  } catch (error: any) {
    console.error('Bulk confirm error:', error);
    return res.status(500).json({ message: 'Lỗi duyệt đơn hàng loạt' });
  }
});

// 8. Bàn giao hàng loạt cho ĐVVC (confirmed -> shipping)
router.post('/orders/bulk-handover', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_ids, carrier = 'Giao Hàng Nhanh (GHN)' } = req.body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 đơn hàng để bàn giao' });
    }

    let successCount = 0;
    for (const orderId of order_ids) {
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (order && (order.status === 'confirmed' || order.status === 'pending')) {
        const trackingCode = order.tracking_code || `GHN${Math.floor(100000000 + Math.random() * 900000000)}`;

        run(`
          UPDATE orders 
          SET status = 'shipping', carrier = ?, tracking_code = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [carrier, trackingCode, orderId]);

        run(`
          INSERT INTO order_status_logs (order_id, from_status, to_status, actor_role, actor_name, note)
          VALUES (?, ?, 'shipping', 'seller', ?, ?)
        `, [orderId, order.status, req.user!.full_name, `Bàn giao hàng loạt sang đơn vị vận chuyển ${carrier}`]);

        run(`
          INSERT INTO shipment_events (order_id, status, location, note)
          VALUES (?, 'Đã bàn giao ĐVVC', ?, 'Kiện hàng đã xuất kho và được bàn giao cho bưu tá giao hàng')
        `, [orderId, `Kho Tiệm Còn Thương · ${carrier}`]);

        createNotification(
          order.buyer_id,
          order.id,
          'order_shipping',
          'Đơn hàng đang trên đường giao!',
          `Đơn hàng #${order.code} đã được bàn giao cho ${carrier} với mã vận đơn ${trackingCode}.`
        );

        successCount++;
      }
    }

    return res.json({
      message: `Đã bàn giao thành công ${successCount} kiện hàng cho ${carrier}!`,
      handover_count: successCount
    });
  } catch (error: any) {
    console.error('Bulk handover error:', error);
    return res.status(500).json({ message: 'Lỗi bàn giao hàng loạt' });
  }
});

// 9. Xuất báo cáo danh sách đơn hàng sang CSV (kèm BOM UTF-8 để mở tiếng Việt trên Excel không lỗi font)
router.get('/orders/export-csv', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = queryAll(`
      SELECT o.*, u.full_name as buyer_name, u.phone as buyer_phone
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ORDER BY o.id DESC
    `);

    // Helper escape CSV cell
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const statusMapVi: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận / Đang chuẩn bị',
      shipping: 'Đang vận chuyển',
      delivered: 'Đã giao hàng',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };

    const paymentMapVi: Record<string, string> = {
      cod: 'Thanh toán khi nhận hàng (COD)',
      card: 'Thẻ quốc tế (Visa/Mastercard)',
      napas: 'Thẻ ATM nội địa (NAPAS)'
    };

    const headers = [
      'Mã đơn hàng',
      'Tài khoản đặt',
      'Người nhận',
      'Số điện thoại nhận',
      'Địa chỉ giao hàng',
      'Danh sách sản phẩm',
      'Tạm tính (đ)',
      'Mã giảm giá',
      'Số tiền giảm (đ)',
      'Phí vận chuyển (đ)',
      'Tổng thanh toán (đ)',
      'Phương thức thanh toán',
      'Trạng thái thanh toán',
      'Trạng thái đơn hàng',
      'Đơn vị vận chuyển',
      'Mã vận đơn',
      'Ghi chú',
      'Ngày tạo đơn'
    ];

    const rows = orders.map(ord => {
      const items = queryAll('SELECT product_name, quantity, price FROM order_items WHERE order_id = ?', [ord.id]);
      const itemsSummary = items.map(it => `${it.product_name} (x${it.quantity})`).join('; ');

      return [
        ord.code,
        ord.buyer_name,
        ord.recipient_name,
        ord.phone,
        ord.address,
        itemsSummary,
        ord.subtotal,
        ord.coupon_code || 'Không có',
        ord.discount_amount || 0,
        ord.shipping_fee,
        ord.total,
        paymentMapVi[ord.payment_method] || ord.payment_method,
        ord.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
        statusMapVi[ord.status] || ord.status,
        ord.carrier || 'Chưa gán',
        ord.tracking_code || 'Chưa có',
        ord.note || '',
        ord.created_at
      ].map(escapeCsv).join(',');
    });

    // Thêm UTF-8 BOM (\uFEFF) ở đầu file để Excel mở tự động nhận diện UTF-8 tiếng Việt
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-don-hang-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ message: 'Lỗi xuất báo cáo đơn hàng' });
  }
});

export default router;
