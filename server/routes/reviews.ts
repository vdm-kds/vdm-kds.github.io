import { Router, Response } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireBuyer, requireSeller, requireAuth, optionalAuth, AuthenticatedRequest } from '../auth.js';
import { isPresentationModeActive } from './demo.js';

const router = Router();

// Hàm làm mờ họ tên bảo mật thông tin (vd: Nguyễn Văn A -> N***n A, hoặc 0987654321 -> 098***4321)
function maskAuthorName(name: string): string {
  if (!name) return 'Khách hàng';
  const trimmed = name.trim();
  if (/^\d+$/.test(trimmed)) {
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

function parseImages(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw).split(',').filter(Boolean);
  }
}

// 1. GET /product/:productId - Danh sách đánh giá của sản phẩm kèm phân bố sao
router.get('/product/:productId', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.productId;
    const currentUserId = req.user?.id || 0;

    const rawReviews = queryAll(`
      SELECT r.*,
             u.full_name as author_name,
             p.condition_pct as product_condition_pct
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.product_id = ?
      ORDER BY r.id DESC
    `, [productId]);

    // Lọc: nếu review bị ẩn (is_hidden = 1), chỉ chính người viết mới thấy
    const visibleReviews = rawReviews.filter(r => {
      if (r.is_hidden === 1) {
        return r.user_id === currentUserId;
      }
      return true;
    });

    // Tính điểm chỉ trên những đánh giá công khai (không bị ẩn)
    const publicReviews = rawReviews.filter(r => r.is_hidden !== 1);
    const totalReviews = publicReviews.length;
    let avgRating = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      const sum = publicReviews.reduce((acc, r) => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        return acc + r.rating;
      }, 0);
      avgRating = Number((sum / totalReviews).toFixed(1));
    }

    const now = Date.now();
    const formattedReviews = visibleReviews.map(r => {
      const images = parseImages(r.images);
      let helpfulUserIds: number[] = [];
      try {
        helpfulUserIds = JSON.parse(r.helpful_user_ids || '[]');
      } catch {
        helpfulUserIds = [];
      }

      const reviewDate = new Date(r.created_at).getTime();
      const isWithin7Days = now - reviewDate <= 7 * 24 * 60 * 60 * 1000;
      const canEdit = currentUserId === r.user_id && (r.edit_count || 0) < 1 && isWithin7Days;

      return {
        id: r.id,
        order_id: r.order_id,
        product_id: r.product_id,
        user_id: r.user_id,
        rating: r.rating,
        comment: r.comment,
        tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
        images,
        video_url: r.video_url || null,
        video_duration: r.video_duration || null,
        video_poster: r.video_poster || null,
        is_anonymous: Boolean(r.is_anonymous),
        author_name: r.is_anonymous ? 'Người mua ẩn danh' : maskAuthorName(r.author_name),
        product_condition_pct: r.product_condition_pct || 90,
        helpful_count: r.helpful_count || 0,
        is_helpful_by_me: helpfulUserIds.includes(currentUserId),
        seller_reply: r.seller_reply || null,
        seller_reply_at: r.seller_reply_at || null,
        is_hidden: Boolean(r.is_hidden),
        is_hidden_notice: r.is_hidden ? 'Đánh giá đang bị ẩn' : null,
        report_reason: r.report_reason || null,
        created_at: r.created_at,
        updated_at: r.updated_at || null,
        edit_count: r.edit_count || 0,
        can_edit: canEdit
      };
    });

    const mediaCount = formattedReviews.filter(r => r.images.length > 0 || r.video_url).length;

    return res.json({
      reviews: formattedReviews,
      total_reviews: totalReviews,
      average_rating: avgRating,
      distribution,
      media_count: mediaCount
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ message: 'Lỗi tải đánh giá sản phẩm' });
  }
});

