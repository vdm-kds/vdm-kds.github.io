import { Product, Order, User, CartItem, Coupon, Offer, ChatConversation, ChatMessage, ChatMessageContext, ReturnRequest, ReturnStatus, Review, NotificationItem, SellerStats, Address, ShipmentEvent, Shop, CheckoutCalculation, CheckoutShopBreakdown } from '../types';

const DB_KEY = 'dcct_db';
const SESSION_KEY = 'dcct_session';
const DB_VERSION = 5;

// Simulated realistic network delay
export const delay = (ms?: number) =>
  new Promise((res) => setTimeout(res, ms ?? (150 + Math.random() * 150)));

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function createShopAvatarSvg(name: string, bg: string = '#08482D', fg: string = '#FAF7F2'): string {
  const words = name.split(' ').filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="${bg}" rx="100"/>
    <text x="100" y="118" font-family="'Be Vietnam Pro', sans-serif" font-size="70" font-weight="800" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Thời trang': '🧥',
  'Điện tử': '🎧',
  'Máy ảnh': '📷',
  'Sách': '📖',
  'Nhạc cụ': '🎸',
  'Phụ kiện': '⌚',
  'Gia dụng': '🍳'
};

// Vintage Product SVG Generator according to Requirement B1:
// - Gradient #08482D to #2E7D4F
// - Faint #DAE7C7 circles
// - Large category emoji (🧥, 🎧, 📷, 📖, 🎸, ⌚, 🍳)
// - Category uppercase in #DAE7C7
// - Product title in white (#FFFFFF)
// - Strictly 'Be Vietnam Pro', sans-serif font
// - 3 distinct variants for product gallery
export function createVintageProductSvg(title: string, category: string, variant: number = 0): string {
  const emoji = CATEGORY_EMOJIS[category] || '📦';
  const cleanTitle = title && title.length > 24 ? title.substring(0, 24) + '...' : (title || 'Sản phẩm');
  const safeCategory = (category || 'ĐỒ CŨ').toUpperCase();

  let gradId = `vg_${variant}_${Math.random().toString(36).substring(2, 6)}`;
  let gradStart = '#08482D';
  let gradEnd = '#2E7D4F';
  let circles = '';
  let variantTag = 'ẢNH CHÍNH';

  if (variant === 1) {
    gradStart = '#0A5335';
    gradEnd = '#246D43';
    circles = `
      <circle cx="440" cy="180" r="170" fill="#DAE7C7" opacity="0.14"/>
      <circle cx="160" cy="420" r="110" fill="#DAE7C7" opacity="0.08"/>
    `;
    variantTag = 'GÓC NGHIÊNG';
  } else if (variant === 2) {
    gradStart = '#063D26';
    gradEnd = '#358A59';
    circles = `
      <circle cx="300" cy="210" r="180" fill="#DAE7C7" opacity="0.15"/>
      <circle cx="480" cy="460" r="95" fill="#DAE7C7" opacity="0.10"/>
    `;
    variantTag = 'CHI TIẾT';
  } else {
    gradStart = '#08482D';
    gradEnd = '#2E7D4F';
    circles = `
      <circle cx="160" cy="180" r="160" fill="#DAE7C7" opacity="0.13"/>
      <circle cx="440" cy="380" r="120" fill="#DAE7C7" opacity="0.08"/>
    `;
    variantTag = 'MẶT TRƯỚC';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradStart}"/>
        <stop offset="100%" stop-color="${gradEnd}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#${gradId})"/>
    ${circles}
    <text x="300" y="240" font-size="96" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    <text x="300" y="340" font-family="'Be Vietnam Pro', sans-serif" font-size="20" font-weight="700" fill="#DAE7C7" text-anchor="middle" letter-spacing="3">${safeCategory}</text>
    <text x="300" y="390" font-family="'Be Vietnam Pro', sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" text-anchor="middle">${cleanTitle}</text>
    <text x="300" y="430" font-family="'Be Vietnam Pro', sans-serif" font-size="13" font-weight="500" fill="#DAE7C7" opacity="0.8" text-anchor="middle">ĐỒ CŨ CÒN THƯƠNG · ${variantTag}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function isLegacyOrEmptyImage(src?: string | null): boolean {
  if (!src || !src.trim()) return true;
  if (
    src.includes('Fraunces') ||
    src.includes('543D2B') ||
    src.includes('Space%20Mono') ||
    src.includes('Plus%20Jakarta') ||
    src.includes('Plus+Jakarta') ||
    src.includes('%232F3E46') ||
    src.includes('%23473B32') ||
    src.includes('%23333D47') ||
    src.includes('%23544636') ||
    src.includes('%232B303A') ||
    src.includes('%235E412F') ||
    src.includes('%233E444B') ||
    src.includes('%233C493F') ||
    src.includes('%234A3B32')
  ) {
    return true;
  }
  try {
    const decoded = decodeURIComponent(src);
    if (
      decoded.includes('Fraunces') ||
      decoded.includes('#543D2B') ||
      decoded.includes('Plus Jakarta Sans') ||
      decoded.includes('Space Mono') ||
      decoded.includes('#2F3E46') ||
      decoded.includes('#473B32') ||
      decoded.includes('#333D47') ||
      decoded.includes('#544636') ||
      decoded.includes('#2B303A') ||
      decoded.includes('#5E412F') ||
      decoded.includes('#3E444B') ||
      decoded.includes('#3C493F') ||
      decoded.includes('#4A3B32')
    ) {
      return true;
    }
  } catch {}
  return false;
}

// Backward compatible SVG placeholder generator
export function createSvgPlaceholder(title: string, category: string, _bg?: string, _fg?: string, tag: string = 'ẢNH GỐC 1'): string {
  const variant = tag.includes('2') || tag.includes('SAU') || tag.includes('NGHIÊNG') ? 1 : tag.includes('3') || tag.includes('CẬN') || tag.includes('TIẾT') ? 2 : 0;
  return createVintageProductSvg(title, category, variant);
}

// Normalized initial sample products
export const INITIAL_PRODUCTS_SEED = [
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

export interface StoredUser extends User {
  password_hash: string;
  failed_login_attempts?: number;
  lockout_until?: string | null;
}

export interface DCCTDatabase {
  version: number;
  users: StoredUser[];
  addresses: Address[];
  shops: Shop[];
  products: Product[];
  coupons: Coupon[];
  cart_items: { id: number; user_id: number; product_id: number; quantity: number; created_at: string }[];
  orders: Order[];
  shipment_events: ShipmentEvent[];
  offers: Offer[];
  chat_conversations: ChatConversation[];
  chat_messages: ChatMessage[];
  return_requests: ReturnRequest[];
  reviews: Review[];
  notifications: NotificationItem[];
  wishlist: { user_id: number; product_id: number; created_at: string }[];
  saved_vouchers?: { user_id: number; coupon_code: string; shop_id: number }[];
  presentation_mode: boolean;
}

// -------------------------------------------------------------------------
// INDEXEDDB FOR MEDIA STORAGE (Photos & Videos)
// -------------------------------------------------------------------------
const IDB_NAME = 'dcct_media_db';
const IDB_STORE = 'media_files';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaToIndexedDb(dataUrl: string, type: 'image' | 'video' = 'image'): Promise<string> {
  const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  try {
    const idb = await openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ id, type, dataUrl, created_at: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return dataUrl; // return dataUrl directly for immediate image/video rendering
  } catch (err) {
    console.warn('Could not save to IndexedDB, fallback to direct dataUrl:', err);
    return dataUrl;
  }
}

// -------------------------------------------------------------------------
// NORMALIZATION & SHA-256 HASHING (LỖI 2)
// -------------------------------------------------------------------------
export function normalizeUsername(input: string, role: 'buyer' | 'seller'): string {
  if (role === 'buyer') {
    // Phone normalization: remove all spaces, dots, dashes, parentheses; +84 -> 0
    let clean = (input || '').replace(/[\s\.\-\(\)]/g, '');
    if (clean.startsWith('+84')) clean = '0' + clean.slice(3);
    else if (clean.startsWith('84') && clean.length === 11) clean = '0' + clean.slice(2);
    return clean;
  }
  // Seller normalization: trim and lowercase
  return (input || '').trim().toLowerCase();
}

export async function hashPassword(username: string, password: string): Promise<string> {
  const normUser = username.trim().toLowerCase();
  const rawString = `dcct:${normUser}:${password}`;
  const msgUint8 = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
  return hex;
}

// -------------------------------------------------------------------------
// DATABASE SEED GENERATOR
// -------------------------------------------------------------------------
function createInitialDatabase(): DCCTDatabase {
  const ADMIN_HASH = '6191a72694365846e663b40df7cb85bb190ec7097e0ce49d8bb2aacbd3c37778';
  const BUYER_HASH = '9122c7069e60a1a744d681c1e5f60786a216e9105a2e2060d5a8ebe3d974fee7';
  const GOC_SACH_NHAC_HASH = '75aa9cc141b811875290e16b6261685547aaf3686a4f75e8e0e37ddc03015fc8';
  const RETRO_TECH_HASH = '89b8e95dd91fd76ae4168e8ccd90a445a265061fa2d7d4926966212ec9427e40';

  const users: StoredUser[] = [
    {
      id: 1,
      role: 'seller',
      username: 'admin',
      phone: '0901234567',
      password_hash: ADMIN_HASH,
      full_name: 'Đồ Cũ Còn Thương',
      shop_name: 'Đồ Cũ Còn Thương',
      is_owner: true,
      created_at: '2026-07-15T08:00:00.000Z'
    },
    {
      id: 2,
      role: 'buyer',
      username: '0987654321',
      phone: '0987654321',
      password_hash: BUYER_HASH,
      full_name: 'Nguyễn Văn A',
      is_owner: true,
      created_at: '2026-08-01T08:00:00.000Z'
    },
    {
      id: 3,
      role: 'seller',
      username: 'goc_sach_nhac',
      phone: '0902345678',
      password_hash: GOC_SACH_NHAC_HASH,
      full_name: 'Góc Sách & Nhạc',
      shop_name: 'Góc Sách & Nhạc',
      is_owner: true,
      created_at: '2026-08-10T09:30:00.000Z'
    },
    {
      id: 4,
      role: 'seller',
      username: 'retro_tech',
      phone: '0903456789',
      password_hash: RETRO_TECH_HASH,
      full_name: 'Retro Tech',
      shop_name: 'Retro Tech',
      is_owner: true,
      created_at: '2026-08-01T10:00:00.000Z'
    }
  ];

  const shops: Shop[] = [
    {
      id: 1,
      owner_user_id: 1,
      name: 'Đồ Cũ Còn Thương',
      slug: 'do-cu-con-thuong',
      cover_color: '#08482D',
      avatar: createShopAvatarSvg('Đồ Cũ Còn Thương', '#08482D'),
      description: 'Tiệm đồ second-hand có câu chuyện: thời trang, phụ kiện, đồ gia dụng đã kiểm định.',
      pickup_address: '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      phone: '0901234567',
      created_at: '2026-07-15T08:00:00.000Z',
      follower_ids: [2],
      rating_avg: 4.9,
      review_count: 48,
      response_rate: 99,
      joined_text: '3 tháng trước'
    },
    {
      id: 2,
      owner_user_id: 3,
      name: 'Góc Sách & Nhạc',
      slug: 'goc-sach-nhac',
      cover_color: '#7A4E2D',
      avatar: createShopAvatarSvg('Góc Sách & Nhạc', '#7A4E2D'),
      description: 'Sách cũ còn thơm mùi giấy và nhạc cụ đã qua sử dụng, chỉnh âm kỹ trước khi giao.',
      pickup_address: '45 Đường Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
      phone: '0902345678',
      created_at: '2026-08-10T09:30:00.000Z',
      follower_ids: [],
      rating_avg: 5.0,
      review_count: 24,
      response_rate: 96,
      joined_text: '2 tháng trước'
    },
    {
      id: 3,
      owner_user_id: 4,
      name: 'Retro Tech',
      slug: 'retro-tech',
      cover_color: '#2F4B6B',
      avatar: createShopAvatarSvg('Retro Tech', '#2F4B6B'),
      description: 'Đồ công nghệ cũ đã test kỹ: máy ảnh film, điện thoại, tai nghe, bàn phím cơ.',
      pickup_address: '89 Đường Cách Mạng Tháng 8, Phường 7, Quận 3, TP. Hồ Chí Minh',
      phone: '0903456789',
      created_at: '2026-08-01T10:00:00.000Z',
      follower_ids: [2],
      rating_avg: 4.8,
      review_count: 36,
      response_rate: 98,
      joined_text: '2 tháng trước'
    }
  ];

  const addresses: Address[] = [
    {
      id: 1,
      user_id: 2,
      recipient_name: 'Nguyễn Văn A',
      phone: '0987654321',
      address_line: '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      is_default: true
    }
  ];

  const PRODUCT_SHOP_MAPPING: Record<string, { shop_id: number; shop_name: string; shop_slug: string; seller_id: number }> = {
    'Áo khoác denim cũ size L': { shop_id: 1, shop_name: 'Đồ Cũ Còn Thương', shop_slug: 'do-cu-con-thuong', seller_id: 1 },
    'Túi xách da thật vintage': { shop_id: 1, shop_name: 'Đồ Cũ Còn Thương', shop_slug: 'do-cu-con-thuong', seller_id: 1 },
    'Đồng hồ Casio A168 vintage': { shop_id: 1, shop_name: 'Đồ Cũ Còn Thương', shop_slug: 'do-cu-con-thuong', seller_id: 1 },
    'Nồi chiên không dầu Philips 4.1L': { shop_id: 1, shop_name: 'Đồ Cũ Còn Thương', shop_slug: 'do-cu-con-thuong', seller_id: 1 },
    'Sách "Nhà giả kim" bản cũ': { shop_id: 2, shop_name: 'Góc Sách & Nhạc', shop_slug: 'goc-sach-nhac', seller_id: 3 },
    'Đàn guitar acoustic Yamaha F310': { shop_id: 2, shop_name: 'Góc Sách & Nhạc', shop_slug: 'goc-sach-nhac', seller_id: 3 },
    'Máy ảnh film Canon AE-1': { shop_id: 3, shop_name: 'Retro Tech', shop_slug: 'retro-tech', seller_id: 4 },
    'iPhone 11 64GB': { shop_id: 3, shop_name: 'Retro Tech', shop_slug: 'retro-tech', seller_id: 4 },
    'Tai nghe Sony WH-1000XM3': { shop_id: 3, shop_name: 'Retro Tech', shop_slug: 'retro-tech', seller_id: 4 },
    'Bàn phím cơ Keychron K2': { shop_id: 3, shop_name: 'Retro Tech', shop_slug: 'retro-tech', seller_id: 4 }
  };

  const products: Product[] = INITIAL_PRODUCTS_SEED.map((item, idx) => {
    const id = idx + 1;
    const mapping = PRODUCT_SHOP_MAPPING[item.name] || {
      shop_id: 1,
      shop_name: 'Đồ Cũ Còn Thương',
      shop_slug: 'do-cu-con-thuong',
      seller_id: 1
    };

    const img1 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'MẶT TRƯỚC');
    const img2 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'MẶT SAU');
    const img3 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'CẬN CẢNH');
    const img4 = createSvgPlaceholder(item.name, item.category, item.bg, '#FAF7F2', 'CHI TIẾT');

    const flawsWithImg = item.flaws.map((fl, fIdx) => ({
      id: fIdx + 1,
      description: fl.description,
      image_url: createSvgPlaceholder(item.name, 'KHUYẾT ĐIỂM', '#8B261E', '#FAF7F2', `LỖI #${fIdx + 1}`)
    }));

    return {
      id,
      shop_id: mapping.shop_id,
      seller_id: mapping.seller_id,
      shop_name: mapping.shop_name,
      shop_slug: mapping.shop_slug,
      name: item.name,
      category: item.category,
      price: item.price,
      original_price: item.original_price,
      condition_pct: item.condition_pct,
      condition_detail: item.condition_detail,
      stock: item.stock,
      image_url: img1,
      images: [img1, img2, img3, img4],
      flaws: flawsWithImg,
      inspection_date: '2026-10-20',
      inspector_name: 'Trần Minh Tuấn (KTV Chuyên Sâu)',
      inspection_checklist: [
        '✓ Hoạt động hoàn hảo mọi tính năng',
        '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
        '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
      ],
      created_at: new Date(Date.now() - (10 - idx) * 86400000).toISOString()
    };
  });

  const coupons: Coupon[] = [
    {
      id: 1,
      shop_id: 1,
      seller_id: 1,
      shop_name: 'Đồ Cũ Còn Thương',
      code: 'DOCU10',
      type: 'percent',
      value: 10,
      max_discount: 100000,
      min_order_amount: 300000,
      is_active: true,
      usage_count: 0,
      description: 'Giảm 10% tối đa 100.000đ cho đơn từ 300.000đ'
    },
    {
      id: 2,
      shop_id: 1,
      seller_id: 1,
      shop_name: 'Đồ Cũ Còn Thương',
      code: 'FREESHIP',
      type: 'shipping',
      value: 100,
      max_discount: 30000,
      min_order_amount: 0,
      is_active: true,
      usage_count: 0,
      description: 'Miễn phí vận chuyển tối đa 30.000đ'
    },
    {
      id: 3,
      shop_id: 2,
      seller_id: 3,
      shop_name: 'Góc Sách & Nhạc',
      code: 'SACHHAY',
      type: 'fixed',
      value: 15000,
      max_discount: 15000,
      min_order_amount: 100000,
      is_active: true,
      usage_count: 0,
      description: 'Giảm 15.000đ cho đơn từ 100.000đ'
    },
    {
      id: 4,
      shop_id: 3,
      seller_id: 4,
      shop_name: 'Retro Tech',
      code: 'TECH50',
      type: 'fixed',
      value: 50000,
      max_discount: 50000,
      min_order_amount: 1000000,
      is_active: true,
      usage_count: 0,
      description: 'Giảm 50.000đ cho đơn từ 1.000.000đ'
    }
  ];

  // 1 Initial completed order for user 2 to test review & return immediately
  const sampleOrder: Order = {
    id: 1,
    shop_id: 3,
    seller_id: 4,
    shop_name: 'Retro Tech',
    shop_slug: 'retro-tech',
    code: 'DCCT-20261024-9988',
    buyer_id: 2,
    user_id: 2,
    status: 'completed',
    payment_method: 'card',
    payment_status: 'paid',
    card_type: 'Visa **** 1111',
    buyer_name: 'Nguyễn Văn A',
    recipient_name: 'Nguyễn Văn A',
    phone: '0987654321',
    address: '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    note: 'Kiểm tra kỹ trước khi giao',
    carrier: 'Giao Hàng Nhanh',
    tracking_code: 'GHN-88992211VN',
    items_count: 1,
    subtotal: 4500000,
    shipping_fee: 0,
    discount_amount: 50000,
    total: 4450000,
    coupon_code: 'TECH50',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      {
        id: 1,
        order_id: 1,
        product_id: 8, // iPhone 11
        product_name: 'iPhone 11 64GB',
        product_image: products[7]?.image_url || '',
        image_url: products[7]?.image_url || '',
        price: 4500000,
        original_price: 8000000,
        quantity: 1,
        condition_pct: 90
      }
    ],
    shipment_events: [
      {
        id: 1,
        order_id: 1,
        status: 'Đã tạo đơn hàng',
        location: 'Retro Tech Hub',
        note: 'Đơn hàng đã được thanh toán và chuyển đến người bán',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 2,
        order_id: 1,
        status: 'Đã bàn giao cho đơn vị vận chuyển',
        location: 'Kho Tân Bình, TP.HCM',
        note: 'Bưu tá đã nhận kiện hàng nguyên seal',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 3,
        order_id: 1,
        status: 'Giao hàng thành công',
        location: 'Quận 1, TP.HCM',
        note: 'Người nhận đã ký nhận kiện hàng nguyên vẹn',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString()
      }
    ]
  };

  const notifications: NotificationItem[] = [
    {
      id: 1,
      user_id: 2,
      role: 'buyer',
      title: 'Đơn hàng hoàn tất',
      message: 'Đơn hàng #DCCT-20261024-9988 của Retro Tech đã giao thành công. Hãy đánh giá món đồ nhé!',
      order_id: 1,
      is_read: false,
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  return {
    version: DB_VERSION,
    users,
    addresses,
    shops,
    products,
    coupons,
    cart_items: [],
    orders: [sampleOrder],
    shipment_events: sampleOrder.shipment_events || [],
    offers: [],
    chat_conversations: [],
    chat_messages: [],
    return_requests: [],
    reviews: [],
    notifications,
    wishlist: [],
    saved_vouchers: [],
    presentation_mode: false
  };
}

// -------------------------------------------------------------------------
// DATABASE INSTANCE & PERSISTENCE
// -------------------------------------------------------------------------
const dbListeners: Set<() => void> = new Set();

export function subscribeDb(listener: () => void): () => void {
  dbListeners.add(listener);
  return () => {
    dbListeners.delete(listener);
  };
}

function notifyDbSubscribers() {
  dbListeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.error('Error in DB listener:', err);
    }
  });
}

