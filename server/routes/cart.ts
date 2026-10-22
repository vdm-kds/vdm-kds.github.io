import { Router, Response } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { requireBuyer, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Phí ship cố định demo: 30.000đ (miễn phí cho đơn từ 1.000.000đ)
export function calculateShippingFee(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= 1000000 ? 0 : 30000;
}

// Lấy danh sách giỏ hàng của người mua
router.get('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;

    const items = queryAll(`
      SELECT 
        c.id, c.product_id, c.quantity, c.created_at,
        p.name, p.category, p.price, p.original_price, p.condition_pct, p.condition_detail, p.stock, p.image_url
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.id DESC
    `, [buyerId]);

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping_fee = calculateShippingFee(subtotal);
    const total = subtotal + shipping_fee;

    return res.json({
      items,
      subtotal,
      shipping_fee,
      total,
      item_count: items.reduce((count, item) => count + item.quantity, 0)
    });
  } catch (error: any) {
    console.error('Get cart error:', error);
    return res.status(500).json({ message: 'Lỗi tải giỏ hàng' });
  }
});

// Thêm sản phẩm vào giỏ
router.post('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: 'Thiếu mã sản phẩm' });
    }

    const product = queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ message: 'Sản phẩm này hiện đã hết hàng' });
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);

    const existingCartItem = queryOne('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [buyerId, product_id]);

    let newQty = requestedQty;
    if (existingCartItem) {
      newQty = existingCartItem.quantity + requestedQty;
    }

    if (newQty > product.stock) {
      return res.status(400).json({ 
        message: `Kho chỉ còn ${product.stock} món, không thể thêm quá số lượng tồn kho` 
      });
    }

    if (existingCartItem) {
      run('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existingCartItem.id]);
    } else {
      run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [buyerId, product_id, newQty]);
    }

    return res.json({ message: 'Đã thêm sản phẩm vào giỏ hàng' });
  } catch (error: any) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ message: 'Lỗi thêm vào giỏ hàng' });
  }
});

// Cập nhật số lượng món trong giỏ
router.put('/:id', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { id } = req.params;
    const { quantity } = req.body;

    const cartItem = queryOne(`
      SELECT c.*, p.stock 
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ? AND c.user_id = ?
    `, [id, buyerId]);

    if (!cartItem) {
      return res.status(404).json({ message: 'Không tìm thấy mục trong giỏ' });
    }

    const targetQty = Number(quantity);
    if (targetQty <= 0) {
      run('DELETE FROM cart_items WHERE id = ?', [id]);
      return res.json({ message: 'Đã xóa món khỏi giỏ hàng' });
    }

    if (targetQty > cartItem.stock) {
      return res.status(400).json({ 
        message: `Số lượng vượt quá tồn kho hiện có (${cartItem.stock} món)` 
      });
    }

    run('UPDATE cart_items SET quantity = ? WHERE id = ?', [targetQty, id]);
    return res.json({ message: 'Đã cập nhật số lượng' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật giỏ hàng' });
  }
});

// Xóa 1 món khỏi giỏ
router.delete('/:id', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { id } = req.params;

    run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [id, buyerId]);
    return res.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi xóa món khỏi giỏ' });
  }
});

// Xóa sạch giỏ hàng
router.delete('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    run('DELETE FROM cart_items WHERE user_id = ?', [buyerId]);
    return res.json({ message: 'Đã làm trống giỏ hàng' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi làm trống giỏ hàng' });
  }
});

export default router;