// 2. GET /shop - Gộp tất cả đánh giá của mọi sản phẩm trong shop
router.get('/shop', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id || 0;

    const rawReviews = queryAll(`
      SELECT r.*,
             u.full_name as author_name,
             p.name as product_name,
             p.image_url as product_image,
             p.condition_pct as product_condition_pct
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.is_hidden = 0 OR r.user_id = ?
      ORDER BY r.id DESC
    `, [currentUserId]);

    const publicReviews = rawReviews.filter(r => r.is_hidden !== 1);
    const totalReviews = publicReviews.length;
    let avgRating = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      const sum = publicReviews.reduce((acc, r) => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        return acc + r.rating;
      }, 0);
      avgRating = Number((sum / totalReviews).toFixed(1));
    }

    const formattedReviews = rawReviews.map(r => {
      const images = parseImages(r.images);
      let helpfulUserIds: number[] = [];
      try {
        helpfulUserIds = JSON.parse(r.helpful_user_ids || '[]');
      } catch {
        helpfulUserIds = [];
      }

      return {
        id: r.id,
        order_id: r.order_id,
        product_id: r.product_id,
        product_name: r.product_name,
        product_image: r.product_image,
        product_condition_pct: r.product_condition_pct || 90,
        user_id: r.user_id,
        rating: r.rating,
        comment: r.comment,
        tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
        images,
        video_url: r.video_url || null,
        video_duration: r.video_duration || null,
        video_poster: r.video_poster || null,
        is_anonymous: Boolean(r.is_anonymous),
        author_name: r.is_anonymous ? 'Người mua ẩn danh' : maskAuthorName(r.author_name),
        helpful_count: r.helpful_count || 0,
        is_helpful_by_me: helpfulUserIds.includes(currentUserId),
        seller_reply: r.seller_reply || null,
        seller_reply_at: r.seller_reply_at || null,
        is_hidden: Boolean(r.is_hidden),
        created_at: r.created_at
      };
    });

    const recentReviews = formattedReviews.slice(0, 3);

    return res.json({
      reviews: formattedReviews,
      recent_reviews: recentReviews,
      total_reviews: totalReviews,
      average_rating: avgRating,
      distribution
    });
  } catch (error: any) {
    console.error('Error fetching shop reviews:', error);
    return res.status(500).json({ message: 'Lỗi tải đánh giá cửa hàng' });
  }
});

// 3. GET /seller - Dành cho người bán quản lý phản hồi và báo cáo
router.get('/seller', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawReviews = queryAll(`
      SELECT r.*,
             u.full_name as author_name,
             u.phone as author_phone,
             p.name as product_name,
             p.image_url as product_image,
             o.code as order_code
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      JOIN orders o ON r.order_id = o.id
      ORDER BY r.id DESC
    `);

    const formattedReviews = rawReviews.map(r => ({
      ...r,
      images: parseImages(r.images),
      tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
      is_anonymous: Boolean(r.is_anonymous),
      is_hidden: Boolean(r.is_hidden)
    }));

    const totalReviews = formattedReviews.length;
    let avgRating = 0;
    if (totalReviews > 0) {
      const sum = formattedReviews.reduce((acc, r) => acc + r.rating, 0);
      avgRating = Number((sum / totalReviews).toFixed(1));
    }

    const unrepliedCount = formattedReviews.filter(r => !r.seller_reply).length;

    return res.json({
      reviews: formattedReviews,
      total_reviews: totalReviews,
      average_rating: avgRating,
      unreplied_count: unrepliedCount
    });
  } catch (error: any) {
    console.error('Error fetching seller reviews:', error);
    return res.status(500).json({ message: 'Lỗi tải danh sách đánh giá của người bán' });
  }
});

// 4. GET /order/:orderId/checked - Kiểm tra các sản phẩm đã được đánh giá trong đơn hàng
router.get('/order/:orderId/checked', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user!.id;
    const rows = queryAll(`
      SELECT r.*, p.name as product_name, p.image_url as product_image, p.condition_pct
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE r.order_id = ? AND r.user_id = ?
    `, [orderId, userId]);

    const formatted = rows.map(r => ({
      ...r,
      images: parseImages(r.images),
      tags: r.tags ? r.tags.split(',').filter(Boolean) : []
    }));

    return res.json({
      reviewed_product_ids: rows.map(r => r.product_id),
      reviews: formatted
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi kiểm tra đánh giá' });
  }
});

