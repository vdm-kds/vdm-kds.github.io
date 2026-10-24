import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'do_cu_con_thuong_secure_vintage_key_2026';

export interface AuthUser {
  id: number;
  role: 'buyer' | 'seller';
  username: string;
  full_name: string;
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ' });
  }
}

export function requireRole(role: 'buyer' | 'seller') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Yêu cầu đăng nhập' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: role === 'seller' 
          ? 'Khu vực quản trị chỉ dành cho Người bán' 
          : 'Khu vực chỉ dành cho Khách hàng mua sắm' 
      });
    }
    next();
  };
}

export const requireAuth = authenticateToken;
export type AuthRequest = AuthenticatedRequest;


export const requireBuyer = [authenticateToken, requireRole('buyer')];
export const requireSeller = [authenticateToken, requireRole('seller')];
