import { Router } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';
import { isPresentationModeActive } from './demo.js';

const router = Router();


// Auto-expire outdated offers
function expireOutdatedOffers() {
  run(`
    UPDATE offers
    SET status = 'expired', updated_at = datetime('now')
    WHERE status IN ('pending', 'countered') AND datetime('now') > datetime(expires_at)
  `);
}

// 1. GET /api/offers/my - Buyer's offers
router.get('/my', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== 'buyer') {
    return res.status(403).json({ error: 'Chỉ người mua mới xem được danh sách trả giá cá nhân' });
  }

  expireOutdatedOffers();

  const offers = queryAll(`
    SELECT o.*, p.name AS product_name, p.image_url AS product_image, p.stock AS product_stock, p.category AS product_category
    FROM offers o
    JOIN products p ON o.product_id = p.id
    WHERE o.buyer_id = ?
    ORDER BY o.created_at DESC
  `, [req.user.id]);

  res.json({ offers });
});

// 2. GET /api/offers/seller - Seller's offers with pending counter
router.get('/seller', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ người bán mới có quyền quản trị lời trả giá' });
  }

  expireOutdatedOffers();

  const offers = queryAll(`
    SELECT o.*, 
           p.name AS product_name, p.image_url AS product_image, p.stock AS product_stock, p.category AS product_category,
           u.full_name AS buyer_name, u.phone AS buyer_phone
    FROM offers o
    JOIN products p ON o.product_id = p.id
    JOIN users u ON o.buyer_id = u.id
    ORDER BY o.created_at DESC
  `);

  const pendingCount = offers.filter(o => o.status === 'pending').length;

  res.json({ offers, pendingCount });
});

// 3. POST /api/offers - Buyer creates offer
router.post('/', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== 'buyer') {
    return res.status(403).json({ error: 'Chỉ tài khoản người mua mới được gửi lời trả giá' });
  }

  if (isPresentationModeActive() && !req.user?.is_owner) {
    return res.status(403).json({ error: 'Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!' });
  }

  expireOutdatedOffers();

  const { product_id, offered_price, message } = req.body;
  const numPrice = Number(offered_price);

  if (!product_id || !numPrice || isNaN(numPrice)) {
    return res.status(400).json({ error: 'Thông tin trả giá không hợp lệ' });
  }

  const product = queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
  if (!product) {
    return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  }

  if (product.stock <= 0) {
    return res.status(400).json({ error: 'Sản phẩm đã hết hàng, không thể trả giá' });
  }

  const minAllowed = Math.round(product.price * 0.7);
  const maxAllowed = product.price - 1000;

  if (numPrice < minAllowed || numPrice > maxAllowed) {
    return res.status(400).json({ 
      error: `Giá đề nghị phải từ 70% (${minAllowed.toLocaleString('vi-VN')}đ) đến dưới 100% (${product.price.toLocaleString('vi-VN')}đ)` 
    });
  }

  // Check existing pending or countered offer by this buyer on this product
  const existing = queryOne(`
    SELECT * FROM offers
    WHERE buyer_id = ? AND product_id = ? AND status IN ('pending', 'countered')
  `, [req.user.id, product_id]);

  if (existing) {
    return res.status(400).json({ error: 'Bạn đã có một lời trả giá đang chờ phản hồi cho sản phẩm này' });
  }

  // Insert offer with 24h expiration
  const insertRes = run(`
    INSERT INTO offers (
      buyer_id, product_id, original_price, offered_price, message, status, expires_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now', '+24 hours'), datetime('now'), datetime('now'))
  `, [req.user.id, product_id, product.price, numPrice, message ? String(message).trim() : null]);

  // Notify seller
  const seller = queryOne('SELECT id FROM users WHERE role = "seller" LIMIT 1');
  if (seller) {
    createNotification(
      seller.id,
      null,
      'offer',
      'Lời trả giá mới!',
      `Khách ${req.user.full_name} vừa gửi lời trả giá ${numPrice.toLocaleString('vi-VN')}đ (giảm ${Math.round(((product.price - numPrice) / product.price) * 100)}%) cho món "${product.name}".`
    );
  }

  res.json({
    success: true,
    message: 'Đã gửi lời trả giá tới chủ shop thành công',
    offerId: insertRes.lastInsertRowid
  });
});

// 4. POST & PUT /api/offers/:id/accept - Seller accepts offer
router.all('/:id/accept', requireAuth, (req: AuthRequest, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }
  if (req.user?.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ người bán mới có quyền chấp nhận lời trả giá' });
  }

  const offerId = Number(req.params.id);
  const offer = queryOne(`
    SELECT o.*, p.name AS product_name 
    FROM offers o
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `, [offerId]);

  if (!offer) {
    return res.status(404).json({ error: 'Lời trả giá không tồn tại' });
  }

  if (offer.status !== 'pending') {
    return res.status(400).json({ error: 'Lời trả giá không còn ở trạng thái chờ duyệt' });
  }

  run(`
    UPDATE offers
    SET status = 'accepted', expires_at = datetime('now', '+24 hours'), updated_at = datetime('now')
    WHERE id = ?
  `, [offerId]);

  createNotification(
    offer.buyer_id,
    null,
    'offer',
    'Lời trả giá được chấp nhận! 🎉',
    `Shop đã đồng ý mức giá ${offer.offered_price.toLocaleString('vi-VN')}đ cho món "${offer.product_name}". Bấm vào để thêm vào giỏ hàng ngay trong vòng 24h!`
  );

  res.json({ success: true, message: 'Đã chấp nhận lời trả giá của khách' });
});