// 5. POST / - Gửi đánh giá cho sản phẩm trong đơn đã hoàn thành
router.post('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isPresentationModeActive() && !req.user?.is_owner) {
      return res.status(403).json({ message: 'Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!' });
    }

    const {
      order_id,
      product_id,
      rating,
      comment,
      tags,
      images,
      video_url,
      video_duration,
      video_poster,
      is_anonymous
    } = req.body;

    if (!order_id || !product_id || !rating || !comment) {
      return res.status(400).json({ message: 'Vui lòng điền đủ điểm sao và nhận xét' });
    }

    const parsedRating = Number(rating);
    if (parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5 sao' });
    }

    const trimmedComment = String(comment).trim();
    if (trimmedComment.length < 10 || trimmedComment.length > 500) {
      return res.status(400).json({ message: 'Nhận xét phải có độ dài từ 10 đến 500 ký tự' });
    }

    // Kiểm tra đơn hàng có thuộc về user và trạng thái là 'completed' không
    const order = queryOne('SELECT * FROM orders WHERE id = ? AND buyer_id = ?', [order_id, userId]);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng tương ứng' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Chỉ có thể đánh giá sản phẩm khi đơn hàng đã Hoàn thành' });
    }

    // Kiểm tra thời hạn 30 ngày kể từ khi hoàn thành
    const orderDate = new Date(order.updated_at || order.created_at).getTime();
    const daysDiff = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      return res.status(400).json({ message: 'Đã quá thời hạn đánh giá 30 ngày kể từ khi hoàn thành đơn hàng' });
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
    const imagesStr = Array.isArray(images) ? JSON.stringify(images.slice(0, 5)) : (images ? JSON.stringify([images]) : '[]');
    const isAnon = is_anonymous ? 1 : 0;
    const dur = video_duration ? Number(video_duration) : null;

    const result = run(`
      INSERT INTO reviews (
        order_id, product_id, user_id, rating, comment, tags,
        images, video_url, video_duration, video_poster, is_anonymous,
        helpful_count, helpful_user_ids, is_hidden, edit_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '[]', 0, 0, datetime('now'), datetime('now'))
    `, [
      order_id, product_id, userId, parsedRating, trimmedComment, tagsStr,
      imagesStr, video_url || null, dur, video_poster || null, isAnon
    ]);

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

    return res.status(201).json({
      message: 'Cảm ơn bạn đã đánh giá!',
      review_id: result.lastInsertRowid
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    return res.status(500).json({ message: 'Lỗi khi gửi đánh giá' });
  }
});

// 6. PUT /:id - Sửa đánh giá (1 lần trong 7 ngày)
router.put('/:id', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = req.user!.id;
    const { rating, comment, tags, images, video_url, video_duration, video_poster, is_anonymous } = req.body;

    const review = queryOne('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    if (review.user_id !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa đánh giá này' });
    }

    if ((review.edit_count || 0) >= 1) {
      return res.status(400).json({ message: 'Mỗi đánh giá chỉ được phép chỉnh sửa 1 lần' });
    }

    const createdTime = new Date(review.created_at).getTime();
    if (Date.now() - createdTime > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Đã quá thời hạn 7 ngày để chỉnh sửa đánh giá' });
    }

    const parsedRating = Number(rating || review.rating);
    const trimmedComment = String(comment || review.comment).trim();
    if (trimmedComment.length < 10 || trimmedComment.length > 500) {
      return res.status(400).json({ message: 'Nhận xét phải có độ dài từ 10 đến 500 ký tự' });
    }

    const tagsStr = tags !== undefined ? (Array.isArray(tags) ? tags.join(',') : String(tags)) : review.tags;
    const imagesStr = images !== undefined ? (Array.isArray(images) ? JSON.stringify(images.slice(0, 5)) : JSON.stringify([images])) : review.images;
    const isAnon = is_anonymous !== undefined ? (is_anonymous ? 1 : 0) : review.is_anonymous;

    run(`
      UPDATE reviews
      SET rating = ?,
          comment = ?,
          tags = ?,
          images = ?,
          video_url = ?,
          video_duration = ?,
          video_poster = ?,
          is_anonymous = ?,
          edit_count = edit_count + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `, [
      parsedRating,
      trimmedComment,
      tagsStr,
      imagesStr,
      video_url !== undefined ? video_url : review.video_url,
      video_duration !== undefined ? Number(video_duration) : review.video_duration,
      video_poster !== undefined ? video_poster : review.video_poster,
      isAnon,
      reviewId
    ]);

    return res.json({ message: 'Cập nhật đánh giá thành công!' });
  } catch (error: any) {
    console.error('Update review error:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật đánh giá' });
  }
});

