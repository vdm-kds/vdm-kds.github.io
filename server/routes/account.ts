import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, run } from '../db.js';
import { requireBuyer, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Lấy thông tin cá nhân
router.get('/profile', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = queryOne(`
      SELECT id, role, username, phone, full_name, created_at 
      FROM users WHERE id = ?
    `, [req.user!.id]);
    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi lấy thông tin tài khoản' });
  }
});

// Cập nhật họ tên & số điện thoại
router.put('/profile', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { full_name, phone } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ message: 'Họ và tên không được để trống' });
    }

    run(`
      UPDATE users SET full_name = ?, phone = ? WHERE id = ?
    `, [full_name.trim(), phone ? phone.trim() : null, userId]);

    const updated = queryOne(`
      SELECT id, role, username, phone, full_name, created_at 
      FROM users WHERE id = ?
    `, [userId]);

    return res.json({ message: 'Cập nhật thông tin thành công', user: updated });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật hồ sơ' });
  }
});

// Đổi mật khẩu
router.post('/change-password', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    const user = queryOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại' });
    }

    const isMatch = bcrypt.compareSync(old_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi đổi mật khẩu' });
  }
});

// SỔ ĐỊA CHỈ: Lấy danh sách
router.get('/addresses', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const addresses = queryAll(`
      SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC
    `, [userId]);
    return res.json({ addresses });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải sổ địa chỉ' });
  }
});

// Thêm địa chỉ mới
router.post('/addresses', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recipient_name, phone, address_line, is_default } = req.body;

    if (!recipient_name || !phone || !address_line) {
      return res.status(400).json({ message: 'Vui lòng điền đủ họ tên, SĐT và địa chỉ chi tiết' });
    }

    // Nếu đặt làm mặc định hoặc là địa chỉ đầu tiên
    const count = queryAll('SELECT COUNT(*) as c FROM addresses WHERE user_id = ?', [userId])[0]?.c || 0;
    const shouldDefault = is_default || count === 0 ? 1 : 0;

    if (shouldDefault === 1) {
      run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    run(`
      INSERT INTO addresses (user_id, recipient_name, phone, address_line, is_default)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, recipient_name.trim(), phone.trim(), address_line.trim(), shouldDefault]);

    const addresses = queryAll('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    return res.status(201).json({ message: 'Thêm địa chỉ thành công', addresses });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi thêm địa chỉ' });
  }
});

// Sửa địa chỉ
router.put('/addresses/:id', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { recipient_name, phone, address_line, is_default } = req.body;

    const existing = queryOne('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      return res.status(404).json({ message: 'Địa chỉ không tồn tại' });
    }

    if (is_default) {
      run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    run(`
      UPDATE addresses 
      SET recipient_name = ?, phone = ?, address_line = ?, is_default = ?
      WHERE id = ? AND user_id = ?
    `, [
      recipient_name.trim(),
      phone.trim(),
      address_line.trim(),
      is_default ? 1 : existing.is_default,
      id,
      userId
    ]);

    const addresses = queryAll('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    return res.json({ message: 'Cập nhật địa chỉ thành công', addresses });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật địa chỉ' });
  }
});

// Xóa địa chỉ
router.delete('/addresses/:id', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = queryOne('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      return res.status(404).json({ message: 'Địa chỉ không tồn tại' });
    }

    run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);

    // Nếu vừa xóa địa chỉ mặc định, đặt địa chỉ mới nhất còn lại làm mặc định
    if (existing.is_default === 1) {
      const remaining = queryOne('SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
      if (remaining) {
        run('UPDATE addresses SET is_default = 1 WHERE id = ?', [remaining.id]);
      }
    }

    const addresses = queryAll('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    return res.json({ message: 'Đã xóa địa chỉ', addresses });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi xóa địa chỉ' });
  }
});

// Đặt làm địa chỉ mặc định
router.post('/addresses/:id/default', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    run('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [id, userId]);

    const addresses = queryAll('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    return res.json({ message: 'Đã đặt làm địa chỉ mặc định', addresses });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi đặt địa chỉ mặc định' });
  }
});

// WISHLIST (Sản phẩm yêu thích)
router.get('/wishlist', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const products = queryAll(`
      SELECT p.*, w.created_at as liked_at
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.id DESC
    `, [userId]);

    return res.json({ products });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải danh sách yêu thích' });
  }
});

// Lấy danh sách ID đã like
router.get('/wishlist/ids', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rows = queryAll<{ product_id: number }>('SELECT product_id FROM wishlists WHERE user_id = ?', [userId]);
    return res.json({ product_ids: rows.map(r => r.product_id) });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải yêu thích' });
  }
});

// Toggle thêm / xóa yêu thích
router.post('/wishlist/:productId/toggle', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId;

    const existing = queryOne('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
    if (existing) {
      run('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.json({ liked: false, message: 'Đã bỏ khỏi danh sách yêu thích' });
    } else {
      run('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [userId, productId]);
      return res.json({ liked: true, message: 'Đã thêm vào danh sách yêu thích' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi thao tác yêu thích' });
  }
});

export default router;
