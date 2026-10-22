import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run } from '../db.js';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../auth.js';

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

    // Với buyer: username có thể là số điện thoại hoặc username
    const user = queryOne(`
      SELECT * FROM users 
      WHERE (username = ? OR phone = ?) AND role = ?
    `, [username, username, role]);

    if (!user) {
      return res.status(401).json({ 
        message: role === 'seller' 
          ? 'Tài khoản người bán không tồn tại' 
          : 'Số điện thoại hoặc mật khẩu không chính xác' 
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác' });
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone
    });

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone
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
    const { username, phone, password, full_name, role } = req.body;

    if (!password || !full_name || !role) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các trường bắt buộc' });
    }

    const userRole = role === 'seller' ? 'seller' : 'buyer';
    const finalUsername = userRole === 'buyer' ? (phone || username) : username;

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

    const passwordHash = bcrypt.hashSync(password, 10);
    const insertRes = run(`
      INSERT INTO users (role, username, phone, password_hash, full_name)
      VALUES (?, ?, ?, ?, ?)
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
      phone: userRole === 'buyer' ? finalUsername : undefined
    });

    return res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: newUserId,
        role: userRole,
        username: finalUsername,
        full_name,
        phone: userRole === 'buyer' ? finalUsername : undefined
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký' });
  }
});

// Lấy thông tin tài khoản hiện tại
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = queryOne('SELECT id, role, username, phone, full_name, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    let defaultAddress = null;
    if (user.role === 'buyer') {
      defaultAddress = queryOne('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC LIMIT 1', [user.id]);
    }

    return res.json({
      user,
      address: defaultAddress
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi lấy thông tin người dùng' });
  }
});

export default router;
