import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  getFirestore
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser
} from 'firebase/auth';
import {
  firebaseConfig,
  getDefaultFirestore,
  getDefaultAuth,
  getActiveApp,
  getActiveFirestore,
  getActiveAuth,
  getOrCreateAccountApp,
  getAccountAuth,
  getAppKeyFor,
  getActiveAccountKey,
  setActiveAccountKey,
  getStoredAccounts,
  saveStoredAccount,
  removeStoredAccount,
  StoredAccount,
  toBuyerEmail,
  toSellerEmail,
  mapFirebaseError,
  OWNER_KEYS
} from '../firebase';
import {
  Product,
  Order,
  User,
  Shop,
  Coupon,
  CartItem,
  ReturnRequest,
  Review,
  NotificationItem,
  Offer,
  ChatConversation,
  ChatMessage,
  Address,
  ShipmentEvent,
  SellerStats
} from '../types';

// =========================================================================
// SVG GENERATORS & ICON HELPERS
// =========================================================================
export function getProductEmoji(title: string = '', category: string = ''): string {
  const t = title.toLowerCase();
  const c = category.toLowerCase();

  if (t.includes('iphone') || t.includes('điện thoại')) return '📱';
  if (t.includes('bàn phím') || t.includes('keychron')) return '⌨️';
  if (t.includes('tai nghe') || t.includes('sony wh') || t.includes('headphone')) return '🎧';
  if (t.includes('máy ảnh') || t.includes('canon') || t.includes('film')) return '📷';
  if (t.includes('đồng hồ') || t.includes('casio')) return '⌚';
  if (t.includes('túi xách') || t.includes('túi da')) return '👜';
  if (t.includes('áo khoác') || t.includes('denim') || t.includes('áo jacket')) return '🧥';
  if (t.includes('nồi chiên') || t.includes('philips') || t.includes('bếp')) return '🍳';
  if (t.includes('sách') || t.includes('nhà giả kim') || t.includes('tiểu thuyết')) return '📖';
  if (t.includes('guitar') || t.includes('yamaha') || t.includes('đàn')) return '🎸';

  if (c.includes('thời trang') || c.includes('quần áo')) return '🧥';
  if (c.includes('máy ảnh')) return '📷';
  if (c.includes('điện thoại') || c.includes('điện tử')) return '📱';
  if (c.includes('sách')) return '📖';
  if (c.includes('nhạc cụ')) return '🎸';
  if (c.includes('gia dụng')) return '🍳';
  if (c.includes('phụ kiện')) return '⌚';

  return '📦';
}

