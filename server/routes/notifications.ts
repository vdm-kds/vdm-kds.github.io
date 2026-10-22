import { Router, Response } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Lấy danh sách thông báo của người dùng hiện tại (Khách mua hoặc Người bán)
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = queryAll(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY id DESC 
      LIMIT 50
    `, [userId]);

    const unreadCount = queryOne(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [userId])?.count || 0;

    return res.json({
      notifications,
      unread_count: unreadCount
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ message: 'Lỗi tải danh sách thông báo' });
  }
});

// Đánh dấu 1 thông báo đã đọc
router.put('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    run(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    return res.json({ message: 'Đã đánh dấu thông báo đã đọc' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
});

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    run(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ?
    `, [userId]);

    return res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi đánh dấu tất cả thông báo' });
  }
});

export default router;
