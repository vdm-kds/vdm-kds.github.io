import bcrypt from 'bcryptjs';
import { getDb, queryAll, run, saveDb } from './db.js';

function createSvgPlaceholder(title: string, category: string, bg: string = '#47533E', fg: string = '#FAF7F2'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${bg}"/>
    <circle cx="300" cy="270" r="140" fill="${fg}" opacity="0.08"/>
    <circle cx="300" cy="270" r="100" fill="${fg}" opacity="0.12"/>
    <text x="300" y="240" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="700" fill="${fg}" text-anchor="middle" letter-spacing="2">${category.toUpperCase()}</text>
    <line x1="220" y1="260" x2="380" y2="260" stroke="${fg}" stroke-width="2" stroke-opacity="0.3"/>
    <text x="300" y="300" font-family="'Fraunces', serif" font-size="24" font-weight="600" fill="${fg}" text-anchor="middle">${title.length > 24 ? title.substring(0, 24) + '...' : title}</text>
    <text x="300" y="340" font-family="'Space Mono', monospace" font-size="16" fill="${fg}" opacity="0.7" text-anchor="middle">ĐỒ CŨ CÒN THƯƠNG · VINTAGE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function seedDatabase(force: boolean = false) {
  await getDb();

  const userCount = queryAll('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  if (userCount > 0 && !force) {
    return;
  }

  console.log('🌱 Seeding database for Đồ Cũ Còn Thương...');

  // Hash passwords
  const adminHash = bcrypt.hashSync('admin', 10);
  const buyerHash = bcrypt.hashSync('nguoidung', 10);

  // 1. Seed Seller
  const sellerRes = run(`
    INSERT INTO users (role, username, phone, password_hash, full_name)
    VALUES ('seller', 'admin', '0901234567', ?, 'Chủ Tiệm Còn Thương')
  `, [adminHash]);

  // 2. Seed Buyer
  const buyerRes = run(`
    INSERT INTO users (role, username, phone, password_hash, full_name)
    VALUES ('buyer', '0987654321', '0987654321', ?, 'Nguyễn Văn A')
  `, [buyerHash]);

  const buyerId = buyerRes.lastInsertRowid;

  // 3. Seed Buyer Sample Address
  run(`
    INSERT INTO addresses (user_id, recipient_name, phone, address_line, is_default)
    VALUES (?, 'Nguyễn Văn A', '0987654321', '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 1)
  `, [buyerId]);

  // 4. Seed 10 second-hand products
  const products = [
    {
      name: 'Áo khoác denim cũ size L',
      category: 'Thời trang',
      price: 350000,
      original_price: 1200000,
      condition_pct: 95,
      condition_detail: 'Không rách, phai màu nhẹ tự nhiên, form áo đứng và dày dặn',
      stock: 1,
      bg: '#2F3E46'
    },
    {
      name: 'Máy ảnh film Canon AE-1',
      category: 'Máy ảnh',
      price: 3200000,
      original_price: 6000000,
      condition_pct: 85,
      condition_detail: 'Cơ tốc chạy tốt, đo sáng nhạy, trầy nhẹ thân máy theo năm tháng',
      stock: 1,
      bg: '#473B32'
    },
    {
      name: 'iPhone 11 64GB',
      category: 'Điện tử',
      price: 4500000,
      original_price: 8000000,
      condition_pct: 90,
      condition_detail: 'Pin 84%, máy zin chưa qua sửa chữa, có vài vết xước dăm viền nhẹ',
      stock: 2,
      bg: '#333D47'
    },
    {
      name: 'Sách "Nhà giả kim" bản cũ',
      category: 'Sách',
      price: 45000,
      original_price: 79000,
      condition_pct: 80,
      condition_detail: 'Giấy ngả ố vàng hoài niệm, chữ in rõ nét, gáy sách chắc chắn không mất trang',
      stock: 5,
      bg: '#544636'
    },
    {
      name: 'Tai nghe Sony WH-1000XM3',
      category: 'Điện tử',
      price: 2100000,
      original_price: 5500000,
      condition_pct: 88,
      condition_detail: 'Chống ồn đỉnh cao, pin còn hơn 25h, đệm tai da cừu đã thay mới tinh',
      stock: 1,
      bg: '#2B303A'
    },
    {
      name: 'Đàn guitar acoustic Yamaha F310',
      category: 'Nhạc cụ',
      price: 1500000,
      original_price: 2900000,
      condition_pct: 85,
      condition_detail: 'Action êm tay, âm vang chuẩn, gỗ đã qua tôi luyện lâu năm, kèm bao da dày',
      stock: 1,
      bg: '#5E412F'
    },
    {
      name: 'Bàn phím cơ Keychron K2',
      category: 'Điện tử',
      price: 1100000,
      original_price: 2000000,
      condition_pct: 92,
      condition_detail: 'Gateron Brown switch gõ đầm tay, bluetooth mượt mà, đủ keycap và cáp Type-C',
      stock: 2,
      bg: '#3E444B'
    },
    {
      name: 'Đồng hồ Casio A168 vintage',
      category: 'Phụ kiện',
      price: 450000,
      original_price: 900000,
      condition_pct: 90,
      condition_detail: 'Đã thay pin Maxell chính hãng, đèn Illuminator sáng rực, dây kim loại còn sáng bóng',
      stock: 3,
      bg: '#3C493F'
    },
    {
      name: 'Nồi chiên không dầu Philips 4.1L',
      category: 'Gia dụng',
      price: 900000,
      original_price: 2300000,
      condition_pct: 85,
      condition_detail: 'Lòng nồi men chống dính còn rất tốt, mâm nhiệt sáng, hoạt động êm ái',
      stock: 1,
      bg: '#4A3B32'
    },
    {
      name: 'Túi xách da thật vintage',
      category: 'Thời trang',
      price: 600000,
      original_price: 1800000,
      condition_pct: 80,
      condition_detail: 'Chất da bò thật patina bóng đẹp, khóa đồng vintage nguyên bản, có dấu sờn quai nhẹ',
      stock: 1,
      bg: '#543D2B'
    }
  ];

  for (const item of products) {
    const imageUrl = createSvgPlaceholder(item.name, item.category, item.bg);
    run(`
      INSERT INTO products (name, category, price, original_price, condition_pct, condition_detail, stock, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.name,
      item.category,
      item.price,
      item.original_price,
      item.condition_pct,
      item.condition_detail,
      item.stock,
      imageUrl
    ]);
  }

  // 5. Seed default coupons
  const existingCoupons = queryAll('SELECT COUNT(*) as count FROM coupons')[0]?.count || 0;
  if (existingCoupons === 0) {
    run(`
      INSERT INTO coupons (code, type, value, max_discount, min_order_amount, is_active, usage_count)
      VALUES 
      ('DOCU10', 'percent', 10, 100000, 300000, 1, 0),
      ('FREESHIP', 'shipping', 100, 30000, 0, 1, 0)
    `);
  }

  saveDb();
  console.log('✅ Seeding completed successfully!');
}

export async function resetDatabase() {
  await getDb();
  console.log('🔄 Đang khôi phục cơ sở dữ liệu về trạng thái mẫu ban đầu...');

  // Xóa toàn bộ dữ liệu hiện tại
  run('DELETE FROM reviews');
  run('DELETE FROM wishlists');
  run('DELETE FROM notifications');
  run('DELETE FROM shipment_events');
  run('DELETE FROM order_status_logs');
  run('DELETE FROM order_items');
  run('DELETE FROM orders');
  run('DELETE FROM cart_items');
  run('DELETE FROM products');
  run('DELETE FROM addresses');
  run('DELETE FROM users');
  run('DELETE FROM coupons');

  // Chạy lại seed
  await seedDatabase(true);
}

