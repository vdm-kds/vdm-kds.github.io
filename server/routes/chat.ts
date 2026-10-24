import { Router } from 'express';
import { queryAll, queryOne, run, createNotification } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';
import { isPresentationModeActive } from './demo.js';

const router = Router();


// Filter checking for phone numbers and external URLs
function containsRestrictedContact(text: string): boolean {
  // Check phone numbers (e.g. 0912345678, 090 123 4567, 098.765.4321, +84...)
  const phoneRegex = /(?:\+84|0)[1-9](?:[\s.-]?\d){7,9}/;
  const rawDigits = text.replace(/\D/g, '');
  const hasLongDigits = /(?:^|\D)(?:0|\+84)\d{8,11}(?:\D|$)/.test(text.replace(/[\s.-]/g, ''));

  // Check external links
  const urlRegex = /(?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.(?:com|vn|net|org|io|xyz|info|edu|biz|cc|me|app)(?:\/[^\s]*)?/i;

  return phoneRegex.test(text) || hasLongDigits || urlRegex.test(text);
}

// 1. GET /api/chat/conversations - List conversations
router.get('/conversations', requireAuth, (req: AuthRequest, res) => {
  const isSeller = req.user?.role === 'seller';
  const userId = req.user?.id;

  let conversations = [];
  if (isSeller) {
    conversations = queryAll(`
      SELECT c.*, 
             u.full_name AS buyer_name, u.phone AS buyer_phone,
             p.name AS product_name, p.image_url AS product_image, p.price AS product_price,
             o.code AS order_code, o.status AS order_status
      FROM chat_conversations c
      JOIN users u ON c.buyer_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN orders o ON c.order_id = o.id
      ORDER BY c.last_message_at DESC
    `);
  } else {
    conversations = queryAll(`
      SELECT c.*, 
             p.name AS product_name, p.image_url AS product_image, p.price AS product_price,
             o.code AS order_code, o.status AS order_status
      FROM chat_conversations c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN orders o ON c.order_id = o.id
      WHERE c.buyer_id = ?
      ORDER BY c.last_message_at DESC
    `, [userId]);
  }

  const unreadTotal = isSeller
    ? conversations.reduce((acc, c) => acc + (c.seller_unread || 0), 0)
    : conversations.reduce((acc, c) => acc + (c.buyer_unread || 0), 0);

  res.json({ conversations, unreadTotal });
});

// 2. POST /api/chat/start - Start or retrieve conversation
router.post('/start', requireAuth, (req: AuthRequest, res) => {
  const { product_id, order_id } = req.body;
  const isSeller = req.user?.role === 'seller';
  if (!isSeller && isPresentationModeActive() && !req.user?.is_owner) {
    return res.status(403).json({ error: 'Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!' });
  }
  const buyerId = req.user?.role === 'buyer' ? req.user.id : Number(req.body.buyer_id);

  if (!buyerId) {
    return res.status(400).json({ error: 'Thiếu thông tin người mua' });
  }

  let existing = null;
  if (product_id) {
    existing = queryOne(`
      SELECT * FROM chat_conversations 
      WHERE buyer_id = ? AND product_id = ? 
      ORDER BY last_message_at DESC LIMIT 1
    `, [buyerId, product_id]);
  } else if (order_id) {
    existing = queryOne(`
      SELECT * FROM chat_conversations 
      WHERE buyer_id = ? AND order_id = ? 
      ORDER BY last_message_at DESC LIMIT 1
    `, [buyerId, order_id]);
  } else {
    existing = queryOne(`
      SELECT * FROM chat_conversations 
      WHERE buyer_id = ? 
      ORDER BY last_message_at DESC LIMIT 1
    `, [buyerId]);
  }

  if (existing) {
    const msgs = queryAll(`SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC`, [existing.id]);
    return res.json({ conversation: { ...existing, messages: msgs }, messages: msgs });
  }

  // Create new conversation
  const insertRes = run(`
    INSERT INTO chat_conversations (buyer_id, product_id, order_id, last_message, last_message_at, buyer_unread, seller_unread)
    VALUES (?, ?, ?, 'Bắt đầu cuộc trò chuyện', datetime('now'), 0, 0)
  `, [buyerId, product_id || null, order_id || null]);

  const newConv = queryOne('SELECT * FROM chat_conversations WHERE id = ?', [insertRes.lastInsertRowid]);
  res.json({ conversation: { ...newConv, messages: [] }, messages: [] });
});

// 3. GET /api/chat/:id & /api/chat/conversations/:id - Get conversation details and messages
router.get(['/:id', '/conversations/:id'], requireAuth, (req: AuthRequest, res) => {
  const convId = Number(req.params.id);
  const isSeller = req.user?.role === 'seller';
  const userId = req.user?.id;

  const conv = queryOne(`
    SELECT c.*, 
           u.full_name AS buyer_name, u.phone AS buyer_phone,
           p.name AS product_name, p.image_url AS product_image, p.price AS product_price, p.condition_pct AS product_condition_pct,
           o.code AS order_code, o.status AS order_status, o.total AS order_total
    FROM chat_conversations c
    JOIN users u ON c.buyer_id = u.id
    LEFT JOIN products p ON c.product_id = p.id
    LEFT JOIN orders o ON c.order_id = o.id
    WHERE c.id = ?
  `, [convId]);

  if (!conv) {
    return res.status(404).json({ error: 'Cuộc trò chuyện không tồn tại' });
  }

  if (!isSeller && conv.buyer_id !== userId) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập cuộc trò chuyện này' });
  }

  // Mark as read
  if (isSeller) {
    run(`UPDATE chat_conversations SET seller_unread = 0 WHERE id = ?`, [convId]);
    run(`UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = 'buyer'`, [convId]);
  } else {
    run(`UPDATE chat_conversations SET buyer_unread = 0 WHERE id = ?`, [convId]);
    run(`UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = 'seller'`, [convId]);
  }

  const messages = queryAll(`
    SELECT * FROM chat_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `, [convId]);

  res.json({ conversation: { ...conv, messages }, messages });
});