export function createVintageProductSvg(
  title: string,
  category: string,
  variant: number = 0,
  shopName?: string
): string {
  const angleLabel = variant === 1 ? 'MẶT SAU' : variant === 2 ? 'CẬN CẢNH' : 'MẶT TRƯỚC';
  const cleanTitle = title.replace(/["<>]/g, '');
  const cleanCat = category.replace(/["<>]/g, '').toUpperCase();
  const emoji = getProductEmoji(cleanTitle, cleanCat);
  const brandSub = (shopName ? shopName.toUpperCase() : 'ĐỒ CŨ CÒN THƯƠNG') + ' · ' + angleLabel;

  const bgPalette = ['#2F3E46', '#473B32', '#333D47', '#544636', '#2B303A', '#3E444B', '#3C493F', '#543D2B'];
  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = (hash << 5) - hash + cleanTitle.charCodeAt(i);
    hash |= 0;
  }
  const bg = bgPalette[Math.abs(hash + variant) % bgPalette.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <rect width="600" height="600" fill="${bg}"/>
  <rect x="24" y="24" width="552" height="552" fill="none" stroke="#FAF7F2" stroke-opacity="0.25" stroke-width="2" rx="16"/>
  <rect x="36" y="36" width="528" height="528" fill="none" stroke="#FAF7F2" stroke-opacity="0.1" stroke-width="1" rx="12"/>
  <circle cx="300" cy="270" r="140" fill="#FAF7F2" fill-opacity="0.08"/>
  <circle cx="300" cy="270" r="100" fill="#FAF7F2" fill-opacity="0.06"/>
  <text x="300" y="315" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="110" text-anchor="middle">${emoji}</text>
  <rect x="60" y="55" width="150" height="28" rx="6" fill="#08482D" fill-opacity="0.85"/>
  <text x="135" y="74" font-family="'Space Mono', monospace, sans-serif" font-size="12" font-weight="bold" fill="#FAF7F2" text-anchor="middle" letter-spacing="1.5">${cleanCat}</text>
  <rect x="390" y="55" width="150" height="28" rx="6" fill="#FAF7F2" fill-opacity="0.15"/>
  <text x="465" y="74" font-family="'Space Mono', monospace, sans-serif" font-size="11" font-weight="bold" fill="#FAF7F2" text-anchor="middle" letter-spacing="1">${angleLabel}</text>
  <text x="300" y="470" font-family="'Fraunces', Georgia, serif" font-size="24" font-weight="bold" fill="#FAF7F2" text-anchor="middle">${cleanTitle.length > 28 ? cleanTitle.slice(0, 26) + '...' : cleanTitle}</text>
  <text x="300" y="505" font-family="'Space Mono', monospace, sans-serif" font-size="11" fill="#FAF7F2" fill-opacity="0.75" text-anchor="middle" letter-spacing="2">${brandSub}</text>
  <line x1="180" y1="525" x2="420" y2="525" stroke="#FAF7F2" stroke-opacity="0.2" stroke-width="1"/>
</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function createShopAvatarSvg(name: string, coverColor: string = '#08482D'): string {
  const initial = (name.trim().charAt(0) || 'S').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <rect width="200" height="200" rx="40" fill="${coverColor}"/>
    <text x="100" y="125" font-family="system-ui, sans-serif" font-size="76" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function isLegacyOrEmptyImage(src?: string): boolean {
  if (!src) return true;
  if (src.startsWith('data:image/svg+xml')) return false;
  if (src.startsWith('data:image/')) return false;
  if (src.startsWith('http://') || src.startsWith('https://')) return false;
  return true;
}

export function createSvgPlaceholder(
  title: string,
  category: string,
  _bg?: string,
  _fg?: string,
  tag: string = 'MẶT TRƯỚC',
  shopName?: string
): string {
  const variant = tag.includes('SAU') ? 1 : tag.includes('CẬN') ? 2 : 0;
  return createVintageProductSvg(title, category, variant, shopName);
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// =========================================================================
// IMAGE & VIDEO UTILITIES (IndexedDB + Canvas Compression)
// =========================================================================
export function assertDocSize(data: any): void {
  const json = JSON.stringify(data);
  const size = new Blob([json]).size;
  if (size > 900 * 1024) {
    throw new Error('Ảnh quá lớn, vui lòng bớt ảnh');
  }
}

export async function compressImage(
  dataUrlOrFile: string | File | Blob,
  maxDimension: number = 1024,
  maxBytes: number = 150 * 1024
): Promise<string> {
  let dataUrl: string;
  if (typeof dataUrlOrFile === 'string') {
    dataUrl = dataUrlOrFile;
  } else {
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(dataUrlOrFile);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      let result = canvas.toDataURL('image/jpeg', quality);

      while (result.length * 0.75 > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(result);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Local IndexedDB for Video review
const IDB_VIDEO_NAME = 'dcct_video_store';
function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(IDB_VIDEO_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('videos', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalVideo(blob: Blob): Promise<string> {
  const id = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const idb = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction('videos', 'readwrite');
      tx.objectStore('videos').put({ id, blob, createdAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return id;
  } catch (err) {
    console.warn('Could not store video in IndexedDB:', err);
    return id;
  }
}

export async function getLocalVideo(id: string): Promise<Blob | null> {
  try {
    const idb = await openVideoDb();
    return new Promise((resolve) => {
      const tx = idb.transaction('videos', 'readonly');
      const req = tx.objectStore('videos').get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// =========================================================================
// CURRENT IN-MEMORY SESSION & SUBSCRIBERS
// =========================================================================
let cachedCurrentUser: User | null = null;
const stateSubscribers = new Set<() => void>();
const activeListeners: Unsubscribe[] = [];

export function clearActiveListeners(): void {
  activeListeners.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  activeListeners.length = 0;
}

export function registerActiveListener(unsub: Unsubscribe): void {
  activeListeners.push(unsub);
}

export function subscribeDb(callback: () => void): () => void {
  stateSubscribers.add(callback);
  return () => {
    stateSubscribers.delete(callback);
  };
}

function notifySubscribers(): void {
  stateSubscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // quiet catch
    }
  });
}

export function getCurrentUser(): User | null {
  return cachedCurrentUser;
}

export function getCurrentSession(): { token: string; user: User } | null {
  if (!cachedCurrentUser) return null;
  return {
    token: cachedCurrentUser.uid || String(cachedCurrentUser.id),
    user: cachedCurrentUser
  };
}

export function setCurrentSession(user: User | null): void {
  cachedCurrentUser = user;
  notifySubscribers();
}

export function clearCurrentSession(): void {
  clearActiveListeners();
  cachedCurrentUser = null;
  setActiveAccountKey(null);
  notifySubscribers();
}

// Normalizer from Firestore user doc to User interface
function normalizeUserDoc(docData: DocumentData, uid: string): User {
  return {
    id: uid as any,
    uid,
    role: docData.role || 'buyer',
    username: docData.username || '',
    phone: docData.phone || '',
    full_name: docData.fullName || docData.full_name || '',
    shop_id: docData.shopId || null,
    shop_name: docData.shopName || undefined,
    is_owner: false,
    created_at: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString()
  };
}

// Normalizer from Firestore shop doc to Shop interface
function normalizeShopDoc(docData: DocumentData, slug: string): Shop {
  return {
    id: slug as any,
    owner_user_id: docData.ownerUid as any,
    name: docData.name,
    slug: docData.slug || slug,
    description: docData.description || '',
    avatar: docData.avatar || createShopAvatarSvg(docData.name, docData.coverColor),
    cover_color: docData.coverColor || '#08482D',
    cover_image: docData.coverImage || '',
    pickup_address: docData.pickupAddress || '',
    phone: docData.phone || '',
    follower_ids: (docData.followerUids || []).map((u: string) => u as any),
    follower_count: docData.followerCount || (docData.followerUids ? docData.followerUids.length : 0),
    rating_avg: docData.ratingAvg || 0,
    review_count: docData.ratingCount || 0,
    response_rate: 98,
    joined_text: 'Đang hoạt động',
    created_at: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString()
  };
}

// Normalizer from Firestore product doc to Product interface
function normalizeProductDoc(docData: DocumentData, id: string): Product {
  const images = Array.isArray(docData.images) && docData.images.length > 0 ? docData.images : [];
  const primaryImg = images[0] || createVintageProductSvg(docData.name, docData.category, 0, docData.shopName);
  return {
    id: id as any,
    shop_id: docData.shopId as any,
    seller_id: docData.ownerUid as any,
    shop_name: docData.shopName || 'Đồ Cũ Còn Thương',
    shop_slug: docData.shopId || 'do-cu-con-thuong',
    name: docData.name,
    category: docData.category,
    price: Number(docData.price || 0),
    original_price: Number(docData.originalPrice || docData.price || 0),
    condition_pct: Number(docData.conditionPct || 90),
    condition_detail: docData.conditionNote || '',
    stock: Number(docData.stock || 1),
    image_url: primaryImg,
    images: images.length > 0 ? images : [primaryImg],
    flaws: Array.isArray(docData.defects) ? docData.defects.map((d: any, idx: number) => ({
      id: idx + 1,
      description: typeof d === 'string' ? d : d.text || '',
      image_url: typeof d === 'object' && d.image ? d.image : ''
    })) : [],
    inspection_date: docData.inspection?.date || '2026-10-20',
    inspector_name: docData.inspection?.inspector || 'Trần Minh Tuấn (KTV Chuyên Sâu)',
    inspection_checklist: docData.inspection?.checks || [
      '✓ Hoạt động hoàn hảo mọi tính năng',
      '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
      '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
    ],
    rating_avg: docData.ratingAvg || 0,
    review_count: docData.ratingCount || 0,
    view_count: docData.viewCount || 0,
    created_at: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString()
  };
}

// Normalizer from Firestore coupon doc to Coupon interface
function normalizeCouponDoc(docData: DocumentData, code: string): Coupon {
  return {
    id: code as any,
    shop_id: docData.shopId as any,
    seller_id: docData.ownerUid as any,
    shop_name: docData.shopName || '',
    code: docData.code || code,
    type: docData.type === 'freeship' ? 'shipping' : docData.type,
    value: Number(docData.value || 0),
    max_discount: Number(docData.maxDiscount || 0),
    min_order_amount: Number(docData.minOrder || 0),
    is_active: docData.active !== false,
    usage_count: docData.usedCount || 0,
    description: docData.type === 'freeship' || docData.type === 'shipping'
      ? `Miễn phí vận chuyển tối đa ${(docData.maxDiscount || 30000).toLocaleString('vi-VN')}đ`
      : docData.type === 'percent'
      ? `Giảm ${docData.value}% tối đa ${(docData.maxDiscount || 0).toLocaleString('vi-VN')}đ`
      : `Giảm ${(docData.value || 0).toLocaleString('vi-VN')}đ`
  };
}

// Normalizer from Firestore order doc to Order interface
function normalizeOrderDoc(docData: DocumentData, code: string): Order {
  return {
    id: code as any,
    code: docData.code || code,
    shop_id: docData.shopId as any,
    seller_id: docData.sellerUid as any,
    shop_name: docData.shopName || '',
    shop_slug: docData.shopId || '',
    buyer_id: docData.buyerUid as any,
    user_id: docData.buyerUid as any,
    buyer_name: docData.buyerName || docData.receiver || '',
    buyer_phone: docData.buyerPhone || docData.phone || '',
    recipient_name: docData.receiver || docData.buyerName || '',
    phone: docData.phone || '',
    address: docData.address || '',
    note: docData.note || '',
    subtotal: Number(docData.subtotal || 0),
    shipping_fee: Number(docData.shippingFee || 0),
    discount_amount: Number(docData.discount || 0),
    coupon_code: docData.couponCode || undefined,
    total: Number(docData.total || 0),
    payment_method: docData.paymentMethod || 'card',
    payment_status: docData.paymentStatus || 'pending',
    card_type: docData.cardBrand ? `${docData.cardBrand} **** ${docData.cardLast4 || '1111'}` : undefined,
    status: docData.status || 'pending',
    carrier: docData.carrier || undefined,
    tracking_code: docData.trackingCode || undefined,
    cancel_reason: docData.cancelReason || undefined,
    items: Array.isArray(docData.items) ? docData.items.map((it: any, idx: number) => ({
      id: idx + 1,
      order_id: code as any,
      product_id: it.productId as any,
      product_name: it.name,
      condition_pct: it.conditionPct || 90,
      price: it.price,
      quantity: it.qty,
      image_url: it.icon ? createVintageProductSvg(it.name, '', 0, docData.shopName) : ''
    })) : [],
    shipment_events: Array.isArray(docData.shipmentEvents) ? docData.shipmentEvents.map((ev: any, idx: number) => ({
      id: idx + 1,
      order_id: code as any,
      event: ev.event,
      label: ev.label,
      location: ev.location,
      note: ev.note,
      created_at: ev.at
    })) : [],
    status_logs: Array.isArray(docData.logs) ? docData.logs.map((lg: any, idx: number) => ({
      id: idx + 1,
      order_id: code as any,
      status: lg.status,
      actor_role: lg.actorRole,
      actor_name: lg.actorName,
      note: lg.note,
      created_at: lg.at
    })) : [],
    items_count: Array.isArray(docData.items) ? docData.items.length : 0,
    created_at: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString(),
    updated_at: docData.updatedAt?.toDate ? docData.updatedAt.toDate().toISOString() : new Date().toISOString()
  };
}

// Check if an account is an owner account
export async function isAccountOwner(role: 'buyer' | 'seller', username: string, uid: string): Promise<boolean> {
  const clean = role === 'buyer' ? username.trim().replace(/\D/g, '') : username.toLowerCase().trim();
  const key = `${role}_${clean}`;
  if (!OWNER_KEYS.includes(key)) return false;
  try {
    const snap = await getDoc(doc(getActiveFirestore(), 'usernames', key));
    if (snap.exists() && snap.data()?.uid === uid) {
      return true;
    }
  } catch {
    try {
      const snap = await getDoc(doc(getDefaultFirestore(), 'usernames', key));
      if (snap.exists() && snap.data()?.uid === uid) {
        return true;
      }
    } catch {}
  }
  return false;
}

// =========================================================================
// MAIN DATABASE CLASS IMPLEMENTATION
// =========================================================================
export class DCCTDatabaseService {
  // --- AUTHENTICATION & MULTI-ACCOUNT ---

  async register(payload: {
    username?: string;
    phone?: string;
    password: string;
    full_name: string;
    role: 'buyer' | 'seller';
    address?: string;
    shop_name?: string;
  }): Promise<{ token: string; user: User }> {
    const role = payload.role;
    let identifier = '';

    if (role === 'buyer') {
      const cleanPhone = (payload.phone || '').trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
        throw new Error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      }
      identifier = cleanPhone;
    } else {
      const cleanUsername = (payload.username || '').trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        throw new Error('Tên đăng nhập phải từ 3-30 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới');
      }
      identifier = cleanUsername;
    }

    if (!payload.password || payload.password.length < 8) {
      throw new Error('Mật khẩu phải có tối thiểu 8 ký tự');
    }

    const email = role === 'buyer' ? toBuyerEmail(identifier) : toSellerEmail(identifier);
    const app = getOrCreateAccountApp(role, identifier);
    const auth = getAccountAuth(app);

    let cred: any;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, payload.password);
    } catch (err: any) {
      throw new Error(mapFirebaseError(err));
    }

    await auth.authStateReady();
    if (!auth.currentUser || auth.currentUser.uid !== cred.user.uid) {
      throw new Error('Không thể xác thực phiên làm việc mới');
    }

    const uid = cred.user.uid;
    const usernameKey = `${role}_${identifier}`;
    const db = getFirestore(app);

    // Verify username uniqueness
    try {
      const usernameRef = doc(db, 'usernames', usernameKey);
      const existingUserSnap = await getDoc(usernameRef);
      if (existingUserSnap.exists()) {
        await deleteUser(cred.user);
        throw new Error(role === 'buyer' ? 'Số điện thoại này đã được sử dụng' : 'Tên đăng nhập đã được sử dụng');
      }

      await setDoc(usernameRef, {
        uid,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      try {
        await deleteUser(cred.user);
      } catch {}
      throw new Error(err.message || 'Tên đăng nhập đã được sử dụng');
    }

    // Create user document
    const isOwner = OWNER_KEYS.includes(usernameKey);
    const userDocData = {
      uid,
      role,
      username: identifier,
      fullName: payload.full_name,
      phone: role === 'buyer' ? identifier : (payload.phone || ''),
      shopId: null,
      addresses: payload.address ? [{
        id: 1,
        receiver: payload.full_name,
        phone: role === 'buyer' ? identifier : (payload.phone || ''),
        address: payload.address,
        isDefault: true
      }] : [],
      wishlist: [],
      followingShops: [],
      savedCoupons: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', uid), userDocData);

    const userObj: User = {
      id: uid as any,
      uid,
      role,
      username: identifier,
      phone: role === 'buyer' ? identifier : (payload.phone || ''),
      full_name: payload.full_name,
      shop_id: null,
      is_owner: isOwner,
      created_at: new Date().toISOString()
    };

    saveStoredAccount({
      role,
      username: identifier,
      fullName: payload.full_name,
      uid,
      phone: role === 'buyer' ? identifier : payload.phone,
      shopId: null
    });

    setActiveAccountKey(getAppKeyFor(role, identifier));
    setCurrentSession(userObj);

    return { token: uid, user: userObj };
  }

  async login(credentials: {
    username: string;
    password: string;
    role: 'buyer' | 'seller';
  }): Promise<{ token: string; user: User; address?: Address }> {
    const role = credentials.role;
    let identifier = '';

    if (role === 'buyer') {
      identifier = credentials.username.trim().replace(/\D/g, '');
    } else {
      identifier = credentials.username.trim().toLowerCase();
    }

    const email = role === 'buyer' ? toBuyerEmail(identifier) : toSellerEmail(identifier);
    const app = getOrCreateAccountApp(role, identifier);
    const auth = getAccountAuth(app);

    let cred: any;
    try {
      cred = await signInWithEmailAndPassword(auth, email, credentials.password);
    } catch (err: any) {
      throw new Error(mapFirebaseError(err));
    }

    await auth.authStateReady();
    if (!auth.currentUser || auth.currentUser.uid !== cred.user.uid) {
      throw new Error('Không thể xác thực phiên làm việc');
    }

    const uid = cred.user.uid;
    const db = getFirestore(app);
    const userSnap = await getDoc(doc(db, 'users', uid));

    if (!userSnap.exists()) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu');
    }

    const userData = userSnap.data();
    const isOwner = await isAccountOwner(role, identifier, uid);
    const userObj = normalizeUserDoc(userData, uid);
    userObj.is_owner = isOwner;

    // If seller, resolve shop
    if (role === 'seller') {
      try {
        const shopsRef = collection(db, 'shops');
        const q = query(shopsRef, where('ownerUid', '==', uid));
        const shopSnap = await getDocs(q);
        if (!shopSnap.empty) {
          const s = shopSnap.docs[0];
          userObj.shop_id = s.id as any;
          userObj.shop_name = s.data().name;
        }
      } catch {}
    }

    saveStoredAccount({
      role,
      username: identifier,
      fullName: userObj.full_name,
      uid,
      phone: userObj.phone,
      shopId: (userObj.shop_id as any) || null,
      shopName: userObj.shop_name
    });

    setActiveAccountKey(getAppKeyFor(role, identifier));
    setCurrentSession(userObj);

    const firstAddress = userData.addresses && userData.addresses.length > 0 ? {
      id: 1,
      user_id: uid as any,
      recipient_name: userData.addresses[0].receiver,
      phone: userData.addresses[0].phone,
      address_line: userData.addresses[0].address,
      is_default: true
    } : undefined;

    return { token: uid, user: userObj, address: firstAddress };
  }

  async getMe(): Promise<{ user: User; address?: Address }> {
    const activeKey = getActiveAccountKey();
    if (!activeKey) {
      clearCurrentSession();
      throw new Error('Chưa đăng nhập');
    }

    const auth = getActiveAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      clearCurrentSession();
      throw new Error('Phiên đăng nhập đã hết hạn');
    }

    const db = getActiveFirestore();
    const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userSnap.exists()) {
      clearCurrentSession();
      throw new Error('Không tìm thấy tài khoản');
    }

    const userData = userSnap.data();
    const userObj = normalizeUserDoc(userData, firebaseUser.uid);
    userObj.is_owner = await isAccountOwner(userObj.role, userObj.username, firebaseUser.uid);

    if (userObj.role === 'seller') {
      try {
        const shopsRef = collection(db, 'shops');
        const q = query(shopsRef, where('ownerUid', '==', firebaseUser.uid));
        const shopSnap = await getDocs(q);
        if (!shopSnap.empty) {
          const s = shopSnap.docs[0];
          userObj.shop_id = s.id as any;
          userObj.shop_name = s.data().name;
        }
      } catch {}
    }

    setCurrentSession(userObj);

    const firstAddress = userData.addresses && userData.addresses.length > 0 ? {
      id: 1,
      user_id: firebaseUser.uid as any,
      recipient_name: userData.addresses[0].receiver,
      phone: userData.addresses[0].phone,
      address_line: userData.addresses[0].address,
      is_default: true
    } : undefined;

    return { user: userObj, address: firstAddress };
  }

  async logout(): Promise<void> {
    try {
      const auth = getActiveAuth();
      await signOut(auth);
    } catch {}

    const cur = getCurrentUser();
    if (cur) {
      removeStoredAccount(cur.role, cur.username);
    }
    clearCurrentSession();
  }

  async switchAccount(role: 'buyer' | 'seller', username: string): Promise<User> {
    clearActiveListeners();
    const app = getOrCreateAccountApp(role, username);
    const auth = getAccountAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) {
      throw new Error(`Tài khoản ${username} chưa được đăng nhập trên thiết bị này`);
    }

    const key = getAppKeyFor(role, username);
    setActiveAccountKey(key);

    const res = await this.getMe();
    return res.user;
  }

  async changePassword(data: { old_password?: string; new_password?: string }): Promise<{ message: string }> {
    throw new Error('Để đổi mật khẩu, vui lòng liên hệ quản trị viên hoặc sử dụng tính năng gửi email đặt lại');
  }

  // --- PRODUCTS ---

  async getProducts(params?: {
    category?: string;
    search?: string;
    sort?: string;
    min_price?: number;
    max_price?: number;
    min_condition?: number;
    in_stock?: boolean;
    shop_id?: string | number;
  }): Promise<{ products: Product[] }> {
    const db = getActiveFirestore();
    const productsRef = collection(db, 'products');

    let q = query(productsRef);
    if (params?.shop_id) {
      q = query(productsRef, where('shopId', '==', String(params.shop_id)));
    }

    const snap = await getDocs(q);
    let list: Product[] = [];

    snap.forEach((d) => {
      const data = d.data();
      if (data.isActive !== false) {
        list.push(normalizeProductDoc(data, d.id));
      }
    });

    if (params?.category && params.category !== 'Tất cả') {
      list = list.filter((p) => p.category.toLowerCase() === params.category!.toLowerCase());
    }

    if (params?.search) {
      const s = params.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s) ||
          (p.shop_name && p.shop_name.toLowerCase().includes(s))
      );
    }

    if (params?.min_price !== undefined) {
      list = list.filter((p) => p.price >= params.min_price!);
    }
    if (params?.max_price !== undefined) {
      list = list.filter((p) => p.price <= params.max_price!);
    }
    if (params?.min_condition !== undefined) {
      list = list.filter((p) => p.condition_pct >= params.min_condition!);
    }
    if (params?.in_stock) {
      list = list.filter((p) => p.stock > 0);
    }

    if (params?.sort === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (params?.sort === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (params?.sort === 'condition') {
      list.sort((a, b) => b.condition_pct - a.condition_pct);
    } else {
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return { products: list };
  }

  async getProduct(id: number | string): Promise<{ product: Product }> {
    const db = getActiveFirestore();
    const snap = await getDoc(doc(db, 'products', String(id)));
    if (!snap.exists()) {
      throw new Error('Sản phẩm không tồn tại hoặc đã bị xóa');
    }
    return { product: normalizeProductDoc(snap.data(), snap.id) };
  }

  async getAutocomplete(queryStr: string): Promise<{
    suggestions: Array<{ id: number; name: string; price: number; condition_pct: number; image_url: string; shop_name?: string }>;
    shops: Array<{ id: number; name: string; slug: string; avatar: string }>;
  }> {
    const q = queryStr.toLowerCase().trim();
    if (!q) return { suggestions: [], shops: [] };

    const { products } = await this.getProducts();
    const matchedProducts = products
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: p.id as any,
        name: p.name,
        price: p.price,
        condition_pct: p.condition_pct,
        image_url: p.image_url,
        shop_name: p.shop_name
      }));

    const { shops } = await this.getShops();
    const matchedShops = shops
      .filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      .slice(0, 3)
      .map((s) => ({
        id: s.id as any,
        name: s.name,
        slug: s.slug,
        avatar: s.avatar || ''
      }));

    return { suggestions: matchedProducts, shops: matchedShops };
  }

  async createProduct(data: Partial<Product>): Promise<{ product: Product }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      throw new Error('Chỉ người bán mới được đăng sản phẩm');
    }

    const db = getActiveFirestore();
    let shopId = cur.shop_id ? String(cur.shop_id) : 'do-cu-con-thuong';
    let shopName = cur.shop_name || 'Đồ Cũ Còn Thương';

    const rawImages = data.images || (data.image_url ? [data.image_url] : []);
    const compressedImages: string[] = [];
    for (const img of rawImages.slice(0, 4)) {
      if (img.startsWith('data:image/svg+xml')) {
        compressedImages.push(img);
      } else {
        const comp = await compressImage(img, 1024, 150 * 1024);
        compressedImages.push(comp);
      }
    }

    const docId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const productDoc = {
      shopId,
      ownerUid: cur.uid,
      shopName,
      name: data.name || 'Sản phẩm mới',
      category: data.category || 'Khác',
      price: Number(data.price || 0),
      originalPrice: Number(data.original_price || data.price || 0),
      conditionPct: Number(data.condition_pct || 90),
      conditionNote: data.condition_detail || '',
      description: data.description || data.condition_detail || '',
      defects: (data.flaws || []).map((f) => ({ text: f.description, image: f.image_url || '' })),
      inspection: {
        date: data.inspection_date || new Date().toISOString().slice(0, 10),
        inspector: data.inspector_name || 'KTV Chuyên Sâu',
        checks: data.inspection_checklist || ['Đã kiểm định hoạt động']
      },
      images: compressedImages,
      icon: getProductEmoji(data.name, data.category),
      stock: Number(data.stock ?? 1),
      sold: 0,
      viewCount: 0,
      viewDate: '',
      ratingAvg: 0,
      ratingCount: 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    assertDocSize(productDoc);
    await setDoc(doc(db, 'products', docId), productDoc);

    return { product: normalizeProductDoc(productDoc, docId) };
  }

  async updateProduct(id: number | string, data: Partial<Product>): Promise<{ product: Product }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      throw new Error('Chỉ người bán mới được sửa sản phẩm');
    }

    const db = getActiveFirestore();
    const ref = doc(db, 'products', String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Sản phẩm không tồn tại');
    }

    const updatePayload: any = {
      updatedAt: serverTimestamp()
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.price !== undefined) updatePayload.price = Number(data.price);
    if (data.original_price !== undefined) updatePayload.originalPrice = Number(data.original_price);
    if (data.condition_pct !== undefined) updatePayload.conditionPct = Number(data.condition_pct);
    if (data.condition_detail !== undefined) updatePayload.conditionNote = data.condition_detail;
    if (data.stock !== undefined) updatePayload.stock = Number(data.stock);

    assertDocSize(updatePayload);
    await updateDoc(ref, updatePayload);

    const updatedSnap = await getDoc(ref);
    return { product: normalizeProductDoc(updatedSnap.data()!, String(id)) };
  }

  async deleteProduct(id: number | string): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      throw new Error('Chỉ người bán mới được xóa sản phẩm');
    }
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'products', String(id)), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
    return { message: 'Đã xóa sản phẩm' };
  }

  async recordProductView(productId: number | string): Promise<void> {
    const cur = getCurrentUser();
    if (!cur) return;

    const today = new Date().toISOString().slice(0, 10);
    const key = `dcct_view_${cur.uid}_${productId}_${today}`;
    if (localStorage.getItem(key)) return;

    try {
      const db = getActiveFirestore();
      const ref = doc(db, 'products', String(productId));
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.viewDate !== today) {
        await updateDoc(ref, { viewCount: 1, viewDate: today });
      } else {
        await updateDoc(ref, { viewCount: increment(1) });
      }
      localStorage.setItem(key, '1');
    } catch {
      // quiet catch
    }
  }

  // --- CART (carts/{uid}) ---

  async getCart(): Promise<{ items: CartItem[]; item_count: number; total_price: number; subtotal: number; shipping_fee: number; total: number }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') {
      return { items: [], item_count: 0, total_price: 0, subtotal: 0, shipping_fee: 0, total: 0 };
    }

    const db = getActiveFirestore();
    const cartSnap = await getDoc(doc(db, 'carts', cur.uid));
    if (!cartSnap.exists()) {
      return { items: [], item_count: 0, total_price: 0, subtotal: 0, shipping_fee: 0, total: 0 };
    }

    const data = cartSnap.data();
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items: CartItem[] = [];
    let totalPrice = 0;

    for (const it of rawItems) {
      try {
        const prodSnap = await getDoc(doc(db, 'products', String(it.productId)));
        if (prodSnap.exists() && prodSnap.data()?.isActive !== false) {
          const p = normalizeProductDoc(prodSnap.data()!, prodSnap.id);
          const effectivePrice = it.negotiatedPrice ? Number(it.negotiatedPrice) : p.price;
          totalPrice += effectivePrice * it.qty;
          items.push({
            id: it.productId as any,
            user_id: cur.uid as any,
            product_id: it.productId as any,
            product_name: p.name,
            product_image: p.image_url,
            quantity: it.qty,
            name: p.name,
            category: p.category,
            price: effectivePrice,
            original_price: p.original_price,
            condition_pct: p.condition_pct,
            condition_detail: p.condition_detail,
            stock: p.stock,
            image_url: p.image_url,
            shop_id: p.shop_id,
            shop_name: p.shop_name,
            shop_slug: p.shop_slug,
            created_at: new Date().toISOString(),
            product: p,
            effective_price: effectivePrice,
            offer_id: it.offerId,
            is_negotiated: !!it.negotiatedPrice,
            negotiated_price: it.negotiatedPrice
          });
        }
      } catch {}
    }

    const shippingFee = totalPrice >= 1000000 || totalPrice === 0 ? 0 : 30000;
    return {
      items,
      item_count: items.reduce((sum, i) => sum + i.quantity, 0),
      total_price: totalPrice,
      subtotal: totalPrice,
      shipping_fee: shippingFee,
      total: totalPrice + shippingFee
    };
  }

  async addToCart(productId: number | string, quantity: number = 1, offerId?: number, negotiatedPrice?: number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để thêm vào giỏ hàng');
    }

    const db = getActiveFirestore();
    const cartRef = doc(db, 'carts', cur.uid);
    const cartSnap = await getDoc(cartRef);
    let items = cartSnap.exists() && Array.isArray(cartSnap.data()?.items) ? cartSnap.data()!.items : [];

    const existingIdx = items.findIndex((i: any) => String(i.productId) === String(productId));
    if (existingIdx >= 0) {
      items[existingIdx].qty += quantity;
      if (offerId) items[existingIdx].offerId = offerId;
      if (negotiatedPrice) items[existingIdx].negotiatedPrice = negotiatedPrice;
    } else {
      const prodSnap = await getDoc(doc(db, 'products', String(productId)));
      const shopId = prodSnap.exists() ? prodSnap.data()?.shopId || 'do-cu-con-thuong' : 'do-cu-con-thuong';
      items.push({
        productId: String(productId),
        shopId,
        qty: quantity,
        negotiatedPrice: negotiatedPrice || null,
        offerId: offerId || null
      });
    }

    await setDoc(cartRef, { items, updatedAt: serverTimestamp() });
    return { message: 'Đã thêm vào giỏ hàng' };
  }

  async updateCartQty(productId: number | string, quantity: number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const cartRef = doc(db, 'carts', cur.uid);
    const cartSnap = await getDoc(cartRef);
    if (!cartSnap.exists()) return { message: 'Thành công' };

    let items = (cartSnap.data()?.items || []).filter((i: any) => {
      if (String(i.productId) === String(productId)) {
        if (quantity <= 0) return false;
        i.qty = quantity;
      }
      return true;
    });

    await setDoc(cartRef, { items, updatedAt: serverTimestamp() });
    return { message: 'Đã cập nhật số lượng' };
  }

  async removeFromCart(productId: number | string): Promise<{ message: string }> {
    return this.updateCartQty(productId, 0);
  }

  async clearCart(): Promise<void> {
    const cur = getCurrentUser();
    if (!cur) return;
    const db = getActiveFirestore();
    await setDoc(doc(db, 'carts', cur.uid), { items: [], updatedAt: serverTimestamp() });
  }

  // --- SHOPS ---

  async getShops(): Promise<{ shops: Shop[] }> {
    const db = getActiveFirestore();
    const snap = await getDocs(collection(db, 'shops'));
    const shops: Shop[] = [];
    snap.forEach((d) => {
      shops.push(normalizeShopDoc(d.data(), d.id));
    });
    return { shops };
  }

  async getShopBySlug(slug: string): Promise<{ shop: Shop }> {
    const db = getActiveFirestore();
    const snap = await getDoc(doc(db, 'shops', slug));
    if (!snap.exists()) {
      throw new Error('Cửa hàng không tồn tại');
    }
    return { shop: normalizeShopDoc(snap.data(), snap.id) };
  }

  async getShopById(id: number | string): Promise<{ shop: Shop }> {
    return this.getShopBySlug(String(id));
  }

  async getShopByOwnerUserId(userId: number | string): Promise<{ shop: Shop }> {
    const db = getActiveFirestore();
    const q = query(collection(db, 'shops'), where('ownerUid', '==', String(userId)));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('Chưa thiết lập cửa hàng');
    }
    const d = snap.docs[0];
    return { shop: normalizeShopDoc(d.data(), d.id) };
  }

  async createShop(payload: {
    name: string;
    slug?: string;
    description?: string;
    avatar?: string;
    cover_color?: string;
    cover_image?: string;
    pickup_address?: string;
    phone?: string;
  }): Promise<{ shop: Shop; message?: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      throw new Error('Chỉ tài khoản người bán mới được tạo cửa hàng');
    }

    const db = getActiveFirestore();
    const slug = slugify(payload.slug || payload.name);
    const shopRef = doc(db, 'shops', slug);
    const existing = await getDoc(shopRef);
    if (existing.exists()) {
      throw new Error('Tên đường dẫn (slug) cửa hàng này đã tồn tại, vui lòng chọn tên khác');
    }

    const shopDoc = {
      slug,
      ownerUid: cur.uid,
      name: payload.name,
      description: payload.description || '',
      avatar: payload.avatar || createShopAvatarSvg(payload.name, payload.cover_color),
      coverColor: payload.cover_color || '#08482D',
      coverImage: payload.cover_image || '',
      pickupAddress: payload.pickup_address || '',
      phone: payload.phone || '',
      followerUids: [],
      followerCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    assertDocSize(shopDoc);
    await setDoc(shopRef, shopDoc);

    await updateDoc(doc(db, 'users', cur.uid), {
      shopId: slug,
      updatedAt: serverTimestamp()
    });

    cur.shop_id = slug as any;
    cur.shop_name = payload.name;
    setCurrentSession(cur);

    return { shop: normalizeShopDoc(shopDoc, slug), message: 'Thiết lập shop thành công!' };
  }

  async updateShop(shopId: number | string, payload: Partial<Shop>): Promise<{ shop: Shop }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') throw new Error('Chỉ người bán mới được cập nhật shop');

    const db = getActiveFirestore();
    const ref = doc(db, 'shops', String(shopId));
    const updates: any = { updatedAt: serverTimestamp() };

    if (payload.name) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.avatar) updates.avatar = payload.avatar;
    if (payload.cover_color) updates.coverColor = payload.cover_color;
    if (payload.cover_image !== undefined) updates.coverImage = payload.cover_image;
    if (payload.pickup_address !== undefined) updates.pickupAddress = payload.pickup_address;
    if (payload.phone !== undefined) updates.phone = payload.phone;

    assertDocSize(updates);
    await updateDoc(ref, updates);
    const snap = await getDoc(ref);
    return { shop: normalizeShopDoc(snap.data()!, snap.id) };
  }

  async toggleFollowShop(shopId: number | string): Promise<{ is_following: boolean; follower_count: number; message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập để theo dõi cửa hàng');

    const db = getActiveFirestore();
    const shopRef = doc(db, 'shops', String(shopId));
    const userRef = doc(db, 'users', cur.uid);

    let isFollowing = false;
    let count = 0;

    await runTransaction(db, async (txn) => {
      const sSnap = await txn.get(shopRef);
      if (!sSnap.exists()) throw new Error('Shop không tồn tại');
      const followers: string[] = sSnap.data().followerUids || [];
      const idx = followers.indexOf(cur.uid);

      if (idx >= 0) {
        txn.update(shopRef, {
          followerUids: arrayRemove(cur.uid),
          followerCount: increment(-1)
        });
        txn.update(userRef, {
          followingShops: arrayRemove(String(shopId))
        });
        isFollowing = false;
        count = Math.max(0, followers.length - 1);
      } else {
        txn.update(shopRef, {
          followerUids: arrayUnion(cur.uid),
          followerCount: increment(1)
        });
        txn.update(userRef, {
          followingShops: arrayUnion(String(shopId))
        });
        isFollowing = true;
        count = followers.length + 1;
      }
    });

    return {
      is_following: isFollowing,
      follower_count: count,
      message: isFollowing ? 'Đã theo dõi cửa hàng' : 'Đã hủy theo dõi cửa hàng'
    };
  }

  async getFollowedShops(): Promise<{ shops: Shop[] }> {
    const cur = getCurrentUser();
    if (!cur) return { shops: [] };
    const db = getActiveFirestore();
    const userSnap = await getDoc(doc(db, 'users', cur.uid));
    const following = userSnap.data()?.followingShops || [];

    const shops: Shop[] = [];
    for (const sId of following) {
      try {
        const sSnap = await getDoc(doc(db, 'shops', sId));
        if (sSnap.exists()) shops.push(normalizeShopDoc(sSnap.data(), sSnap.id));
      } catch {}
    }
    return { shops };
  }

  async listProductsByShop(shopId: number | string): Promise<{ products: Product[] }> {
    return this.getProducts({ shop_id: shopId });
  }

  async listCouponsByShop(shopId: number | string): Promise<{ coupons: Coupon[] }> {
    const db = getActiveFirestore();
    const q = query(collection(db, 'coupons'), where('shopId', '==', String(shopId)));
    const snap = await getDocs(q);
    const coupons: Coupon[] = [];
    snap.forEach((d) => {
      coupons.push(normalizeCouponDoc(d.data(), d.id));
    });
    return { coupons };
  }

  async saveShopVoucher(code: string, shopId: number | string): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập');
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'users', cur.uid), {
      savedCoupons: arrayUnion(code.toUpperCase().trim())
    });
    return { message: 'Đã lưu mã giảm giá vào ví voucher' };
  }

  async getSavedShopVouchers(shopId?: number | string): Promise<{ vouchers: Coupon[] }> {
    const cur = getCurrentUser();
    if (!cur) return { vouchers: [] };
    const db = getActiveFirestore();
    const userSnap = await getDoc(doc(db, 'users', cur.uid));
    const saved = userSnap.data()?.savedCoupons || [];

    const list: Coupon[] = [];
    for (const code of saved) {
      try {
        const snap = await getDoc(doc(db, 'coupons', code));
        if (snap.exists()) {
          const c = normalizeCouponDoc(snap.data(), snap.id);
          if (!shopId || String(c.shop_id) === String(shopId)) {
            list.push(c);
          }
        }
      } catch {}
    }
    return { vouchers: list };
  }

  async searchShops(queryStr: string): Promise<{ shops: Shop[] }> {
    const { shops } = await this.getShops();
    const s = queryStr.toLowerCase().trim();
    return {
      shops: shops.filter((sh) => sh.name.toLowerCase().includes(s) || sh.description.toLowerCase().includes(s))
    };
  }

  // --- ORDERS (BUYER & SELLER) & CHECKOUT TRANSACTION (Section 6) ---

  async createOrder(payload: {
    items: Array<{ product_id: number | string; quantity: number; offer_id?: number }>;
    recipient_name: string;
    phone: string;
    address: string;
    note?: string;
    payment_method: 'card' | 'napas' | 'cod';
    card_info?: { number: string; expiry: string; cvv: string; card_type?: string };
    coupon_code?: string;
    shop_coupons?: Record<number, string>;
  }): Promise<{ orders: Order[]; message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để đặt hàng');
    }

    const db = getActiveFirestore();
    const createdOrders: Order[] = [];

    const productsMap = new Map<string, any>();
    for (const it of payload.items) {
      const snap = await getDoc(doc(db, 'products', String(it.product_id)));
      if (!snap.exists()) throw new Error('Sản phẩm không tồn tại');
      productsMap.set(String(it.product_id), { snap, data: snap.data() });
    }

    await runTransaction(db, async (txn) => {
      for (const it of payload.items) {
        const pRef = doc(db, 'products', String(it.product_id));
        const pSnap = await txn.get(pRef);
        if (!pSnap.exists() || pSnap.data().isActive === false) {
          throw new Error('Sản phẩm không tồn tại hoặc đã ngừng bán');
        }
        const pData = pSnap.data();
        if (pData.stock < it.quantity) {
          throw new Error(`${pData.name} vừa có chủ mới`);
        }
      }

      let couponData: any = null;
      if (payload.coupon_code) {
        const cRef = doc(db, 'coupons', payload.coupon_code.toUpperCase().trim());
        const cSnap = await txn.get(cRef);
        if (cSnap.exists()) {
          couponData = cSnap.data();
        }
      }

      const shopGroups = new Map<string, any[]>();
      for (const it of payload.items) {
        const pData = productsMap.get(String(it.product_id))!.data;
        const sId = pData.shopId || 'do-cu-con-thuong';
        if (!shopGroups.has(sId)) shopGroups.set(sId, []);
        shopGroups.get(sId)!.push({ it, pData });
      }

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      let orderIndex = 0;

      for (const [shopId, group] of shopGroups.entries()) {
        orderIndex++;
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderCode = `DCCT-${todayStr}-${randomSuffix}`;
        const shopSnap = await txn.get(doc(db, 'shops', shopId));
        const shopData = shopSnap.exists() ? shopSnap.data() : { name: 'Đồ Cũ Còn Thương', ownerUid: 'seller_admin' };

        let subtotal = 0;
        const orderItems = group.map(({ it, pData }) => {
          const itemPrice = Number(pData.price || 0);
          subtotal += itemPrice * it.quantity;
          return {
            productId: String(it.product_id),
            name: pData.name,
            icon: pData.icon || getProductEmoji(pData.name, pData.category),
            conditionPct: pData.conditionPct || 90,
            price: itemPrice,
            qty: it.quantity,
            negotiated: !!it.offer_id
          };
        });

        const shippingFee = subtotal >= 1000000 ? 0 : 30000;
        let discount = 0;
        let appliedCoupon: string | null = null;

        if (couponData && (!couponData.shopId || couponData.shopId === shopId)) {
          if (subtotal >= (couponData.minOrder || 0)) {
            appliedCoupon = couponData.code;
            if (couponData.type === 'freeship' || couponData.type === 'shipping') {
              discount = Math.min(shippingFee, couponData.maxDiscount || 30000);
            } else if (couponData.type === 'percent') {
              discount = Math.min(Math.round((subtotal * couponData.value) / 100), couponData.maxDiscount || 999999999);
            } else {
              discount = couponData.value || 0;
            }
          }
        }

        const total = Math.max(0, subtotal + shippingFee - discount);

        const orderDoc = {
          code: orderCode,
          checkoutId: `chk_${Date.now()}_${orderIndex}`,
          buyerUid: cur.uid,
          buyerName: cur.full_name,
          buyerPhone: cur.phone,
          shopId,
          shopName: shopData.name || 'Đồ Cũ Còn Thương',
          sellerUid: shopData.ownerUid || 'seller_admin',
          items: orderItems,
          subtotal,
          shippingFee,
          couponCode: appliedCoupon,
          discount,
          total,
          paymentMethod: payload.payment_method === 'cod' ? 'cod' : 'card',
          paymentStatus: payload.payment_method === 'cod' ? 'pending' : 'paid',
          cardBrand: payload.payment_method === 'card' ? 'Visa' : null,
          cardLast4: payload.payment_method === 'card' ? '1111' : null,
          receiver: payload.recipient_name,
          phone: payload.phone,
          address: payload.address,
          note: payload.note || '',
          status: 'pending',
          carrier: 'Giao Hàng Nhanh',
          trackingCode: `GHN-${Date.now().toString().slice(-6)}VN`,
          logs: [{
            status: 'pending',
            actorRole: 'buyer',
            actorName: cur.full_name,
            note: 'Khách hàng tạo đơn hàng',
            at: new Date().toISOString()
          }],
          shipmentEvents: [{
            event: 'created',
            label: 'Đơn hàng đã được tạo',
            location: payload.address,
            note: 'Chờ người bán xác nhận',
            at: new Date().toISOString()
          }],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        txn.set(doc(db, 'orders', orderCode), orderDoc);

        for (const { it } of group) {
          const pRef = doc(db, 'products', String(it.product_id));
          txn.update(pRef, {
            stock: increment(-it.quantity),
            sold: increment(it.quantity),
            updatedAt: serverTimestamp()
          });

          if (it.offer_id) {
            txn.update(doc(db, 'offers', String(it.offer_id)), {
              status: 'used'
            });
          }
        }

        if (appliedCoupon) {
          txn.update(doc(db, 'coupons', appliedCoupon), {
            usedCount: increment(1)
          });
        }

        const buyerNotifId = `notif_buyer_${Date.now()}_${orderIndex}`;
        txn.set(doc(db, 'notifications', buyerNotifId), {
          toUid: cur.uid,
          fromUid: shopData.ownerUid || 'system',
          type: 'order_status',
          title: 'Đặt hàng thành công',
          body: `Đơn hàng #${orderCode} tại ${shopData.name} trị giá ${total.toLocaleString('vi-VN')}đ đã được gửi tới shop.`,
          link: `/orders?code=${orderCode}`,
          isRead: false,
          createdAt: serverTimestamp()
        });

        const sellerNotifId = `notif_seller_${Date.now()}_${orderIndex}`;
        txn.set(doc(db, 'notifications', sellerNotifId), {
          toUid: shopData.ownerUid || 'seller_admin',
          fromUid: cur.uid,
          type: 'new_order',
          title: 'Đơn hàng mới chờ duyệt',
          body: `Đơn hàng mới #${orderCode} (${orderItems.length} món, ${total.toLocaleString('vi-VN')}đ) đang chờ bạn xác nhận.`,
          link: `/seller?order=${orderCode}`,
          isRead: false,
          createdAt: serverTimestamp()
        });

        createdOrders.push(normalizeOrderDoc(orderDoc, orderCode));
      }

      txn.set(doc(db, 'carts', cur.uid), { items: [], updatedAt: serverTimestamp() });
    });

    return { orders: createdOrders, message: 'Đặt hàng thành công' };
  }

  async getMyOrders(statusFilter?: string): Promise<{ orders: Order[] }> {
    const cur = getCurrentUser();
    if (!cur) return { orders: [] };

    const db = getActiveFirestore();
    const ordersRef = collection(db, 'orders');

    const q = query(ordersRef, where('buyerUid', '==', cur.uid));
    const snap = await getDocs(q);
    let orders: Order[] = [];

    snap.forEach((d) => {
      orders.push(normalizeOrderDoc(d.data(), d.id));
    });

    if (statusFilter && statusFilter !== 'all') {
      orders = orders.filter((o) => o.status === statusFilter);
    }
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { orders };
  }

  async getSellerOrders(statusFilter?: string): Promise<{ orders: Order[] }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') return { orders: [] };

    const db = getActiveFirestore();
    const ordersRef = collection(db, 'orders');

    const q = query(ordersRef, where('sellerUid', '==', cur.uid));
    const snap = await getDocs(q);
    let orders: Order[] = [];

    snap.forEach((d) => {
      orders.push(normalizeOrderDoc(d.data(), d.id));
    });

    if (statusFilter && statusFilter !== 'all') {
      orders = orders.filter((o) => o.status === statusFilter);
    }
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { orders };
  }

  async getOrder(code: string | number): Promise<{ order: Order }> {
    const db = getActiveFirestore();
    const snap = await getDoc(doc(db, 'orders', String(code)));
    if (!snap.exists()) {
      throw new Error('Đơn hàng không tồn tại');
    }
    return { order: normalizeOrderDoc(snap.data(), snap.id) };
  }

  async cancelOrder(code: string | number, reason?: string): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const orderRef = doc(db, 'orders', String(code));

    await runTransaction(db, async (txn) => {
      const snap = await txn.get(orderRef);
      if (!snap.exists()) throw new Error('Đơn hàng không tồn tại');
      const oData = snap.data();

      if (oData.status === 'shipping' || oData.status === 'completed' || oData.status === 'cancelled') {
        throw new Error('Đơn hàng không thể hủy ở trạng thái hiện tại');
      }

      const logs = oData.logs || [];
      logs.push({
        status: 'cancelled',
        actorRole: cur.role,
        actorName: cur.full_name,
        note: `Hủy đơn: ${reason || 'Khách yêu cầu hủy'}`,
        at: new Date().toISOString()
      });

      txn.update(orderRef, {
        status: 'cancelled',
        cancelReason: reason || 'Hủy bởi người dùng',
        cancelledBy: cur.role,
        logs,
        updatedAt: serverTimestamp()
      });

      for (const it of oData.items || []) {
        if (it.productId) {
          const pRef = doc(db, 'products', String(it.productId));
          txn.update(pRef, {
            stock: increment(it.qty || 1),
            sold: increment(-(it.qty || 1)),
            updatedAt: serverTimestamp()
          });
        }
      }
    });

    return { message: 'Đã hủy đơn hàng thành công' };
  }

  async confirmOrderReceived(code: string | number): Promise<{ message: string }> {
    return this.updateOrderStatus(String(code), 'completed', 'Khách hàng đã nhận được hàng');
  }

  async updateOrderStatus(code: string | number, status: string, note?: string, cancel_reason?: string): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const orderRef = doc(db, 'orders', String(code));
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error('Đơn không tồn tại');

    const oData = snap.data();
    const logs = oData.logs || [];
    logs.push({
      status,
      actorRole: cur.role,
      actorName: cur.full_name,
      note: note || `Cập nhật trạng thái sang ${status}`,
      at: new Date().toISOString()
    });

    const updates: any = {
      status,
      logs,
      updatedAt: serverTimestamp()
    };
    if (cancel_reason) updates.cancelReason = cancel_reason;
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
      updates.paymentStatus = 'paid';
    } else if (status === 'delivered') {
      updates.deliveredAt = new Date().toISOString();
    }

    await updateDoc(orderRef, updates);
    return { message: 'Cập nhật thành công' };
  }

  async assignCarrier(code: string | number, carrier: string): Promise<{ message: string; tracking_code: string }> {
    const db = getActiveFirestore();
    const orderRef = doc(db, 'orders', String(code));
    const tracking_code = `VN${carrier.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`;
    await updateDoc(orderRef, {
      carrier,
      tracking_code,
      updatedAt: serverTimestamp()
    });
    return { message: 'Đã gán đơn vị vận chuyển', tracking_code };
  }

  async handoverOrder(code: string | number, handoverData: { carrier: string; location?: string; note?: string }): Promise<{ message: string }> {
    const db = getActiveFirestore();
    const orderRef = doc(db, 'orders', String(code));
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error('Đơn không tồn tại');

    const events = snap.data().shipmentEvents || [];
    events.push({
      event: 'dispatched',
      label: `Đã bàn giao cho ${handoverData.carrier}`,
      location: handoverData.location || 'Kho người bán',
      note: handoverData.note || 'Kiện hàng đã lấy thành công',
      at: new Date().toISOString()
    });

    await updateDoc(orderRef, {
      carrier: handoverData.carrier,
      status: 'shipping',
      shipmentEvents: events,
      updatedAt: serverTimestamp()
    });

    return { message: 'Đã bàn giao đơn vị vận chuyển' };
  }

  async bulkConfirmOrders(orderIds: Array<string | number>): Promise<{ message: string }> {
    for (const id of orderIds) {
      await this.updateOrderStatus(String(id), 'confirmed', 'Duyệt đơn hàng loạt');
    }
    return { message: `Đã duyệt ${orderIds.length} đơn hàng` };
  }

  async bulkHandoverOrders(orderIds: Array<string | number>, carrier: string): Promise<{ message: string }> {
    for (const id of orderIds) {
      await this.handoverOrder(String(id), { carrier });
    }
    return { message: `Đã bàn giao ${orderIds.length} đơn hàng cho ${carrier}` };
  }

  async addShipmentEvent(code: string | number, event: { event?: string; status?: string; label?: string; location?: string; note?: string }): Promise<{ message: string }> {
    const db = getActiveFirestore();
    const orderRef = doc(db, 'orders', String(code));
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error('Đơn không tồn tại');

    const events = snap.data()?.shipmentEvents || [];
    events.push({
      event: event.event || event.status || 'in_transit',
      label: event.label || 'Đang luân chuyển qua các bưu cục',
      location: event.location || 'TP. Hồ Chí Minh',
      note: event.note || '',
      at: new Date().toISOString()
    });

    await updateDoc(orderRef, {
      shipmentEvents: events,
      updatedAt: serverTimestamp()
    });

    return { message: 'Đã thêm mốc vận chuyển' };
  }

  // --- OFFERS (TRẢ GIÁ) ---

  async getOffers(): Promise<{ offers: Offer[] }> {
    const cur = getCurrentUser();
    if (!cur) return { offers: [] };

    const db = getActiveFirestore();
    const q = query(collection(db, 'offers'), where('buyerUid', '==', cur.uid));
    const snap = await getDocs(q);

    const offers: Offer[] = [];
    snap.forEach((d) => {
      const data = d.data();
      offers.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        seller_id: data.sellerUid as any,
        buyer_id: data.buyerUid as any,
        buyer_name: data.buyerName,
        product_id: data.productId as any,
        product_name: data.productName,
        original_price: data.originalPrice,
        offered_price: data.offeredPrice,
        counter_price: data.counterPrice,
        price: data.offeredPrice,
        status: data.status,
        expires_at: data.expiresAt,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    offers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { offers };
  }

  async getSellerOffers(): Promise<{ offers: Offer[] }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') return { offers: [] };

    const db = getActiveFirestore();
    const q = query(collection(db, 'offers'), where('sellerUid', '==', cur.uid));
    const snap = await getDocs(q);

    const offers: Offer[] = [];
    snap.forEach((d) => {
      const data = d.data();
      offers.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        seller_id: data.sellerUid as any,
        buyer_id: data.buyerUid as any,
        buyer_name: data.buyerName,
        product_id: data.productId as any,
        product_name: data.productName,
        original_price: data.originalPrice,
        offered_price: data.offeredPrice,
        counter_price: data.counterPrice,
        price: data.offeredPrice,
        status: data.status,
        expires_at: data.expiresAt,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    offers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { offers };
  }

  async createOffer(payload: {
    productId?: number | string;
    product_id?: number | string;
    offeredPrice?: number;
    offered_price?: number;
    price?: number;
    message?: string;
  }): Promise<{ message: string; offer: Offer }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để trả giá');
    }

    const pid = String(payload.productId || payload.product_id);
    const offeredPrice = Number(payload.offeredPrice ?? payload.offered_price ?? payload.price ?? 0);

    const db = getActiveFirestore();
    const prodSnap = await getDoc(doc(db, 'products', pid));
    if (!prodSnap.exists()) throw new Error('Sản phẩm không tồn tại');
    const prod = prodSnap.data();

    const existingQ = query(collection(db, 'offers'), where('buyerUid', '==', cur.uid));
    const existingSnap = await getDocs(existingQ);
    for (const d of existingSnap.docs) {
      const data = d.data();
      if (String(data.productId) === pid && (data.status === 'pending' || data.status === 'countered')) {
        throw new Error('Bạn đang có một lời trả giá chờ phản hồi cho món này');
      }
    }

    const offerId = `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const offerDoc = {
      productId: pid,
      productName: prod.name,
      shopId: prod.shopId || 'do-cu-con-thuong',
      sellerUid: prod.ownerUid || 'seller_admin',
      buyerUid: cur.uid,
      buyerName: cur.full_name,
      originalPrice: Number(prod.price || 0),
      offeredPrice,
      counterPrice: null,
      message: payload.message || '',
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt,
      respondedAt: null
    };

    assertDocSize(offerDoc);
    await setDoc(doc(db, 'offers', offerId), offerDoc);

    await setDoc(doc(db, 'notifications', `notif_off_${offerId}`), {
      toUid: prod.ownerUid || 'seller_admin',
      fromUid: cur.uid,
      type: 'offer',
      title: 'Lời trả giá mới',
      body: `Khách ${cur.full_name} đề nghị giá ${offeredPrice.toLocaleString('vi-VN')}đ cho món "${prod.name}".`,
      link: '/seller?tab=offers',
      isRead: false,
      createdAt: serverTimestamp()
    });

    return {
      message: 'Đã gửi lời trả giá thành công',
      offer: {
        id: offerId as any,
        shop_id: prod.shopId as any,
        seller_id: prod.ownerUid as any,
        buyer_id: cur.uid as any,
        buyer_name: cur.full_name,
        product_id: pid as any,
        product_name: prod.name,
        original_price: Number(prod.price || 0),
        offered_price: offeredPrice,
        price: offeredPrice,
        status: 'pending',
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }
    };
  }

  async getMyOfferForProduct(productId: number | string): Promise<{ offer: Offer | null }> {
    const cur = getCurrentUser();
    if (!cur) return { offer: null };

    const db = getActiveFirestore();
    const q = query(collection(db, 'offers'), where('buyerUid', '==', cur.uid));
    const snap = await getDocs(q);

    let activeOffer: Offer | null = null;
    const now = new Date().getTime();

    for (const d of snap.docs) {
      const data = d.data();
      if (String(data.productId) === String(productId)) {
        if (data.status === 'pending' && data.expiresAt && new Date(data.expiresAt).getTime() < now) {
          await updateDoc(doc(db, 'offers', d.id), { status: 'expired' });
          continue;
        }

        if (data.status === 'pending' || data.status === 'accepted' || data.status === 'countered') {
          activeOffer = {
            id: d.id as any,
            shop_id: data.shopId as any,
            seller_id: data.sellerUid as any,
            buyer_id: data.buyerUid as any,
            buyer_name: data.buyerName,
            product_id: data.productId as any,
            product_name: data.productName,
            original_price: data.originalPrice,
            offered_price: data.offeredPrice,
            counter_price: data.counterPrice,
            price: data.offeredPrice,
            status: data.status,
            expires_at: data.expiresAt,
            created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
          };
          break;
        }
      }
    }

    return { offer: activeOffer };
  }

  async cancelOffer(offerId: number | string): Promise<{ message: string }> {
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'offers', String(offerId)), {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
    return { message: 'Đã hủy lời trả giá' };
  }

  async acceptOffer(offerId: number | string): Promise<{ message: string }> {
    return this.respondToOffer(offerId, 'accept');
  }

  async counterOffer(offerId: number | string, counter_price: number, seller_note?: string): Promise<{ message: string }> {
    return this.respondToOffer(offerId, 'counter', counter_price);
  }

  async rejectOffer(offerId: number | string, seller_note?: string): Promise<{ message: string }> {
    return this.respondToOffer(offerId, 'reject');
  }

  async acceptCounterOffer(offerId: number | string): Promise<{ message: string }> {
    return this.buyerRespondToCounter(offerId, 'accept');
  }

  async rejectCounterOffer(offerId: number | string): Promise<{ message: string }> {
    return this.buyerRespondToCounter(offerId, 'reject');
  }

  async respondToOffer(offerId: number | string, action: 'accept' | 'reject' | 'counter', counterPrice?: number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') throw new Error('Chỉ người bán mới được phản hồi trả giá');

    const db = getActiveFirestore();
    const ref = doc(db, 'offers', String(offerId));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Lời trả giá không tồn tại');
    const data = snap.data();

    let newStatus: string = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';

    await updateDoc(ref, {
      status: newStatus,
      counterPrice: action === 'counter' ? Number(counterPrice) : null,
      respondedAt: serverTimestamp()
    });

    const notifBody = action === 'accept'
      ? `Shop đã đồng ý mức giá ${Number(data.offeredPrice).toLocaleString('vi-VN')}đ cho món "${data.productName}".`
      : action === 'counter'
      ? `Shop đề nghị mức giá mới ${Number(counterPrice).toLocaleString('vi-VN')}đ cho món "${data.productName}".`
      : `Shop đã từ chối lời trả giá cho món "${data.productName}".`;

    await setDoc(doc(db, 'notifications', `notif_resp_${offerId}`), {
      toUid: data.buyerUid,
      fromUid: cur.uid,
      type: 'offer_response',
      title: 'Phản hồi lời trả giá',
      body: notifBody,
      link: `/product/${data.productId}`,
      isRead: false,
      createdAt: serverTimestamp()
    });

    return { message: 'Đã phản hồi lời trả giá' };
  }

  async buyerRespondToCounter(offerId: number | string, action: 'accept' | 'reject'): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const ref = doc(db, 'offers', String(offerId));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Lời trả giá không tồn tại');
    const data = snap.data();

    if (action === 'accept') {
      await updateDoc(ref, { status: 'accepted' });
      await this.addToCart(data.productId, 1, Number(offerId) as any, data.counterPrice);
      return { message: 'Đã chấp nhận đề nghị của shop và thêm vào giỏ hàng' };
    } else {
      await updateDoc(ref, { status: 'rejected' });
      return { message: 'Đã từ chối đề nghị của shop' };
    }
  }

  // --- REVIEWS & RETURNS ---

  async createReview(payload: {
    order_id: string | number;
    product_id: string | number;
    rating: number;
    comment: string;
    tags?: string[];
    images?: string[];
    video_blob?: Blob;
  }): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const pid = String(payload.product_id);
    const orderCode = String(payload.order_id);

    const compressedImages: string[] = [];
    for (const img of (payload.images || []).slice(0, 3)) {
      const c = await compressImage(img, 800, 120 * 1024);
      compressedImages.push(c);
    }

    let videoLocalId: string | null = null;
    let videoThumb: string | null = null;
    if (payload.video_blob) {
      videoLocalId = await saveLocalVideo(payload.video_blob);
      videoThumb = compressedImages[0] || null;
    }

    const reviewId = `${orderCode}_${pid}`;
    const pSnap = await getDoc(doc(db, 'products', pid));
    const pData = pSnap.exists() ? pSnap.data() : { shopId: 'do-cu-con-thuong', ownerUid: 'seller_admin' };

    const reviewDoc = {
      orderId: orderCode,
      productId: pid,
      shopId: pData.shopId || 'do-cu-con-thuong',
      sellerUid: pData.ownerUid || 'seller_admin',
      buyerUid: cur.uid,
      buyerDisplayName: cur.full_name,
      anonymous: false,
      rating: Number(payload.rating),
      tags: payload.tags || [],
      comment: payload.comment,
      images: compressedImages,
      videoLocalId,
      videoThumb,
      helpfulUids: [],
      helpfulCount: 0,
      sellerReply: null,
      hidden: false,
      hiddenReason: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      editedOnce: false
    };

    assertDocSize(reviewDoc);

    await runTransaction(db, async (txn) => {
      txn.set(doc(db, 'reviews', reviewId), reviewDoc);

      const prodRef = doc(db, 'products', pid);
      const prSnap = await txn.get(prodRef);
      if (prSnap.exists()) {
        const curCount = prSnap.data().ratingCount || 0;
        const curAvg = prSnap.data().ratingAvg || 0;
        const newCount = curCount + 1;
        const newAvg = Number(((curAvg * curCount + payload.rating) / newCount).toFixed(1));
        txn.update(prodRef, {
          ratingCount: newCount,
          ratingAvg: newAvg
        });
      }

      const shopRef = doc(db, 'shops', pData.shopId);
      const shSnap = await txn.get(shopRef);
      if (shSnap.exists()) {
        const curCount = shSnap.data().ratingCount || 0;
        const curAvg = shSnap.data().ratingAvg || 0;
        const newCount = curCount + 1;
        const newAvg = Number(((curAvg * curCount + payload.rating) / newCount).toFixed(1));
        txn.update(shopRef, {
          ratingCount: newCount,
          ratingAvg: newAvg
        });
      }
    });

    return { message: 'Đã gửi đánh giá thành công' };
  }

  async submitReview(payload: any): Promise<{ message: string }> {
    return this.createReview(payload);
  }

  async getProductReviews(productId: number | string): Promise<{ reviews: Review[]; avg: number; total: number }> {
    const db = getActiveFirestore();
    const q = query(collection(db, 'reviews'), where('productId', '==', String(productId)));
    const snap = await getDocs(q);

    const list: Review[] = [];
    let sum = 0;
    snap.forEach((d) => {
      const data = d.data();
      if (!data.hidden) {
        sum += Number(data.rating || 0);
        list.push({
          id: d.id as any,
          order_id: data.orderId,
          product_id: data.productId,
          user_id: data.buyerUid,
          user_name: data.buyerDisplayName,
          rating: data.rating,
          comment: data.comment,
          images: data.images || [],
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      }
    });

    const total = list.length;
    const avg = total > 0 ? Number((sum / total).toFixed(1)) : 0;
    return { reviews: list, avg, total };
  }

  async getShopReviews(): Promise<{ reviews: Review[]; avg: number; total: number; unreplied_count: number }> {
    const cur = getCurrentUser();
    if (!cur) return { reviews: [], avg: 0, total: 0, unreplied_count: 0 };
    const db = getActiveFirestore();
    const q = query(collection(db, 'reviews'), where('sellerUid', '==', cur.uid));
    const snap = await getDocs(q);
    const list: Review[] = [];
    let sum = 0;
    snap.forEach((d) => {
      const data = d.data();
      sum += Number(data.rating || 0);
      list.push({
        id: d.id as any,
        order_id: data.orderId,
        product_id: data.productId,
        user_id: data.buyerUid,
        user_name: data.buyerDisplayName,
        rating: data.rating,
        comment: data.comment,
        images: data.images || [],
        seller_reply: data.sellerReply?.text || null,
        seller_reply_at: data.sellerReply?.at || null,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });
    const unreplied = list.filter((r) => !r.seller_reply).length;
    return {
      reviews: list,
      avg: list.length > 0 ? Number((sum / list.length).toFixed(1)) : 0,
      total: list.length,
      unreplied_count: unreplied
    };
  }

  async getSellerReviews(): Promise<{ reviews: Review[]; avg: number; total: number; unreplied_count: number }> {
    return this.getShopReviews();
  }

  async getOrderReviewedItems(orderId: number | string): Promise<{ reviewed_product_ids: number[] }> {
    const db = getActiveFirestore();
    const q = query(collection(db, 'reviews'), where('orderId', '==', String(orderId)));
    const snap = await getDocs(q);
    const ids: number[] = [];
    snap.forEach((d) => {
      ids.push(Number(d.data().productId) || d.data().productId);
    });
    return { reviewed_product_ids: ids };
  }

  async updateReview(id: number | string, payload: any): Promise<{ message: string }> {
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'reviews', String(id)), {
      ...payload,
      updatedAt: serverTimestamp()
    });
    return { message: 'Cập nhật đánh giá thành công' };
  }

  async toggleHelpfulReview(id: number | string): Promise<{ helpful_count: number }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập');
    const db = getActiveFirestore();
    const ref = doc(db, 'reviews', String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return { helpful_count: 0 };

    const helpfulUids: string[] = snap.data().helpfulUids || [];
    let newCount = helpfulUids.length;
    if (helpfulUids.includes(cur.uid)) {
      await updateDoc(ref, {
        helpfulUids: arrayRemove(cur.uid),
        helpfulCount: increment(-1)
      });
      newCount--;
    } else {
      await updateDoc(ref, {
        helpfulUids: arrayUnion(cur.uid),
        helpfulCount: increment(1)
      });
      newCount++;
    }
    return { helpful_count: Math.max(0, newCount) };
  }

  async replyReview(id: number | string, reply: string): Promise<{ message: string }> {
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'reviews', String(id)), {
      sellerReply: {
        text: reply,
        at: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    });
    return { message: 'Đã gửi phản hồi đánh giá' };
  }

  async reportReview(id: number | string, reason: string): Promise<{ message: string }> {
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'reviews', String(id)), {
      hidden: true,
      hiddenReason: reason,
      updatedAt: serverTimestamp()
    });
    return { message: 'Đã báo cáo đánh giá' };
  }

  async createReturn(payload: {
    order_id: string | number;
    reason: string;
    detail?: string;
    description?: string;
    images?: string[];
  }): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const orderSnap = await getDoc(doc(db, 'orders', String(payload.order_id)));
    if (!orderSnap.exists()) throw new Error('Đơn không tồn tại');
    const oData = orderSnap.data();

    const compressedImages: string[] = [];
    for (const img of (payload.images || []).slice(0, 3)) {
      const c = await compressImage(img, 800, 120 * 1024);
      compressedImages.push(c);
    }

    const retId = `ret_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const retDoc = {
      orderId: String(payload.order_id),
      buyerUid: cur.uid,
      sellerUid: oData.sellerUid,
      shopId: oData.shopId,
      items: oData.items || [],
      reason: payload.reason,
      detail: payload.detail || payload.description || '',
      images: compressedImages,
      status: 'pending',
      logs: [{
        status: 'pending',
        actor: cur.full_name,
        at: new Date().toISOString()
      }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    assertDocSize(retDoc);
    await setDoc(doc(db, 'returns', retId), retDoc);

    return { message: 'Đã gửi yêu cầu trả hàng' };
  }

  async requestReturn(payload: any): Promise<{ message: string }> {
    return this.createReturn(payload);
  }

  async getMyReturns(): Promise<{ returns: ReturnRequest[] }> {
    const cur = getCurrentUser();
    if (!cur) return { returns: [] };
    const db = getActiveFirestore();
    const q = query(collection(db, 'returns'), where('buyerUid', '==', cur.uid));
    const snap = await getDocs(q);
    const list: ReturnRequest[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        order_id: data.orderId,
        buyer_id: data.buyerUid,
        product_id: data.items?.[0]?.productId || 1,
        reason: data.reason,
        description: data.detail,
        images: data.images,
        status: data.status,
        refund_amount: 0,
        refund_method: 'Ngân hàng',
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });
    return { returns: list };
  }

  async getSellerReturns(): Promise<{ returns: ReturnRequest[]; return_requests: ReturnRequest[] }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') return { returns: [], return_requests: [] };
    const db = getActiveFirestore();
    const q = query(collection(db, 'returns'), where('sellerUid', '==', cur.uid));
    const snap = await getDocs(q);
    const list: ReturnRequest[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        order_id: data.orderId,
        buyer_id: data.buyerUid,
        product_id: data.items?.[0]?.productId || 1,
        reason: data.reason,
        description: data.detail,
        images: data.images,
        status: data.status,
        refund_amount: 0,
        refund_method: 'Ngân hàng',
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });
    return { returns: list, return_requests: list };
  }

  async updateReturnStatus(id: number | string, payload: { status: string; seller_note?: string }): Promise<{ message: string }> {
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'returns', String(id)), {
      status: payload.status,
      sellerNote: payload.seller_note || null,
      updatedAt: serverTimestamp()
    });
    return { message: 'Đã cập nhật trạng thái khiếu nại' };
  }

  // --- CONVERSATIONS & CHAT ---

  async getChatConversations(): Promise<{ conversations: ChatConversation[] }> {
    return this.getConversations();
  }

  async getConversations(): Promise<{ conversations: ChatConversation[] }> {
    const cur = getCurrentUser();
    if (!cur) return { conversations: [] };

    const db = getActiveFirestore();
    const convRef = collection(db, 'conversations');
    const field = cur.role === 'seller' ? 'sellerUid' : 'buyerUid';
    const q = query(convRef, where(field, '==', cur.uid));
    const snap = await getDocs(q);

    const list: ChatConversation[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id as any,
        buyer_id: data.buyerUid as any,
        seller_id: data.sellerUid as any,
        shop_id: data.shopId as any,
        shop_name: data.shopName,
        buyer_name: data.buyerName,
        last_message: data.lastMessage,
        last_message_at: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : new Date().toISOString(),
        unread_count: cur.role === 'buyer' ? data.buyerUnread || 0 : data.sellerUnread || 0,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    list.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    return { conversations: list };
  }

  async startShopChat(
    shopId: number | string,
    context?: { type: 'product' | 'order'; product_id?: number | string; order_code?: string; initial_message?: string }
  ): Promise<{ conversation: ChatConversation; created: boolean }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập');

    const db = getActiveFirestore();
    const convId = `${cur.uid}_${shopId}`;
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);

    let created = false;
    let shopName = 'Đồ Cũ Còn Thương';
    let sellerUid = 'seller_admin';

    const sSnap = await getDoc(doc(db, 'shops', String(shopId)));
    if (sSnap.exists()) {
      shopName = sSnap.data().name;
      sellerUid = sSnap.data().ownerUid;
    }

    if (!snap.exists()) {
      created = true;
      await setDoc(convRef, {
        buyerUid: cur.uid,
        buyerName: cur.full_name,
        shopId: String(shopId),
        shopName,
        sellerUid,
        lastMessage: context?.initial_message || 'Bắt đầu trò chuyện',
        lastMessageAt: serverTimestamp(),
        buyerUnread: 0,
        sellerUnread: 1,
        createdAt: serverTimestamp()
      });

      if (context?.initial_message) {
        await this.sendMessage({
          conversation_id: convId,
          text: context.initial_message,
          context: context.product_id ? { kind: 'product', refId: context.product_id } : undefined
        });
      }
    }

    const { messages } = await this.getMessages(convId);
    const conv: ChatConversation = {
      id: convId as any,
      buyer_id: cur.uid as any,
      seller_id: sellerUid as any,
      shop_id: shopId as any,
      shop_name: shopName,
      buyer_name: cur.full_name,
      last_message: context?.initial_message || 'Bắt đầu trò chuyện',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
      created_at: new Date().toISOString(),
      messages
    };

    return { conversation: conv, created };
  }

  async getChatDetail(id: number | string): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
    const db = getActiveFirestore();
    const snap = await getDoc(doc(db, 'conversations', String(id)));
    if (!snap.exists()) throw new Error('Cuộc trò chuyện không tồn tại');
    const data = snap.data();

    const { messages } = await this.getMessages(String(id));
    const conversation: ChatConversation = {
      id: String(id) as any,
      buyer_id: data.buyerUid,
      seller_id: data.sellerUid,
      shop_id: data.shopId,
      shop_name: data.shopName,
      buyer_name: data.buyerName,
      last_message: data.lastMessage,
      last_message_at: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : new Date().toISOString(),
      unread_count: 0,
      created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      messages
    };

    return { conversation, messages };
  }

  async getMessages(conversationId: string): Promise<{ messages: ChatMessage[] }> {
    const db = getActiveFirestore();
    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const snap = await getDocs(msgsRef);

    const messages: ChatMessage[] = [];
    snap.forEach((d) => {
      const data = d.data();
      messages.push({
        id: d.id as any,
        conversation_id: conversationId as any,
        sender_id: data.senderUid as any,
        sender_role: data.senderRole,
        message: data.text,
        context_type: data.context?.kind,
        context_id: data.context?.refId,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return { messages };
  }

  async sendMessage(payload: {
    conversation_id?: string;
    shop_id?: string | number;
    text: string;
    context?: any;
  }): Promise<{ message: ChatMessage }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập để gửi tin nhắn');

    const db = getActiveFirestore();
    let convId = payload.conversation_id;

    if (!convId && payload.shop_id) {
      convId = `${cur.uid}_${payload.shop_id}`;
    }
    if (!convId) throw new Error('Thiếu thông tin cuộc trò chuyện');

    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);

    let toUid = '';
    if (!convSnap.exists()) {
      const shopSnap = await getDoc(doc(db, 'shops', String(payload.shop_id)));
      const shopData = shopSnap.exists() ? shopSnap.data() : { name: 'Đồ Cũ Còn Thương', ownerUid: 'seller_admin' };
      toUid = shopData.ownerUid;

      await setDoc(convRef, {
        buyerUid: cur.uid,
        buyerName: cur.full_name,
        shopId: String(payload.shop_id),
        shopName: shopData.name,
        sellerUid: shopData.ownerUid,
        lastMessage: payload.text,
        lastMessageAt: serverTimestamp(),
        buyerUnread: 0,
        sellerUnread: 1,
        createdAt: serverTimestamp()
      });
    } else {
      const data = convSnap.data();
      toUid = cur.role === 'buyer' ? data.sellerUid : data.buyerUid;
      await updateDoc(convRef, {
        lastMessage: payload.text,
        lastMessageAt: serverTimestamp(),
        buyerUnread: cur.role === 'seller' ? increment(1) : 0,
        sellerUnread: cur.role === 'buyer' ? increment(1) : 0
      });
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const msgDoc = {
      senderUid: cur.uid,
      senderRole: cur.role,
      type: payload.context ? 'context' : 'text',
      text: payload.text,
      context: payload.context || null,
      createdAt: serverTimestamp(),
      readAt: null
    };

    await setDoc(doc(db, 'conversations', convId, 'messages', msgId), msgDoc);

    const notifId = `chat_${convId}_${toUid}`;
    await setDoc(
      doc(db, 'notifications', notifId),
      {
        toUid,
        fromUid: cur.uid,
        type: 'chat',
        title: `Tin nhắn mới từ ${cur.full_name}`,
        body: payload.text,
        link: `/chat?conv=${convId}`,
        isRead: false,
        count: increment(1),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      message: {
        id: msgId as any,
        conversation_id: convId as any,
        sender_id: cur.uid as any,
        sender_role: cur.role,
        message: payload.text,
        created_at: new Date().toISOString()
      }
    };
  }

  async sendChatMessage(payload: any): Promise<{ message: ChatMessage }> {
    return this.sendMessage({
      conversation_id: payload.conversation_id ? String(payload.conversation_id) : undefined,
      shop_id: payload.shop_id,
      text: payload.content || payload.text,
      context: payload.context_card || payload.context
    });
  }

  async markChatRead(id: number | string): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) return { message: 'OK' };
    const db = getActiveFirestore();
    const convRef = doc(db, 'conversations', String(id));
    if (cur.role === 'buyer') {
      await updateDoc(convRef, { buyerUnread: 0 });
    } else {
      await updateDoc(convRef, { sellerUnread: 0 });
    }
    return { message: 'Đã đánh dấu đã đọc' };
  }

  // --- NOTIFICATIONS ---

  async getNotifications(): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    const cur = getCurrentUser();
    if (!cur) return { notifications: [], unread_count: 0 };

    const db = getActiveFirestore();
    const q = query(collection(db, 'notifications'), where('toUid', '==', cur.uid));
    const snap = await getDocs(q);

    const list: NotificationItem[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id as any,
        user_id: cur.uid as any,
        role: cur.role,
        title: data.title,
        message: data.body,
        is_read: !!data.isRead,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      notifications: list,
      unread_count: list.filter((n) => !n.is_read).length
    };
  }

  async markNotificationRead(id: string | number): Promise<void> {
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'notifications', String(id)), { isRead: true });
  }

  async markAllNotificationsRead(): Promise<void> {
    const cur = getCurrentUser();
    if (!cur) return;
    const db = getActiveFirestore();
    const q = query(collection(db, 'notifications'), where('toUid', '==', cur.uid));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
  }

  // --- COUPONS & CHECKOUT CALCULATIONS ---

  async getPublicCoupons(): Promise<{ coupons: Coupon[] }> {
    const db = getActiveFirestore();
    const snap = await getDocs(collection(db, 'coupons'));
    const list: Coupon[] = [];
    snap.forEach((d) => {
      list.push(normalizeCouponDoc(d.data(), d.id));
    });
    return { coupons: list };
  }

  async getSellerCoupons(): Promise<{ coupons: Coupon[] }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') return { coupons: [] };
    const db = getActiveFirestore();
    const q = query(collection(db, 'coupons'), where('ownerUid', '==', cur.uid));
    const snap = await getDocs(q);
    const list: Coupon[] = [];
    snap.forEach((d) => {
      list.push(normalizeCouponDoc(d.data(), d.id));
    });
    return { coupons: list };
  }

  async createCoupon(data: any): Promise<{ coupon: Coupon }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') throw new Error('Chỉ người bán mới được tạo mã');
    const db = getActiveFirestore();
    const code = (data.code || '').toUpperCase().trim();
    const couponDoc = {
      code,
      shopId: cur.shop_id || 'do-cu-con-thuong',
      ownerUid: cur.uid,
      type: data.type || 'percent',
      value: Number(data.value || 0),
      maxDiscount: Number(data.max_discount || 0),
      minOrder: Number(data.min_order_amount || 0),
      active: true,
      usedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'coupons', code), couponDoc);
    return { coupon: normalizeCouponDoc(couponDoc, code) };
  }

  async toggleCoupon(code: string | number): Promise<{ is_active: boolean; message: string }> {
    const db = getActiveFirestore();
    const ref = doc(db, 'coupons', String(code));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Mã không tồn tại');
    const current = snap.data().active !== false;
    await updateDoc(ref, { active: !current });
    return {
      is_active: !current,
      message: !current ? 'Đã kích hoạt mã giảm giá' : 'Đã tạm dừng mã giảm giá'
    };
  }

  async deleteCoupon(code: string | number): Promise<{ message: string }> {
    const db = getActiveFirestore();
    await deleteDoc(doc(db, 'coupons', String(code)));
    return { message: 'Đã xóa mã' };
  }

  async validateCoupon(code: string, subtotal: number, shippingFee?: number, shopId?: number | string): Promise<{ coupon: Coupon; discount_amount: number }> {
    const db = getActiveFirestore();
    const cSnap = await getDoc(doc(db, 'coupons', code.toUpperCase().trim()));
    if (!cSnap.exists() || cSnap.data().active === false) {
      throw new Error('Mã giảm giá không tồn tại hoặc đã hết hạn');
    }
    const cpn = cSnap.data();
    if (shopId && cpn.shopId && String(cpn.shopId) !== String(shopId)) {
      throw new Error('Mã này chỉ áp dụng cho shop phát hành');
    }
    if (subtotal < (cpn.minOrder || 0)) {
      throw new Error(`Đơn hàng của shop phải từ ${(cpn.minOrder || 0).toLocaleString('vi-VN')}đ để dùng mã này`);
    }

    const shipFee = shippingFee !== undefined ? shippingFee : (subtotal >= 1000000 ? 0 : 30000);
    let discount = 0;
    if (cpn.type === 'freeship' || cpn.type === 'shipping') {
      discount = Math.min(shipFee, cpn.maxDiscount || 30000);
    } else if (cpn.type === 'percent') {
      discount = Math.min(Math.round((subtotal * cpn.value) / 100), cpn.maxDiscount || 999999999);
    } else {
      discount = cpn.value || 0;
    }

    return {
      coupon: normalizeCouponDoc(cpn, code),
      discount_amount: discount
    };
  }

  async calculateCheckout(cart: { items: any[] }, couponsByShop?: Record<number | string, string>): Promise<{
    shop_breakdowns: Array<{
      shop_id: string;
      shop_name: string;
      items: any[];
      subtotal: number;
      shipping_fee: number;
      discount_amount: number;
      total: number;
      applied_coupon?: string;
    }>;
    total_subtotal: number;
    total_shipping: number;
    total_discount: number;
    grand_total: number;
  }> {
    const shopMap = new Map<string, any[]>();
    for (const it of cart.items || []) {
      const sId = String(it.product?.shop_id || it.shopId || 'do-cu-con-thuong');
      if (!shopMap.has(sId)) shopMap.set(sId, []);
      shopMap.get(sId)!.push(it);
    }

    const breakdowns: any[] = [];
    let totSub = 0;
    let totShip = 0;
    let totDisc = 0;

    for (const [sId, items] of shopMap.entries()) {
      let sub = 0;
      let shopName = items[0]?.product?.shop_name || 'Đồ Cũ Còn Thương';
      for (const i of items) {
        sub += (i.effective_price || i.product?.price || 0) * (i.quantity || 1);
      }
      const ship = sub >= 1000000 ? 0 : 30000;
      let disc = 0;
      const cCode = couponsByShop ? couponsByShop[sId as any] : undefined;
      if (cCode) {
        try {
          const res = await this.validateCoupon(cCode, sub, ship, sId);
          disc = res.discount_amount;
        } catch {}
      }

      const total = Math.max(0, sub + ship - disc);
      totSub += sub;
      totShip += ship;
      totDisc += disc;

      breakdowns.push({
        shop_id: sId,
        shop_name: shopName,
        items,
        subtotal: sub,
        shipping_fee: ship,
        discount_amount: disc,
        total,
        applied_coupon: cCode
      });
    }

    return {
      shop_breakdowns: breakdowns,
      total_subtotal: totSub,
      total_shipping: totShip,
      total_discount: totDisc,
      grand_total: Math.max(0, totSub + totShip - totDisc)
    };
  }

  // --- ADDRESSES & PROFILE & WISHLIST ---

  async updateProfile(data: { full_name: string; phone?: string }): Promise<{ user: User }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'users', cur.uid), {
      fullName: data.full_name,
      phone: data.phone || cur.phone,
      updatedAt: serverTimestamp()
    });
    cur.full_name = data.full_name;
    if (data.phone) cur.phone = data.phone;
    setCurrentSession(cur);
    return { user: cur };
  }

  async getAddresses(): Promise<{ addresses: Address[] }> {
    const cur = getCurrentUser();
    if (!cur) return { addresses: [] };
    const db = getActiveFirestore();
    const uSnap = await getDoc(doc(db, 'users', cur.uid));
    const raw = uSnap.data()?.addresses || [];
    return {
      addresses: raw.map((a: any, idx: number) => ({
        id: a.id || idx + 1,
        user_id: cur.uid as any,
        recipient_name: a.receiver || a.recipient_name,
        phone: a.phone,
        address_line: a.address || a.address_line,
        is_default: !!a.isDefault
      }))
    };
  }

  async addAddress(data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }): Promise<{ address: Address }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');
    const db = getActiveFirestore();
    const uRef = doc(db, 'users', cur.uid);
    const uSnap = await getDoc(uRef);
    const addresses = uSnap.data()?.addresses || [];

    const newId = (addresses.reduce((max: number, a: any) => Math.max(max, a.id || 0), 0) || 0) + 1;
    const newAddr = {
      id: newId,
      receiver: data.recipient_name,
      phone: data.phone,
      address: data.address_line,
      isDefault: !!data.is_default || addresses.length === 0
    };

    if (newAddr.isDefault) {
      addresses.forEach((a: any) => (a.isDefault = false));
    }
    addresses.push(newAddr);

    await updateDoc(uRef, { addresses, updatedAt: serverTimestamp() });
    return {
      address: {
        id: newId,
        user_id: cur.uid as any,
        recipient_name: data.recipient_name,
        phone: data.phone,
        address_line: data.address_line,
        is_default: newAddr.isDefault
      }
    };
  }

  async updateAddress(id: number, data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }): Promise<{ address: Address }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');
    const db = getActiveFirestore();
    const uRef = doc(db, 'users', cur.uid);
    const uSnap = await getDoc(uRef);
    const addresses = uSnap.data()?.addresses || [];

    const idx = addresses.findIndex((a: any) => a.id === id);
    if (idx < 0) throw new Error('Địa chỉ không tồn tại');

    if (data.is_default) {
      addresses.forEach((a: any) => (a.isDefault = false));
    }

    addresses[idx] = {
      id,
      receiver: data.recipient_name,
      phone: data.phone,
      address: data.address_line,
      isDefault: data.is_default !== undefined ? data.is_default : addresses[idx].isDefault
    };

    await updateDoc(uRef, { addresses, updatedAt: serverTimestamp() });
    return {
      address: {
        id,
        user_id: cur.uid as any,
        recipient_name: data.recipient_name,
        phone: data.phone,
        address_line: data.address_line,
        is_default: addresses[idx].isDefault
      }
    };
  }

  async deleteAddress(id: number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');
    const db = getActiveFirestore();
    const uRef = doc(db, 'users', cur.uid);
    const uSnap = await getDoc(uRef);
    const addresses = (uSnap.data()?.addresses || []).filter((a: any) => a.id !== id);
    await updateDoc(uRef, { addresses, updatedAt: serverTimestamp() });
    return { message: 'Đã xóa địa chỉ' };
  }

  async setDefaultAddress(id: number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');
    const db = getActiveFirestore();
    const uRef = doc(db, 'users', cur.uid);
    const uSnap = await getDoc(uRef);
    const addresses = uSnap.data()?.addresses || [];
    addresses.forEach((a: any) => (a.isDefault = a.id === id));
    await updateDoc(uRef, { addresses, updatedAt: serverTimestamp() });
    return { message: 'Đã đặt địa chỉ mặc định' };
  }

  async getWishlist(): Promise<{ products: Product[] }> {
    const cur = getCurrentUser();
    if (!cur) return { products: [] };
    const db = getActiveFirestore();
    const uSnap = await getDoc(doc(db, 'users', cur.uid));
    const ids = uSnap.data()?.wishlist || [];
    const products: Product[] = [];
    for (const pid of ids) {
      try {
        const pSnap = await getDoc(doc(db, 'products', String(pid)));
        if (pSnap.exists() && pSnap.data().isActive !== false) {
          products.push(normalizeProductDoc(pSnap.data(), pSnap.id));
        }
      } catch {}
    }
    return { products };
  }

  async getWishlistIds(): Promise<{ wishlist_ids: number[]; product_ids: number[] }> {
    const cur = getCurrentUser();
    if (!cur) return { wishlist_ids: [], product_ids: [] };
    const db = getActiveFirestore();
    const uSnap = await getDoc(doc(db, 'users', cur.uid));
    const ids = (uSnap.data()?.wishlist || []).map((i: any) => Number(i) || i);
    return { wishlist_ids: ids, product_ids: ids };
  }

  async toggleWishlist(productId: number | string): Promise<{ in_wishlist: boolean; message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập để lưu vào yêu thích');
    const db = getActiveFirestore();
    const uRef = doc(db, 'users', cur.uid);
    const uSnap = await getDoc(uRef);
    const wishlist: string[] = (uSnap.data()?.wishlist || []).map(String);
    const strPid = String(productId);

    if (wishlist.includes(strPid)) {
      await updateDoc(uRef, { wishlist: arrayRemove(strPid) });
      return { in_wishlist: false, message: 'Đã xóa khỏi danh sách yêu thích' };
    } else {
      await updateDoc(uRef, { wishlist: arrayUnion(strPid) });
      return { in_wishlist: true, message: 'Đã thêm vào danh sách yêu thích' };
    }
  }

  async uploadFile(dataUrl: string, type: 'image' | 'video' = 'image'): Promise<{ url: string }> {
    if (type === 'video') {
      const thumb = await compressImage(dataUrl, 200, 40 * 1024);
      return { url: thumb };
    }
    const comp = await compressImage(dataUrl, 1024, 150 * 1024);
    return { url: comp };
  }

  // --- SELLER STATS ---

  async getSellerStats(): Promise<{ stats: SellerStats }> {
    const { orders } = await this.getSellerOrders('all');
    const { products } = await this.getProducts({ in_stock: true });

    let revenue = 0;
    let pending = 0;
    let confirmed = 0;
    let shipping = 0;
    let completed = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      if (o.status === 'completed' || o.payment_status === 'paid') revenue += o.total;
      if (o.status === 'pending') pending++;
      else if (o.status === 'confirmed') confirmed++;
      else if (o.status === 'shipping') shipping++;
      else if (o.status === 'completed') completed++;
      else if (o.status === 'cancelled') cancelled++;
    });

    const stats: SellerStats = {
      total_revenue: revenue,
      total_orders: orders.length,
      status_counts: {
        pending,
        confirmed,
        shipping,
        delivered: 0,
        completed,
        cancelled
      },
      low_stock_count: products.filter((p) => (p.stock || 0) <= 2).length,
      recent_orders: orders.slice(0, 5),
      orders_pending: pending,
      orders_confirmed: confirmed,
      orders_shipping: shipping,
      orders_completed: completed,
      orders_cancelled: cancelled,
      total_products: products.length,
      rating_avg: 0,
      total_reviews: 0
    };

    return { stats };
  }

  // --- DEMO CONTROLLER ROLE SWITCHING ---

  async switchRole(targetUserId: number | string): Promise<{ token: string; user: User; role_name: string }> {
    if (targetUserId === 2 || targetUserId === '2' || targetUserId === 'buyer') {
      const u = await this.switchAccount('buyer', '0987654321');
      return { token: u.uid || String(u.id), user: u, role_name: 'Khách mua hàng' };
    }
    if (targetUserId === 3 || targetUserId === '3' || targetUserId === 'goc_sach_nhac') {
      const u = await this.switchAccount('seller', 'goc_sach_nhac');
      return { token: u.uid || String(u.id), user: u, role_name: 'Góc Sách & Nhạc' };
    }
    if (targetUserId === 4 || targetUserId === '4' || targetUserId === 'retro_tech') {
      const u = await this.switchAccount('seller', 'retro_tech');
      return { token: u.uid || String(u.id), user: u, role_name: 'Retro Tech' };
    }
    const u = await this.switchAccount('seller', 'admin');
    return { token: u.uid || String(u.id), user: u, role_name: 'Đồ Cũ Còn Thương' };
  }

  async switchBuyer(): Promise<{ token: string; user: User }> {
    const res = await this.switchRole(2);
    return { token: res.token, user: res.user };
  }

  async switchSeller(username: string = 'admin'): Promise<{ token: string; user: User }> {
    const res = await this.switchRole(username);
    return { token: res.token, user: res.user };
  }

  async resetDemo(): Promise<{ message: string }> {
    return this.resetDemoData();
  }

  // --- PRESENTATION MODE (config/settings) ---

  async getPresentationMode(): Promise<{ presentation_mode: boolean }> {
    const db = getActiveFirestore();
    const snap = await getDoc(doc(db, 'config', 'settings'));
    if (!snap.exists()) return { presentation_mode: false };
    return { presentation_mode: !!snap.data()?.presentationMode };
  }

  async setPresentationMode(enabled: boolean): Promise<{ presentation_mode: boolean }> {
    const cur = getCurrentUser();
    const activeAuth = getActiveAuth();
    if (!cur || !activeAuth.currentUser) {
      throw new Error('Phiên đăng nhập đã hết, vui lòng đăng nhập lại');
    }

    const db = getActiveFirestore();
    await setDoc(
      doc(db, 'config', 'settings'),
      {
        presentationMode: enabled,
        updatedAt: serverTimestamp(),
        updatedBy: cur.uid
      },
      { merge: true }
    );
    return { presentation_mode: enabled };
  }

  // --- MARKETPLACE SEED INITIALIZATION (Section 8) ---

  async initMarketplaceData(onProgress?: (msg: string) => void): Promise<{ message: string }> {
    const cur = getCurrentUser();
    const activeAuth = getActiveAuth();
    if (!cur || !activeAuth.currentUser) {
      throw new Error('Phiên đăng nhập đã hết, vui lòng đăng nhập lại');
    }

    const db = getActiveFirestore();
    onProgress?.('Kiểm tra tài khoản chủ...');

    const adminSnap = await getDoc(doc(db, 'usernames', 'seller_admin'));
    if (!adminSnap.exists()) {
      throw new Error('Cần đăng ký tài khoản người bán admin trước');
    }
    const gocSnap = await getDoc(doc(db, 'usernames', 'seller_goc_sach_nhac'));
    if (!gocSnap.exists()) {
      throw new Error('Cần đăng ký tài khoản người bán goc_sach_nhac trước');
    }
    const retroSnap = await getDoc(doc(db, 'usernames', 'seller_retro_tech'));
    if (!retroSnap.exists()) {
      throw new Error('Cần đăng ký tài khoản người bán retro_tech trước');
    }

    const adminUid = adminSnap.data()?.uid;
    const gocUid = gocSnap.data()?.uid;
    const retroUid = retroSnap.data()?.uid;

    onProgress?.('Tạo 3 shop mẫu...');
    const batch1 = writeBatch(db);

    batch1.set(doc(db, 'shops', 'do-cu-con-thuong'), {
      slug: 'do-cu-con-thuong',
      ownerUid: adminUid,
      name: 'Đồ Cũ Còn Thương',
      description: 'Tiệm đồ second-hand có câu chuyện: thời trang, phụ kiện, đồ gia dụng đã kiểm định.',
      avatar: createShopAvatarSvg('Đồ Cũ Còn Thương', '#08482D'),
      coverColor: '#08482D',
      coverImage: '',
      pickupAddress: '128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      phone: '0901234567',
      followerUids: [],
      followerCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'shops', 'goc-sach-nhac'), {
      slug: 'goc-sach-nhac',
      ownerUid: gocUid,
      name: 'Góc Sách & Nhạc',
      description: 'Sách cũ còn thơm mùi giấy và nhạc cụ đã qua sử dụng, chỉnh âm kỹ trước khi giao.',
      avatar: createShopAvatarSvg('Góc Sách & Nhạc', '#7A4E2D'),
      coverColor: '#7A4E2D',
      coverImage: '',
      pickupAddress: '45 Đường Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
      phone: '0902345678',
      followerUids: [],
      followerCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'shops', 'retro-tech'), {
      slug: 'retro-tech',
      ownerUid: retroUid,
      name: 'Retro Tech',
      description: 'Đồ công nghệ cũ đã test kỹ: máy ảnh film, điện thoại, tai nghe, bàn phím cơ.',
      avatar: createShopAvatarSvg('Retro Tech', '#2F4B6B'),
      coverColor: '#2F4B6B',
      coverImage: '',
      pickupAddress: '89 Đường Cách Mạng Tháng 8, Phường 7, Quận 3, TP. Hồ Chí Minh',
      phone: '0903456789',
      followerUids: [],
      followerCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'coupons', 'DOCU10'), {
      code: 'DOCU10',
      shopId: 'do-cu-con-thuong',
      ownerUid: adminUid,
      type: 'percent',
      value: 10,
      maxDiscount: 100000,
      minOrder: 300000,
      active: true,
      usedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'coupons', 'FREESHIP'), {
      code: 'FREESHIP',
      shopId: 'do-cu-con-thuong',
      ownerUid: adminUid,
      type: 'freeship',
      value: 100,
      maxDiscount: 30000,
      minOrder: 0,
      active: true,
      usedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'coupons', 'SACHHAY'), {
      code: 'SACHHAY',
      shopId: 'goc-sach-nhac',
      ownerUid: gocUid,
      type: 'fixed',
      value: 15000,
      maxDiscount: 15000,
      minOrder: 100000,
      active: true,
      usedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'coupons', 'TECH50'), {
      code: 'TECH50',
      shopId: 'retro-tech',
      ownerUid: retroUid,
      type: 'fixed',
      value: 50000,
      maxDiscount: 50000,
      minOrder: 1000000,
      active: true,
      usedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch1.set(doc(db, 'config', 'settings'), {
      presentationMode: false,
      updatedAt: serverTimestamp()
    });

    await batch1.commit();

    onProgress?.('Tạo 10 sản phẩm mẫu...');
    const batch2 = writeBatch(db);

    const sampleProducts = [
      { id: 'prod_1', name: 'Áo khoác denim cũ size L', category: 'Thời trang', price: 350000, orig: 1200000, cond: 95, note: 'Không rách, phai màu nhẹ tự nhiên ở khuỷu tay, form áo đứng và dày dặn', stock: 1, shopId: 'do-cu-con-thuong', ownerUid: adminUid, shopName: 'Đồ Cũ Còn Thương', icon: '🧥' },
      { id: 'prod_2', name: 'Túi xách da thật vintage', category: 'Thời trang', price: 600000, orig: 1800000, cond: 80, note: 'Chất da bò thật patina bóng đẹp, khóa đồng vintage nguyên bản, có dấu sờn quai nhẹ', stock: 1, shopId: 'do-cu-con-thuong', ownerUid: adminUid, shopName: 'Đồ Cũ Còn Thương', icon: '👜' },
      { id: 'prod_3', name: 'Đồng hồ Casio A168 vintage', category: 'Phụ kiện', price: 450000, orig: 900000, cond: 90, note: 'Đã thay pin Maxell chính hãng, đèn Illuminator sáng rực, dây kim loại còn sáng bóng', stock: 3, shopId: 'do-cu-con-thuong', ownerUid: adminUid, shopName: 'Đồ Cũ Còn Thương', icon: '⌚' },
      { id: 'prod_4', name: 'Nồi chiên không dầu Philips 4.1L', category: 'Gia dụng', price: 900000, orig: 2300000, cond: 85, note: 'Lòng nồi men chống dính còn rất tốt, mâm nhiệt sáng, hoạt động êm ái', stock: 1, shopId: 'do-cu-con-thuong', ownerUid: adminUid, shopName: 'Đồ Cũ Còn Thương', icon: '🍳' },
      { id: 'prod_5', name: 'Sách "Nhà giả kim" bản cũ', category: 'Sách', price: 45000, orig: 79000, cond: 80, note: 'Giấy ngả ố vàng hoài niệm, chữ in rõ nét, gáy sách chắc chắn không mất trang', stock: 5, shopId: 'goc-sach-nhac', ownerUid: gocUid, shopName: 'Góc Sách & Nhạc', icon: '📖' },
      { id: 'prod_6', name: 'Đàn guitar acoustic Yamaha F310', category: 'Nhạc cụ', price: 1500000, orig: 2900000, cond: 85, note: 'Action êm tay, âm vang chuẩn, gỗ đã qua tôi luyện lâu năm, kèm bao da dày', stock: 1, shopId: 'goc-sach-nhac', ownerUid: gocUid, shopName: 'Góc Sách & Nhạc', icon: '🎸' },
      { id: 'prod_7', name: 'Máy ảnh film Canon AE-1', category: 'Máy ảnh', price: 3200000, orig: 6000000, cond: 85, note: 'Cơ tốc chạy tốt, đo sáng nhạy, trầy nhẹ thân máy theo năm tháng', stock: 1, shopId: 'retro-tech', ownerUid: retroUid, shopName: 'Retro Tech', icon: '📷' },
      { id: 'prod_8', name: 'iPhone 11 64GB', category: 'Điện tử', price: 4500000, orig: 8000000, cond: 90, note: 'Pin 84%, máy zin chưa qua sửa chữa, có vài vết xước dăm viền nhẹ', stock: 2, shopId: 'retro-tech', ownerUid: retroUid, shopName: 'Retro Tech', icon: '📱' },
      { id: 'prod_9', name: 'Tai nghe Sony WH-1000XM3', category: 'Điện tử', price: 2100000, orig: 5500000, cond: 88, note: 'Chống ồn đỉnh cao, pin còn hơn 25h, đệm tai da cừu đã thay mới tinh', stock: 1, shopId: 'retro-tech', ownerUid: retroUid, shopName: 'Retro Tech', icon: '🎧' },
      { id: 'prod_10', name: 'Bàn phím cơ Keychron K2', category: 'Điện tử', price: 1100000, orig: 2000000, cond: 92, note: 'Gateron Brown switch gõ đầm tay, bluetooth mượt mà, đủ keycap và cáp Type-C', stock: 2, shopId: 'retro-tech', ownerUid: retroUid, shopName: 'Retro Tech', icon: '⌨️' }
    ];

    for (const p of sampleProducts) {
      batch2.set(doc(db, 'products', p.id), {
        shopId: p.shopId,
        ownerUid: p.ownerUid,
        shopName: p.shopName,
        name: p.name,
        category: p.category,
        price: p.price,
        originalPrice: p.orig,
        conditionPct: p.cond,
        conditionNote: p.note,
        description: p.note,
        defects: [{ text: p.note, image: '' }],
        inspection: {
          date: '2026-10-20',
          inspector: 'Trần Minh Tuấn (KTV Chuyên Sâu)',
          checks: [
            '✓ Hoạt động hoàn hảo mọi tính năng',
            '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
            '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
          ]
        },
        images: [],
        icon: p.icon,
        stock: p.stock,
        sold: 0,
        viewCount: 0,
        viewDate: '',
        ratingAvg: 0,
        ratingCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    await batch2.commit();
    onProgress?.('Hoàn thành khởi tạo dữ liệu chợ!');

    return { message: 'Khởi tạo dữ liệu chợ thành công' };
  }

  // --- DEMO RESET (Section 8) ---

  async resetDemoData(): Promise<{ message: string }> {
    const cur = getCurrentUser();
    const activeAuth = getActiveAuth();
    if (!cur || !activeAuth.currentUser) {
      throw new Error('Phiên đăng nhập đã hết, vui lòng đăng nhập lại');
    }

    const db = getActiveFirestore();

    const collectionsToClear = [
      'orders',
      'offers',
      'returns',
      'reviews',
      'notifications',
      'carts',
      'conversations'
    ];

    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }

    const sampleProductIds = [
      'prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5',
      'prod_6', 'prod_7', 'prod_8', 'prod_9', 'prod_10'
    ];
    const initialStocks: Record<string, number> = {
      prod_1: 1, prod_2: 1, prod_3: 3, prod_4: 1, prod_5: 5,
      prod_6: 1, prod_7: 1, prod_8: 2, prod_9: 1, prod_10: 2
    };

    const prodBatch = writeBatch(db);
    for (const pid of sampleProductIds) {
      const ref = doc(db, 'products', pid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        prodBatch.update(ref, {
          stock: initialStocks[pid] || 1,
          sold: 0,
          viewCount: 0,
          ratingAvg: 0,
          ratingCount: 0,
          updatedAt: serverTimestamp()
        });
      }
    }
    await prodBatch.commit();

    const sampleCoupons = ['DOCU10', 'FREESHIP', 'SACHHAY', 'TECH50'];
    const cpnBatch = writeBatch(db);
    for (const c of sampleCoupons) {
      const ref = doc(db, 'coupons', c);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        cpnBatch.update(ref, {
          usedCount: 0,
          updatedAt: serverTimestamp()
        });
      }
    }
    await cpnBatch.commit();

    const sampleShops = ['do-cu-con-thuong', 'goc-sach-nhac', 'retro-tech'];
    const shopBatch = writeBatch(db);
    for (const s of sampleShops) {
      const ref = doc(db, 'shops', s);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        shopBatch.update(ref, {
          followerUids: [],
          followerCount: 0,
          ratingAvg: 0,
          ratingCount: 0,
          updatedAt: serverTimestamp()
        });
      }
    }
    await shopBatch.commit();

    return { message: 'Đã khôi phục dữ liệu demo về trạng thái ban đầu' };
  }

  // --- FAST FORWARD SHIPMENT (DEMO TOOL) ---

  async getEligibleShipmentOrders(): Promise<{ orders: Order[] }> {
    const { orders } = await this.getMyOrders('all');
    return {
      orders: orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
    };
  }

  async advanceShipmentStep(orderCode: string | number, step: number): Promise<{ message: string }> {
    const db = getActiveFirestore();
    const ref = doc(db, 'orders', String(orderCode));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Đơn không tồn tại');

    const steps = [
      { status: 'confirmed', label: 'Bàn giao cho ĐVVC', event: 'dispatched' },
      { status: 'shipping', label: 'Đến kho phân loại', event: 'hub_arrival' },
      { status: 'shipping', label: 'Đang vận chuyển liên tỉnh', event: 'transit' },
      { status: 'shipping', label: 'Đang giao hàng tới người mua', event: 'out_for_delivery' },
      { status: 'completed', label: 'Giao hàng thành công', event: 'delivered' }
    ];

    const target = steps[Math.min(step, steps.length - 1)];
    const events = snap.data().shipmentEvents || [];
    events.push({
      event: target.event,
      label: target.label,
      location: 'Hồ Chí Minh',
      note: 'Tua nhanh vận chuyển',
      at: new Date().toISOString()
    });

    const updates: any = {
      status: target.status,
      shipmentEvents: events,
      updatedAt: serverTimestamp()
    };
    if (target.status === 'completed') {
      updates.completedAt = new Date().toISOString();
      updates.paymentStatus = 'paid';
    }

    await updateDoc(ref, updates);
    return { message: `Đã cập nhật: ${target.label}` };
  }
}

export const db = new DCCTDatabaseService();