// Setup cross-tab sync via window 'storage' event
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY) {
      notifyDbSubscribers();
    }
  });
}

export function getDb(): DCCTDatabase {
  if (typeof window === 'undefined') {
    return createInitialDatabase();
  }

  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const initial = createInitialDatabase();
    localStorage.setItem(DB_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number' || !Array.isArray(parsed.shops) || parsed.shops.length === 0) {
      const initial = createInitialDatabase();
      localStorage.setItem(DB_KEY, JSON.stringify(initial));
      return initial;
    }

    let modified = false;

    // Version 5 migration: Convert old "Đang hỏi về: ..." to type 'context', upgrade legacy/dark SVG images
    if (parsed.version < DB_VERSION) {
      parsed.version = DB_VERSION;
      if (Array.isArray(parsed.chat_messages)) {
        for (const m of parsed.chat_messages) {
          if (m.context_card || (m.content && m.content.startsWith('Đang hỏi về:'))) {
            m.type = 'context';
            m.content = '';
            m.is_read = true;
          } else if (!m.type) {
            m.type = 'text';
          }
        }
      }
      if (Array.isArray(parsed.chat_conversations) && Array.isArray(parsed.chat_messages)) {
        const convIdsWithRealMessages = new Set(
          parsed.chat_messages.filter((m: any) => m.type === 'text' && m.content && m.content.trim()).map((m: any) => m.conversation_id)
        );
        parsed.chat_conversations = parsed.chat_conversations.filter((c: any) => convIdsWithRealMessages.has(c.id));
      }
      if (Array.isArray(parsed.products)) {
        for (const p of parsed.products) {
          if (isLegacyOrEmptyImage(p.image_url)) {
            p.image_url = createVintageProductSvg(p.name, p.category, 0);
          }
          if (Array.isArray(p.images)) {
            p.images = [
              isLegacyOrEmptyImage(p.images[0]) ? createVintageProductSvg(p.name, p.category, 0) : p.images[0],
              isLegacyOrEmptyImage(p.images[1]) ? createVintageProductSvg(p.name, p.category, 1) : p.images[1],
              isLegacyOrEmptyImage(p.images[2]) ? createVintageProductSvg(p.name, p.category, 2) : p.images[2]
            ];
          } else {
            p.images = [
              createVintageProductSvg(p.name, p.category, 0),
              createVintageProductSvg(p.name, p.category, 1),
              createVintageProductSvg(p.name, p.category, 2)
            ];
          }
          if (Array.isArray(p.flaws)) {
            p.flaws.forEach((fl: any, fIdx: number) => {
              if (isLegacyOrEmptyImage(fl.image_url)) {
                fl.image_url = createVintageProductSvg(p.name, 'LỖI SẢN PHẨM', fIdx % 3);
              }
            });
          }
        }
      }
      modified = true;
    }

    const arrayKeys: (keyof DCCTDatabase)[] = [
      'users', 'addresses', 'shops', 'products', 'coupons', 'cart_items',
      'orders', 'shipment_events', 'offers', 'chat_conversations',
      'chat_messages', 'return_requests', 'reviews', 'notifications', 'wishlist'
    ];
    for (const key of arrayKeys) {
      if (!Array.isArray(parsed[key])) {
        (parsed as any)[key] = [];
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    }
    return parsed as DCCTDatabase;
  } catch {
    const initial = createInitialDatabase();
    localStorage.setItem(DB_KEY, JSON.stringify(initial));
    return initial;
  }
}

export function saveDb(data: DCCTDatabase): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  notifyDbSubscribers();
}