// 4. POST /api/chat/:id/messages & /api/chat/conversations/:id/messages - Send message with safety filter
router.post(['/:id/messages', '/conversations/:id/messages'], requireAuth, (req: AuthRequest, res) => {
  const convId = Number(req.params.id);
  const isSeller = req.user?.role === 'seller';
  const userId = req.user?.id;
  if (!isSeller && isPresentationModeActive() && !req.user?.is_owner) {
    return res.status(403).json({ error: 'Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!' });
  }
  const { content } = req.body;

  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });
  }

  const cleanText = String(content).trim();

  // Safety filter against phone numbers and external links
  if (containsRestrictedContact(cleanText)) {
    return res.status(400).json({
      error: 'Vì an toàn, vui lòng giao dịch trên Đồ Cũ Còn Thương. Hệ thống không cho phép chia sẻ số điện thoại hoặc liên kết ngoài trong khung chat.'
    });
  }

  const conv = queryOne(`SELECT * FROM chat_conversations WHERE id = ?`, [convId]);
  if (!conv) {
    return res.status(404).json({ error: 'Cuộc trò chuyện không tồn tại' });
  }

  if (!isSeller && conv.buyer_id !== userId) {
    return res.status(403).json({ error: 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này' });
  }

  const senderRole = isSeller ? 'seller' : 'buyer';

  const insertRes = run(`
    INSERT INTO chat_messages (conversation_id, sender_role, sender_id, content, is_read, created_at)
    VALUES (?, ?, ?, ?, 0, datetime('now'))
  `, [convId, senderRole, userId, cleanText]);

  // Update conversation last message & unread counters
  if (isSeller) {
    run(`
      UPDATE chat_conversations
      SET last_message = ?, last_message_at = datetime('now'), buyer_unread = buyer_unread + 1
      WHERE id = ?
    `, [cleanText, convId]);

    // Notify Buyer
    createNotification(
      conv.buyer_id,
      conv.order_id || null,
      'chat',
      'Tin nhắn mới từ Tiệm Đồ Cũ Còn Thương 💬',
      cleanText.length > 60 ? cleanText.substring(0, 60) + '...' : cleanText
    );
  } else {
    run(`
      UPDATE chat_conversations
      SET last_message = ?, last_message_at = datetime('now'), seller_unread = seller_unread + 1
      WHERE id = ?
    `, [cleanText, convId]);

    // Notify Seller
    const seller = queryOne('SELECT id FROM users WHERE role = "seller" LIMIT 1');
    if (seller) {
      createNotification(
        seller.id,
        conv.order_id || null,
        'chat',
        `Tin nhắn mới từ khách ${req.user?.full_name} 💬`,
        cleanText.length > 60 ? cleanText.substring(0, 60) + '...' : cleanText
      );
    }
  }

  const newMessage = queryOne('SELECT * FROM chat_messages WHERE id = ?', [insertRes.lastInsertRowid]);
  res.json({ success: true, message: newMessage });
});

export default router;
