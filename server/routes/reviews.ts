import { Router, Response } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireBuyer, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Hàm làm mờ họ tên bảo mật thông tin (vd: Nguyễn Văn A -> N***n A, hoặc 0987654321 -> 098***4321)
function maskAuthorName(name: string): string {
  if (!name) return 'Khách hàng';
  const trimmed = name.trim();
  if (/^\d+$/.test(trimmed)) {
    // Số điện thoại
    if (trimmed.length > 6) {
      return trimmed.slice(0, 3) + '***' + trimmed.slice(-3);
    }
    return trimmed.slice(0, 2) + '***';
  }
  const parts = trimmed.split(' ');
  if (parts.length === 1) {
    const p = parts[0];
    if (p.length <= 2) return p;
    return p[0] + '***' + p[p.length - 1];
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  const maskedFirst = first.length > 2 ? first[0] + '***' + first[first.length - 1] : first[0] + '***';
  return `${maskedFirst} ${last}`;
}

// Lấy danh sách đánh giá của sản phẩm kèm phân bố sao
router.get('/product/:productId', (req, res) => {
  try {
    const productId = req.params.productId;
    const reviews = queryAll(`
      r.id, r.order_id, r.product_id, r.rating, r.comment, r.tags, r.created_at,
      u.full_name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.id DESC
    `.replace('r.id', 'SELECT r.id'), [productId]);

    const totalReviews = reviews.length;
    let avgRating = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, r) => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        return acc + r.rating;
      }, 0);
      avgRating = Number((sum / totalReviews).toFixed(1));
    }

    const maskedReviews = reviews.map(r => ({
      ...r,
      author_name: maskAuthorName(r.author_name),
      tags: r.tags ? r.tags.split(',').filter(Boolean) : []
    }));

    return res.json({
      reviews: maskedReviews,
      total_reviews: totalReviews,
      average_rating: avgRating,
      distribution
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ message: 'Lỗi tải đánh giá sản phẩm' });
  }
});

// Kiểm tra các sản phẩm đã được đánh giá trong đơn hàng
router.get('/order/:orderId/checked', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user!.id;
    const rows = queryAll<{ product_id: number }>(`
      SELECT product_id FROM reviews WHERE order_id = ? AND user_id = ?
    `, [orderId, userId]);
    return res.json({ reviewed_product_ids: rows.map(r => r.product_id) });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi kiểm tra đánh giá' });
  }
});

// Gửi đánh giá cho 1 sản phẩm trong đơn đã hoàn thành
router.post('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { order_id, product_id, rating, comment, tags } = req.body;

    if (!order_id || !product_id || !rating || !comment) {
      return res.status(400).json({ message: 'Vui lòng điền đủ điểm sao và nhận xét' });
    }

    const parsedRating = Number(rating);
    if (parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5 sao' });
    }

    const trimmedComment = String(comment).trim();
    if (trimmedComment.length < 10) {
      return res.status(400).json({ message: 'Nhận xét phải có tối thiểu 10 ký tự để tiệm và khách sau tham khảo' });
    }

    // Kiểm tra đơn hàng có thuộc về user và trạng thái là 'completed' không
    const order = queryOne('SELECT * FROM orders WHERE id = ? AND buyer_id = ?', [order_id, userId]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng tương ứng' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Chỉ có thể đánh giá sản phẩm khi đơn hàng đã Hoàn thành' });
    }

    // Kiểm tra sản phẩm có trong đơn hàng không
    const item = queryOne('SELECT * FROM order_items WHERE order_id = ? AND product_id = ?', [order_id, product_id]);
    if (!item) {
      return res.status(400).json({ message: 'Sản phẩm không thuộc đơn hàng này' });
    }

    // Kiểm tra đã đánh giá chưa
    const existing = queryOne('SELECT id FROM reviews WHERE order_id = ? AND product_id = ?', [order_id, product_id]);
    if (existing) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng rồi' });
    }

    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

    run(`
      INSERT INTO reviews (order_id, product_id, user_id, rating, comment, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [order_id, product_id, userId, parsedRating, trimmedComment, tagsStr]);

    // Bắn thông báo cho người bán
    const seller = queryOne<{ id: number }>('SELECT id FROM users WHERE role = "seller" LIMIT 1');
    if (seller) {
      createNotification(
        seller.id,
        order_id,
        'new_review',
        `Đánh giá mới ${parsedRating}⭐ cho "${item.product_name}"`,
        `Khách hàng vừa để lại đánh giá ${parsedRating} sao: "${trimmedComment.slice(0, 60)}${trimmedComment.length > 60 ? '...' : ''}" cho đơn #${order.code}`
      );
    }

    return res.status(201).json({ message: 'Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.' });
  } catch (error: any) {
    console.error('Submit review error:', error);
    return res.status(500).json({ message: 'Lỗi khi gửi đánh giá' });
  }
});

export default router;