// 5. POST & PUT /api/offers/:id/counter - Seller counter offers
router.all('/:id/counter', requireAuth, (req: AuthRequest, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }
  if (req.user?.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ người bán mới có quyền trả giá lại' });
  }

  const offerId = Number(req.params.id);
  const { counter_price, seller_note } = req.body;
  const numCounter = Number(counter_price);

  const offer = queryOne(`
    SELECT o.*, p.name AS product_name, p.price AS product_price
    FROM offers o
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `, [offerId]);

  if (!offer) {
    return res.status(404).json({ error: 'Lời trả giá không tồn tại' });
  }

  if (offer.status !== 'pending') {
    return res.status(400).json({ error: 'Lời trả giá không ở trạng thái chờ' });
  }

  if (!numCounter || numCounter <= offer.offered_price || numCounter >= offer.original_price) {
    return res.status(400).json({ 
      error: `Giá đề xuất lại phải nằm giữa mức khách đề nghị (${offer.offered_price.toLocaleString('vi-VN')}đ) và giá bán gốc (${offer.original_price.toLocaleString('vi-VN')}đ)` 
    });
  }

  run(`
    UPDATE offers
    SET status = 'countered', counter_price = ?, seller_note = ?, expires_at = datetime('now', '+24 hours'), updated_at = datetime('now')
    WHERE id = ?
  `, [numCounter, seller_note ? String(seller_note).trim() : null, offerId]);

  createNotification(
    offer.buyer_id,
    null,
    'offer',
    'Shop đã trả giá lại 💬',
    `Shop gửi giá đề xuất mới ${numCounter.toLocaleString('vi-VN')}đ cho món "${offer.product_name}". Hãy kiểm tra và chọn đồng ý hoặc từ chối.`
  );

  const updatedOffer = queryOne('SELECT * FROM offers WHERE id = ?', [offerId]);
  res.json({ success: true, message: 'Đã gửi giá đề xuất lại cho khách hàng', offer: updatedOffer });
});

// 6. POST & PUT /api/offers/:id/reject - Seller rejects offer
router.all('/:id/reject', requireAuth, (req: AuthRequest, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }
  if (req.user?.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ người bán mới có quyền từ chối trả giá' });
  }

  const offerId = Number(req.params.id);
  const { seller_note } = req.body;

  const offer = queryOne(`
    SELECT o.*, p.name AS product_name 
    FROM offers o
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `, [offerId]);

  if (!offer) {
    return res.status(404).json({ error: 'Lời trả giá không tồn tại' });
  }

  run(`
    UPDATE offers
    SET status = 'rejected', seller_note = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [seller_note ? String(seller_note).trim() : 'Giá chưa phù hợp với chất lượng món đồ', offerId]);

  createNotification(
    offer.buyer_id,
    null,
    'offer',
    'Lời trả giá không thành công',
    `Shop chưa thể bán món "${offer.product_name}" với giá bạn đề xuất. ${seller_note ? `Lý do: ${seller_note}` : ''}`
  );

  res.json({ success: true, message: 'Đã từ chối lời trả giá' });
});

// 7. POST & PUT /api/offers/:id/buyer-accept & /buyer-accept-counter
router.all(['/:id/buyer-accept', '/:id/buyer-accept-counter'], requireAuth, (req: AuthRequest, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }
  if (req.user?.role !== 'buyer') {
    return res.status(403).json({ error: 'Chỉ người mua mới có quyền phản hồi' });
  }

  const offerId = Number(req.params.id);
  const offer = queryOne(`
    SELECT o.*, p.name AS product_name 
    FROM offers o
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ? AND o.buyer_id = ?
  `, [offerId, req.user.id]);

  if (!offer) {
    return res.status(404).json({ error: 'Không tìm thấy lời trả giá' });
  }

  if (offer.status !== 'countered' || !offer.counter_price) {
    return res.status(400).json({ error: 'Lời trả giá không có đề xuất mới từ shop' });
  }

  run(`
    UPDATE offers
    SET status = 'accepted', offered_price = counter_price, expires_at = datetime('now', '+24 hours'), updated_at = datetime('now')
    WHERE id = ?
  `, [offerId]);

  const seller = queryOne('SELECT id FROM users WHERE role = "seller" LIMIT 1');
  if (seller) {
    createNotification(
      seller.id,
      null,
      'offer',
      'Khách đã đồng ý giá đề xuất! 🎉',
      `Khách ${req.user.full_name} đã chấp nhận mức giá ${offer.counter_price.toLocaleString('vi-VN')}đ cho món "${offer.product_name}".`
    );
  }

  const updatedOffer = queryOne('SELECT * FROM offers WHERE id = ?', [offerId]);
  res.json({ success: true, message: 'Đã chấp nhận giá đề xuất của shop. Bạn có thể mua ngay!', offer: updatedOffer });
});

// 8. POST & PUT /api/offers/:id/buyer-reject & /buyer-reject-counter
router.all(['/:id/buyer-reject', '/:id/buyer-reject-counter'], requireAuth, (req: AuthRequest, res) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Phương thức không hợp lệ' });
  }
  if (req.user?.role !== 'buyer') {
    return res.status(403).json({ error: 'Chỉ người mua mới có quyền phản hồi' });
  }

  const offerId = Number(req.params.id);
  const offer = queryOne(`SELECT * FROM offers WHERE id = ? AND buyer_id = ?`, [offerId, req.user.id]);

  if (!offer) {
    return res.status(404).json({ error: 'Không tìm thấy lời trả giá' });
  }

  run(`
    UPDATE offers
    SET status = 'rejected', updated_at = datetime('now')
    WHERE id = ?
  `, [offerId]);

  const updatedOffer = queryOne('SELECT * FROM offers WHERE id = ?', [offerId]);
  res.json({ success: true, message: 'Đã từ chối mức giá đề xuất của shop', offer: updatedOffer });
});

export default router;
