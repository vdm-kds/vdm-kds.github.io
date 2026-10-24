import { Router, Response } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { requireBuyer, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Phí ship cố định demo: 30.000đ (miễn phí cho đơn từ 1.000.000đ)
export function calculateShippingFee(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= 1000000 ? 0 : 30000;
}

// Lấy danh sách giỏ hàng của người mua (kèm kiểm tra giá thương lượng và cảnh báo hết hàng)
router.get('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;

    const rawItems = queryAll(`
      SELECT 
        c.id, c.product_id, c.quantity, c.is_negotiated, c.negotiated_price, c.offer_id, c.created_at,
        p.name, p.category, p.price, p.original_price, p.condition_pct, p.condition_detail, p.stock, p.image_url
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.id DESC
    `, [buyerId]);

    const items = rawItems.map(item => {
      let isNegotiatedValid = false;
      let effectivePrice = item.price;

      if (item.is_negotiated && item.offer_id) {
        // Validate offer in database
        const offer = queryOne(`
          SELECT * FROM offers 
          WHERE id = ? AND buyer_id = ? AND product_id = ? AND status = 'accepted' AND datetime('now') <= datetime(expires_at)
        `, [item.offer_id, buyerId, item.product_id]);

        if (offer) {
          isNegotiatedValid = true;
          effectivePrice = offer.offered_price;
        }
      }

      const isSoldOut = item.stock <= 0;

      return {
        ...item,
        price: effectivePrice,
        original_item_price: item.price,
        is_negotiated: isNegotiatedValid,
        negotiated_price: isNegotiatedValid ? effectivePrice : undefined,
        is_sold_out: isSoldOut
      };
    });

    const activeItems = items.filter(it => !it.is_sold_out);
    const subtotal = activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping_fee = calculateShippingFee(subtotal);
    const total = subtotal + shipping_fee;

    return res.json({
      items,
      subtotal,
      shipping_fee,
      total,
      item_count: activeItems.reduce((count, item) => count + item.quantity, 0),
      has_sold_out_items: items.some(it => it.is_sold_out)
    });
  } catch (error: any) {
    console.error('Get cart error:', error);
    return res.status(500).json({ message: 'Lỗi tải giỏ hàng' });
  }
});

// Thêm sản phẩm vào giỏ (hỗ trợ mua với giá thương lượng từ offer_id)
router.post('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { product_id, quantity = 1, offer_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: 'Thiếu mã sản phẩm' });
    }

    const product = queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ message: 'Sản phẩm này hiện đã có chủ mới' });
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);

    // Validate offer if provided
    let isNegotiated = 0;
    let negotiatedPrice = null;
    let validOfferId = null;

    if (offer_id) {
      const offer = queryOne(`
        SELECT * FROM offers
        WHERE id = ? AND buyer_id = ? AND product_id = ? AND status = 'accepted' AND datetime('now') <= datetime(expires_at)
      `, [offer_id, buyerId, product_id]);

      if (offer) {
        isNegotiated = 1;
        negotiatedPrice = offer.offered_price;
        validOfferId = offer.id;
      }
    }

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
      run(`
        UPDATE cart_items 
        SET quantity = ?, 
            is_negotiated = coalesce(?, is_negotiated), 
            negotiated_price = coalesce(?, negotiated_price),
            offer_id = coalesce(?, offer_id)
        WHERE id = ?
      `, [newQty, isNegotiated ? 1 : null, negotiatedPrice, validOfferId, existingCartItem.id]);
    } else {
      run(`
        INSERT INTO cart_items (user_id, product_id, quantity, is_negotiated, negotiated_price, offer_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [buyerId, product_id, newQty, isNegotiated, negotiatedPrice, validOfferId]);
    }

    return res.json({ 
      message: isNegotiated ? 'Đã thêm sản phẩm với Giá đã thương lượng vào giỏ hàng' : 'Đã thêm sản phẩm vào giỏ hàng',
      is_negotiated: Boolean(isNegotiated)
    });
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
      return res.status(404).json({ message: 'Không tìm thấy món hàng trong giỏ' });
    }

    const newQty = Number(quantity);
    if (isNaN(newQty) || newQty <= 0) {
      run('DELETE FROM cart_items WHERE id = ?', [id]);
      return res.json({ message: 'Đã xóa món khỏi giỏ hàng' });
    }

    if (newQty > cartItem.stock) {
      return res.status(400).json({ 
        message: `Kho chỉ còn ${cartItem.stock} món, không đủ số lượng` 
      });
    }

    run('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, id]);
    return res.json({ message: 'Cập nhật số lượng thành công' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật số lượng' });
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
    return res.status(500).json({ message: 'Lỗi xóa khỏi giỏ' });
  }
});

// Xóa sạch giỏ hàng
router.delete('/', requireBuyer, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    run('DELETE FROM cart_items WHERE user_id = ?', [buyerId]);
    return res.json({ message: 'Đã làm trống giỏ hàng' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi xóa giỏ hàng' });
  }
});

export default router;