// 7. POST /:id/helpful - Bấm hoặc hủy Hữu ích cho đánh giá
router.post('/:id/helpful', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = req.user!.id;

    const review = queryOne('SELECT id, helpful_count, helpful_user_ids FROM reviews WHERE id = ?', [reviewId]);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    let userIds: number[] = [];
    try {
      userIds = JSON.parse(review.helpful_user_ids || '[]');
    } catch {
      userIds = [];
    }

    const index = userIds.indexOf(userId);
    let newCount = review.helpful_count || 0;
    let isHelpful = false;

    if (index > -1) {
      userIds.splice(index, 1);
      newCount = Math.max(0, newCount - 1);
      isHelpful = false;
    } else {
      userIds.push(userId);
      newCount += 1;
      isHelpful = true;
    }

    run(`
      UPDATE reviews 
      SET helpful_count = ?, helpful_user_ids = ?
      WHERE id = ?
    `, [newCount, JSON.stringify(userIds), reviewId]);

    return res.json({
      helpful_count: newCount,
      is_helpful: isHelpful
    });
  } catch (error: any) {
    console.error('Helpful toggle error:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật hữu ích' });
  }
});

// 8. POST /:id/reply - Người bán phản hồi đánh giá
router.post('/:id/reply', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const { reply } = req.body;

    if (!reply || !String(reply).trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi' });
    }

    const trimmed = String(reply).trim();
    if (trimmed.length > 300) {
      return res.status(400).json({ message: 'Phản hồi tối đa 300 ký tự' });
    }

    const review = queryOne(`
      SELECT r.*, p.name as product_name
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE r.id = ?
    `, [reviewId]);

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    run(`
      UPDATE reviews
      SET seller_reply = ?, seller_reply_at = datetime('now')
      WHERE id = ?
    `, [trimmed, reviewId]);

    // Bắn thông báo cho người mua
    createNotification(
      review.user_id,
      review.order_id,
      'seller_reply',
      'Người bán đã phản hồi đánh giá của bạn',
      `Tiệm Đồ Cũ Còn Thương vừa phản hồi đánh giá món "${review.product_name}": "${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}"`
    );

    return res.json({
      message: 'Phản hồi đánh giá thành công',
      seller_reply: trimmed,
      seller_reply_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Reply error:', error);
    return res.status(500).json({ message: 'Lỗi phản hồi đánh giá' });
  }
});

// 9. POST /:id/report - Người bán báo cáo vi phạm, ẩn đánh giá khỏi trang công khai
router.post('/:id/report', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const { reason } = req.body;

    const validReasons = ['Ngôn từ không phù hợp', 'Spam', 'Không liên quan'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Lý do báo cáo không hợp lệ (Ngôn từ không phù hợp, Spam, Không liên quan)' });
    }

    const review = queryOne('SELECT id FROM reviews WHERE id = ?', [reviewId]);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    run(`
      UPDATE reviews
      SET is_hidden = 1, report_reason = ?
      WHERE id = ?
    `, [reason, reviewId]);

    return res.json({
      message: 'Đã ẩn đánh giá khỏi trang công khai vì lý do vi phạm',
      is_hidden: true,
      report_reason: reason
    });
  } catch (error: any) {
    console.error('Report error:', error);
    return res.status(500).json({ message: 'Lỗi báo cáo vi phạm đánh giá' });
  }
});

export default router;
