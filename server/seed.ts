import bcrypt from 'bcryptjs';
import { getDb, queryAll, queryOne, run, saveDb, createNotification } from './db.js';

function createSvgPlaceholder(title: string, category: string, bg: string = '#47533E', fg: string = '#FAF7F2', tag: string = 'ẢNH GỐC 1'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${bg}"/>
    <circle cx="300" cy="270" r="140" fill="${fg}" opacity="0.08"/>
    <circle cx="300" cy="270" r="100" fill="${fg}" opacity="0.12"/>
    <text x="300" y="240" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="700" fill="${fg}" text-anchor="middle" letter-spacing="2">${category.toUpperCase()}</text>
    <line x1="220" y1="260" x2="380" y2="260" stroke="${fg}" stroke-width="2" stroke-opacity="0.3"/>
    <text x="300" y="300" font-family="'Fraunces', serif" font-size="24" font-weight="600" fill="${fg}" text-anchor="middle">${title.length > 24 ? title.substring(0, 24) + '...' : title}</text>
    <text x="300" y="340" font-family="'Space Mono', monospace" font-size="16" fill="${fg}" opacity="0.7" text-anchor="middle">ĐỒ CŨ CÒN THƯƠNG · ${tag}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PRODUCTS_DATA = [
  {
    name: 'Áo khoác denim cũ size L',
    category: 'Thời trang',
    price: 350000,
    original_price: 1200000,
    condition_pct: 95,
    condition_detail: 'Không rách, phai màu nhẹ tự nhiên ở khuỷu tay, form áo đứng và dày dặn',
    stock: 1,
    bg: '#2F3E46',
    flaws: [
      {
        description: 'Phai màu nhẹ tự nhiên ở phần khuỷu tay phải do sử dụng, vải denim còn dày 100%',
        image_url: ''
      }
    ]
  },
  {
    name: 'Máy ảnh film Canon AE-1',
    category: 'Máy ảnh',
    price: 3200000,
    original_price: 6000000,
    condition_pct: 85,
    condition_detail: 'Cơ tốc chạy tốt, đo sáng nhạy, trầy nhẹ thân máy theo năm tháng',
    stock: 1,
    bg: '#473B32',
    flaws: [
      {
        description: 'Vết xước kim loại nhẹ ở đáy máy dài khoảng 1.2cm do cọ xát với bao da',
        image_url: ''
      },
      {
        description: 'Vòng cao su ống kính hơi mòn gai viền nhẹ nhưng xoay zoom vẫn mượt mà',
        image_url: ''
      }
    ]
  },
  {
    name: 'iPhone 11 64GB',
    category: 'Điện tử',
    price: 4500000,
    original_price: 8000000,
    condition_pct: 90,
    condition_detail: 'Pin 84%, máy zin chưa qua sửa chữa, có vài vết xước dăm viền nhẹ',
    stock: 2,
    bg: '#333D47',
    flaws: [
      {
        description: 'Xước dăm nhỏ ở viền nhôm góc trên bên trái (~0.8cm), màn hình dán cường lực đẹp',
        image_url: ''
      }
    ]
  },
  {
    name: 'Sách "Nhà giả kim" bản cũ',
    category: 'Sách',
    price: 45000,
    original_price: 79000,
    condition_pct: 80,
    condition_detail: 'Giấy ngả ố vàng hoài niệm, chữ in rõ nét, gáy sách chắc chắn không mất trang',
    stock: 5,
    bg: '#544636',
    flaws: [
      {
        description: 'Góc mép bìa hơi gấp nếp nhẹ và giấy ngả ố vàng tự nhiên theo năm tháng',
        image_url: ''
      }
    ]
  },
  {
    name: 'Tai nghe Sony WH-1000XM3',
    category: 'Điện tử',
    price: 2100000,
    original_price: 5500000,
    condition_pct: 88,
    condition_detail: 'Chống ồn đỉnh cao, pin còn hơn 25h, đệm tai da cừu đã thay mới tinh',
    stock: 1,
    bg: '#2B303A',
    flaws: [
      {
        description: 'Vết xước dăm mờ ở mặt cảm ứng tai phải, cảm ứng vuốt chạm vẫn phản hồi 100%',
        image_url: ''
      }
    ]
  },
  {
    name: 'Đàn guitar acoustic Yamaha F310',
    category: 'Nhạc cụ',
    price: 1500000,
    original_price: 2900000,
    condition_pct: 85,
    condition_detail: 'Action êm tay, âm vang chuẩn, gỗ đã qua tôi luyện lâu năm, kèm bao da dày',
    stock: 1,
    bg: '#5E412F',
    flaws: [
      {
        description: 'Vết cấn dăm nhỏ 0.5cm ở mặt lưng thùng đàn, không nứt vỡ, âm thanh vẫn vang ấm',
        image_url: ''
      }
    ]
  },
  {
    name: 'Bàn phím cơ Keychron K2',
    category: 'Điện tử',
    price: 1100000,
    original_price: 2000000,
    condition_pct: 92,
    condition_detail: 'Gateron Brown switch gõ đầm tay, bluetooth mượt mà, đủ keycap và cáp Type-C',
    stock: 2,
    bg: '#3E444B',
    flaws: [
      {
        description: 'Keycap phím Space bóng nhẹ do ngón tay gõ nhiều, switch nảy êm',
        image_url: ''
      }
    ]
  },
  {
    name: 'Đồng hồ Casio A168 vintage',
    category: 'Phụ kiện',
    price: 450000,
    original_price: 900000,
    condition_pct: 90,
    condition_detail: 'Đã thay pin Maxell chính hãng, đèn Illuminator sáng rực, dây kim loại còn sáng bóng',
    stock: 3,
    bg: '#3C493F',
    flaws: [
      {
        description: 'Xước dăm sợi tóc ở mặt kính nhựa gần góc 4 giờ, nhìn nghiêng mới thấy rõ',
        image_url: ''
      }
    ]
  },
  {
    name: 'Nồi chiên không dầu Philips 4.1L',
    category: 'Gia dụng',
    price: 900000,
    original_price: 2300000,
    condition_pct: 85,
    condition_detail: 'Lòng nồi men chống dính còn rất tốt, mâm nhiệt sáng, hoạt động êm ái',
    stock: 1,
    bg: '#4A3B32',
    flaws: [
      {
        description: 'Vỏ nhựa bên hông có vết cọ xát mờ khi lau chùi, lòng nồi và mâm nhiệt sạch sẽ',
        image_url: ''
      }
    ]
  },
  {
    name: 'Túi xách da thật vintage',
    category: 'Thời trang',
    price: 600000,
    original_price: 1800000,
    condition_pct: 80,
    condition_detail: 'Chất da bò thật patina bóng đẹp, khóa đồng vintage nguyên bản, có dấu sờn quai nhẹ',
    stock: 1,
    bg: '#543D2B',
    flaws: [
      {
        description: 'Quai đeo có vết sờn nhẹ ở điểm tì vai, đường chỉ may đôi vẫn nguyên vẹn',
        image_url: ''
      }
    ]
  }
];

export async function seedDatabase(force: boolean = false) {
  await getDb();

  const userCount = queryAll('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  
  if (userCount === 0 || force) {
    console.log('🌱 Seeding fresh database for Đồ Cũ Còn Thương...');
    
    if (force) {
      const tables = [
        'chat_messages',
        'chat_conversations',
        'return_requests',
        'offers',
        'cart_items',
        'shipment_events',
        'order_status_logs',
        'order_items',
        'orders',
        'reviews',
        'coupons',
        'wishlist',
        'addresses',
        'notifications',
        'product_views',
        'user_recent_views',
        'products',
        'users'
      ];
      for (const tbl of tables) {
        try {
          run(`DELETE FROM ${tbl}`);
        } catch (e: any) {
          console.warn(`Could not clear table ${tbl}:`, e.message);
        }
      }
    }

    // Demo Accounts exact SHA-256 hashes
    const ADMIN_HASH = '6191a72694365846e663b40df7cb85bb190ec7097e0ce49d8bb2aacbd3c37778';
    const BUYER_HASH = '9122c7069e60a1a744d681c1e5f60786a216e9105a2e2060d5a8ebe3d974fee7';

    // 1. Seed Seller (Owner)
    const sellerRes = run(`
      INSERT INTO users (role, username, phone, password_hash, full_name, is_owner)
      VALUES ('seller', 'admin', '0901234567', ?, 'Chủ Tiệm Còn Thương', 1)
    `, [ADMIN_HASH]);

    // 2. Seed Buyer (Owner)
    const buyerRes = run(`
      INSERT INTO users (role, username, phone, password_hash, full_name, is_owner)
      VALUES ('buyer', '0987654321', '0987654321', ?, 'Nguyễn Văn A', 1)
    `, [BUYER_HASH]);

    const buyerId = buyerRes.lastInsertRowid;

    // 3. Seed Buyer Address
    run(`
      INSERT INTO addresses (user_id, recipient_name, phone, address_line, is_default)
      VALUES (?, 'Nguyễn Văn A', '0987654321', '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 1)
    `, [buyerId]);

    // 4. Seed Products
    for (const item of SAMPLE_PRODUCTS_DATA) {
      const img1 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'MẶT TRƯỚC');
      const img2 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'MẶT SAU');
      const img3 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'CẬN CẢNH GÓC CẠNH');
      const img4 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'TEM NHÃN & MÃ SỐ');

      const imagesJson = JSON.stringify([img1, img2, img3, img4]);
      
      const flawsWithImg = item.flaws.map((fl, idx) => ({
        id: idx + 1,
        description: fl.description,
        image_url: createSvgPlaceholder(item.name, 'VẾT XƯỚC/KHUYẾT ĐIỂM', '#8B261E', '#FAF7F2', `KHUYẾT ĐIỂM #${idx + 1}`)
      }));
      const flawsJson = JSON.stringify(flawsWithImg);

      const checklistJson = JSON.stringify([
        '✓ Hoạt động hoàn hảo mọi tính năng',
        '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
        '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
      ]);

      run(`
        INSERT INTO products (
          name, category, price, original_price, condition_pct, condition_detail, stock, image_url,
          images, flaws, inspection_date, inspector_name, inspection_checklist
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-10-20', 'Trần Minh Tuấn (Chuyên viên kiểm định)', ?)
      `, [
        item.name,
        item.category,
        item.price,
        item.original_price,
        item.condition_pct,
        item.condition_detail,
        item.stock,
        img1,
        imagesJson,
        flawsJson,
        checklistJson
      ]);
    }

    // 5. Seed default coupons
    run(`
      INSERT INTO coupons (code, type, value, max_discount, min_order_amount, is_active, usage_count)
      VALUES 
      ('DOCU10', 'percent', 10, 100000, 300000, 1, 0),
      ('FREESHIP', 'shipping', 100, 30000, 0, 1, 0)
    `);

    // 6. Seed Sample Order for Return/Refund Testing (Delivered 1 day ago)
    const iphoneProd = queryAll('SELECT * FROM products WHERE name LIKE "%iPhone%"')[0];
    if (iphoneProd) {
      const orderRes = run(`
        INSERT INTO orders (
          code, buyer_id, subtotal, shipping_fee, total, status, payment_method, payment_status,
          recipient_name, phone, address, carrier, tracking_code, created_at, updated_at
        )
        VALUES (
          'DCT-882910', ?, ?, 0, ?, 'delivered', 'card', 'paid',
          'Nguyễn Văn A', '0987654321', '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
          'Giao Hàng Nhanh', 'GHN-98218731', datetime('now', '-1 day'), datetime('now', '-1 day')
        )
      `, [buyerId, iphoneProd.price, iphoneProd.price]);

      const orderId = orderRes.lastInsertRowid;
      run(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity, condition_pct, image_url)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `, [orderId, iphoneProd.id, iphoneProd.name, iphoneProd.price, iphoneProd.condition_pct, iphoneProd.image_url]);

      run(`
        INSERT INTO shipment_events (order_id, status, location, note, created_at)
        VALUES 
        (?, 'Đã bàn giao cho đơn vị vận chuyển', 'Kho Tiệm Còn Thương - Quận 1', 'Đã bọc bóng khí và bàn giao cho bưu tá', datetime('now', '-2 day')),
        (?, 'Đã đến kho phân loại', 'Kho Trung Chuyển Tân Bình, TP.HCM', 'Kiện hàng đang phân tuyến giao', datetime('now', '-1.5 day')),
        (?, 'Đang giao hàng', 'Quận 1, TP.HCM', 'Bưu tá Nguyễn Văn Shipper đang giao', datetime('now', '-1.2 day')),
        (?, 'Giao hàng thành công', '128 Hai Bà Trưng, Q1, TP.HCM', 'Khách hàng đã ký nhận và đồng kiểm', datetime('now', '-1 day'))
      `, [orderId, orderId, orderId, orderId]);

      // Seed another order in 'confirmed' for shipment fast-forward testing
      const cameraProd = queryOne(`SELECT * FROM products WHERE category = 'Máy ảnh' LIMIT 1`);
      if (cameraProd) {
        const order2Res = run(`
          INSERT INTO orders (
            code, buyer_id, subtotal, shipping_fee, total, status, payment_method, payment_status,
            recipient_name, phone, address, carrier, tracking_code, created_at, updated_at
          )
          VALUES (
            'DCT-552199', ?, ?, 30000, ?, 'confirmed', 'cod', 'unpaid',
            'Nguyễn Văn A', '0987654321', '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            'Giao Hàng Nhanh', 'GHN-11223344', datetime('now', '-2 hours'), datetime('now', '-2 hours')
          )
        `, [buyerId, cameraProd.price, cameraProd.price + 30000]);

        const order2Id = order2Res.lastInsertRowid;
        run(`
          INSERT INTO order_items (order_id, product_id, product_name, price, quantity, condition_pct, image_url)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `, [order2Id, cameraProd.id, cameraProd.name, cameraProd.price, cameraProd.condition_pct, cameraProd.image_url]);

        run(`
          INSERT INTO shipment_events (order_id, status, location, note, created_at)
          VALUES (?, 'Shop đã xác nhận đơn hàng', 'Kho Tiệm Còn Thương - Quận 1', 'Đang đóng gói và dán tem kiểm định', datetime('now', '-1.5 hours'))
        `, [order2Id]);
      }
    }
  } else {
    // Existing DB check: backfill multi-images and flaws for existing products if empty
    const prods = queryAll('SELECT id, name, category, image_url, images, flaws FROM products');
    for (const p of prods) {
      if (!p.images || p.images === '[]' || p.images === '') {
        const itemData = SAMPLE_PRODUCTS_DATA.find(d => d.name === p.name) || {
          bg: '#2F3E46',
          flaws: [{ description: 'Có vết xước dăm nhẹ tự nhiên theo thời gian sử dụng', image_url: '' }]
        };

        const img1 = p.image_url || createSvgPlaceholder(p.name, p.category, itemData.bg, '#FAF7F2', 'MẶT TRƯỚC');
        const img2 = createSvgPlaceholder(p.name, p.category, itemData.bg, '#FAF7F2', 'MẶT SAU');
        const img3 = createSvgPlaceholder(p.name, p.category, itemData.bg, '#FAF7F2', 'CẬN CẢNH GÓC CẠNH');
        const img4 = createSvgPlaceholder(p.name, p.category, itemData.bg, '#FAF7F2', 'TEM NHÃN & MÃ SỐ');

        const imagesJson = JSON.stringify([img1, img2, img3, img4]);
        
        const flawsWithImg = itemData.flaws.map((fl, idx) => ({
          id: idx + 1,
          description: fl.description,
          image_url: createSvgPlaceholder(p.name, 'VẾT XƯỚC/KHUYẾT ĐIỂM', '#8B261E', '#FAF7F2', `KHUYẾT ĐIỂM #${idx + 1}`)
        }));

        const checklistJson = JSON.stringify([
          '✓ Hoạt động hoàn hảo mọi tính năng',
          '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
          '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
        ]);

        run(`
          UPDATE products
          SET images = ?, flaws = ?, inspection_date = '2026-10-20', inspector_name = 'Trần Minh Tuấn (Chuyên viên kiểm định)', inspection_checklist = ?
          WHERE id = ?
        `, [imagesJson, JSON.stringify(flawsWithImg), checklistJson, p.id]);
      }
    }
  }

  saveDb();
}
