import { Router, Response } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { requireSeller, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Lấy danh sách gợi ý tìm kiếm tức thì (autocomplete)
router.get('/autocomplete', (req, res: Response) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    if (!q) {
      return res.json({ suggestions: [] });
    }

    const suggestions = queryAll(`
      SELECT id, name, category, price, original_price, condition_pct, image_url, stock
      FROM products
      WHERE name LIKE ? OR category LIKE ? OR condition_detail LIKE ?
      ORDER BY id DESC
      LIMIT 6
    `, [`%${q}%`, `%${q}%`, `%${q}%`]);

    return res.json({ suggestions });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tìm kiếm gợi ý' });
  }
});

// Lấy danh sách sản phẩm (có lọc danh mục, tìm kiếm tên, sắp xếp giá, khoảng giá, độ mới tối thiểu, còn hàng)
router.get('/', (req, res: Response) => {
  try {
    const { category, search, sort, min_price, max_price, min_condition, in_stock } = req.query;
    let sql = `
      SELECT p.*,
        COALESCE(ROUND(AVG(r.rating), 1), 0) as rating_avg,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category && category !== 'Tất cả' && category !== 'all') {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ' AND (p.name LIKE ? OR p.condition_detail LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (min_price && !isNaN(Number(min_price))) {
      sql += ' AND p.price >= ?';
      params.push(Number(min_price));
    }

    if (max_price && !isNaN(Number(max_price))) {
      sql += ' AND p.price <= ?';
      params.push(Number(max_price));
    }

    if (min_condition && !isNaN(Number(min_condition))) {
      sql += ' AND p.condition_pct >= ?';
      params.push(Number(min_condition));
    }

    if (in_stock === 'true' || in_stock === '1') {
      sql += ' AND p.stock > 0';
    }

    sql += ' GROUP BY p.id';

    // Sắp xếp
    if (sort === 'price_asc') {
      sql += ' ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY p.price DESC';
    } else if (sort === 'condition') {
      sql += ' ORDER BY p.condition_pct DESC';
    } else if (sort === 'rating') {
      sql += ' ORDER BY rating_avg DESC, review_count DESC';
    } else {
      sql += ' ORDER BY p.id DESC'; // Mới nhất mặc định
    }

    const products = queryAll(sql, params);
    return res.json({ products });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return res.status(500).json({ message: 'Lỗi tải danh sách sản phẩm' });
  }
});

// Chi tiết sản phẩm
router.get('/:id', (req, res: Response) => {
  try {
    const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    return res.json({ product });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải chi tiết sản phẩm' });
  }
});

// Thêm sản phẩm mới (chỉ Người bán)
router.post('/', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, category, price, original_price, condition_pct, condition_detail, stock, image_url } = req.body;

    if (!name || !category || price === undefined || condition_pct === undefined) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin sản phẩm' });
    }

    const defaultImg = image_url || `https://placehold.co/600x600/47533E/FAF7F2?text=${encodeURIComponent(name)}`;

    const result = run(`
      INSERT INTO products (name, category, price, original_price, condition_pct, condition_detail, stock, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      category,
      Number(price) || 0,
      Number(original_price) || Number(price) || 0,
      Number(condition_pct) || 90,
      condition_detail || 'Đã kiểm tra kỹ lưỡng, sử dụng tốt',
      Number(stock) !== undefined ? Number(stock) : 1,
      defaultImg
    ]);

    const newProduct = queryOne('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({
      message: 'Thêm sản phẩm thành công',
      product: newProduct
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    return res.status(500).json({ message: 'Lỗi khi tạo sản phẩm mới' });
  }
});

// Cập nhật sản phẩm (chỉ Người bán)
router.put('/:id', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, price, original_price, condition_pct, condition_detail, stock, image_url } = req.body;

    const existing = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    run(`
      UPDATE products 
      SET name = ?, category = ?, price = ?, original_price = ?, condition_pct = ?, condition_detail = ?, stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name ?? existing.name,
      category ?? existing.category,
      price !== undefined ? Number(price) : existing.price,
      original_price !== undefined ? Number(original_price) : existing.original_price,
      condition_pct !== undefined ? Number(condition_pct) : existing.condition_pct,
      condition_detail ?? existing.condition_detail,
      stock !== undefined ? Number(stock) : existing.stock,
      image_url ?? existing.image_url,
      id
    ]);

    const updated = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    return res.json({
      message: 'Cập nhật sản phẩm thành công',
      product: updated
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi cập nhật sản phẩm' });
  }
});

// Xóa sản phẩm (chỉ Người bán)
router.delete('/:id', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    run('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ message: 'Đã xóa sản phẩm khỏi kho' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi xóa sản phẩm' });
  }
});

export default router;