// -------------------------------------------------------------------------
// SESSION MANAGEMENT (PER-TAB via sessionStorage)
// -------------------------------------------------------------------------
export function getCurrentSession(): { user: User; token: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentSession(user: User): string {
  if (typeof window === 'undefined') return '';
  const token = `token_${user.role}_${user.id}_${Date.now()}`;
  const session = { user, token };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return token;
}

export function clearCurrentSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

// -------------------------------------------------------------------------
// HIGH LEVEL DOMAIN API METHODS (ALL ASYNC WITH DELAY)
// -------------------------------------------------------------------------

export const db = {
  // --- AUTH ---
  async login(credentials: { username: string; password: string; role: 'buyer' | 'seller' }): Promise<{ token: string; user: User }> {
    await delay();
    const { username, password, role } = credentials;
    if (!username || !password || !role) {
      throw new Error('Vui lòng cung cấp đầy đủ thông tin đăng nhập');
    }

    const normUsername = normalizeUsername(username, role);
    const database = getDb();

    const user = database.users.find(
      (u) =>
        u.role === role &&
        (normalizeUsername(u.username, role) === normUsername ||
          (u.phone && normalizeUsername(u.phone, 'buyer') === normUsername))
    );

    if (!user) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu');
    }

    // Check brute force lockout
    if (user.lockout_until) {
      const lockTime = new Date(user.lockout_until).getTime();
      if (!isNaN(lockTime) && lockTime > Date.now()) {
        throw new Error('Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 5 phút');
      }
    }

    const inputHash = await hashPassword(user.username, password);

    // Self-healing migration for plain passwords or corrupted promises
    let isMatch = false;
    if (user.password_hash === inputHash) {
      isMatch = true;
    } else if (user.password_hash === password) {
      // Plain text migration to hash
      user.password_hash = inputHash;
      isMatch = true;
    } else if (user.password_hash === '[object Promise]') {
      // Corrupted promise fix
      user.password_hash = inputHash;
      isMatch = true;
    }

    if (!isMatch) {
      user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
      if (user.failed_login_attempts >= 5) {
        user.failed_login_attempts = 0;
        user.lockout_until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        saveDb(database);
        throw new Error('Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 5 phút');
      } else {
        saveDb(database);
        throw new Error('Sai tên đăng nhập hoặc mật khẩu');
      }
    }

    // Success -> reset attempts
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    saveDb(database);

    const safeUser: User = {
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone,
      is_owner: Boolean(user.is_owner),
      shop_name: user.shop_name
    };

    const token = setCurrentSession(safeUser);
    return { token, user: safeUser };
  },

  async register(payload: {
    username?: string;
    phone?: string;
    password: string;
    full_name: string;
    role: 'buyer' | 'seller';
    address?: string;
    shop_name?: string;
  }): Promise<{ token: string; user: User }> {
    await delay();
    const database = getDb();

    // Check presentation mode
    if (database.presentation_mode) {
      throw new Error('Tạm dừng đăng ký trong buổi thuyết trình');
    }

    const { role, password, full_name, address, shop_name } = payload;
    if (!password || password.length < 8) {
      throw new Error('Mật khẩu phải có tối thiểu 8 ký tự');
    }
    if (!full_name || full_name.trim().length === 0) {
      throw new Error('Vui lòng nhập họ và tên');
    }

    let usernameToUse = '';
    let phoneToUse = '';

    if (role === 'buyer') {
      const rawPhone = payload.phone || payload.username || '';
      const cleanPhone = normalizeUsername(rawPhone, 'buyer');
      if (!/^0\d{9}$/.test(cleanPhone)) {
        throw new Error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      }
      usernameToUse = cleanPhone;
      phoneToUse = cleanPhone;

      // Check existing
      const existing = database.users.find(
        (u) => u.role === 'buyer' && (u.username === usernameToUse || u.phone === phoneToUse)
      );
      if (existing) {
        throw new Error('Số điện thoại này đã được đăng ký tài khoản');
      }
    } else {
      // Seller
      const cleanUsername = normalizeUsername(payload.username || '', 'seller');
      if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
        throw new Error('Tên đăng nhập người bán phải từ 3 đến 30 ký tự');
      }
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        throw new Error('Tên đăng nhập chỉ gồm chữ thường, số và dấu gạch dưới');
      }
      usernameToUse = cleanUsername;
      phoneToUse = payload.phone ? normalizeUsername(payload.phone, 'buyer') : '';

      const existing = database.users.find(
        (u) => u.role === 'seller' && u.username === usernameToUse
      );
      if (existing) {
        throw new Error('Tên đăng nhập này đã tồn tại, vui lòng chọn tên khác');
      }
    }

    const hashed = await hashPassword(usernameToUse, password);

    const newId = (database.users.reduce((max, u) => Math.max(max, u.id), 0) || 0) + 1;
    const newUser: StoredUser = {
      id: newId,
      role,
      username: usernameToUse,
      phone: phoneToUse,
      full_name: full_name.trim(),
      password_hash: hashed,
      is_owner: false,
      shop_name: role === 'seller' ? (shop_name?.trim() || `Shop của ${full_name.trim()}`) : undefined
    };

    database.users.push(newUser);

    if (role === 'buyer' && address && address.trim()) {
      database.addresses.push({
        id: (database.addresses.reduce((max, a) => Math.max(max, a.id), 0) || 0) + 1,
        user_id: newId,
        recipient_name: full_name.trim(),
        phone: phoneToUse,
        address_line: address.trim(),
        is_default: true
      });
    }

    saveDb(database);

    const safeUser: User = {
      id: newUser.id,
      role: newUser.role,
      username: newUser.username,
      full_name: newUser.full_name,
      phone: newUser.phone,
      is_owner: false,
      shop_name: newUser.shop_name
    };

    const token = setCurrentSession(safeUser);
    return { token, user: safeUser };
  },

  async getMe(): Promise<{ user: User; address?: Address }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) {
      throw new Error('Chưa đăng nhập');
    }
    const database = getDb();
    const user = database.users.find((u) => u.id === session.user.id);
    if (!user) {
      clearCurrentSession();
      throw new Error('Không tìm thấy tài khoản');
    }

    const address = database.addresses.find((a) => a.user_id === user.id && a.is_default);

    const safeUser: User = {
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone,
      is_owner: Boolean(user.is_owner),
      shop_name: user.shop_name
    };

    return { user: safeUser, address };
  },

  async changePassword(data: { old_password?: string; new_password?: string; confirm_password?: string }): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) {
      throw new Error('Vui lòng đăng nhập');
    }
    if (!data.old_password || !data.new_password) {
      throw new Error('Vui lòng nhập đầy đủ mật khẩu');
    }
    if (data.new_password.length < 8) {
      throw new Error('Mật khẩu mới phải có tối thiểu 8 ký tự');
    }
    if (data.new_password !== data.confirm_password) {
      throw new Error('Xác nhận mật khẩu mới không khớp');
    }

    const database = getDb();
    const user = database.users.find((u) => u.id === session.user.id);
    if (!user) throw new Error('Không tìm thấy tài khoản');

    const oldHash = await hashPassword(user.username, data.old_password);
    if (user.password_hash !== oldHash && user.password_hash !== data.old_password) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }

    user.password_hash = await hashPassword(user.username, data.new_password);
    saveDb(database);
    return { message: 'Đổi mật khẩu thành công' };
  },

  async switchRole(targetUserId: number): Promise<{ message: string; token: string; user: User; role_name: string }> {
    await delay(50);
    const database = getDb();
    const targetUser = database.users.find((u) => u.id === Number(targetUserId));
    if (!targetUser) throw new Error('Không tìm thấy tài khoản');
    if (!targetUser.is_owner) throw new Error('Tài khoản không phải là tài khoản chủ');

    const session = getCurrentSession();
    if (session?.user && !session.user.is_owner) {
      throw new Error('Chỉ tài khoản chủ mới có thể đổi vai');
    }

    const shop = database.shops.find((s) => s.owner_user_id === targetUser.id);
    const safeUser: User = {
      id: targetUser.id,
      role: targetUser.role,
      username: targetUser.username,
      full_name: targetUser.full_name,
      phone: targetUser.phone,
      shop_name: shop?.name || targetUser.shop_name,
      is_owner: true
    };
    const token = setCurrentSession(safeUser);
    const roleName = targetUser.role === 'seller' ? (shop?.name || targetUser.full_name) : targetUser.full_name;
    return {
      message: `Đã chuyển sang vai ${roleName}`,
      token,
      user: safeUser,
      role_name: roleName
    };
  },

  async switchBuyer(): Promise<{ message: string; token: string; user: User }> {
    const res = await this.switchRole(2);
    return { message: res.message, token: res.token, user: res.user };
  },

  async switchSeller(targetUsername: string = 'admin'): Promise<{ message: string; token: string; user: User }> {
    let targetUserId = 1;
    if (targetUsername === 'goc_sach_nhac') targetUserId = 3;
    else if (targetUsername === 'retro_tech') targetUserId = 4;
    const res = await this.switchRole(targetUserId);
    return { message: res.message, token: res.token, user: res.user };
  },

  async resetDemo(): Promise<{ message: string }> {
    await delay(200);
    const fresh = createInitialDatabase();
    saveDb(fresh);
    return { message: 'Đã khôi phục dữ liệu ban đầu thành công' };
  },

  async getPresentationMode(): Promise<{ presentation_mode: boolean }> {
    await delay(50);
    const database = getDb();
    return { presentation_mode: Boolean(database.presentation_mode) };
  },

  async setPresentationMode(enabled: boolean): Promise<{ message: string; presentation_mode: boolean }> {
    await delay(100);
    const database = getDb();
    database.presentation_mode = Boolean(enabled);
    saveDb(database);
    return {
      message: database.presentation_mode ? 'Đã bật Chế độ thuyết trình' : 'Đã tắt Chế độ thuyết trình',
      presentation_mode: database.presentation_mode
    };
  },

  // --- SHOPS HELPER ---
  checkSellerShopOwnership(session: any, database: DCCTDatabase, targetShopId?: number): Shop {
    if (!session || !session.user || session.user.role !== 'seller') {
      throw new Error('Vui lòng đăng nhập tài khoản người bán');
    }
    const sellerShop = database.shops.find((s) => s.owner_user_id === session.user.id);
    if (!sellerShop) {
      throw new Error('Bạn chưa thiết lập shop');
    }
    if (targetShopId !== undefined && sellerShop.id !== targetShopId) {
      throw new Error('Bạn không có quyền thao tác dữ liệu của shop khác');
    }
    return sellerShop;
  },

  // --- SHOPS DOMAIN API ---
  async getShops(): Promise<{ shops: Shop[] }> {
    await delay(60);
    const database = getDb();
    const populated = database.shops.map((s) => {
      const prods = database.products.filter((p) => p.shop_id === s.id);
      return {
        ...s,
        product_count: prods.length
      };
    });
    return { shops: populated };
  },

  async getShopBySlug(slug: string): Promise<{ shop: Shop; products: Product[]; coupons: Coupon[] }> {
    await delay(80);
    const database = getDb();
    const shop = database.shops.find((s) => s.slug === slug);
    if (!shop) throw new Error('Không tìm thấy shop này');

    const products = database.products.filter((p) => p.shop_id === shop.id).map(p => ({
      ...p,
      shop_name: shop.name,
      shop_slug: shop.slug
    }));
    const coupons = database.coupons.filter((c) => c.shop_id === shop.id && c.is_active);

    return {
      shop: {
        ...shop,
        product_count: products.length
      },
      products,
      coupons
    };
  },

  async getShopById(id: number): Promise<{ shop: Shop }> {
    await delay(50);
    const database = getDb();
    const shop = database.shops.find((s) => s.id === Number(id));
    if (!shop) throw new Error('Không tìm thấy shop');
    const prods = database.products.filter((p) => p.shop_id === shop.id);
    return { shop: { ...shop, product_count: prods.length } };
  },

  async getShopByOwnerUserId(userId: number): Promise<{ shop: Shop | null }> {
    await delay(50);
    const database = getDb();
    const shop = database.shops.find((s) => s.owner_user_id === Number(userId));
    if (!shop) return { shop: null };
    const prods = database.products.filter((p) => p.shop_id === shop.id);
    return { shop: { ...shop, product_count: prods.length } };
  },

  async createShop(payload: {
    name: string;
    slug?: string;
    description?: string;
    avatar?: string;
    cover_image?: string;
    cover_color?: string;
    pickup_address?: string;
    phone?: string;
  }): Promise<{ shop: Shop; message: string }> {
    await delay(120);
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'seller') {
      throw new Error('Vui lòng đăng nhập tài khoản người bán');
    }
    const database = getDb();
    const existingShop = database.shops.find((s) => s.owner_user_id === session.user.id);
    if (existingShop) {
      throw new Error('Tài khoản này đã có shop');
    }

    const name = payload.name.trim();
    if (!name) throw new Error('Vui lòng nhập tên shop');

    let targetSlug = (payload.slug || slugify(name)).trim();
    if (!targetSlug) targetSlug = `shop-${Date.now()}`;

    if (database.shops.some((s) => s.slug === targetSlug)) {
      throw new Error('Đường dẫn shop đã tồn tại, vui lòng chọn đường dẫn khác');
    }

    const coverColor = payload.cover_color || '#08482D';
    const newShopId = (database.shops.reduce((max, s) => Math.max(max, s.id), 0) || 0) + 1;
    const newShop: Shop = {
      id: newShopId,
      owner_user_id: session.user.id,
      name,
      slug: targetSlug,
      description: payload.description?.trim() || '',
      avatar: payload.avatar || createShopAvatarSvg(name, coverColor),
      cover_image: payload.cover_image,
      cover_color: coverColor,
      pickup_address: (payload.pickup_address || '').trim(),
      phone: (payload.phone || session.user.phone || '').trim(),
      created_at: new Date().toISOString(),
      follower_ids: [],
      rating_avg: 5.0,
      review_count: 0,
      response_rate: 100,
      joined_text: 'Vừa tham gia',
      product_count: 0
    };

    database.shops.push(newShop);

    // Update user shop_name
    const user = database.users.find((u) => u.id === session.user.id);
    if (user) {
      user.shop_name = name;
      session.user.shop_name = name;
      setCurrentSession(session.user);
    }

    saveDb(database);
    return { shop: newShop, message: 'Thiết lập shop thành công!' };
  },

  async updateShop(shopId: number, payload: Partial<Shop>): Promise<{ shop: Shop; message: string }> {
    await delay(100);
    const session = getCurrentSession();
    const database = getDb();
    const shop = database.shops.find((s) => s.id === Number(shopId));
    if (!shop) throw new Error('Không tìm thấy shop');

    if (!session || !session.user || (session.user.role === 'seller' && shop.owner_user_id !== session.user.id)) {
      throw new Error('Bạn không có quyền thao tác dữ liệu của shop khác');
    }

    if (payload.slug && payload.slug !== shop.slug) {
      const cleanSlug = slugify(payload.slug);
      if (database.shops.some((s) => s.id !== shop.id && s.slug === cleanSlug)) {
        throw new Error('Đường dẫn shop đã tồn tại');
      }
      shop.slug = cleanSlug;
    }

    if (payload.name) {
      shop.name = payload.name.trim();
      const user = database.users.find((u) => u.id === shop.owner_user_id);
      if (user) user.shop_name = shop.name;
    }
    if (payload.description !== undefined) shop.description = payload.description.trim();
    if (payload.avatar !== undefined) shop.avatar = payload.avatar;
    if (payload.cover_image !== undefined) shop.cover_image = payload.cover_image;
    if (payload.cover_color !== undefined) shop.cover_color = payload.cover_color;
    if (payload.pickup_address !== undefined) shop.pickup_address = payload.pickup_address.trim();
    if (payload.phone !== undefined) shop.phone = payload.phone.trim();

    saveDb(database);
    return { shop, message: 'Đã cập nhật thông tin shop thành công' };
  },

  async toggleFollowShop(shopId: number): Promise<{ is_following: boolean; follower_count: number; message: string }> {
    await delay(80);
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để theo dõi shop');
    }
    const database = getDb();
    const shop = database.shops.find((s) => s.id === Number(shopId));
    if (!shop) throw new Error('Không tìm thấy shop');

    if (shop.owner_user_id === session.user.id) {
      throw new Error('Bạn không thể theo dõi chính shop của mình');
    }

    shop.follower_ids = shop.follower_ids || [];
    const idx = shop.follower_ids.indexOf(session.user.id);
    let isFollowing = false;

    if (idx >= 0) {
      shop.follower_ids.splice(idx, 1);
      isFollowing = false;
    } else {
      shop.follower_ids.push(session.user.id);
      isFollowing = true;
    }

    saveDb(database);
    return {
      is_following: isFollowing,
      follower_count: shop.follower_ids.length,
      message: isFollowing ? `Đã theo dõi ${shop.name}` : `Đã bỏ theo dõi ${shop.name}`
    };
  },

  async getFollowedShops(): Promise<{ shops: Shop[] }> {
    await delay(60);
    const session = getCurrentSession();
    if (!session || !session.user) return { shops: [] };
    const database = getDb();
    const followed = database.shops.filter((s) => (s.follower_ids || []).includes(session.user.id));
    return {
      shops: followed.map((s) => ({
        ...s,
        product_count: database.products.filter((p) => p.shop_id === s.id).length
      }))
    };
  },

  async saveShopVoucher(couponCode: string, shopId: number): Promise<{ message: string; saved: boolean }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập để lưu mã');
    const database = getDb();
    database.saved_vouchers = database.saved_vouchers || [];
    const code = couponCode.toUpperCase().trim();

    const exists = database.saved_vouchers.some(
      (v) => v.user_id === session.user.id && v.coupon_code === code && v.shop_id === shopId
    );
    if (exists) {
      return { message: 'Mã giảm giá đã có trong ví của bạn', saved: true };
    }

    database.saved_vouchers.push({
      user_id: session.user.id,
      coupon_code: code,
      shop_id: shopId
    });
    saveDb(database);
    return { message: 'Đã lưu mã giảm giá vào ví', saved: true };
  },

  async getSavedShopVouchers(shopId?: number): Promise<{ vouchers: string[] }> {
    await delay(40);
    const session = getCurrentSession();
    if (!session || !session.user) return { vouchers: [] };
    const database = getDb();
    let list = (database.saved_vouchers || []).filter((v) => v.user_id === session.user.id);
    if (shopId) {
      list = list.filter((v) => v.shop_id === shopId);
    }
    return { vouchers: list.map((v) => v.coupon_code) };
  },

  async listProductsByShop(shopId: number): Promise<{ products: Product[] }> {
    await delay(50);
    const database = getDb();
    const shop = database.shops.find((s) => s.id === Number(shopId));
    const list = database.products
      .filter((p) => p.shop_id === Number(shopId))
      .sort((a, b) => {
        const aInStock = a.stock > 0 ? 1 : 0;
        const bInStock = b.stock > 0 ? 1 : 0;
        if (aInStock !== bInStock) return bInStock - aInStock;
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      })
      .map((p) => ({
        ...p,
        shop_name: shop?.name || p.shop_name,
        shop_slug: shop?.slug || p.shop_slug
      }));
    return { products: list };
  },

  async listCouponsByShop(shopId: number): Promise<{ coupons: Coupon[] }> {
    await delay(40);
    const database = getDb();
    const list = database.coupons.filter((c) => c.shop_id === Number(shopId) && c.is_active);
    return { coupons: list };
  },

  // --- PRODUCTS ---
  async getProducts(params?: {
    category?: string;
    search?: string;
    sort?: string;
    min_price?: number;
    max_price?: number;
    min_condition?: number;
    in_stock?: boolean;
    shop_id?: number;
  }): Promise<{ products: Product[] }> {
    await delay();
    const database = getDb();
    let list = [...database.products];

    if (params?.shop_id) {
      list = list.filter((p) => p.shop_id === Number(params.shop_id));
    }
    if (params?.category && params.category !== 'Tất cả') {
      list = list.filter((p) => p.category === params.category);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.condition_detail.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.shop_name && p.shop_name.toLowerCase().includes(q))
      );
    }
    if (params?.min_price !== undefined && !isNaN(params.min_price)) {
      list = list.filter((p) => p.price >= params.min_price!);
    }
    if (params?.max_price !== undefined && !isNaN(params.max_price)) {
      list = list.filter((p) => p.price <= params.max_price!);
    }
    if (params?.min_condition !== undefined && !isNaN(params.min_condition)) {
      list = list.filter((p) => p.condition_pct >= params.min_condition!);
    }
    if (params?.in_stock) {
      list = list.filter((p) => p.stock > 0);
    }

    list.sort((a, b) => {
      const aInStock = a.stock > 0 ? 1 : 0;
      const bInStock = b.stock > 0 ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock; // available items first, out of stock last

      if (params?.sort === 'price_asc') {
        return a.price - b.price;
      } else if (params?.sort === 'price_desc') {
        return b.price - a.price;
      } else if (params?.sort === 'condition') {
        return b.condition_pct - a.condition_pct;
      } else {
        // newest
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
    });

    const populated = list.map((p) => {
      const shop = database.shops.find((s) => s.id === p.shop_id);
      return {
        ...p,
        shop_name: p.shop_name || shop?.name || 'Đồ Cũ Còn Thương',
        shop_slug: p.shop_slug || shop?.slug || 'do-cu-con-thuong'
      };
    });

    return { products: populated };
  },

  async getProduct(id: number): Promise<{ product: Product }> {
    await delay();
    const database = getDb();
    const found = database.products.find((p) => p.id === Number(id));
    if (!found) throw new Error('Không tìm thấy sản phẩm');

    const shop = database.shops.find((s) => s.id === found.shop_id);
    return {
      product: {
        ...found,
        shop_name: found.shop_name || shop?.name || 'Đồ Cũ Còn Thương',
        shop_slug: found.shop_slug || shop?.slug || 'do-cu-con-thuong'
      }
    };
  },

  async createProduct(data: Partial<Product>): Promise<{ product: Product }> {
    await delay();
    const database = getDb();
    const session = getCurrentSession();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    const newId = (database.products.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1;
    const newProd: Product = {
      id: newId,
      shop_id: sellerShop.id,
      seller_id: session!.user.id,
      shop_name: sellerShop.name,
      shop_slug: sellerShop.slug,
      name: data.name || 'Sản phẩm mới',
      category: data.category || 'Thời trang',
      price: Number(data.price) || 100000,
      original_price: Number(data.original_price) || Number(data.price) || 200000,
      condition_pct: Number(data.condition_pct) || 90,
      condition_detail: data.condition_detail || 'Độ mới rất tốt',
      stock: Number(data.stock) || 1,
      image_url: data.image_url || createSvgPlaceholder(data.name || 'Sản phẩm', data.category || 'Đồ cũ'),
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image_url || ''],
      flaws: data.flaws || [],
      inspection_date: data.inspection_date || new Date().toISOString().split('T')[0],
      inspector_name: data.inspector_name || 'Nguyễn Văn Minh (KTV-04)',
      inspection_checklist: [
        '✓ Hoạt động hoàn hảo mọi tính năng',
        '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
        '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
      ],
      created_at: new Date().toISOString()
    };

    database.products.unshift(newProd);
    saveDb(database);
    return { product: newProd };
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<{ product: Product }> {
    await delay();
    const database = getDb();
    const session = getCurrentSession();
    const idx = database.products.findIndex((p) => p.id === Number(id));
    if (idx === -1) throw new Error('Không tìm thấy sản phẩm');

    this.checkSellerShopOwnership(session, database, database.products[idx].shop_id);

    database.products[idx] = { ...database.products[idx], ...data };
    saveDb(database);
    return { product: database.products[idx] };
  },

  async deleteProduct(id: number): Promise<{ message: string }> {
    await delay();
    const database = getDb();
    const session = getCurrentSession();
    const prod = database.products.find((p) => p.id === Number(id));
    if (!prod) throw new Error('Không tìm thấy sản phẩm');

    this.checkSellerShopOwnership(session, database, prod.shop_id);

    database.products = database.products.filter((p) => p.id !== Number(id));
    saveDb(database);
    return { message: 'Đã xóa sản phẩm thành công' };
  },

  // --- CART ---
  async getCart(): Promise<{
    items: CartItem[];
    subtotal: number;
    shipping_fee: number;
    total: number;
    item_count: number;
    shops: Array<{
      shop_id: number;
      shop_name: string;
      shop_slug: string;
      items: CartItem[];
      subtotal: number;
      shipping_fee: number;
      total: number;
    }>;
  }> {
    await delay(80);
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      return { items: [], subtotal: 0, shipping_fee: 0, total: 0, item_count: 0, shops: [] };
    }
    const database = getDb();
    const userCart = database.cart_items.filter((c) => c.user_id === session.user.id);

    const items: CartItem[] = [];
    for (const c of userCart) {
      const prod = database.products.find((p) => p.id === c.product_id);
      if (prod) {
        const shop = database.shops.find((s) => s.id === prod.shop_id);
        items.push({
          id: c.id,
          product_id: prod.id,
          shop_id: prod.shop_id || 1,
          shop_name: prod.shop_name || shop?.name || 'Đồ Cũ Còn Thương',
          shop_slug: prod.shop_slug || shop?.slug || 'do-cu-con-thuong',
          name: prod.name,
          product_name: prod.name,
          category: prod.category,
          condition_detail: prod.condition_detail,
          image_url: prod.image_url,
          product_image: prod.image_url,
          price: prod.price,
          original_price: prod.original_price,
          condition_pct: prod.condition_pct,
          quantity: c.quantity,
          stock: prod.stock
        });
      }
    }

    // Group items by shop
    const shopMap = new Map<number, CartItem[]>();
    for (const it of items) {
      const sId = it.shop_id;
      if (!shopMap.has(sId)) {
        shopMap.set(sId, []);
      }
      shopMap.get(sId)!.push(it);
    }

    const shopBreakdown: Array<{
      shop_id: number;
      shop_name: string;
      shop_slug: string;
      items: CartItem[];
      subtotal: number;
      shipping_fee: number;
      total: number;
    }> = [];

    let grandSubtotal = 0;
    let grandShippingFee = 0;

    shopMap.forEach((shopItems, sId) => {
      const shopObj = database.shops.find((s) => s.id === sId);
      const sSubtotal = shopItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const sShipping = sSubtotal >= 1000000 || sSubtotal === 0 ? 0 : 30000;
      grandSubtotal += sSubtotal;
      grandShippingFee += sShipping;

      shopBreakdown.push({
        shop_id: sId,
        shop_name: shopItems[0]?.shop_name || shopObj?.name || 'Đồ Cũ Còn Thương',
        shop_slug: shopItems[0]?.shop_slug || shopObj?.slug || 'do-cu-con-thuong',
        items: shopItems,
        subtotal: sSubtotal,
        shipping_fee: sShipping,
        total: sSubtotal + sShipping
      });
    });

    return {
      items,
      subtotal: grandSubtotal,
      shipping_fee: grandShippingFee,
      total: grandSubtotal + grandShippingFee,
      item_count: items.reduce((acc, i) => acc + i.quantity, 0),
      shops: shopBreakdown
    };
  },

  async addToCart(productId: number, quantity: number = 1): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập bằng tài khoản người mua');
    }
    const database = getDb();
    if (database.presentation_mode && !session.user.is_owner) {
      throw new Error('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình');
    }

    const prod = database.products.find((p) => p.id === Number(productId));
    if (!prod) throw new Error('Không tìm thấy sản phẩm');
    if (prod.stock <= 0) throw new Error('Sản phẩm đã hết hàng');

    // Rule: Buyer cannot buy from their own shop
    const shop = database.shops.find((s) => s.id === prod.shop_id);
    if (shop && shop.owner_user_id === session.user.id) {
      throw new Error('Bạn không thể tự mua sản phẩm của chính shop mình');
    }

    const existing = database.cart_items.find(
      (c) => c.user_id === session.user.id && c.product_id === prod.id
    );

    if (existing) {
      existing.quantity = Math.min(prod.stock, existing.quantity + quantity);
    } else {
      const newId = (database.cart_items.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
      database.cart_items.push({
        id: newId,
        user_id: session.user.id,
        product_id: prod.id,
        quantity: Math.min(prod.stock, quantity),
        created_at: new Date().toISOString()
      });
    }

    saveDb(database);
    return { message: 'Đã thêm vào giỏ hàng' };
  },

  async updateCartQty(cartId: number, quantity: number): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();

    if (quantity <= 0) {
      database.cart_items = database.cart_items.filter((c) => c.id !== Number(cartId));
    } else {
      const item = database.cart_items.find((c) => c.id === Number(cartId) && c.user_id === session.user.id);
      if (item) item.quantity = quantity;
    }
    saveDb(database);
    return { message: 'Đã cập nhật giỏ hàng' };
  },

  async removeFromCart(cartId: number): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();
    database.cart_items = database.cart_items.filter((c) => c.id !== Number(cartId));
    saveDb(database);
    return { message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
  },

  async clearCart(): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) return { message: 'Xong' };
    const database = getDb();
    database.cart_items = database.cart_items.filter((c) => c.user_id !== session.user.id);
    saveDb(database);
    return { message: 'Đã dọn sạch giỏ hàng' };
  },

  // --- COUPONS ---
  calculateCheckout(
    cartInput: CartItem[] | { items: CartItem[] },
    couponsByShop: Record<number, string> = {}
  ): CheckoutCalculation {
    const database = getDb();
    const rawItems: CartItem[] = Array.isArray(cartInput) ? cartInput : (cartInput?.items || []);

    const shopMap = new Map<number, CartItem[]>();
    for (const it of rawItems) {
      const sId = it.shop_id || 1;
      if (!shopMap.has(sId)) {
        shopMap.set(sId, []);
      }
      shopMap.get(sId)!.push(it);
    }

    const shopBreakdowns: CheckoutShopBreakdown[] = [];
    let grandSubtotal = 0;
    let grandShipping = 0;
    let grandDiscount = 0;

    shopMap.forEach((items, shopId) => {
      const shopObj = database.shops.find((s) => s.id === shopId);
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping_fee = (subtotal >= 1000000 || subtotal === 0) ? 0 : 30000;

      let discount_amount = 0;
      let validCouponCode: string | undefined = undefined;
      let appliedCoupon: Coupon | null = null;

      const code = (couponsByShop[shopId] || '').trim().toUpperCase();
      if (code) {
        const cpn = database.coupons.find(
          (c) => c.shop_id === shopId && c.code.toUpperCase() === code && c.is_active
        );
        if (cpn) {
          if (subtotal >= (cpn.min_order_amount || 0)) {
            if (cpn.type === 'percent') {
              let d = Math.round(subtotal * (cpn.value / 100));
              if (cpn.max_discount && d > cpn.max_discount) d = cpn.max_discount;
              discount_amount = d;
              validCouponCode = cpn.code;
              appliedCoupon = cpn;
            } else if (cpn.type === 'fixed') {
              discount_amount = Math.min(subtotal, cpn.value);
              validCouponCode = cpn.code;
              appliedCoupon = cpn;
            } else if (cpn.type === 'shipping') {
              if (shipping_fee > 0) {
                discount_amount = Math.min(shipping_fee, cpn.value || shipping_fee);
                validCouponCode = cpn.code;
                appliedCoupon = cpn;
              }
            }
          }
        }
      }

      const total = Math.max(0, subtotal + shipping_fee - discount_amount);
      grandSubtotal += subtotal;
      grandShipping += shipping_fee;
      grandDiscount += discount_amount;

      shopBreakdowns.push({
        shop_id: shopId,
        shop_name: items[0]?.shop_name || shopObj?.name || 'Đồ Cũ Còn Thương',
        shop_slug: items[0]?.shop_slug || shopObj?.slug || 'do-cu-con-thuong',
        items,
        subtotal,
        shipping_fee,
        coupon_code: discount_amount > 0 ? validCouponCode : undefined,
        discount_amount,
        total,
        applied_coupon: appliedCoupon
      });
    });

    return {
      shops: shopBreakdowns,
      subtotal: grandSubtotal,
      shipping_fee: grandShipping,
      discount_amount: grandDiscount,
      grand_total: grandSubtotal + grandShipping - grandDiscount
    };
  },

  async validateCoupon(code: string, subtotal: number, shippingFee?: number, shopId?: number): Promise<{ valid: boolean; discount_amount: number; coupon: Coupon; message: string }> {
    await delay(30);
    const cleanCode = (code || '').toUpperCase().trim();
    const database = getDb();
    let cpn = database.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.is_active);

    if (shopId && cpn && cpn.shop_id !== shopId) {
      throw new Error('Mã giảm giá này không thuộc về shop này');
    }

    if (!cpn) {
      throw new Error('Mã giảm giá không tồn tại hoặc đã hết hạn');
    }
    if (subtotal < (cpn.min_order_amount || 0)) {
      throw new Error(`Đơn hàng của shop phải từ ${(cpn.min_order_amount || 0).toLocaleString()}đ để dùng mã này`);
    }

    const actualShippingFee = shippingFee !== undefined ? shippingFee : (subtotal >= 1000000 ? 0 : 30000);

    let discount = 0;
    if (cpn.type === 'shipping') {
      if (actualShippingFee <= 0) {
        throw new Error('Phần hàng của shop này đã được miễn phí vận chuyển');
      }
      discount = Math.min(actualShippingFee, 30000);
    } else if (cpn.type === 'percent') {
      discount = Math.round((subtotal * cpn.value) / 100);
      if (cpn.max_discount && discount > cpn.max_discount) {
        discount = cpn.max_discount;
      }
    } else if (cpn.type === 'fixed') {
      discount = Math.min(subtotal, cpn.value);
    }

    return {
      valid: true,
      discount_amount: discount,
      coupon: cpn,
      message: 'Áp dụng mã giảm giá thành công'
    };
  },

  // --- ORDERS (MULTI-SHOP SUPPORT) ---
  async createOrder(payload: {
    items: { product_id: number; quantity: number }[];
    recipient_name: string;
    phone: string;
    address: string;
    note?: string;
    payment_method: 'cod' | 'card';
    card_info?: { number: string; expiry: string; cvv: string; card_type?: string };
    coupon_code?: string;
    shop_coupons?: Record<number, string>;
  }): Promise<{ message: string; order: Order; orders: Order[]; total_amount: number }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua');
    }

    const database = getDb();
    if (database.presentation_mode && !session.user.is_owner) {
      throw new Error('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Giỏ hàng trống');
    }
    if (!payload.recipient_name || !payload.phone || !payload.address) {
      throw new Error('Vui lòng điền đầy đủ thông tin giao hàng');
    }

    // Prepare fullCartItems for calculateCheckout
    const fullItems: CartItem[] = [];
    for (const it of payload.items) {
      const prod = database.products.find((p) => p.id === it.product_id);
      if (!prod) throw new Error(`Sản phẩm #${it.product_id} không tồn tại`);
      if (prod.stock < it.quantity) throw new Error(`Sản phẩm "${prod.name}" không đủ số lượng tồn kho`);

      const sId = prod.shop_id || 1;
      const shopObj = database.shops.find((s) => s.id === sId);
      if (shopObj && shopObj.owner_user_id === session.user.id) {
        throw new Error('Bạn không thể tự mua sản phẩm của chính shop mình');
      }

      fullItems.push({
        id: it.product_id,
        shop_id: sId,
        shop_name: shopObj?.name,
        shop_slug: shopObj?.slug,
        product_id: prod.id,
        quantity: it.quantity,
        name: prod.name,
        category: prod.category,
        price: prod.price,
        original_price: prod.original_price,
        condition_pct: prod.condition_pct,
        condition_detail: prod.condition_detail,
        stock: prod.stock,
        image_url: prod.image_url
      });
    }

    const couponsByShop = payload.shop_coupons || (payload.coupon_code ? { 1: payload.coupon_code } : {});
    const calc = this.calculateCheckout(fullItems, couponsByShop);

    const createdOrders: Order[] = [];

    for (const shopBreakdown of calc.shops) {
      const shopObj = database.shops.find((s) => s.id === shopBreakdown.shop_id);

      const orderItems = shopBreakdown.items.map((it: CartItem, idx: number) => {
        const prod = database.products.find((p) => p.id === it.product_id)!;
        prod.stock = Math.max(0, prod.stock - it.quantity);

        return {
          id: (database.orders.length * 10) + idx + 1,
          order_id: 0,
          product_id: prod.id,
          product_name: prod.name,
          product_image: prod.image_url,
          image_url: prod.image_url,
          price: prod.price,
          original_price: prod.original_price,
          quantity: it.quantity,
          condition_pct: prod.condition_pct
        };
      });

      if (shopBreakdown.applied_coupon) {
        const cpnInDb = database.coupons.find((c) => c.id === shopBreakdown.applied_coupon!.id);
        if (cpnInDb) cpnInDb.usage_count = (cpnInDb.usage_count || 0) + 1;
      }

      const newOrderId = (database.orders.reduce((max, o) => Math.max(max, o.id), 0) || 0) + 1;
      const orderCode = `DCCT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        id: newOrderId,
        shop_id: shopBreakdown.shop_id,
        seller_id: shopObj?.owner_user_id || 1,
        shop_name: shopObj?.name || 'Đồ Cũ Còn Thương',
        shop_slug: shopObj?.slug || 'do-cu-con-thuong',
        code: orderCode,
        buyer_id: session.user.id,
        user_id: session.user.id,
        status: 'pending',
        payment_method: payload.payment_method,
        payment_status: payload.payment_method === 'card' ? 'paid' : 'pending',
        card_type: payload.payment_method === 'card' ? (payload.card_info?.card_type || 'Thẻ quốc tế') : undefined,
        buyer_name: session.user.full_name,
        recipient_name: payload.recipient_name.trim(),
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        note: payload.note?.trim(),
        items_count: orderItems.length,
        subtotal: shopBreakdown.subtotal,
        shipping_fee: shopBreakdown.shipping_fee,
        discount_amount: shopBreakdown.discount_amount,
        total: shopBreakdown.total,
        coupon_code: shopBreakdown.discount_amount > 0 ? shopBreakdown.coupon_code : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: orderItems.map((i: any) => ({ ...i, order_id: newOrderId })),
        shipment_events: [
          {
            id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
            order_id: newOrderId,
            status: 'Đã tạo đơn hàng',
            location: shopObj?.name || 'Hệ thống Đồ Cũ Còn Thương',
            note: 'Đơn hàng đã được ghi nhận và gửi đến shop xử lý',
            created_at: new Date().toISOString()
          }
        ]
      };

      database.orders.unshift(newOrder);
      createdOrders.push(newOrder);

      // Create notifications for buyer and seller of this shop
      database.notifications.unshift({
        id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
        user_id: session.user.id,
        role: 'buyer',
        title: 'Đặt hàng thành công',
        message: `Đơn hàng #${orderCode} tại ${shopObj?.name} trị giá ${shopBreakdown.total.toLocaleString()}đ đã được gửi tới shop.`,
        order_id: newOrderId,
        is_read: false,
        created_at: new Date().toISOString()
      });

      database.notifications.unshift({
        id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 2,
        user_id: shopObj?.owner_user_id || 1,
        role: 'seller',
        title: 'Đơn hàng mới chờ duyệt',
        message: `Đơn hàng mới #${orderCode} (${shopBreakdown.items.length} món, ${shopBreakdown.total.toLocaleString()}đ) đang chờ bạn xác nhận.`,
        order_id: newOrderId,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    // Remove ordered items from cart
    const orderedPids = new Set(payload.items.map((i) => i.product_id));
    database.cart_items = database.cart_items.filter(
      (c) => c.user_id !== session.user.id || !orderedPids.has(c.product_id)
    );

    saveDb(database);
    return {
      message: 'Đặt hàng thành công',
      order: createdOrders[0],
      orders: createdOrders,
      total_amount: calc.grand_total
    };
  },

  async getMyOrders(status?: string): Promise<{ orders: Order[] }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) return { orders: [] };
    const database = getDb();
    let userOrders = database.orders.filter((o) => o.user_id === session.user.id);
    if (status && status !== 'all') {
      userOrders = userOrders.filter((o) => o.status === status);
    }
    return { orders: userOrders };
  },

  async getOrder(codeOrId: string | number): Promise<{ order: Order }> {
    await delay();
    const database = getDb();
    const found = database.orders.find(
      (o) => o.id === Number(codeOrId) || o.code === String(codeOrId)
    );
    if (!found) throw new Error('Không tìm thấy đơn hàng');
    return { order: found };
  },

  async confirmOrderReceived(orderId: number): Promise<{ message: string; order: Order }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId) && o.user_id === session.user.id);
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    ord.status = 'completed';
    ord.completed_at = new Date().toISOString();
    if (ord.payment_status === 'pending') {
      ord.payment_status = 'paid';
    }

    ord.shipment_events = ord.shipment_events || [];
    ord.shipment_events.push({
      id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
      order_id: ord.id,
      status: 'Đã hoàn thành',
      location: ord.address,
      note: 'Khách hàng đã xác nhận đã nhận được hàng nguyên vẹn',
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã xác nhận nhận hàng thành công', order: ord };
  },

  async cancelOrder(orderId: number, reason?: string): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId) && o.user_id === session.user.id);
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    if (ord.status !== 'pending' && ord.status !== 'confirmed') {
      throw new Error('Đơn hàng đã được bàn giao vận chuyển, không thể hủy');
    }

    ord.status = 'cancelled';
    ord.cancel_reason = reason || 'Khách hàng yêu cầu hủy';

    // Restore stock
    for (const item of ord.items || []) {
      const prod = database.products.find((p) => p.id === item.product_id);
      if (prod) prod.stock += item.quantity;
    }

    saveDb(database);
    return { message: 'Đã hủy đơn hàng thành công' };
  },

  // --- SELLER ORDERS & STATS ---
  async getSellerStats(): Promise<{ stats: SellerStats }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    const orders = database.orders.filter((o) => o.shop_id === sellerShop.id);

    const total_revenue = orders
      .filter((o) => o.payment_status === 'paid' && o.status !== 'cancelled')
      .reduce((acc, o) => acc + o.total, 0);

    const status_counts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0
    };

    for (const o of orders) {
      if (status_counts[o.status] !== undefined) {
        status_counts[o.status]++;
      }
    }

    const low_stock_count = database.products.filter((p) => p.shop_id === sellerShop.id && p.stock <= 1).length;

    return {
      stats: {
        total_revenue,
        total_orders: orders.length,
        status_counts: status_counts as any,
        low_stock_count,
        recent_orders: orders.slice(0, 5)
      }
    };
  },

  async getSellerOrders(status?: string): Promise<{ orders: Order[] }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    let orders = database.orders.filter((o) => o.shop_id === sellerShop.id);
    if (status && status !== 'all') {
      orders = orders.filter((o) => o.status === status);
    }
    return { orders };
  },

  async updateOrderStatus(orderId: number, target_status: string, note?: string, cancel_reason?: string): Promise<{ message: string; order: Order }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId));
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    const sellerShop = this.checkSellerShopOwnership(session, database, ord.shop_id);

    ord.status = target_status as any;
    if (cancel_reason) ord.cancel_reason = cancel_reason;

    if (target_status === 'cancelled') {
      // restore stock
      for (const it of ord.items || []) {
        const prod = database.products.find((p) => p.id === it.product_id);
        if (prod) prod.stock += it.quantity;
      }
    }

    ord.shipment_events = ord.shipment_events || [];
    const statusMap: Record<string, string> = {
      confirmed: 'Đã xác nhận đơn hàng',
      shipping: 'Đang giao hàng',
      delivered: 'Giao hàng thành công',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy đơn'
    };

    ord.shipment_events.push({
      id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
      order_id: ord.id,
      status: statusMap[target_status] || target_status,
      location: `Kho ${sellerShop.name}`,
      note: note || `Đơn hàng chuyển trạng thái sang ${target_status}`,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã cập nhật trạng thái đơn hàng', order: ord };
  },

  async assignCarrier(orderId: number, carrier: string): Promise<{ tracking_code: string; order: Order }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId));
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    const sellerShop = this.checkSellerShopOwnership(session, database, ord.shop_id);

    const carrierPrefixMap: Record<string, string> = {
      'Giao Hàng Nhanh': 'GHN',
      'Giao Hàng Tiết Kiệm': 'GHTK',
      'Viettel Post': 'VTP',
      'J&T Express': 'JNT',
      'SPX Express': 'SPX'
    };
    const prefix = carrierPrefixMap[carrier] || 'VN';
    const tracking_code = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}VN`;

    ord.carrier = carrier;
    ord.tracking_code = tracking_code;
    ord.status = 'confirmed';

    ord.shipment_events = ord.shipment_events || [];
    ord.shipment_events.push({
      id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
      order_id: ord.id,
      status: 'Đã gán đối tác vận chuyển',
      location: `Kho ${sellerShop.name}`,
      note: `Đã phân công ${carrier}. Mã vận đơn: ${tracking_code}`,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { tracking_code, order: ord };
  },

  async addShipmentEvent(orderId: number, payload: { status: string; location: string; note?: string }): Promise<{ message: string; event: ShipmentEvent }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId));
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    this.checkSellerShopOwnership(session, database, ord.shop_id);

    const newEvt: ShipmentEvent = {
      id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
      order_id: ord.id,
      status: payload.status,
      location: payload.location,
      note: payload.note || '',
      created_at: new Date().toISOString()
    };

    ord.shipment_events = ord.shipment_events || [];
    ord.shipment_events.push(newEvt);

    if (payload.status.includes('Giao hàng thành công')) {
      ord.status = 'delivered';
      if (ord.payment_status === 'pending') {
        ord.payment_status = 'paid';
      }
    } else if (payload.status.includes('Đang giao hàng')) {
      ord.status = 'shipping';
    }

    saveDb(database);
    return { message: 'Đã thêm sự kiện vận chuyển', event: newEvt };
  },

  async advanceShipmentStep(orderId: number, step: number): Promise<{ message: string; order: Order }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId));
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    const sellerShop = this.checkSellerShopOwnership(session, database, ord.shop_id);

    ord.shipment_events = ord.shipment_events || [];
    const eventId = (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1;

    if (step === 1) {
      ord.status = 'confirmed';
      ord.shipment_events.push({
        id: eventId,
        order_id: ord.id,
        status: 'Đã bàn giao cho đơn vị vận chuyển',
        location: sellerShop.pickup_address || 'Kho Tân Bình, TP.HCM',
        note: 'Kiện hàng đã bọc chống sốc và bàn giao cho bưu tá',
        created_at: new Date().toISOString()
      });
    } else if (step === 2) {
      ord.status = 'shipping';
      ord.shipment_events.push({
        id: eventId,
        order_id: ord.id,
        status: 'Đã đến kho phân loại trung tâm',
        location: 'Kho phân loại Củ Chi, TP.HCM',
        note: 'Đang kiểm đếm và phân tuyến phát hàng',
        created_at: new Date().toISOString()
      });
    } else if (step === 3) {
      ord.status = 'shipping';
      ord.shipment_events.push({
        id: eventId,
        order_id: ord.id,
        status: 'Đang giao hàng',
        location: ord.address,
        note: 'Bưu tá đang trên đường giao hàng đến bạn',
        created_at: new Date().toISOString()
      });
    } else if (step === 4) {
      ord.status = 'delivered';
      if (ord.payment_status === 'pending') {
        ord.payment_status = 'paid';
      }
      ord.shipment_events.push({
        id: eventId,
        order_id: ord.id,
        status: 'Giao hàng thành công',
        location: ord.address,
        note: 'Kiện hàng đã được phát tận tay người nhận',
        created_at: new Date().toISOString()
      });
    }

    saveDb(database);
    return { message: 'Đã cập nhật bước vận chuyển', order: ord };
  },

  async bulkConfirmOrders(orderIds: number[]): Promise<{ message: string; confirmed_count: number }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    let count = 0;
    for (const id of orderIds) {
      const ord = database.orders.find((o) => o.id === Number(id));
      if (ord && ord.shop_id === sellerShop.id && ord.status === 'pending') {
        ord.status = 'confirmed';
        count++;
      }
    }
    saveDb(database);
    return { message: `Đã duyệt ${count} đơn hàng`, confirmed_count: count };
  },

  // --- OFFERS / TRẢ GIÁ (LỖI 3) ---
  async createOffer(payload: { productId: number; offeredPrice: number; message?: string }): Promise<{ message: string; offer: Offer }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để trả giá');
    }
    const database = getDb();
    if (database.presentation_mode && !session.user.is_owner) {
      throw new Error('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình');
    }

    const prod = database.products.find((p) => p.id === Number(payload.productId));
    if (!prod) throw new Error('Không tìm thấy sản phẩm');

    const offeredPrice = Math.round(Number(payload.offeredPrice));
    if (isNaN(offeredPrice) || offeredPrice <= 0) {
      throw new Error('Mức giá đề xuất không hợp lệ');
    }
    if (offeredPrice >= prod.price) {
      throw new Error('Mức giá trả phải thấp hơn giá niêm yết của sản phẩm');
    }

    const shop = database.shops.find((s) => s.id === prod.shop_id);
    if (shop && shop.owner_user_id === session.user.id) {
      throw new Error('Bạn không thể trả giá sản phẩm của chính shop mình');
    }

    // Check if buyer already has an active pending/countered offer for this product
    const existingActive = database.offers.find(
      (o) => o.buyer_id === session.user.id && o.product_id === prod.id && (o.status === 'pending' || o.status === 'countered')
    );
    if (existingActive) {
      throw new Error('Bạn đang có một lời trả giá đang chờ phản hồi cho sản phẩm này');
    }

    const newOfferId = (database.offers.reduce((max, o) => Math.max(max, o.id), 0) || 0) + 1;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const newOffer: Offer = {
      id: newOfferId,
      shop_id: prod.shop_id || 1,
      shop_name: shop?.name || prod.shop_name || 'Đồ Cũ Còn Thương',
      user_id: session.user.id,
      buyer_id: session.user.id,
      seller_id: shop?.owner_user_id || prod.seller_id || 1,
      product_id: prod.id,
      product_name: prod.name,
      product_image: prod.image_url,
      original_price: prod.price,
      offered_price: offeredPrice,
      message: payload.message?.trim(),
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      buyer_name: session.user.full_name,
      buyer_phone: session.user.phone
    };

    database.offers.unshift(newOffer);

    // Notify seller of this shop
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: shop?.owner_user_id || 1,
      role: 'seller',
      title: 'Lời trả giá mới',
      message: `Khách hàng ${session.user.full_name} trả giá ${offeredPrice.toLocaleString()}đ cho "${prod.name}".`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã gửi lời trả giá', offer: newOffer };
  },

  async getOffers(): Promise<{ offers: Offer[] }> {
    return this.getMyOffers();
  },

  async getMyOffers(): Promise<{ offers: Offer[] }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) return { offers: [] };
    const database = getDb();
    const myOffers = database.offers.filter((o) => o.user_id === session.user.id || o.buyer_id === session.user.id);
    return { offers: myOffers };
  },

  async getSellerOffers(): Promise<{ offers: Offer[] }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);
    return { offers: database.offers.filter((o) => o.shop_id === sellerShop.id) };
  },

  async acceptOffer(offerId: number): Promise<{ message: string; offer: Offer }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const off = database.offers.find((o) => o.id === Number(offerId));
    if (!off) throw new Error('Không tìm thấy lời trả giá');

    this.checkSellerShopOwnership(session, database, off.shop_id);

    off.status = 'accepted';

    // Notify buyer
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: off.buyer_id || off.user_id || 1,
      role: 'buyer',
      title: 'Shop chấp nhận trả giá!',
      message: `Shop đã chấp nhận mức giá ${off.offered_price.toLocaleString()}đ cho "${off.product_name}". Hãy đặt mua ngay nhé!`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã chấp nhận lời trả giá', offer: off };
  },

  async counterOffer(offerId: number, counterPrice: number, sellerNote?: string): Promise<{ message: string; offer: Offer }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const off = database.offers.find((o) => o.id === Number(offerId));
    if (!off) throw new Error('Không tìm thấy lời trả giá');

    this.checkSellerShopOwnership(session, database, off.shop_id);

    off.status = 'countered';
    off.counter_price = Number(counterPrice);
    off.seller_note = sellerNote?.trim();

    // Notify buyer
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: off.buyer_id || off.user_id || 1,
      role: 'buyer',
      title: 'Shop thương lượng lại mức giá',
      message: `Shop đề xuất mức giá ${Number(counterPrice).toLocaleString()}đ cho "${off.product_name}".`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã gửi giá thương lượng lại', offer: off };
  },

  async rejectOffer(offerId: number, reason?: string): Promise<{ message: string; offer: Offer }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const off = database.offers.find((o) => o.id === Number(offerId));
    if (!off) throw new Error('Không tìm thấy lời trả giá');

    this.checkSellerShopOwnership(session, database, off.shop_id);

    off.status = 'rejected';
    off.seller_note = reason?.trim();

    // Notify buyer
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: off.buyer_id || off.user_id || 1,
      role: 'buyer',
      title: 'Shop từ chối trả giá',
      message: `Shop không thể giảm giá thêm cho "${off.product_name}".`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã từ chối lời trả giá', offer: off };
  },

  async acceptCounterOffer(offerId: number): Promise<{ message: string }> {
    await delay();
    const database = getDb();
    const off = database.offers.find((o) => o.id === Number(offerId));
    if (!off) throw new Error('Không tìm thấy lời trả giá');

    off.status = 'accepted';
    if (off.counter_price) {
      off.offered_price = off.counter_price;
    }
    saveDb(database);
    return { message: 'Đã đồng ý mức giá thương lượng' };
  },

  async rejectCounterOffer(offerId: number): Promise<{ message: string }> {
    await delay();
    const database = getDb();
    const off = database.offers.find((o) => o.id === Number(offerId));
    if (!off) throw new Error('Không tìm thấy lời trả giá');

    off.status = 'rejected';
    saveDb(database);
    return { message: 'Đã từ chối mức giá thương lượng' };
  },

  async cancelOffer(offerId: number): Promise<{ message: string }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();
    const off = database.offers.find((o) => o.id === Number(offerId) && o.buyer_id === session.user.id);
    if (!off) throw new Error('Không tìm thấy lời trả giá');
    if (off.status !== 'pending' && off.status !== 'countered') {
      throw new Error('Không thể hủy lời trả giá ở trạng thái này');
    }
    off.status = 'rejected';
    off.seller_note = 'Người mua đã hủy lời trả giá';
    saveDb(database);
    return { message: 'Đã hủy lời trả giá' };
  },

  async getMyOfferForProduct(productId: number): Promise<{ offer: Offer | null }> {
    await delay(30);
    const session = getCurrentSession();
    if (!session || !session.user) return { offer: null };
    const database = getDb();
    const myOffers = database.offers.filter((o) => o.buyer_id === session.user.id && o.product_id === Number(productId));
    const active = myOffers.find((o) => o.status === 'pending' || o.status === 'countered') || myOffers.find((o) => o.status === 'accepted');
    return { offer: active || null };
  },

  // --- CHAT / NHẮN TIN THEO SHOP (MULTI-SHOP SHOPEE-STYLE) ---
  async startShopChat(
    shopId: number,
    context?: {
      type: 'product' | 'order';
      product_id?: number;
      order_code?: string;
      initial_message?: string;
    }
  ): Promise<{ conversation: ChatConversation; created: boolean }> {
    await delay(30);
    const session = getCurrentSession();
    if (!session || !session.user) {
      throw new Error('Vui lòng đăng nhập để chat với shop');
    }
    const database = getDb();
    const shop = database.shops.find((s) => s.id === Number(shopId));
    if (!shop) throw new Error('Không tìm thấy shop');

    if (shop.owner_user_id === session.user.id) {
      throw new Error('Bạn không thể tự chat với shop của chính mình');
    }

    let conv = database.chat_conversations.find(
      (c) => c.buyer_id === session.user.id && c.shop_id === shop.id
    );

    let contextCard: ChatMessageContext | undefined;
    if (context) {
      if (context.type === 'product' && context.product_id) {
        const prod = database.products.find((p) => p.id === context.product_id);
        if (prod) {
          contextCard = {
            type: 'product',
            product_id: prod.id,
            title: prod.name,
            image_url: prod.image_url,
            price: prod.price
          };
        }
      } else if (context.type === 'order' && context.order_code) {
        const ord = database.orders.find((o) => o.code === context.order_code || o.id === Number(context.order_code));
        if (ord) {
          contextCard = {
            type: 'order',
            order_code: ord.code,
            title: `Đơn hàng #${ord.code}`,
            price: ord.total,
            status_text: ord.status === 'completed' ? 'Đã hoàn thành' : ord.status === 'shipping' ? 'Đang giao' : 'Đang xử lý'
          };
        }
      }
    }

    if (!conv) {
      // Do NOT save empty conversation to DB before buyer sends first message
      const virtualConv: ChatConversation = {
        id: 0,
        shop_id: shop.id,
        buyer_id: session.user.id,
        seller_id: shop.owner_user_id,
        shop_name: shop.name,
        shop_slug: shop.slug,
        shop_avatar: shop.avatar,
        buyer_name: session.user.full_name,
        buyer_phone: session.user.phone,
        last_message: '',
        last_message_at: new Date().toISOString(),
        buyer_unread: 0,
        seller_unread: 0,
        created_at: new Date().toISOString(),
        messages: contextCard ? [{
          id: -1,
          conversation_id: 0,
          sender_role: 'buyer',
          sender_id: session.user.id,
          content: '',
          type: 'context',
          context_card: contextCard,
          is_read: true,
          created_at: new Date().toISOString()
        }] : []
      };
      return { conversation: virtualConv, created: true };
    }

    const msgs = database.chat_messages.filter((m) => m.conversation_id === conv!.id);
    return {
      conversation: {
        ...conv,
        shop_name: conv.shop_name || shop.name,
        shop_slug: conv.shop_slug || shop.slug,
        shop_avatar: conv.shop_avatar || shop.avatar,
        messages: msgs
      },
      created: false
    };
  },

  async getChatConversations(): Promise<{ conversations: ChatConversation[] }> {
    await delay(50);
    const database = getDb();
    const session = getCurrentSession();
    if (!session || !session.user) return { conversations: [] };

    let convs: ChatConversation[] = [];

    if (session.user.role === 'buyer') {
      convs = database.chat_conversations.filter((c) => c.buyer_id === session.user.id);
    } else {
      // Seller: only chats belonging to seller's shop
      const sellerShop = this.checkSellerShopOwnership(session, database);
      convs = database.chat_conversations.filter((c) => c.shop_id === sellerShop.id);
    }

    const populated = convs
      .filter((c) => {
        // Only keep conversations with at least 1 real text message
        const msgs = database.chat_messages.filter((m) => m.conversation_id === c.id);
        return msgs.some((m) => m.type === 'text' && m.content && m.content.trim());
      })
      .map((c) => {
        const msgs = database.chat_messages.filter((m) => m.conversation_id === c.id);
        const textMsgs = msgs.filter((m) => m.type === 'text' && m.content && m.content.trim());
        const lastText = textMsgs[textMsgs.length - 1];
        const shopObj = database.shops.find((s) => s.id === c.shop_id);

        const isSeller = session.user.role === 'seller';
        const unreadCount = msgs.filter(
          (m) => m.type === 'text' && !m.is_read && (isSeller ? m.sender_role === 'buyer' : m.sender_role === 'seller')
        ).length;

        return {
          ...c,
          shop_name: c.shop_name || shopObj?.name || 'Shop',
          shop_slug: c.shop_slug || shopObj?.slug || '',
          shop_avatar: c.shop_avatar || shopObj?.avatar || '',
          last_message: lastText?.content || '',
          last_message_at: lastText?.created_at || c.last_message_at,
          buyer_unread: isSeller ? c.buyer_unread : unreadCount,
          seller_unread: isSeller ? unreadCount : c.seller_unread,
          messages: msgs
        };
      })
      .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());

    return { conversations: populated };
  },

  async getChatDetail(conversationId: number): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
    await delay(50);
    const database = getDb();
    const conv = database.chat_conversations.find((c) => c.id === Number(conversationId));
    if (!conv) throw new Error('Không tìm thấy cuộc trò chuyện');

    const msgs = database.chat_messages.filter((m) => m.conversation_id === conv.id);

    // Mark read for text messages
    const session = getCurrentSession();
    if (session?.user?.role === 'seller') {
      conv.seller_unread = 0;
      msgs.forEach((m) => {
        if (m.sender_role === 'buyer') m.is_read = true;
      });
    } else {
      conv.buyer_unread = 0;
      msgs.forEach((m) => {
        if (m.sender_role === 'seller') m.is_read = true;
      });
    }

    if (session?.user) {
      for (const n of database.notifications) {
        if (n.type === 'chat' && n.order_id === conv.id && n.user_id === session.user.id) {
          n.is_read = true;
        }
      }
    }
    saveDb(database);

    const shopObj = database.shops.find((s) => s.id === conv.shop_id);
    const populatedConv = {
      ...conv,
      shop_name: conv.shop_name || shopObj?.name || 'Shop',
      shop_slug: conv.shop_slug || shopObj?.slug || '',
      shop_avatar: conv.shop_avatar || shopObj?.avatar || '',
      messages: msgs
    };

    return {
      conversation: populatedConv,
      messages: msgs
    };
  },

  async sendChatMessage(payload: {
    conversation_id?: number;
    shop_id?: number;
    product_id?: number;
    order_code?: string;
    content: string;
    context_card?: ChatMessageContext;
  }): Promise<{ message: ChatMessage; conversation: ChatConversation }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) {
      throw new Error('Chưa gửi được, bạn thử lại nhé');
    }
    const database = getDb();
    if (database.presentation_mode && !session.user.is_owner) {
      throw new Error('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình');
    }

    const content = (payload.content || '').trim();
    if (!content) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }

    const senderRole = session.user.role === 'seller' ? 'seller' : 'buyer';
    let conv: ChatConversation | undefined;

    if (payload.conversation_id && payload.conversation_id > 0) {
      conv = database.chat_conversations.find((c) => c.id === Number(payload.conversation_id));
    }

    if (!conv && payload.shop_id) {
      conv = database.chat_conversations.find(
        (c) => c.shop_id === Number(payload.shop_id) && c.buyer_id === (senderRole === 'buyer' ? session.user.id : c.buyer_id)
      );
    }

    const targetShop = database.shops.find((s) => s.id === (conv?.shop_id || Number(payload.shop_id)));
    if (!targetShop) throw new Error('Không tìm thấy shop');

    if (senderRole === 'buyer' && targetShop.owner_user_id === session.user.id) {
      throw new Error('Bạn không thể tự chat với shop của chính mình');
    }

    if (senderRole === 'seller') {
      this.checkSellerShopOwnership(session, database, targetShop.id);
    }

    // If conversation doesn't exist yet, create it now!
    if (!conv) {
      const newConvId = (database.chat_conversations.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
      conv = {
        id: newConvId,
        shop_id: targetShop.id,
        buyer_id: session.user.id,
        seller_id: targetShop.owner_user_id,
        shop_name: targetShop.name,
        shop_slug: targetShop.slug,
        shop_avatar: targetShop.avatar,
        buyer_name: session.user.full_name,
        buyer_phone: session.user.phone,
        last_message: content,
        last_message_at: new Date().toISOString(),
        buyer_unread: senderRole === 'seller' ? 1 : 0,
        seller_unread: senderRole === 'buyer' ? 1 : 0,
        created_at: new Date().toISOString()
      };
      database.chat_conversations.unshift(conv);
    }

    // If context_card provided: only insert if different from last context card in this conversation
    if (payload.context_card) {
      const prevContextMsgs = database.chat_messages.filter(
        (m) => m.conversation_id === conv!.id && m.type === 'context'
      );
      const lastContext = prevContextMsgs[prevContextMsgs.length - 1];
      const isSameProd = lastContext?.context_card?.product_id && payload.context_card.product_id && lastContext.context_card.product_id === payload.context_card.product_id;
      const isSameOrd = lastContext?.context_card?.order_code && payload.context_card.order_code && lastContext.context_card.order_code === payload.context_card.order_code;

      if (!isSameProd && !isSameOrd) {
        const ctxMsgId = (database.chat_messages.reduce((max, m) => Math.max(max, m.id), 0) || 0) + 1;
        const ctxMsg: ChatMessage = {
          id: ctxMsgId,
          conversation_id: conv.id,
          sender_role: senderRole,
          sender_id: session.user.id,
          content: '', // NO text bubble!
          type: 'context',
          context_card: payload.context_card,
          is_read: true,
          created_at: new Date().toISOString()
        };
        database.chat_messages.push(ctxMsg);
      }
    }

    // Now insert real text message
    const newMsgId = (database.chat_messages.reduce((max, m) => Math.max(max, m.id), 0) || 0) + 1;
    const newMsg: ChatMessage = {
      id: newMsgId,
      conversation_id: conv.id,
      sender_role: senderRole,
      sender_id: session.user.id,
      content,
      type: 'text',
      is_read: false,
      created_at: new Date().toISOString()
    };
    database.chat_messages.push(newMsg);

    conv.last_message = content;
    conv.last_message_at = newMsg.created_at;

    if (senderRole === 'buyer') {
      conv.seller_unread = (conv.seller_unread || 0) + 1;
    } else {
      conv.buyer_unread = (conv.buyer_unread || 0) + 1;
    }

    // Notification for recipient (with 60 chars snippet, grouped/updated if existing unread notification for this conversation exists)
    const recipientUserId = senderRole === 'buyer' ? targetShop.owner_user_id : conv.buyer_id;
    const recipientRole = senderRole === 'buyer' ? 'seller' : 'buyer';
    const senderName = senderRole === 'buyer' ? session.user.full_name : targetShop.name;
    const snippet = content.length > 60 ? content.slice(0, 60) + '...' : content;

    const existingNotif = database.notifications.find(
      (n) => n.user_id === recipientUserId && n.type === 'chat' && n.order_id === conv!.id && !n.is_read
    );

    if (existingNotif) {
      existingNotif.title = `Tin nhắn mới từ ${senderName}`;
      existingNotif.message = `Tin nhắn mới từ ${senderName}: "${snippet}"`;
      existingNotif.created_at = new Date().toISOString();
    } else {
      database.notifications.unshift({
        id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
        user_id: recipientUserId,
        role: recipientRole,
        type: 'chat',
        order_id: conv.id,
        title: `Tin nhắn mới từ ${senderName}`,
        message: `Tin nhắn mới từ ${senderName}: "${snippet}"`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    saveDb(database);
    const msgs = database.chat_messages.filter((m) => m.conversation_id === conv!.id);
    return {
      message: newMsg,
      conversation: {
        ...conv,
        shop_name: conv.shop_name || targetShop.name,
        shop_slug: conv.shop_slug || targetShop.slug,
        shop_avatar: conv.shop_avatar || targetShop.avatar,
        messages: msgs
      }
    };
  },

  async markChatRead(conversationId: number): Promise<{ message: string }> {
    await delay(30);
    const session = getCurrentSession();
    if (!session || !session.user) return { message: 'Xong' };
    const database = getDb();
    const conv = database.chat_conversations.find((c) => c.id === Number(conversationId));
    if (conv) {
      if (session.user.role === 'seller') {
        conv.seller_unread = 0;
      } else {
        conv.buyer_unread = 0;
      }
      for (const m of database.chat_messages) {
        if (m.conversation_id === conv.id) {
          if (session.user.role === 'seller' && m.sender_role === 'buyer') m.is_read = true;
          if (session.user.role === 'buyer' && m.sender_role === 'seller') m.is_read = true;
        }
      }
      for (const n of database.notifications) {
        if (n.type === 'chat' && n.order_id === conv.id && n.user_id === session.user.id) {
          n.is_read = true;
        }
      }
      saveDb(database);
    }
    return { message: 'Đã đánh dấu đã đọc' };
  },

  // --- REVIEWS / ĐÁNH GIÁ ---
  async getProductReviews(productId: number): Promise<{
    reviews: Review[];
    recent_reviews: Review[];
    total_reviews: number;
    average_rating: number;
    distribution: Record<string, number>;
  }> {
    await delay();
    const database = getDb();
    const pid = Number(productId);
    const session = getCurrentSession();

    // public filter: not hidden unless authored by current logged in user
    const list = database.reviews.filter(
      (r) => r.product_id === pid && (!r.is_hidden || (session?.user && r.user_id === session.user.id))
    );

    const total = list.length;
    const avg = total > 0 ? Number((list.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)) : 5.0;

    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of list) {
      const k = String(r.rating);
      if (dist[k] !== undefined) dist[k]++;
    }

    return {
      reviews: list,
      recent_reviews: list.slice(0, 5),
      total_reviews: total,
      average_rating: avg,
      distribution: dist
    };
  },

  async getShopReviews(shopId?: number): Promise<{
    reviews: Review[];
    recent_reviews: Review[];
    total_reviews: number;
    average_rating: number;
    distribution: Record<string, number>;
  }> {
    await delay();
    const database = getDb();
    const session = getCurrentSession();

    let list = database.reviews.filter(
      (r) => !r.is_hidden || (session?.user && r.user_id === session.user.id)
    );

    if (shopId) {
      list = list.filter((r) => r.shop_id === Number(shopId));
    }

    const total = list.length;
    const avg = total > 0 ? Number((list.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)) : 5.0;

    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of list) {
      const k = String(r.rating);
      if (dist[k] !== undefined) dist[k]++;
    }

    return {
      reviews: list,
      recent_reviews: list.slice(0, 5),
      total_reviews: total,
      average_rating: avg,
      distribution: dist
    };
  },

  async getSellerReviews(): Promise<{ reviews: Review[]; total_reviews: number; average_rating: number; unreplied_count: number }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    const list = database.reviews.filter((r) => r.shop_id === sellerShop.id);
    const total = list.length;
    const avg = total > 0 ? Number((list.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)) : 5.0;
    const unreplied = list.filter((r) => !r.seller_reply).length;

    return {
      reviews: list,
      total_reviews: total,
      average_rating: avg,
      unreplied_count: unreplied
    };
  },

  async getOrderReviewedItems(orderId: number): Promise<{ reviewed_product_ids: number[]; reviews: Review[] }> {
    await delay(50);
    const database = getDb();
    const revs = database.reviews.filter((r) => r.order_id === Number(orderId));
    return {
      reviewed_product_ids: revs.map((r) => r.product_id),
      reviews: revs
    };
  },

  async submitReview(payload: {
    order_id: number;
    product_id: number;
    rating: number;
    comment?: string;
    images?: string[];
    video_url?: string;
    video_duration?: number;
    video_poster?: string;
    is_anonymous?: boolean;
    tags?: string[];
  }): Promise<{ message: string; review: Review }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập để gửi đánh giá');
    }
    const database = getDb();
    if (database.presentation_mode && !session.user.is_owner) {
      throw new Error('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình');
    }

    const prod = database.products.find((p) => p.id === Number(payload.product_id));
    if (!prod) throw new Error('Không tìm thấy sản phẩm');

    // Check existing
    const existing = database.reviews.find(
      (r) => r.order_id === Number(payload.order_id) && r.product_id === Number(payload.product_id)
    );
    if (existing) {
      throw new Error('Sản phẩm này trong đơn hàng đã được đánh giá rồi');
    }

    const ord = database.orders.find((o) => o.id === Number(payload.order_id));
    const targetShopId = prod.shop_id || ord?.shop_id || 1;
    const shopObj = database.shops.find((s) => s.id === targetShopId);

    const newRevId = (database.reviews.reduce((max, r) => Math.max(max, r.id), 0) || 0) + 1;
    const authorName = payload.is_anonymous ? 'Người mua ẩn danh' : session.user.full_name;
    const newRev: Review = {
      id: newRevId,
      shop_id: targetShopId,
      order_id: Number(payload.order_id),
      product_id: Number(payload.product_id),
      user_id: session.user.id,
      author_name: authorName,
      buyer_name: authorName,
      product_name: prod.name,
      order_code: ord?.code,
      rating: Math.min(5, Math.max(1, Number(payload.rating) || 5)),
      comment: (payload.comment || '').trim(),
      images: payload.images || [],
      video_url: payload.video_url,
      video_duration: payload.video_duration,
      video_poster: payload.video_poster,
      is_anonymous: Boolean(payload.is_anonymous),
      tags: payload.tags || [],
      helpful_count: 0,
      helpful_user_ids: [],
      is_hidden: false,
      edit_count: 0,
      created_at: new Date().toISOString()
    };

    database.reviews.unshift(newRev);

    // Notify seller of this shop
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: shopObj?.owner_user_id || 1,
      role: 'seller',
      title: 'Đánh giá mới cho sản phẩm',
      message: `${newRev.buyer_name} vừa đánh giá ${newRev.rating}★ cho "${prod.name}".`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Cảm ơn bạn đã đánh giá!', review: newRev };
  },

  async updateReview(reviewId: number, payload: Partial<Review>): Promise<{ message: string; review: Review }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();
    const rev = database.reviews.find((r) => r.id === Number(reviewId) && r.user_id === session.user.id);
    if (!rev) throw new Error('Không tìm thấy đánh giá');

    // Allowed 1 edit within 7 days
    const createdTime = new Date(rev.created_at).getTime();
    if (Date.now() - createdTime > 7 * 86400000) {
      throw new Error('Đã quá hạn 7 ngày để chỉnh sửa đánh giá');
    }
    if ((rev.edit_count || 0) >= 1) {
      throw new Error('Đánh giá chỉ được chỉnh sửa tối đa 1 lần');
    }

    if (payload.rating !== undefined) rev.rating = payload.rating;
    if (payload.comment !== undefined) rev.comment = payload.comment;
    if (payload.images !== undefined) rev.images = payload.images;
    if (payload.video_url !== undefined) rev.video_url = payload.video_url;
    if (payload.is_anonymous !== undefined) {
      rev.is_anonymous = payload.is_anonymous;
      rev.buyer_name = payload.is_anonymous ? 'Người mua ẩn danh' : session.user.full_name;
    }
    rev.edit_count = (rev.edit_count || 0) + 1;
    rev.updated_at = new Date().toISOString();

    saveDb(database);
    return { message: 'Đã cập nhật đánh giá thành công', review: rev };
  },

  async toggleHelpfulReview(reviewId: number): Promise<{ helpful_count: number; is_helpful: boolean }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();
    const rev = database.reviews.find((r) => r.id === Number(reviewId));
    if (!rev) throw new Error('Không tìm thấy đánh giá');

    rev.helpful_user_ids = rev.helpful_user_ids || [];
    const idx = rev.helpful_user_ids.indexOf(session.user.id);
    let isHelpful = false;

    if (idx >= 0) {
      rev.helpful_user_ids.splice(idx, 1);
      isHelpful = false;
    } else {
      rev.helpful_user_ids.push(session.user.id);
      isHelpful = true;
    }
    rev.helpful_count = rev.helpful_user_ids.length;

    saveDb(database);
    return { helpful_count: rev.helpful_count, is_helpful: isHelpful };
  },

  async replyReview(reviewId: number, reply: string): Promise<{ message: string; review: Review }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const rev = database.reviews.find((r) => r.id === Number(reviewId));
    if (!rev) throw new Error('Không tìm thấy đánh giá');

    this.checkSellerShopOwnership(session, database, rev.shop_id);

    rev.seller_reply = reply.trim();
    rev.seller_reply_at = new Date().toISOString();

    // Notify buyer
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: rev.user_id || 2,
      role: 'buyer',
      title: 'Shop đã phản hồi đánh giá',
      message: `Shop vừa phản hồi đánh giá của bạn cho món đồ "${rev.product_name}".`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã phản hồi đánh giá', review: rev };
  },

  async reportReview(reviewId: number, reason: string): Promise<{ message: string }> {
    await delay();
    const database = getDb();
    const rev = database.reviews.find((r) => r.id === Number(reviewId));
    if (!rev) throw new Error('Không tìm thấy đánh giá');

    rev.is_hidden = true;
    rev.report_reason = reason;

    saveDb(database);
    return { message: 'Đã ẩn đánh giá khỏi trang công khai' };
  },

  // --- RETURNS & REFUNDS ---
  async requestReturn(payload: {
    order_id: number;
    reason: string;
    description: string;
    images?: string[];
    refund_method: string;
  }): Promise<{ message: string; return_request: ReturnRequest }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua');
    }
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(payload.order_id) && (o.buyer_id === session.user.id || o.user_id === session.user.id));
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    const firstItem = ord.items?.[0];
    const newId = (database.return_requests.reduce((max, r) => Math.max(max, r.id), 0) || 0) + 1;
    const shopObj = database.shops.find((s) => s.id === ord.shop_id);

    const newReq: ReturnRequest = {
      id: newId,
      order_id: ord.id,
      shop_id: ord.shop_id,
      order_code: ord.code,
      buyer_id: session.user.id,
      buyer_name: session.user.full_name,
      buyer_phone: session.user.phone,
      product_id: firstItem?.product_id || 1,
      product_name: firstItem?.product_name || 'Sản phẩm hoàn trả',
      product_image: firstItem?.image_url,
      reason: payload.reason,
      description: payload.description,
      images: payload.images || [],
      refund_amount: ord.total,
      refund_method: payload.refund_method,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    database.return_requests.unshift(newReq);

    // Notify seller of this shop
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: shopObj?.owner_user_id || 1,
      role: 'seller',
      title: 'Yêu cầu đổi trả mới',
      message: `Khách ${session.user.full_name} yêu cầu trả đơn #${ord.code}.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: 'Đã gửi yêu cầu trả hàng & hoàn tiền', return_request: newReq };
  },

  async getMyReturns(): Promise<{ return_requests: ReturnRequest[] }> {
    await delay();
    const session = getCurrentSession();
    if (!session || !session.user) return { return_requests: [] };
    const database = getDb();
    return { return_requests: database.return_requests.filter((r) => r.buyer_id === session.user.id) };
  },

  async getSellerReturns(): Promise<{ return_requests: ReturnRequest[] }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    const filtered = database.return_requests.filter((r) => {
      if (r.shop_id) return r.shop_id === sellerShop.id;
      const ord = database.orders.find((o) => o.id === r.order_id);
      return ord && ord.shop_id === sellerShop.id;
    });

    return { return_requests: filtered };
  },

  async updateReturnStatus(id: number, payload: { status: string; seller_note?: string }): Promise<{ message: string; return_request: ReturnRequest }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const ret = database.return_requests.find((r) => r.id === Number(id));
    if (!ret) throw new Error('Không tìm thấy yêu cầu trả hàng');

    const ord = database.orders.find((o) => o.id === ret.order_id);
    const shopId = ret.shop_id || ord?.shop_id || 1;
    this.checkSellerShopOwnership(session, database, shopId);

    ret.status = payload.status as ReturnStatus;
    if (payload.seller_note) ret.seller_note = payload.seller_note;

    if (payload.status === 'refunded') {
      // restore stock
      if (ord) {
        for (const it of ord.items || []) {
          const prod = database.products.find((p) => p.id === it.product_id);
          if (prod) prod.stock += it.quantity;
        }
      }
    }

    saveDb(database);
    return { message: 'Đã cập nhật yêu cầu trả hàng', return_request: ret };
  },

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) return { notifications: [], unread_count: 0 };
    const database = getDb();
    const myNotifs = database.notifications.filter(
      (n) => n.user_id === session.user.id || (n.role && n.role === session.user.role)
    );
    return {
      notifications: myNotifs,
      unread_count: myNotifs.filter((n) => !n.is_read).length
    };
  },

  async markNotificationRead(id: number): Promise<{ message: string }> {
    await delay(30);
    const database = getDb();
    const notif = database.notifications.find((n) => n.id === Number(id));
    if (notif) notif.is_read = true;
    saveDb(database);
    return { message: 'Đã đánh dấu đã đọc' };
  },

  async markAllNotificationsRead(): Promise<{ message: string }> {
    await delay(30);
    const session = getCurrentSession();
    if (!session || !session.user) return { message: 'Xong' };
    const database = getDb();
    for (const n of database.notifications) {
      if (n.user_id === session.user.id || n.role === session.user.role) {
        n.is_read = true;
      }
    }
    saveDb(database);
    return { message: 'Đã đọc toàn bộ thông báo' };
  },

  // --- WISHLIST ---
  async getWishlistIds(): Promise<{ product_ids: number[] }> {
    await delay(40);
    const session = getCurrentSession();
    if (!session || !session.user) return { product_ids: [] };
    const database = getDb();
    const ids = database.wishlist.filter((w) => w.user_id === session.user.id).map((w) => w.product_id);
    return { product_ids: ids };
  },

  async toggleWishlist(productId: number): Promise<{ liked: boolean; message: string }> {
    await delay(80);
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để lưu món đồ');
    }
    const database = getDb();
    const pid = Number(productId);
    const idx = database.wishlist.findIndex((w) => w.user_id === session.user.id && w.product_id === pid);
    let liked = false;
    if (idx >= 0) {
      database.wishlist.splice(idx, 1);
      liked = false;
    } else {
      database.wishlist.push({ user_id: session.user.id, product_id: pid, created_at: new Date().toISOString() });
      liked = true;
    }
    saveDb(database);
    return { liked, message: liked ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ yêu thích' };
  },

  // --- SELLER COUPONS ---
  async getSellerCoupons(): Promise<{ coupons: Coupon[] }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);
    return { coupons: database.coupons.filter((c) => c.shop_id === sellerShop.id) };
  },

  async createCoupon(data: { code: string; type: string; value: number; max_discount?: number; min_order_amount?: number }): Promise<{ coupon: Coupon }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    const cleanCode = data.code.toUpperCase().trim();
    if (database.coupons.some((c) => c.code === cleanCode && c.shop_id === sellerShop.id)) {
      throw new Error('Mã giảm giá này đã tồn tại trong shop của bạn');
    }

    const newId = (database.coupons.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
    const newCpn: Coupon = {
      id: newId,
      shop_id: sellerShop.id,
      seller_id: sellerShop.owner_user_id,
      code: cleanCode,
      type: data.type as any,
      value: Number(data.value),
      max_discount: data.max_discount ? Number(data.max_discount) : undefined,
      min_order_amount: data.min_order_amount ? Number(data.min_order_amount) : 0,
      is_active: true,
      usage_count: 0
    };

    database.coupons.push(newCpn);
    saveDb(database);
    return { coupon: newCpn };
  },

  async toggleCoupon(id: number): Promise<{ message: string; is_active: boolean }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const cpn = database.coupons.find((c) => c.id === Number(id));
    if (!cpn) throw new Error('Không tìm thấy mã');

    this.checkSellerShopOwnership(session, database, cpn.shop_id);

    cpn.is_active = !cpn.is_active;
    saveDb(database);
    return {
      message: cpn.is_active ? 'Đã kích hoạt mã giảm giá' : 'Đã tạm dừng mã giảm giá',
      is_active: Boolean(cpn.is_active)
    };
  },

  async deleteCoupon(id: number): Promise<{ message: string }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const cpn = database.coupons.find((c) => c.id === Number(id));
    if (!cpn) throw new Error('Không tìm thấy mã');

    this.checkSellerShopOwnership(session, database, cpn.shop_id);

    database.coupons = database.coupons.filter((c) => c.id !== Number(id));
    saveDb(database);
    return { message: 'Đã xóa mã giảm giá' };
  },

  // --- FILE UPLOAD (MOCK / INDEXEDDB) ---
  async uploadFile(base64: string, type: 'image' | 'video' = 'image'): Promise<{ url: string }> {
    await delay(100);
    const url = await saveMediaToIndexedDb(base64, type);
    return { url };
  },

  // --- ADDRESS BOOK ---
  async getAddresses(): Promise<{ addresses: Address[] }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) return { addresses: [] };
    const database = getDb();
    const list = database.addresses.filter((a) => a.user_id === session.user.id);
    return { addresses: list };
  },

  async addAddress(data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }): Promise<{ message: string; addresses: Address[] }> {
    await delay(80);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();

    if (data.is_default) {
      for (const a of database.addresses) {
        if (a.user_id === session.user.id) a.is_default = false;
      }
    }

    const newId = (database.addresses.reduce((max, a) => Math.max(max, a.id), 0) || 0) + 1;
    database.addresses.push({
      id: newId,
      user_id: session.user.id,
      recipient_name: data.recipient_name.trim(),
      phone: data.phone.trim(),
      address_line: data.address_line.trim(),
      is_default: Boolean(data.is_default || database.addresses.filter((a) => a.user_id === session.user.id).length === 0)
    });

    saveDb(database);
    const updatedList = database.addresses.filter((a) => a.user_id === session.user.id);
    return { message: 'Thêm địa chỉ mới thành công', addresses: updatedList };
  },

  async updateAddress(id: number, data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }): Promise<{ message: string; addresses: Address[] }> {
    await delay(80);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();

    const addr = database.addresses.find((a) => a.id === Number(id) && a.user_id === session.user.id);
    if (!addr) throw new Error('Không tìm thấy địa chỉ');

    if (data.is_default) {
      for (const a of database.addresses) {
        if (a.user_id === session.user.id) a.is_default = false;
      }
    }

    addr.recipient_name = data.recipient_name.trim();
    addr.phone = data.phone.trim();
    addr.address_line = data.address_line.trim();
    if (data.is_default !== undefined) addr.is_default = data.is_default;

    saveDb(database);
    const updatedList = database.addresses.filter((a) => a.user_id === session.user.id);
    return { message: 'Cập nhật địa chỉ thành công', addresses: updatedList };
  },

  async deleteAddress(id: number): Promise<{ message: string; addresses: Address[] }> {
    await delay(80);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();

    database.addresses = database.addresses.filter((a) => !(a.id === Number(id) && a.user_id === session.user.id));
    saveDb(database);
    const updatedList = database.addresses.filter((a) => a.user_id === session.user.id);
    return { message: 'Đã xóa địa chỉ', addresses: updatedList };
  },

  async setDefaultAddress(id: number): Promise<{ message: string; addresses: Address[] }> {
    await delay(50);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();

    for (const a of database.addresses) {
      if (a.user_id === session.user.id) {
        a.is_default = a.id === Number(id);
      }
    }

    saveDb(database);
    const updatedList = database.addresses.filter((a) => a.user_id === session.user.id);
    return { message: 'Đã đặt làm địa chỉ mặc định', addresses: updatedList };
  },

  // --- PROFILE UPDATE ---
  async updateProfile(data: { full_name: string; phone?: string }): Promise<{ message: string; user: User }> {
    await delay(100);
    const session = getCurrentSession();
    if (!session || !session.user) throw new Error('Vui lòng đăng nhập');
    const database = getDb();

    const user = database.users.find((u) => u.id === session.user.id);
    if (!user) throw new Error('Không tìm thấy tài khoản');

    user.full_name = data.full_name.trim();
    if (data.phone) {
      user.phone = data.phone.trim();
    }

    const safeUser: User = {
      id: user.id,
      role: user.role,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone,
      is_owner: Boolean(user.is_owner),
      shop_name: user.shop_name
    };

    saveDb(database);
    setCurrentSession(safeUser);
    return { message: 'Cập nhật thông tin thành công', user: safeUser };
  },

  // --- WISHLIST FULL PRODUCTS ---
  async getWishlist(): Promise<{ products: Product[] }> {
    await delay(60);
    const session = getCurrentSession();
    if (!session || !session.user) return { products: [] };
    const database = getDb();
    const wishPids = new Set(database.wishlist.filter((w) => w.user_id === session.user.id).map((w) => w.product_id));
    const products = database.products.filter((p) => wishPids.has(p.id));
    return { products };
  },

  // --- PUBLIC COUPONS & AUTOCOMPLETE ---
  async getPublicCoupons(): Promise<{ coupons: Coupon[] }> {
    await delay(40);
    const database = getDb();
    return { coupons: database.coupons.filter((c) => c.is_active) };
  },

  async getAutocomplete(q: string): Promise<{ suggestions: Array<{ id: number; name: string; category: string; price: number; original_price: number; condition_pct: number; image_url: string; stock: number }> }> {
    await delay(30);
    const database = getDb();
    const query = (q || '').toLowerCase().trim();
    if (!query) return { suggestions: [] };

    const matches = database.products
      .filter((p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        original_price: p.original_price,
        condition_pct: p.condition_pct,
        image_url: p.image_url,
        stock: p.stock
      }));

    return { suggestions: matches };
  },

  async recordProductView(productId: number): Promise<{ success: boolean }> {
    // Record view in memory
    return { success: true };
  },

  // --- SEARCH SHOPS ---
  async searchShops(q: string): Promise<{ shops: Shop[] }> {
    await delay(30);
    const database = getDb();
    const query = (q || '').toLowerCase().trim();
    if (!query) return { shops: [] };
    const matches = database.shops.filter(
      (s) => s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query)) || s.slug.toLowerCase().includes(query)
    );
    return { shops: matches };
  },

  // --- SHIPMENT FAST FORWARD & KANBAN HANDOVER ---
  async getEligibleShipmentOrders(): Promise<{ orders: Order[] }> {
    await delay(50);
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);

    const eligible = database.orders.filter(
      (o) => o.shop_id === sellerShop.id && (o.status === 'confirmed' || o.status === 'shipping' || o.status === 'delivered' || o.status === 'pending')
    );
    return { orders: eligible };
  },

  async handoverOrder(orderId: number, handoverData: { carrier: string; location?: string; note?: string }): Promise<{ message: string; order: Order; shipment_events: ShipmentEvent[] }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const ord = database.orders.find((o) => o.id === Number(orderId));
    if (!ord) throw new Error('Không tìm thấy đơn hàng');

    const sellerShop = this.checkSellerShopOwnership(session, database, ord.shop_id);

    ord.carrier = handoverData.carrier;
    if (!ord.tracking_code) {
      const carrierPrefixMap: Record<string, string> = {
        'Giao Hàng Nhanh': 'GHN',
        'Giao Hàng Tiết Kiệm': 'GHTK',
        'Viettel Post': 'VTP',
        'J&T Express': 'JNT',
        'SPX Express': 'SPX'
      };
      const prefix = carrierPrefixMap[handoverData.carrier] || 'VN';
      ord.tracking_code = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}VN`;
    }
    ord.status = 'shipping';

    const newEvt: ShipmentEvent = {
      id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
      order_id: ord.id,
      status: 'Đã bàn giao cho đơn vị vận chuyển',
      location: handoverData.location || sellerShop.pickup_address || `Kho ${sellerShop.name}`,
      note: handoverData.note || `Đã bàn giao kiện hàng cho đối tác ${handoverData.carrier}`,
      created_at: new Date().toISOString()
    };

    ord.shipment_events = ord.shipment_events || [];
    ord.shipment_events.push(newEvt);

    // Notify buyer
    database.notifications.unshift({
      id: (database.notifications.reduce((max, n) => Math.max(max, n.id), 0) || 0) + 1,
      user_id: ord.buyer_id || ord.user_id || 2,
      role: 'buyer',
      title: 'Đơn hàng đang trên đường giao',
      message: `Đơn hàng #${ord.code} đã được bàn giao cho ${handoverData.carrier}. Mã vận đơn: ${ord.tracking_code}`,
      order_id: ord.id,
      is_read: false,
      created_at: new Date().toISOString()
    });

    saveDb(database);
    return { message: `Đã bàn giao đơn hàng #${ord.code}`, order: ord, shipment_events: ord.shipment_events };
  },

  async bulkHandoverOrders(orderIds: number[], carrier: string): Promise<{ message: string; handover_count: number }> {
    await delay();
    const session = getCurrentSession();
    const database = getDb();
    const sellerShop = this.checkSellerShopOwnership(session, database);
    let count = 0;

    for (const id of orderIds) {
      const ord = database.orders.find((o) => o.id === Number(id));
      if (ord && ord.shop_id === sellerShop.id) {
        ord.carrier = carrier;
        if (!ord.tracking_code) {
          ord.tracking_code = `GHN-${Math.floor(100000 + Math.random() * 900000)}VN`;
        }
        ord.status = 'shipping';
        ord.shipment_events = ord.shipment_events || [];
        ord.shipment_events.push({
          id: (database.shipment_events.reduce((max, e) => Math.max(max, e.id), 0) || 0) + 1,
          order_id: ord.id,
          status: 'Đã bàn giao cho đơn vị vận chuyển',
          location: sellerShop.pickup_address || `Kho ${sellerShop.name}`,
          note: `Đã bàn giao hàng loạt cho ${carrier}`,
          created_at: new Date().toISOString()
        });
        count++;
      }
    }

    saveDb(database);
    return { message: `Đã bàn giao ${count} đơn hàng cho ${carrier}`, handover_count: count };
  }
};
