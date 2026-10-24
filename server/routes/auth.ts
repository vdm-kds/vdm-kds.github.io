import { Router } from 'express';
import { queryOne, run } from '../db.js';
import { generateToken, authenticateToken, AuthenticatedRequest, hashPassword, verifyPassword } from '../auth.js';
import { isPresentationModeActive } from './demo.js';

const router = Router();

// Đăng nhập (hỗ trợ cả Khách hàng và Người bán)
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin đăng nhập' });
    }

    if (role !== 'buyer' && role !== 'seller') {
      return res.status(400).json({ message: 'Vai trò người dùng không hợp lệ' });
    }

    const cleanUsername = String(username).trim();

    // Tìm tài khoản
    const user = queryOne(`
      SELECT * FROM users 
      WHERE (username = ? OR phone = ?) AND role = ?
    `, [cleanUsername, cleanUsername, role]);

    if (!user) {
      // Thông báo lỗi chung, không tiết lộ tài khoản có tồn tại hay không
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // Kiểm tra khóa tài khoản (5 phút nếu sai 5 lần)
    if (user.lockout_until) {
      const rawLock = String(user.lockout_until);
      const isoLock = rawLock.endsWith('Z') ? rawLock : (rawLock.includes('T') ? rawLock + 'Z' : rawLock.replace(' ', 'T') + 'Z');
      const lockTime = new Date(isoLock).getTime();
      if (!isNaN(lockTime) && lockTime > Date.now()) {
        return res.status(403).json({ message: 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 5 phút' });
      }
    }

    const isMatch = verifyPassword(user.username, password, user.password_hash);
    if (!isMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= 5) {
        const lockoutIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        run("UPDATE users SET failed_login_attempts = 0, lockout_until = ? WHERE id = ?", [lockoutIso, user.id]);
        return res.status(403).json({ message: 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 5 phút' });
      } else {
        run("UPDATE users SET failed_login_attempts = ? WHERE id = ?", [attempts, user.id]);
        return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
      }
    }

    // Đăng nhập thành công -> xóa đếm số lần sai
    run("UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?", [user.id]);

    const isOwner = Boolean(user.is_owner);

    const token = generateToken({
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone,
      is_owner: isOwner
    });

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        is_owner: isOwner
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// Đăng ký tài khoản
router.post('/register', async (req, res) => {
  try {
    // Chế độ thuyết trình: tạm khóa đăng ký mới
    if (isPresentationModeActive()) {
      return res.status(403).json({ message: 'Đăng ký tài khoản mới đang tạm khóa trong buổi thuyết trình.' });
    }

    const { username, phone, password, full_name, role } = req.body;

    if (!password || !full_name || !role) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các trường bắt buộc' });
    }

    const userRole = role === 'seller' ? 'seller' : 'buyer';
    const finalUsername = String(userRole === 'buyer' ? (phone || username) : username).trim();

    if (!finalUsername) {
      return res.status(400).json({ 
        message: userRole === 'buyer' ? 'Vui lòng nhập số điện thoại' : 'Vui lòng nhập tên đăng nhập' 
      });
    }

    if (userRole === 'buyer' && !/^0\d{9}$/.test(finalUsername)) {
      return res.status(400).json({ message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng số 0' });
    }

    // Kiểm tra trùng lặp
    const existing = queryOne('SELECT id FROM users WHERE username = ? OR (phone = ? AND phone IS NOT NULL)', [finalUsername, finalUsername]);
    if (existing) {
      return res.status(400).json({ 
        message: userRole === 'buyer' ? 'Số điện thoại này đã được đăng ký' : 'Tên đăng nhập đã tồn tại' 
      });
    }

    // Mã băm SHA-256 theo chuẩn dcct:{username}:{password}
    const passwordHash = hashPassword(finalUsername, password);
    const insertRes = run(`
      INSERT INTO users (role, username, phone, password_hash, full_name, is_owner)
      VALUES (?, ?, ?, ?, ?, 0)
    `, [userRole, finalUsername, userRole === 'buyer' ? finalUsername : null, passwordHash, full_name]);

    const newUserId = insertRes.lastInsertRowid;

    // Nếu là buyer, tạo sẵn địa chỉ mặc định rỗng nếu có gửi kèm
    if (userRole === 'buyer' && req.body.address) {
      run(`
        INSERT INTO addresses (user_id, recipient_name, phone, address_line, is_default)
        VALUES (?, ?, ?, ?, 1)
      `, [newUserId, full_name, finalUsername, req.body.address]);
    }

    const token = generateToken({
      id: newUserId,
      role: userRole,
      username: finalUsername,
      full_name,
      phone: userRole === 'buyer' ? finalUsername : undefined,
      is_owner: false
    });

    return res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: newUserId,
        role: userRole,
        username: finalUsername,
        full_name,
        phone: userRole === 'buyer' ? finalUsername : undefined,
        is_owner: false
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký' });
  }
});

// Đổi mật khẩu
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user!.id;

    if (!old_password || !new_password) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới' });
    }

    if (String(new_password).length < 8) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 8 ký tự' });
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = verifyPassword(user.username, old_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
    }

    const newHash = hashPassword(user.username, new_password);
    run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Lỗi khi đổi mật khẩu' });
  }
});

// Lấy thông tin tài khoản hiện tại
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = queryOne('SELECT id, role, username, phone, full_name, is_owner, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    let defaultAddress = null;
    if (user.role === 'buyer') {
      defaultAddress = queryOne('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC LIMIT 1', [user.id]);
    }

    return res.json({
      user: {
        ...user,
        is_owner: Boolean(user.is_owner)
      },
      address: defaultAddress
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi lấy thông tin người dùng' });
  }
});

export default router;
