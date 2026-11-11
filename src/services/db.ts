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
  getFirestore,
  Bytes,
  collectionGroup
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
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
import {
  SEED_MEDIA_DEFAULTS,
  validateAndNormalizeReviewImages,
  createProductThumbnail,
  compressProductImage
} from '../utils/image';
import { removeVietnameseTones } from '../utils/format';

export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

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

export function createShopAvatarSvg(name: string, coverColor: string = '#08482D', slug?: string): string {
  const normSlug = (slug || slugify(name)).toLowerCase();

  // 1. Đồ Cũ Còn Thương: biểu tượng ♻ trên nền #08482D
  if (normSlug === 'do-cu-con-thuong' || normSlug.includes('do-cu')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" rx="48" fill="#08482D"/>
      <text x="100" y="132" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="88" font-weight="bold" fill="#DAE7C7" text-anchor="middle">♻</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // 2. Góc Sách & Nhạc: quyển sách mở + nốt nhạc trên nền #DAE7C7
  if (normSlug === 'goc-sach-nhac' || normSlug.includes('sach-nhac')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" rx="48" fill="#DAE7C7"/>
      <text x="76" y="125" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="64" text-anchor="middle">📖</text>
      <text x="135" y="115" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="52" text-anchor="middle">🎵</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // 3. Retro Tech: máy ảnh film / cassette trên nền #08482D
  if (normSlug === 'retro-tech' || normSlug.includes('retro')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" rx="48" fill="#08482D"/>
      <text x="76" y="125" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="64" text-anchor="middle">📷</text>
      <text x="135" y="120" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="52" text-anchor="middle">📼</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // Shop mới do người dùng tạo mà chưa có ảnh thì dùng avatar chữ cái đầu tên shop
  const initial = (name.trim().charAt(0) || 'S').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <rect width="200" height="200" rx="48" fill="${coverColor || '#08482D'}"/>
    <text x="100" y="130" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="80" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function isValidImageSrc(src?: any): boolean {
  if (!src || typeof src !== 'string') return false;
  const s = src.trim();
  if (!s) return false;
  if (
    s.startsWith('/') ||
    s.startsWith('./') ||
    s.startsWith('blob:') ||
    s.startsWith('data:image/') ||
    s.startsWith('http://') ||
    s.startsWith('https://')
  ) {
    return true;
  }
  return false;
}

export function isLegacyOrEmptyImage(src?: string): boolean {
  return !isValidImageSrc(src);
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
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach((img: string, i: number) => {
        if (typeof img === 'string' && img.length > 180000) {
          throw new Error(`Ảnh thứ ${i + 1} quá lớn, vui lòng chọn ảnh khác`);
        }
      });
    }
    throw new Error('Dung lượng sản phẩm vượt quá 900KB, vui lòng giảm bớt ảnh');
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

const videoBlobCache = new Map<string, string>();

export async function uploadReviewVideo(
  blob: Blob,
  duration: number,
  onProgress?: (pct: number) => void,
  meta?: {
    productId?: string | number;
    orderId?: string | number;
    reviewId?: string;
    width?: number;
    height?: number;
    thumb?: string;
  }
): Promise<{ mediaId: string }> {
  const cur = getCurrentUser();
  if (!cur) {
    throw new Error('Vui lòng đăng nhập để tải video đánh giá');
  }

  const db = getActiveFirestore();
  const mediaId = `rm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const totalBytes = bytes.length;
  const chunkSize = 650 * 1024; // 650KB chunk binary
  const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize));

  const prodId = String(meta?.productId || '');
  const ordId = String(meta?.orderId || '');
  const revId = meta?.reviewId || (ordId && prodId ? `${ordId}_${prodId}` : '');

  const mediaRef = doc(db, 'reviewMedia', mediaId);
  // 1. Tạo reviewMedia document TRƯỚC với ownerUid và đầy đủ thông tin metadata
  await setDoc(mediaRef, {
    mediaId,
    ownerUid: cur.uid,
    productId: prodId,
    orderId: ordId,
    reviewId: revId,
    mime: blob.type || 'video/webm',
    size: totalBytes,
    duration: Math.round(duration || 0),
    width: meta?.width || 640,
    height: meta?.height || 360,
    chunkCount: totalChunks,
    thumb: meta?.thumb || '',
    status: 'uploading',
    createdAt: serverTimestamp(),
    // Các trường tương thích ngược
    totalChunks,
    totalBytes,
    mimeType: blob.type || 'video/webm'
  });

  const writtenChunkRefs: any[] = [];
  try {
    // 2. Ghi từng chunk vào subcollection chunks/{000, 001, ...}
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalBytes);
      const chunkBytes = bytes.subarray(start, end);
      const chunkId = String(i).padStart(3, '0');
      const chunkRef = doc(db, 'reviewMedia', mediaId, 'chunks', chunkId);
      await setDoc(chunkRef, {
        index: i,
        chunkIndex: i,
        data: Bytes.fromUint8Array(chunkBytes),
        size: chunkBytes.length
      });
      writtenChunkRefs.push(chunkRef);
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
    }

    // 3. Cập nhật status: 'ready' khi hoàn tất
    await updateDoc(mediaRef, {
      status: 'ready',
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    // 4. Nếu lỗi giữa chừng: dọn dẹp các chunk đã ghi và document reviewMedia
    try {
      for (const cr of writtenChunkRefs) {
        await deleteDoc(cr);
      }
      await deleteDoc(mediaRef);
    } catch {}
    throw new Error(err?.message || 'Lỗi khi lưu video lên máy chủ');
  }

  const objectUrl = URL.createObjectURL(blob);
  videoBlobCache.set(mediaId, objectUrl);

  return { mediaId };
}

export async function deleteReviewMedia(mediaId: string): Promise<void> {
  if (!mediaId || !mediaId.startsWith('rm_')) return;
  try {
    const db = getActiveFirestore();
    const chunksSnap = await getDocs(collection(db, 'reviewMedia', mediaId, 'chunks'));
    for (const cd of chunksSnap.docs) {
      await deleteDoc(cd.ref);
    }
    await deleteDoc(doc(db, 'reviewMedia', mediaId));
    if (videoBlobCache.has(mediaId)) {
      videoBlobCache.delete(mediaId);
    }
  } catch (e) {
    console.warn('Could not delete reviewMedia:', e);
  }
}

export async function getReviewVideoBlobUrl(mediaId: string): Promise<string> {
  if (!mediaId) return '';
  if (videoBlobCache.has(mediaId)) {
    return videoBlobCache.get(mediaId)!;
  }
  const db = getActiveFirestore();
  const mediaRef = doc(db, 'reviewMedia', mediaId);
  const mediaSnap = await getDoc(mediaRef);
  if (!mediaSnap.exists()) {
    const localBlob = await getLocalVideo(mediaId);
    if (localBlob) {
      const url = URL.createObjectURL(localBlob);
      videoBlobCache.set(mediaId, url);
      return url;
    }
    return '';
  }

  const mediaData = mediaSnap.data();
  const chunksSnap = await getDocs(collection(db, 'reviewMedia', mediaId, 'chunks'));
  if (chunksSnap.empty) return '';

  const sortedDocs = chunksSnap.docs
    .map((d) => d.data())
    .sort((a, b) => ((a.index ?? a.chunkIndex) ?? 0) - ((b.index ?? b.chunkIndex) ?? 0));

  const totalBytes = Number(mediaData.size || mediaData.totalBytes || 0);
  const merged = new Uint8Array(
    totalBytes > 0
      ? totalBytes
      : sortedDocs.reduce((acc, c) => acc + (c.data?.toUint8Array?.()?.length || 0), 0)
  );
  let offset = 0;
  for (const c of sortedDocs) {
    if (c.data && typeof c.data.toUint8Array === 'function') {
      const u8 = c.data.toUint8Array();
      merged.set(u8, offset);
      offset += u8.length;
    }
  }

  const mimeType = mediaData.mime || mediaData.mimeType || 'video/webm';
  const blob = new Blob([merged], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  videoBlobCache.set(mediaId, blobUrl);
  return blobUrl;
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

function normalizeShopDoc(docData: DocumentData, slug: string): Shop {
  const rawAvatar = docData.avatar;
  const shopAvatar = rawAvatar && !rawAvatar.includes('unsplash.com') && !rawAvatar.includes('photo-1544816155-12df9643f363')
    ? rawAvatar
    : createShopAvatarSvg(docData.name, docData.coverColor, slug);
  const rAvg = Number(docData.ratingAvg ?? docData.rating_avg ?? docData.average_rating ?? 0);
  const rCount = Number(docData.ratingCount ?? docData.rating_count ?? docData.review_count ?? docData.total_reviews ?? 0);
  const seedCover = SEED_MEDIA_DEFAULTS.shops[slug as keyof typeof SEED_MEDIA_DEFAULTS.shops]?.coverImage;
  const rawCover = docData.coverImage || docData.cover_image;
  const effectiveCover = (rawCover && isValidImageSrc(rawCover)) ? rawCover : (seedCover || '');

  return {
    id: slug as any,
    owner_user_id: docData.ownerUid as any,
    name: docData.name,
    slug: docData.slug || slug,
    description: docData.description || '',
    avatar: shopAvatar,
    cover_color: docData.coverColor || '#08482D',
    cover_image: effectiveCover,
    coverImage: effectiveCover,
    pickup_address: docData.pickupAddress || '',
    phone: docData.phone || '',
    follower_ids: (docData.followerUids || []).map((u: string) => u as any),
    follower_count: docData.followerCount || (docData.followerUids ? docData.followerUids.length : 0),
    rating_avg: rAvg,
    average_rating: rAvg,
    rating_count: rCount,
    review_count: rCount,
    total_reviews: rCount,
    response_rate: 98,
    joined_text: (() => {
      const d = docData.createdAt?.toDate ? docData.createdAt.toDate() : (docData.createdAt ? new Date(docData.createdAt) : new Date(2026, 9, 1));
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      return `${m}/${y}`;
    })(),
    created_at: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString()
  };
}

// Normalizer from Firestore product doc to Product interface
function normalizeProductDoc(docData: DocumentData, id: string): Product {
  const seedProduct = SEED_MEDIA_DEFAULTS.products[id as keyof typeof SEED_MEDIA_DEFAULTS.products];
  let images = Array.isArray(docData.images) && docData.images.length > 0 ? docData.images : [];
  
  if (images.length === 0 || images.every((img: string) => !isValidImageSrc(img) || img.startsWith('data:image/svg+xml'))) {
    if (seedProduct?.images && seedProduct.images.length > 0) {
      images = seedProduct.images;
    }
  }

  const primaryImg = (images[0] && isValidImageSrc(images[0]) && !images[0].startsWith('data:image/svg+xml'))
    ? images[0]
    : (docData.imageUrl && isValidImageSrc(docData.imageUrl) && !docData.imageUrl.startsWith('data:image/svg+xml')
        ? docData.imageUrl
        : (docData.image_url && isValidImageSrc(docData.image_url) && !docData.image_url.startsWith('data:image/svg+xml')
            ? docData.image_url
            : (seedProduct?.images[0] || images[0] || createVintageProductSvg(docData.name, docData.category, 0, docData.shopName))));

  const thumb = (docData.thumb && isValidImageSrc(docData.thumb) && !docData.thumb.startsWith('data:image/svg+xml'))
    ? docData.thumb
    : (docData.thumbnail && isValidImageSrc(docData.thumbnail) && !docData.thumbnail.startsWith('data:image/svg+xml')
        ? docData.thumbnail
        : (seedProduct?.thumb || primaryImg));

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
    stock: Number(docData.stock ?? 0),
    image_url: primaryImg,
    images: images.length > 0 ? images : [primaryImg],
    thumb: thumb,
    flaws: Array.isArray(docData.defects) ? docData.defects.map((d: any, idx: number) => ({
      id: idx + 1,
      description: typeof d === 'string' ? d : d.text || '',
      image_url: typeof d === 'object' && d.image ? d.image : '',
      photo_url: typeof d === 'object' && d.image ? d.image : ''
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
    card_brand: docData.cardBrand || undefined,
    card_last4: docData.cardLast4 || undefined,
    card_category: docData.cardType || undefined,
    card_type: docData.cardBrand ? `${docData.cardBrand} **** ${docData.cardLast4 || '1111'}` : undefined,
    status: docData.status || 'pending',
    carrier: docData.carrier || undefined,
    tracking_code: docData.trackingCode || undefined,
    cancel_reason: docData.cancelReason || undefined,
    items: Array.isArray(docData.items) ? docData.items.map((it: any, idx: number) => {
      const pid = String(it.productId ?? it.product_id ?? '');
      const seedThumb = SEED_MEDIA_DEFAULTS.products[pid as keyof typeof SEED_MEDIA_DEFAULTS.products]?.thumb;
      const rawThumb = it.thumb || it.image_url || it.imageUrl;
      const effectiveThumb = (rawThumb && isValidImageSrc(rawThumb) && !rawThumb.startsWith('data:image/svg+xml'))
        ? rawThumb
        : (seedThumb || (rawThumb && isValidImageSrc(rawThumb) ? rawThumb : ''));
      return {
        id: idx + 1,
        order_id: code as any,
        product_id: (it.productId ?? it.product_id) as any,
        product_name: it.name || it.product_name,
        condition_pct: it.conditionPct || it.condition_pct || 90,
        price: Number(it.price || 0),
        original_price: Number(it.originalPrice || it.original_price || it.price || 0),
        is_negotiated: Boolean(it.negotiated || it.is_negotiated),
        offer_id: it.offerId || it.offer_id || undefined,
        quantity: it.qty || it.quantity,
        thumb: effectiveThumb,
        image_url: effectiveThumb || (it.icon ? createVintageProductSvg(it.name || it.product_name, '', 0, docData.shopName) : '')
      };
    }) : [],
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
    return_status: docData.returnStatus || (docData.returnRequest ? docData.returnRequest.status : undefined),
    return_request: docData.returnRequest ? {
      id: docData.returnRequest.id || `ret_${code}`,
      shop_id: docData.shopId,
      shop_name: docData.shopName,
      order_id: code,
      order_code: code,
      buyer_id: docData.buyerUid,
      buyer_name: docData.receiver || docData.buyerName || 'Khách hàng',
      buyer_phone: docData.phone || docData.buyerPhone || '',
      product_id: docData.items?.[0]?.productId || 1,
      product_name: docData.items?.[0]?.name,
      product_image: docData.items?.[0]?.thumb,
      reason: docData.returnRequest.reason || '',
      description: docData.returnRequest.detail || docData.returnRequest.description || '',
      images: docData.returnRequest.images || [],
      status: docData.returnRequest.status || 'pending',
      seller_note: docData.returnRequest.sellerNote || '',
      refund_amount: Number(docData.returnRequest.refundAmount || docData.total || 0),
      refund_method: 'Hoàn tiền về tài khoản',
      created_at: docData.returnRequest.createdAt || (docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString())
    } : null,
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

export function mapChatMessageDoc(docId: string, conversationId: string, data: any): ChatMessage {
  const rawText = data.text || data.content || '';
  const ctx = data.context;
  const isImg = data.type === 'image' || !!data.image;
  return {
    id: docId as any,
    conversation_id: conversationId as any,
    sender_id: data.senderUid as any,
    sender_role: data.senderRole,
    type: isImg ? 'image' : (ctx ? 'context' : (data.type || 'text')),
    content: isImg ? (data.text || '📷 Đã gửi một ảnh') : rawText,
    message: isImg ? (data.text || '📷 Đã gửi một ảnh') : rawText,
    image: data.image || null,
    width: data.width || null,
    height: data.height || null,
    context_card: ctx ? {
      kind: ctx.kind || ctx.type,
      type: ctx.kind || ctx.type,
      ref_id: ctx.refId || ctx.product_id || ctx.order_code,
      product_id: ctx.product_id || (ctx.kind === 'product' ? ctx.refId : undefined),
      order_code: ctx.order_code || (ctx.kind === 'order' ? String(ctx.refId) : undefined),
      title: ctx.title || '',
      price: ctx.price,
      image: ctx.image || ctx.image_url || '',
      image_url: ctx.image || ctx.image_url || ''
    } : null,
    created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : (data.created_at || new Date().toISOString())),
    read_at: data.readAt?.toDate ? data.readAt.toDate().toISOString() : (data.read_at || null)
  };
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
          if (!userData.shopId) {
            await updateDoc(doc(db, 'users', uid), { shopId: s.id });
          }
          const sData = s.data();
          if (!sData.avatar || sData.avatar.includes('unsplash.com')) {
            const patchedAvatar = createShopAvatarSvg(sData.name || 'Shop', sData.coverColor || '#08482D', s.id);
            try {
              await updateDoc(doc(db, 'shops', s.id), { avatar: patchedAvatar });
            } catch {}
          }
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

    if (userObj.role === 'seller' && (!userData.shopId || !userObj.shop_id)) {
      try {
        const shopsRef = collection(db, 'shops');
        const q = query(shopsRef, where('ownerUid', '==', firebaseUser.uid));
        const shopSnap = await getDocs(q);
        if (!shopSnap.empty) {
          const s = shopSnap.docs[0];
          userObj.shop_id = s.id as any;
          userObj.shop_name = s.data().name;
          if (!userData.shopId) {
            await updateDoc(doc(db, 'users', firebaseUser.uid), { shopId: s.id });
          }
          const sData = s.data();
          if (!sData.avatar || sData.avatar.includes('unsplash.com')) {
            const patchedAvatar = createShopAvatarSvg(sData.name || 'Shop', sData.coverColor || '#08482D', s.id);
            try {
              await updateDoc(doc(db, 'shops', s.id), { avatar: patchedAvatar });
            } catch {}
          }
          saveStoredAccount({
            role: 'seller',
            username: userObj.username,
            fullName: userObj.full_name,
            uid: firebaseUser.uid,
            phone: userObj.phone,
            shopId: s.id,
            shopName: s.data().name
          });
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

  async changePassword(data: { old_password?: string; new_password?: string; confirm_password?: string }): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập để đổi mật khẩu');

    const oldPass = (data.old_password || '').trim();
    const newPass = (data.new_password || '').trim();
    const confirmPass = data.confirm_password !== undefined ? data.confirm_password.trim() : newPass;

    if (!oldPass) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại');
    }
    if (!newPass) {
      throw new Error('Vui lòng nhập mật khẩu mới');
    }
    if (newPass.length < 8) {
      throw new Error('Mật khẩu mới phải có tối thiểu 8 ký tự');
    }
    if (confirmPass && newPass !== confirmPass) {
      throw new Error('Mật khẩu xác nhận không khớp');
    }
    if (oldPass === newPass) {
      throw new Error('Mật khẩu mới không được trùng mật khẩu cũ');
    }

    const auth = getActiveAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại');
    }

    // Determine user's auth email
    let email = user.email;
    if (!email) {
      email = cur.role === 'buyer'
        ? toBuyerEmail(cur.phone || cur.username)
        : toSellerEmail(cur.username);
    }

    try {
      const credential = EmailAuthProvider.credential(email, oldPass);
      await reauthenticateWithCredential(user, credential);
    } catch (err: any) {
      console.error('Re-auth error:', err);
      throw new Error('Mật khẩu hiện tại không chính xác');
    }

    try {
      await updatePassword(user, newPass);
    } catch (err: any) {
      console.error('Update password error:', err);
      if (err.code === 'auth/weak-password' || err.message?.includes('weak-password')) {
        throw new Error('Mật khẩu mới quá yếu, vui lòng chọn mật khẩu tối thiểu 8 ký tự');
      }
      throw new Error(err.message || 'Không thể cập nhật mật khẩu mới lúc này');
    }

    return { message: 'Đổi mật khẩu thành công!' };
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

    // Push sold out items (stock <= 0) to the bottom of all lists
    list.sort((a, b) => {
      const aSold = a.stock <= 0 ? 1 : 0;
      const bSold = b.stock <= 0 ? 1 : 0;
      return aSold - bSold;
    });

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
    const rawQ = (queryStr || '').trim();
    if (rawQ.length < 2) return { suggestions: [], shops: [] };
    const qLower = rawQ.toLowerCase();
    const qNorm = removeVietnameseTones(rawQ);

    const { products } = await this.getProducts();
    const matchedProducts = products
      .filter((p) => {
        const nameLower = (p.name || '').toLowerCase();
        const catLower = (p.category || '').toLowerCase();
        const nameNorm = removeVietnameseTones(p.name);
        const catNorm = removeVietnameseTones(p.category);
        return (
          nameLower.includes(qLower) ||
          catLower.includes(qLower) ||
          nameNorm.includes(qNorm) ||
          catNorm.includes(qNorm)
        );
      })
      .slice(0, 4)
      .map((p) => ({
        id: p.id as any,
        name: p.name,
        price: p.price,
        condition_pct: p.condition_pct,
        image_url: p.thumb || p.image_url,
        shop_name: p.shop_name
      }));

    const { shops } = await this.getShops();
    const matchedShops = shops
      .filter((s) => {
        const nameLower = (s.name || '').toLowerCase();
        const descLower = (s.description || '').toLowerCase();
        const nameNorm = removeVietnameseTones(s.name);
        const descNorm = removeVietnameseTones(s.description || '');
        return (
          nameLower.includes(qLower) ||
          descLower.includes(qLower) ||
          nameNorm.includes(qNorm) ||
          descNorm.includes(qNorm)
        );
      })
      .slice(0, 2)
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
    if (!cur.shop_id) {
      throw new Error('Vui lòng thiết lập thông tin shop trước khi đăng bán');
    }

    const db = getActiveFirestore();
    const shopId = String(cur.shop_id);
    const shopName = cur.shop_name || 'Đồ Cũ Còn Thương';

    const rawImages = data.images || (data.image_url ? [data.image_url] : []);
    const compressedImages: string[] = [];
    let idx = 1;
    for (const img of rawImages.slice(0, 5)) {
      if (img.startsWith('data:image/svg+xml') || img.startsWith('http://') || img.startsWith('https://')) {
        compressedImages.push(img);
      } else {
        const comp = await compressProductImage(img, 1024, 150000);
        if (comp.length > 200000) {
          throw new Error(`Ảnh thứ ${idx} quá lớn, vui lòng chọn ảnh khác`);
        }
        compressedImages.push(comp);
      }
      idx++;
    }

    let thumb = data.thumb;
    if (!thumb && compressedImages[0]) {
      try {
        thumb = await createProductThumbnail(compressedImages[0]);
      } catch {
        thumb = compressedImages[0];
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
      defects: (data.flaws || []).map((f: any) => ({
        text: f.description || f.note || '',
        location: f.location || '',
        image: f.photo_url || f.image_url || f.image || ''
      })),
      inspection: {
        date: data.inspection_date || new Date().toISOString().slice(0, 10),
        inspector: data.inspector_name || 'KTV Chuyên Sâu',
        checks: data.inspection_checklist || ['Đã kiểm định hoạt động']
      },
      images: compressedImages,
      imageUrl: compressedImages[0] || '',
      thumb: thumb || compressedImages[0] || '',
      thumbnail: thumb || compressedImages[0] || '',
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

  async getSellerProducts(): Promise<{ products: Product[] }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      return { products: [] };
    }

    const db = getActiveFirestore();
    const snap = await getDocs(collection(db, 'products'));
    const list: Product[] = [];
    const myUid = cur.uid;
    const myShopId = cur.shop_id ? String(cur.shop_id) : '';

    snap.forEach((d) => {
      const data = d.data();
      if (data.isActive !== false) {
        const prodShopId = data.shopId ? String(data.shopId) : '';
        const prodOwnerUid = data.ownerUid ? String(data.ownerUid) : '';
        const isMine = (myShopId && prodShopId === myShopId) || (myUid && prodOwnerUid === myUid);
        if (isMine) {
          list.push(normalizeProductDoc(data, d.id));
        }
      }
    });

    list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return { products: list };
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

    const pData = snap.data();
    const myUid = cur.uid;
    const myShopId = cur.shop_id ? String(cur.shop_id) : '';
    const isOwner = (pData.ownerUid && String(pData.ownerUid) === myUid) ||
                    (myShopId && String(pData.shopId) === myShopId);
    if (!isOwner) {
      throw new Error('Bạn không có quyền sửa sản phẩm này');
    }

    const updatePayload: any = {
      updatedAt: serverTimestamp()
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.price !== undefined) updatePayload.price = Number(data.price);
    if (data.original_price !== undefined) updatePayload.originalPrice = Number(data.original_price);
    if (data.condition_pct !== undefined) updatePayload.conditionPct = Number(data.condition_pct);
    if (data.condition_detail !== undefined) updatePayload.conditionNote = data.condition_detail;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.stock !== undefined) updatePayload.stock = Number(data.stock);

    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      updatePayload.images = data.images.slice(0, 5);
    } else if (data.image_url) {
      updatePayload.images = [data.image_url];
    }
    if (data.image_url) updatePayload.imageUrl = data.image_url;

    if (data.thumb !== undefined) {
      updatePayload.thumb = data.thumb;
      updatePayload.thumbnail = data.thumb;
    }

    if (data.flaws) {
      updatePayload.defects = data.flaws.map((f: any) => ({
        text: f.description || f.note || '',
        location: f.location || '',
        image: f.photo_url || f.image_url || f.image || ''
      }));
    }

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
    const ref = doc(db, 'products', String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Sản phẩm không tồn tại');
    }

    const pData = snap.data();
    const myUid = cur.uid;
    const myShopId = cur.shop_id ? String(cur.shop_id) : '';
    const isOwner = (pData.ownerUid && String(pData.ownerUid) === myUid) ||
                    (myShopId && String(pData.shopId) === myShopId);
    if (!isOwner) {
      throw new Error('Bạn không có quyền sửa sản phẩm này');
    }

    await updateDoc(ref, {
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
          if (p.stock > 0) {
            totalPrice += effectivePrice * it.qty;
          }
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
            original_item_price: p.price,
            condition_pct: p.condition_pct,
            condition_detail: p.condition_detail,
            stock: p.stock,
            is_sold_out: p.stock <= 0,
            image_url: p.image_url,
            shop_id: p.shop_id,
            shop_name: p.shop_name,
            shop_slug: p.shop_slug,
            created_at: new Date().toISOString(),
            product: p,
            effective_price: effectivePrice,
            offer_id: it.offerId ? String(it.offerId) : undefined,
            is_negotiated: !!it.negotiatedPrice,
            negotiated_price: it.negotiatedPrice
          });
        }
      } catch {}
    }

    const shippingFee = totalPrice >= 1000000 || totalPrice === 0 ? 0 : 30000;
    return {
      items,
      item_count: items.reduce((sum, i) => (i.stock > 0 ? sum + i.quantity : sum), 0),
      total_price: totalPrice,
      subtotal: totalPrice,
      shipping_fee: shippingFee,
      total: totalPrice + shippingFee
    };
  }

  async addToCart(productId: number | string, quantity: number = 1, offerId?: number | string, negotiatedPrice?: number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để thêm vào giỏ hàng');
    }

    const db = getActiveFirestore();
    const cartRef = doc(db, 'carts', cur.uid);
    const cartSnap = await getDoc(cartRef);
    let items = cartSnap.exists() && Array.isArray(cartSnap.data()?.items) ? cartSnap.data()!.items : [];

    const existingIdx = items.findIndex((i: any) => String(i.productId) === String(productId));
    const strOfferId = offerId != null ? String(offerId) : null;
    if (existingIdx >= 0) {
      items[existingIdx].qty += quantity;
      if (strOfferId) items[existingIdx].offerId = strOfferId;
      if (negotiatedPrice) items[existingIdx].negotiatedPrice = negotiatedPrice;
    } else {
      const prodSnap = await getDoc(doc(db, 'products', String(productId)));
      const shopId = prodSnap.exists() ? prodSnap.data()?.shopId || 'do-cu-con-thuong' : 'do-cu-con-thuong';
      items.push({
        productId: String(productId),
        shopId,
        qty: quantity,
        negotiatedPrice: negotiatedPrice || null,
        offerId: strOfferId
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
    const db = getActiveFirestore();
    const strId = String(id);
    const snap = await getDoc(doc(db, 'shops', strId));
    if (snap.exists()) {
      return { shop: normalizeShopDoc(snap.data(), snap.id) };
    }
    const { shops } = await this.getShops();
    const found = shops.find((s) => s.slug === strId || String(s.id) === strId) || shops[0];
    if (found) {
      return { shop: found };
    }
    throw new Error('Cửa hàng không tồn tại');
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

    // Query active products count per shop
    const prodCounts: Record<string, number> = {};
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      prodSnap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          const sId = String(data.shopId || '');
          if (sId) {
            prodCounts[sId] = (prodCounts[sId] || 0) + 1;
          }
        }
      });
    } catch {}

    const shops: Shop[] = [];
    for (const sId of following) {
      try {
        const sSnap = await getDoc(doc(db, 'shops', sId));
        if (sSnap.exists()) {
          const shop = normalizeShopDoc(sSnap.data(), sSnap.id);
          shop.product_count = prodCounts[sSnap.id] || prodCounts[shop.slug] || 0;
          shops.push(shop);
        }
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

  async unsaveShopVoucher(code: string): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập');
    const db = getActiveFirestore();
    await updateDoc(doc(db, 'users', cur.uid), {
      savedCoupons: arrayRemove(code.toUpperCase().trim())
    });
    return { message: 'Đã xóa mã giảm giá khỏi ví voucher' };
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
    const rawS = (queryStr || '').trim();
    if (!rawS) return { shops };
    const sLower = rawS.toLowerCase();
    const sNorm = removeVietnameseTones(rawS);
    return {
      shops: shops.filter((sh) => {
        const nameLower = (sh.name || '').toLowerCase();
        const descLower = (sh.description || '').toLowerCase();
        const nameNorm = removeVietnameseTones(sh.name);
        const descNorm = removeVietnameseTones(sh.description || '');
        return (
          nameLower.includes(sLower) ||
          descLower.includes(sLower) ||
          nameNorm.includes(sNorm) ||
          descNorm.includes(sNorm)
        );
      })
    };
  }

  // --- ORDERS (BUYER & SELLER) & CHECKOUT TRANSACTION (Section 6) ---

  async createOrder(payload: {
    items: Array<{ product_id: number | string; quantity: number; offer_id?: number | string; offerId?: number | string }>;
    recipient_name: string;
    phone: string;
    address: string;
    note?: string;
    payment_method: 'card' | 'napas' | 'cod';
    card_info?: { number: string; expiry: string; cvv: string; card_type?: string };
    coupon_code?: string;
    shop_coupons?: Record<string | number, string>;
  }): Promise<{ orders: Order[]; message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'buyer') {
      throw new Error('Vui lòng đăng nhập tài khoản người mua để đặt hàng');
    }

    const db = getActiveFirestore();
    const createdOrders: Order[] = [];

    await runTransaction(db, async (txn) => {
      // 1. ALL READS:
      // A. Read all products
      const productSnaps = new Map<string, any>();
      for (const it of payload.items) {
        const pid = String(it.product_id);
        if (!productSnaps.has(pid)) {
          const pRef = doc(db, 'products', pid);
          const pSnap = await txn.get(pRef);
          if (!pSnap.exists() || pSnap.data().isActive === false) {
            throw new Error('Sản phẩm không tồn tại hoặc đã ngừng bán');
          }
          productSnaps.set(pid, pSnap.data());
        }
      }

      // Check stock
      for (const it of payload.items) {
        const pData = productSnaps.get(String(it.product_id));
        if (pData.stock < it.quantity) {
          throw new Error(`${pData.name} vừa có chủ mới`);
        }
      }

      // B. Read all offers for items that have offer_id
      const validOffersMap = new Map<string, any>();
      for (const it of payload.items) {
        const offId = it.offer_id || (it as any).offerId;
        if (offId) {
          const offStr = String(offId);
          if (!validOffersMap.has(offStr)) {
            const offRef = doc(db, 'offers', offStr);
            const offSnap = await txn.get(offRef);
            if (offSnap.exists()) {
              const offData = offSnap.data();
              const now = Date.now();
              const isPast24h = offData.expiresAt
                ? new Date(offData.expiresAt).getTime() < now
                : (offData.createdAt?.toDate ? now - offData.createdAt.toDate().getTime() > 24 * 3600 * 1000 : false);

              if (
                offData.buyerUid === cur.uid &&
                String(offData.productId) === String(it.product_id) &&
                offData.status === 'accepted' &&
                !isPast24h
              ) {
                validOffersMap.set(offStr, offData);
              }
            }
          }
        }
      }

      // C. Read all unique shops
      const shopGroups = new Map<string, any[]>();
      for (const it of payload.items) {
        const pData = productSnaps.get(String(it.product_id));
        const sId = pData.shopId || 'do-cu-con-thuong';
        if (!shopGroups.has(sId)) shopGroups.set(sId, []);
        shopGroups.get(sId)!.push({ it, pData });
      }

      const shopDataMap = new Map<string, any>();
      for (const shopId of shopGroups.keys()) {
        const sSnap = await txn.get(doc(db, 'shops', shopId));
        shopDataMap.set(shopId, sSnap.exists() ? sSnap.data() : { name: 'Đồ Cũ Còn Thương', ownerUid: 'seller_admin' });
      }

      // D. Read all coupons if provided (ALL READS MUST PRECEDE WRITES)
      const couponCodesToFetch = new Set<string>();
      if (payload.coupon_code) {
        couponCodesToFetch.add(payload.coupon_code.toUpperCase().trim());
      }
      if (payload.shop_coupons) {
        for (const c of Object.values(payload.shop_coupons)) {
          if (c && typeof c === 'string' && c.trim()) {
            couponCodesToFetch.add(c.toUpperCase().trim());
          }
        }
      }

      const couponsMap = new Map<string, any>();
      for (const code of couponCodesToFetch) {
        const cRef = doc(db, 'coupons', code);
        const cSnap = await txn.get(cRef);
        if (cSnap.exists()) {
          couponsMap.set(code, cSnap.data());
        }
      }

      // --- END OF ALL READS ---
      // 2. NOW PERFORM CALCULATIONS AND WRITES:
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      let orderIndex = 0;

      for (const [shopId, group] of shopGroups.entries()) {
        orderIndex++;
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderCode = `DCCT-${todayStr}-${randomSuffix}`;
        const shopData = shopDataMap.get(shopId) || { name: 'Đồ Cũ Còn Thương', ownerUid: 'seller_admin' };

        let subtotal = 0;
        const orderItems = group.map(({ it, pData }) => {
          const offId = it.offer_id || (it as any).offerId;
          const validOffer = offId ? validOffersMap.get(String(offId)) : null;

          let itemPrice = Number(pData.price || 0);
          let isNegotiated = false;
          const originalPrice = itemPrice;

          if (validOffer) {
            const finalOffered = validOffer.counterPrice != null
              ? Number(validOffer.counterPrice)
              : Number(validOffer.offeredPrice || validOffer.price || 0);
            if (finalOffered > 0) {
              itemPrice = finalOffered;
              isNegotiated = true;
            }
          }

          subtotal += itemPrice * it.quantity;
          const itemThumb = pData.thumb || (Array.isArray(pData.images) && pData.images[0]) || pData.imageUrl || '';
          return {
            productId: String(it.product_id),
            name: pData.name,
            icon: pData.icon || getProductEmoji(pData.name, pData.category),
            thumb: itemThumb,
            conditionPct: pData.conditionPct || 90,
            price: itemPrice,
            originalPrice,
            qty: it.quantity,
            negotiated: isNegotiated,
            offerId: validOffer ? String(offId) : null
          };
        });

        const shippingFee = subtotal >= 1000000 ? 0 : 30000;
        let discount = 0;
        let appliedCoupon: string | null = null;

        const assignedCode = (payload.shop_coupons && (payload.shop_coupons[shopId as any] || (payload.shop_coupons as any)[Number(shopId)])) || payload.coupon_code;
        const couponData = assignedCode ? couponsMap.get(String(assignedCode).toUpperCase().trim()) : null;

        if (couponData && couponData.active !== false) {
          const couponShop = couponData.shopId ? String(couponData.shopId) : null;
          if (!couponShop || couponShop === String(shopId)) {
            const minOrder = Number(couponData.minOrder ?? couponData.min_order_amount ?? 0);
            if (subtotal >= minOrder) {
              appliedCoupon = couponData.code || String(assignedCode).toUpperCase().trim();
              const cType = String(couponData.type || '').toLowerCase();
              const val = Number(couponData.value || 0);
              const maxDisc = Number(couponData.maxDiscount ?? couponData.max_discount ?? Infinity);
              if (cType === 'freeship' || cType === 'shipping') {
                discount = Math.min(shippingFee, isFinite(maxDisc) ? maxDisc : 30000);
              } else if (cType === 'percent') {
                discount = Math.min(Math.round((subtotal * val) / 100), maxDisc);
              } else {
                discount = Math.min(val, subtotal);
              }
            }
          }
        }

        const total = Math.max(0, subtotal + shippingFee - discount);

        let cardBrand: string | null = null;
        let cardLast4: string | null = null;
        let cardType: 'intl' | 'domestic' | null = null;

        if (payload.payment_method !== 'cod') {
          const info = payload.card_info || ({} as any);
          const cType = String(info.card_type || '');
          if (cType.toLowerCase().includes('napas') || payload.payment_method === 'napas') {
            cardType = 'domestic';
            cardBrand = cType || 'NAPAS';
          } else {
            cardType = 'intl';
            cardBrand = cType || 'Visa';
          }
          const rawNum = String(info.number || (payload as any).card_last4 || '');
          cardLast4 = (payload as any).card_last4 || rawNum.replace(/\D/g, '').slice(-4) || '1111';
        }

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
          cardBrand,
          cardLast4,
          cardType,
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

        for (const it of orderItems) {
          const pRef = doc(db, 'products', it.productId);
          txn.update(pRef, {
            stock: increment(-it.qty),
            sold: increment(it.qty),
            updatedAt: serverTimestamp()
          });

          if (it.offerId) {
            txn.update(doc(db, 'offers', it.offerId), {
              status: 'used',
              orderCode,
              usedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
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
          fromUid: cur.uid,
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
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const orderRef = doc(db, 'orders', String(code));

    const statusText = (event.status || event.label || event.event || '').trim();
    const isHandover = statusText === 'Đã bàn giao cho đơn vị vận chuyển' || event.event === 'dispatched' || statusText.toLowerCase().includes('bàn giao');
    const isDelivered = statusText === 'Giao hàng thành công' || event.event === 'delivered' || statusText.toLowerCase().includes('giao hàng thành công');

    let updatedStatus: string = '';
    let buyerUid: string = '';
    let shopName: string = '';
    let orderCodeStr: string = '';

    await runTransaction(db, async (txn) => {
      const snap = await txn.get(orderRef);
      if (!snap.exists()) throw new Error('Đơn không tồn tại');
      const oData = snap.data();
      const currentStatus = oData.status;
      buyerUid = oData.buyerUid;
      shopName = oData.shopName || cur.shop_name || 'Người bán';
      orderCodeStr = oData.code || String(code);

      if (isHandover) {
        if (currentStatus !== 'confirmed') {
          throw new Error('Chỉ có thể bàn giao khi đơn hàng ở trạng thái Đã xác nhận');
        }
        updatedStatus = 'shipping';
      } else if (isDelivered) {
        if (currentStatus !== 'shipping') {
          throw new Error('Đơn hàng phải đang trong trạng thái Đang giao hàng trước khi báo giao thành công');
        }
        updatedStatus = 'delivered';
      } else {
        if (currentStatus === 'confirmed') {
          throw new Error('Hãy báo cáo Đã bàn giao cho đơn vị vận chuyển trước');
        }
        if (currentStatus !== 'shipping') {
          throw new Error('Đơn hàng không ở trạng thái giao hàng');
        }
        updatedStatus = 'shipping';
      }

      const events = oData.shipmentEvents || [];
      const newEvent = {
        event: event.event || (isHandover ? 'dispatched' : isDelivered ? 'delivered' : 'in_transit'),
        label: statusText || (isHandover ? 'Đã bàn giao cho đơn vị vận chuyển' : isDelivered ? 'Giao hàng thành công' : 'Đang vận chuyển'),
        location: event.location || 'Bưu cục trung tâm',
        note: event.note || statusText,
        at: new Date().toISOString()
      };
      events.push(newEvent);

      const logs = oData.logs || [];
      logs.push({
        status: updatedStatus,
        actorRole: 'seller',
        actorName: shopName,
        note: event.note || statusText,
        at: new Date().toISOString()
      });

      const updates: any = {
        status: updatedStatus,
        shipmentEvents: events,
        logs,
        updatedAt: serverTimestamp()
      };

      if (isDelivered) {
        updates.deliveredAt = new Date().toISOString();
        if (oData.paymentMethod === 'cod') {
          updates.paymentStatus = 'paid';
        }
      }

      txn.update(orderRef, updates);
    });

    if (buyerUid) {
      try {
        const notifId = `notif_ship_${code}_${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          toUid: buyerUid,
          fromUid: cur.uid,
          type: 'order_status',
          title: `Cập nhật vận chuyển: #${orderCodeStr}`,
          body: `${statusText} · ${event.location || ''} ${event.note ? `(${event.note})` : ''}`.trim(),
          link: `/orders/${orderCodeStr}`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Failed to send shipment notif to buyer:', e);
      }
    }

    return { message: 'Đã cập nhật mốc vận chuyển thành công' };
  }

  // --- OFFERS (TRẢ GIÁ) ---

  async getOffers(): Promise<{ offers: Offer[] }> {
    const cur = getCurrentUser();
    if (!cur) return { offers: [] };

    const db = getActiveFirestore();
    const q = query(collection(db, 'offers'), where('buyerUid', '==', cur.uid));
    const snap = await getDocs(q);

    const offers: Offer[] = [];
    const now = Date.now();

    for (const d of snap.docs) {
      const data = d.data();
      let status = data.status;
      const isPast24h = data.expiresAt
        ? new Date(data.expiresAt).getTime() < now
        : (data.createdAt?.toDate ? now - data.createdAt.toDate().getTime() > 24 * 3600 * 1000 : false);

      if (status === 'pending' && isPast24h) {
        status = 'expired';
        try {
          await updateDoc(doc(db, 'offers', d.id), { status: 'expired', updatedAt: serverTimestamp() });
          await setDoc(doc(db, 'notifications', `notif_exp_${d.id}`), {
            toUid: cur.uid,
            fromUid: cur.uid,
            type: 'offer_expired',
            title: 'Lời trả giá đã hết hạn',
            body: `Lời trả giá cho món "${data.productName}" đã hết hạn sau 24 giờ. Bạn có thể trả giá lại.`,
            link: `/product/${data.productId}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch {}
      }

      const pid = String(data.productId ?? data.product_id ?? '');
      const seedProd = (SEED_MEDIA_DEFAULTS.products as any)[pid];
      const rawImg = data.productImage || data.product_image;
      const effectiveImg = (rawImg && isValidImageSrc(rawImg) && !rawImg.startsWith('data:image/svg+xml'))
        ? rawImg
        : (seedProd?.thumb || (seedProd?.images && seedProd.images[0]) || (rawImg && isValidImageSrc(rawImg) ? rawImg : ''));

      offers.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        seller_id: data.sellerUid as any,
        buyer_id: data.buyerUid as any,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone || '',
        product_id: data.productId as any,
        product_name: data.productName,
        product_image: effectiveImg,
        original_price: Number(data.originalPrice || 0),
        offered_price: Number(data.offeredPrice || data.price || 0),
        counter_price: data.counterPrice != null ? Number(data.counterPrice) : undefined,
        price: Number(data.offeredPrice || data.price || 0),
        status,
        expires_at: data.expiresAt,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    }

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
    const now = Date.now();

    for (const d of snap.docs) {
      const data = d.data();
      let status = data.status;
      const isPast24h = data.expiresAt
        ? new Date(data.expiresAt).getTime() < now
        : (data.createdAt?.toDate ? now - data.createdAt.toDate().getTime() > 24 * 3600 * 1000 : false);

      if (status === 'pending' && isPast24h) {
        status = 'expired';
        try {
          await updateDoc(doc(db, 'offers', d.id), { status: 'expired', updatedAt: serverTimestamp() });
          await setDoc(doc(db, 'notifications', `notif_exp_${d.id}`), {
            toUid: data.buyerUid,
            fromUid: cur.uid,
            type: 'offer_expired',
            title: 'Lời trả giá đã hết hạn',
            body: `Lời trả giá cho món "${data.productName}" đã hết hạn sau 24 giờ. Bạn có thể trả giá lại.`,
            link: `/product/${data.productId}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch {}
      }

      const pid = String(data.productId ?? data.product_id ?? '');
      const seedProd = (SEED_MEDIA_DEFAULTS.products as any)[pid];
      const rawImg = data.productImage || data.product_image;
      const effectiveImg = (rawImg && isValidImageSrc(rawImg) && !rawImg.startsWith('data:image/svg+xml'))
        ? rawImg
        : (seedProd?.thumb || (seedProd?.images && seedProd.images[0]) || (rawImg && isValidImageSrc(rawImg) ? rawImg : ''));

      offers.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        seller_id: data.sellerUid as any,
        buyer_id: data.buyerUid as any,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone || '',
        product_id: data.productId as any,
        product_name: data.productName,
        product_image: effectiveImg,
        original_price: Number(data.originalPrice || 0),
        offered_price: Number(data.offeredPrice || data.price || 0),
        counter_price: data.counterPrice != null ? Number(data.counterPrice) : undefined,
        price: Number(data.offeredPrice || data.price || 0),
        status,
        expires_at: data.expiresAt,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    }

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
    const now = Date.now();
    for (const d of existingSnap.docs) {
      const data = d.data();
      if (String(data.productId) === pid && (data.status === 'pending' || data.status === 'countered')) {
        const isPast24h = data.expiresAt
          ? new Date(data.expiresAt).getTime() < now
          : (data.createdAt?.toDate ? now - data.createdAt.toDate().getTime() > 24 * 3600 * 1000 : false);
        if (data.status === 'pending' && isPast24h) {
          try {
            await updateDoc(doc(db, 'offers', d.id), { status: 'expired', updatedAt: serverTimestamp() });
          } catch {}
          continue;
        }
        throw new Error('Bạn đang có một lời trả giá chờ phản hồi cho món này');
      }
    }

    const offerId = `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const seedProd = (SEED_MEDIA_DEFAULTS.products as any)[pid];
    const pImg = prod.thumb || (Array.isArray(prod.images) ? prod.images[0] : null) || seedProd?.thumb || (seedProd?.images && seedProd.images[0]) || prod.imageUrl || '';

    const offerDoc = {
      productId: pid,
      productName: prod.name,
      productImage: pImg,
      shopId: prod.shopId || 'do-cu-con-thuong',
      sellerUid: prod.ownerUid || 'seller_admin',
      buyerUid: cur.uid,
      buyerName: cur.full_name,
      buyerPhone: cur.phone || '',
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
        buyer_phone: cur.phone || '',
        product_id: pid as any,
        product_name: prod.name,
        product_image: pImg,
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
          const rawImg = data.productImage || data.product_image;
          const seedProd = (SEED_MEDIA_DEFAULTS.products as any)[String(data.productId)];
          const effectiveImg = (rawImg && isValidImageSrc(rawImg) && !rawImg.startsWith('data:image/svg+xml'))
            ? rawImg
            : (seedProd?.thumb || (seedProd?.images && seedProd.images[0]) || (rawImg && isValidImageSrc(rawImg) ? rawImg : ''));

          activeOffer = {
            id: d.id as any,
            shop_id: data.shopId as any,
            seller_id: data.sellerUid as any,
            buyer_id: data.buyerUid as any,
            buyer_name: data.buyerName,
            product_id: data.productId as any,
            product_name: data.productName,
            product_image: effectiveImg,
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
      const agreedPrice = data.counterPrice != null ? Number(data.counterPrice) : Number(data.offeredPrice || data.price || 0);
      await this.addToCart(data.productId, 1, String(offerId), agreedPrice);
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
    video_id?: string;
    videoId?: string;
    video_thumb?: string;
    videoThumb?: string;
    video_duration?: number;
    videoDuration?: number;
    anonymous?: boolean;
    is_anonymous?: boolean;
  }): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    const pid = String(payload.product_id);
    const orderCode = String(payload.order_id);

    // Up to 5 compressed images (<110KB each, total <700KB)
    const rawImages = (payload.images || []).slice(0, 5);
    const compressedImages = await validateAndNormalizeReviewImages(rawImages);

    let videoId = payload.videoId || payload.video_id || null;
    const videoThumb = payload.videoThumb || payload.video_thumb || (compressedImages[0] || null);
    const videoDuration = Number(payload.videoDuration || payload.video_duration || 0);

    if (payload.video_blob && !videoId) {
      const up = await uploadReviewVideo(payload.video_blob, videoDuration);
      videoId = up.mediaId;
    }

    const reviewId = `${orderCode}_${pid}`;
    const pSnap = await getDoc(doc(db, 'products', pid));
    const pData = pSnap.exists() ? pSnap.data() : { shopId: 'do-cu-con-thuong', ownerUid: 'seller_admin' };
    const pName = pData.name || '';
    const pImg = (pData.images && pData.images[0]) || pData.imageUrl || '';
    const isAnon = !!(payload as any).is_anonymous || !!(payload as any).anonymous;

    const reviewDoc = {
      orderId: orderCode,
      productId: pid,
      productName: pName,
      productImage: pImg,
      shopId: pData.shopId || 'do-cu-con-thuong',
      sellerUid: pData.ownerUid || 'seller_admin',
      buyerUid: cur.uid,
      buyerDisplayName: cur.full_name,
      anonymous: isAnon,
      rating: Number(payload.rating),
      tags: payload.tags || [],
      comment: payload.comment,
      images: compressedImages,
      videoId: videoId || null,
      videoThumb: videoThumb || null,
      videoDuration: videoDuration || 0,
      videoLocalId: videoId || null,
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
      const reviewRef = doc(db, 'reviews', reviewId);
      const prodRef = doc(db, 'products', pid);
      const shopRef = doc(db, 'shops', pData.shopId || 'do-cu-con-thuong');

      // 1. ALL READS:
      const rSnap = await txn.get(reviewRef);
      const prSnap = await txn.get(prodRef);
      const shSnap = await txn.get(shopRef);

      // 2. VALIDATION & CALCULATIONS:
      if (rSnap.exists()) {
        throw new Error('Bạn đã đánh giá món này rồi');
      }

      let newProdCount = 1;
      let newProdAvg = Number(payload.rating);
      if (prSnap.exists()) {
        const curCount = Number(prSnap.data().ratingCount || 0);
        const curAvg = Number(prSnap.data().ratingAvg || 0);
        newProdCount = curCount + 1;
        newProdAvg = Number(((curAvg * curCount + payload.rating) / newProdCount).toFixed(1));
      }

      let newShopCount = 1;
      let newShopAvg = Number(payload.rating);
      if (shSnap.exists()) {
        const curCount = Number(shSnap.data().ratingCount || 0);
        const curAvg = Number(shSnap.data().ratingAvg || 0);
        newShopCount = curCount + 1;
        newShopAvg = Number(((curAvg * curCount + payload.rating) / newShopCount).toFixed(1));
      }

      // 3. ALL WRITES:
      txn.set(reviewRef, reviewDoc);

      if (prSnap.exists()) {
        txn.update(prodRef, {
          ratingCount: newProdCount,
          ratingAvg: newProdAvg
        });
      }

      if (shSnap.exists()) {
        txn.update(shopRef, {
          ratingCount: newShopCount,
          ratingAvg: newShopAvg
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
          product_name: data.productName || '',
          product_image: data.productImage || '',
          user_id: data.buyerUid,
          user_name: data.buyerDisplayName,
          buyer_name: data.buyerDisplayName,
          author_name: data.buyerDisplayName,
          is_anonymous: !!data.anonymous,
          rating: data.rating,
          tags: data.tags || [],
          comment: data.comment,
          images: data.images || [],
          video_url: data.videoId || data.videoLocalId || data.videoUrl || null,
          video_poster: data.videoThumb || null,
          video_id: data.videoId || null,
          videoId: data.videoId || null,
          video_thumb: data.videoThumb || null,
          videoThumb: data.videoThumb || null,
          video_duration: data.videoDuration || null,
          videoDuration: data.videoDuration || null,
          video_local_id: data.videoLocalId || null,
          helpful_count: data.helpfulCount || 0,
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
    const q = cur.shop_id
      ? query(collection(db, 'reviews'), where('shopId', '==', String(cur.shop_id)))
      : query(collection(db, 'reviews'), where('sellerUid', '==', cur.uid));
    const snap = await getDocs(q);

    // Cache missing product names/images for historical reviews
    const prodMap = new Map<string, { name: string; image: string }>();
    for (const d of snap.docs) {
      const data = d.data();
      const pid = String(data.productId || '');
      if ((!data.productName || !data.productImage) && pid && !prodMap.has(pid)) {
        try {
          const pSnap = await getDoc(doc(db, 'products', pid));
          if (pSnap.exists()) {
            const pInfo = pSnap.data();
            prodMap.set(pid, {
              name: pInfo.name || '',
              image: (pInfo.images && pInfo.images[0]) || pInfo.imageUrl || ''
            });
          }
        } catch {}
      }
    }

    const list: Review[] = [];
    let sum = 0;
    snap.forEach((d) => {
      const data = d.data();
      sum += Number(data.rating || 0);
      const pid = String(data.productId || '');
      const fallback = prodMap.get(pid);
      list.push({
        id: d.id as any,
        order_id: data.orderId,
        product_id: data.productId,
        product_name: data.productName || fallback?.name || '',
        product_image: data.productImage || fallback?.image || '',
        user_id: data.buyerUid,
        user_name: data.buyerDisplayName,
        buyer_name: data.buyerDisplayName,
        author_name: data.buyerDisplayName,
        is_anonymous: !!data.anonymous,
        rating: data.rating,
        tags: data.tags || [],
        comment: data.comment,
        images: data.images || [],
        video_url: data.videoId || data.videoLocalId || data.videoUrl || null,
        video_poster: data.videoThumb || null,
        video_id: data.videoId || null,
        videoId: data.videoId || null,
        video_thumb: data.videoThumb || null,
        videoThumb: data.videoThumb || null,
        video_duration: data.videoDuration || null,
        videoDuration: data.videoDuration || null,
        video_local_id: data.videoLocalId || null,
        helpful_count: data.helpfulCount || 0,
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

  async getPublicShopReviews(shopSlugOrId: string | number): Promise<{ reviews: Review[]; avg: number; total: number; distribution: Record<string, number> }> {
    const db = getActiveFirestore();
    const strSlug = String(shopSlugOrId);
    const q = query(collection(db, 'reviews'), where('shopId', '==', strSlug));
    const snap = await getDocs(q);

    const prodMap = new Map<string, { name: string; image: string }>();
    for (const d of snap.docs) {
      const data = d.data();
      const pid = String(data.productId || '');
      if ((!data.productName || !data.productImage) && pid && !prodMap.has(pid)) {
        try {
          const pSnap = await getDoc(doc(db, 'products', pid));
          if (pSnap.exists()) {
            const pInfo = pSnap.data();
            prodMap.set(pid, {
              name: pInfo.name || '',
              image: (pInfo.images && pInfo.images[0]) || pInfo.imageUrl || ''
            });
          }
        } catch {}
      }
    }

    const list: Review[] = [];
    let sum = 0;
    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    snap.forEach((d) => {
      const data = d.data();
      if (data.hidden) return;
      const rating = Number(data.rating || 0);
      sum += rating;
      const k = String(rating);
      if (dist[k] !== undefined) dist[k]++;

      const pid = String(data.productId || '');
      const fallback = prodMap.get(pid);
      list.push({
        id: d.id as any,
        order_id: data.orderId,
        product_id: data.productId,
        product_name: data.productName || fallback?.name || '',
        product_image: data.productImage || fallback?.image || '',
        user_id: data.buyerUid,
        user_name: data.buyerDisplayName,
        buyer_name: data.buyerDisplayName,
        author_name: data.buyerDisplayName,
        is_anonymous: !!data.anonymous,
        rating,
        tags: data.tags || [],
        comment: data.comment || '',
        images: data.images || [],
        video_url: data.videoId || data.videoLocalId || data.videoUrl || null,
        video_poster: data.videoThumb || null,
        video_id: data.videoId || null,
        videoId: data.videoId || null,
        video_thumb: data.videoThumb || null,
        videoThumb: data.videoThumb || null,
        video_duration: data.videoDuration || null,
        videoDuration: data.videoDuration || null,
        video_local_id: data.videoLocalId || null,
        helpful_count: data.helpfulCount || 0,
        seller_reply: data.sellerReply?.text || (typeof data.sellerReply === 'string' ? data.sellerReply : null),
        seller_reply_at: data.sellerReply?.at || null,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
      });
    });

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = list.length;
    const avg = total > 0 ? Number((sum / total).toFixed(1)) : 0;
    return { reviews: list, avg, total, distribution: dist };
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
  }): Promise<{ message: string; return_request: ReturnRequest }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Chưa đăng nhập');

    const db = getActiveFirestore();
    let orderDocKey = String(payload.order_id);
    let orderSnap = await getDoc(doc(db, 'orders', orderDocKey));

    if (!orderSnap.exists()) {
      // Try finding by code
      const q = query(collection(db, 'orders'), where('code', '==', orderDocKey));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        orderSnap = qSnap.docs[0];
        orderDocKey = orderSnap.id;
      } else {
        throw new Error('Đơn hàng không tồn tại');
      }
    }

    const oData = orderSnap.data();
    if (!oData) {
      throw new Error('Không tìm thấy dữ liệu đơn hàng');
    }
    const orderCode = oData.code || orderDocKey;
    const retId = `ret_${orderCode}`;

    // Prevent duplicate return requests
    const existingRet = await getDoc(doc(db, 'returns', retId));
    if (existingRet.exists()) {
      throw new Error('Đơn này đã có yêu cầu trả hàng, vui lòng theo dõi tiến trình');
    }

    const compressedImages: string[] = [];
    for (const img of (payload.images || []).slice(0, 3)) {
      if (img.startsWith('data:image/svg+xml')) {
        compressedImages.push(img);
      } else {
        const c = await compressImage(img, 800, 120 * 1024);
        compressedImages.push(c);
      }
    }

    const normalizedItems = Array.isArray(oData.items) ? oData.items.map((it: any) => ({
      productId: it.productId ?? it.product_id,
      name: it.name || it.product_name || 'Sản phẩm',
      thumb: it.thumb || it.image_url || it.imageUrl || '',
      qty: Number(it.qty || it.quantity || 1),
      price: Number(it.price || 0)
    })) : [];

    const refundAmount = Number(oData.total || 0);

    const retDoc = {
      orderId: orderCode,
      orderCode: orderCode,
      buyerUid: cur.uid,
      buyerName: oData.receiver || oData.buyerName || cur.full_name || 'Khách hàng',
      buyerPhone: oData.phone || oData.buyerPhone || cur.phone || '',
      shopId: oData.shopId || 'do-cu-con-thuong',
      sellerUid: oData.sellerUid || '',
      items: normalizedItems,
      refundAmount,
      reason: payload.reason,
      detail: payload.detail || payload.description || '',
      images: compressedImages,
      status: 'pending',
      sellerNote: null,
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

    // Update order document with returnStatus & returnRequest & log
    const orderLogs = oData.logs || [];
    orderLogs.push({
      status: oData.status,
      actorRole: 'buyer',
      actorName: cur.full_name,
      note: `Khách gửi yêu cầu trả hàng: ${payload.reason}`,
      at: new Date().toISOString()
    });

    await updateDoc(doc(db, 'orders', orderDocKey), {
      returnStatus: 'pending',
      returnRequest: {
        id: retId,
        status: 'pending',
        reason: payload.reason,
        detail: payload.detail || payload.description || '',
        refundAmount,
        images: compressedImages,
        createdAt: new Date().toISOString()
      },
      logs: orderLogs,
      updatedAt: serverTimestamp()
    });

    // Notify seller
    if (oData.sellerUid) {
      try {
        await setDoc(doc(db, 'notifications', `notif_ret_${orderCode}_${Date.now()}`), {
          toUid: oData.sellerUid,
          fromUid: cur.uid,
          type: 'order_status',
          title: `Yêu cầu trả hàng: #${orderCode}`,
          body: `Khách ${cur.full_name} đã gửi yêu cầu trả hàng/hoàn tiền (${refundAmount.toLocaleString('vi-VN')}đ).`,
          link: `/seller`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch {}
    }

    const returnRequestObj: ReturnRequest = {
      id: retId as any,
      shop_id: oData.shopId || 'do-cu-con-thuong',
      order_id: orderCode,
      order_code: orderCode,
      buyer_id: cur.uid,
      buyer_name: oData.receiver || oData.buyerName || cur.full_name || 'Khách hàng',
      buyer_phone: oData.phone || oData.buyerPhone || cur.phone || '',
      product_id: normalizedItems[0]?.productId || 1,
      product_name: normalizedItems[0]?.name || 'Sản phẩm theo đơn',
      product_image: normalizedItems[0]?.thumb || '',
      reason: payload.reason,
      description: payload.detail || payload.description || '',
      images: compressedImages,
      status: 'pending',
      seller_note: null,
      refund_amount: refundAmount,
      refund_method: 'Ngân hàng / Ví điện tử',
      created_at: new Date().toISOString(),
      items: normalizedItems
    } as any;

    return { message: 'Đã gửi yêu cầu trả hàng', return_request: returnRequestObj };
  }

  async requestReturn(payload: any): Promise<{ message: string; return_request?: ReturnRequest }> {
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
      const firstItem = data.items?.[0];
      list.push({
        id: d.id as any,
        shop_id: data.shopId as any,
        order_id: data.orderId,
        order_code: data.orderCode || data.orderId,
        buyer_id: data.buyerUid,
        buyer_name: data.buyerName || 'Khách hàng',
        buyer_phone: data.buyerPhone || '',
        product_id: firstItem?.productId || 1,
        product_name: firstItem?.name || '',
        product_image: firstItem?.thumb || '',
        reason: data.reason,
        description: data.detail || '',
        images: data.images || [],
        status: data.status,
        seller_note: data.sellerNote || '',
        refund_amount: Number(data.refundAmount || 0),
        refund_method: 'Ngân hàng / Ví điện tử',
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        items: data.items || []
      } as any);
    });
    return { returns: list };
  }

  async getSellerReturns(): Promise<{ returns: ReturnRequest[]; return_requests: ReturnRequest[] }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') return { returns: [], return_requests: [] };
    const db = getActiveFirestore();
    const snap = await getDocs(collection(db, 'returns'));
    const list: ReturnRequest[] = [];
    const myUid = cur.uid;
    const myShopId = cur.shop_id ? String(cur.shop_id) : '';

    for (const d of snap.docs) {
      const data = d.data();
      const isMine = (data.sellerUid && String(data.sellerUid) === myUid) ||
                     (myShopId && String(data.shopId) === myShopId);
      if (isMine) {
        let buyerName = data.buyerName;
        let buyerPhone = data.buyerPhone;
        let items = data.items;
        let refundAmount = Number(data.refundAmount || 0);

        if (!buyerName || !buyerPhone || !items || !Array.isArray(items) || items.length === 0 || !refundAmount) {
          try {
            const orderDocKey = String(data.orderCode || data.orderId || d.id.replace(/^ret_/, ''));
            const oSnap = await getDoc(doc(db, 'orders', orderDocKey));
            if (oSnap.exists()) {
              const oData = oSnap.data();
              if (!buyerName) buyerName = oData.receiver || oData.buyerName || 'Khách hàng';
              if (!buyerPhone) buyerPhone = oData.phone || oData.buyerPhone || '';
              if (!items || !Array.isArray(items) || items.length === 0) {
                items = Array.isArray(oData.items) ? oData.items.map((it: any) => ({
                  productId: it.productId ?? it.product_id,
                  name: it.name || it.product_name || 'Sản phẩm',
                  thumb: it.thumb || it.image_url || it.imageUrl || '',
                  qty: Number(it.qty || it.quantity || 1),
                  price: Number(it.price || 0)
                })) : [];
              }
              if (!refundAmount) refundAmount = Number(oData.total || 0);
            }
          } catch {}
        }

        const firstItem = Array.isArray(items) ? items[0] : undefined;
        list.push({
          id: d.id as any,
          shop_id: data.shopId as any,
          order_id: data.orderId,
          order_code: data.orderCode || data.orderId || d.id.replace(/^ret_/, ''),
          buyer_id: data.buyerUid,
          buyer_name: buyerName || 'Khách hàng',
          buyer_phone: buyerPhone || '',
          product_id: firstItem?.productId || 1,
          product_name: firstItem?.name || 'Sản phẩm theo đơn',
          product_image: firstItem?.thumb || '',
          reason: data.reason,
          description: data.detail || data.description || '',
          images: data.images || [],
          status: data.status,
          seller_note: data.sellerNote || '',
          refund_amount: refundAmount,
          refund_method: 'Ngân hàng / Ví điện tử',
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          items: items || []
        } as any);
      }
    }

    list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return { returns: list, return_requests: list };
  }

  async updateReturnStatus(id: number | string, payload: { status: string; seller_note?: string }): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      throw new Error('Chỉ người bán mới được cập nhật yêu cầu trả hàng');
    }

    const db = getActiveFirestore();
    const retRef = doc(db, 'returns', String(id));
    const retSnap = await getDoc(retRef);
    if (!retSnap.exists()) {
      throw new Error('Yêu cầu trả hàng không tồn tại');
    }

    const rData = retSnap.data();
    const orderDocKey = String(rData.orderId || rData.orderCode);
    const orderRef = doc(db, 'orders', orderDocKey);
    const orderSnap = await getDoc(orderRef);
    const oData = orderSnap.exists() ? orderSnap.data() : null;

    const buyerUid = rData.buyerUid || oData?.buyerUid;
    const orderCode = rData.orderCode || rData.orderId;
    const refundAmount = Number(rData.refundAmount || oData?.total || 0);

    const stepLabels: Record<string, string> = {
      approved: 'Shop đã duyệt yêu cầu trả hàng',
      shipping_back: 'Đang chuyển trả hàng về kho shop',
      received: 'Shop đã nhận kiện hàng về kho',
      refunded: `Shop đã hoàn tiền ${refundAmount.toLocaleString('vi-VN')}đ và nhận lại hàng về kho`,
      rejected: `Shop đã từ chối yêu cầu: ${payload.seller_note || 'Không đủ điều kiện'}`
    };

    const statusNote = stepLabels[payload.status] || `Cập nhật trạng thái trả hàng: ${payload.status}`;

    if (payload.status === 'refunded') {
      // Step: "Hoàn tiền & khôi phục tồn kho" - runTransaction to update stock & order status atomically
      await runTransaction(db, async (txn) => {
        const tOrderSnap = await txn.get(orderRef);
        if (!tOrderSnap.exists()) throw new Error('Đơn hàng không tồn tại');
        const tOData = tOrderSnap.data();

        // 1. Restore stock and reduce sold for each item in the order
        const itemsToRestore = rData.items && rData.items.length > 0 ? rData.items : (tOData.items || []);
        for (const it of itemsToRestore) {
          const pid = String(it.productId ?? it.product_id ?? '');
          if (pid) {
            const pRef = doc(db, 'products', pid);
            const pSnap = await txn.get(pRef);
            if (pSnap.exists()) {
              const currentStock = Number(pSnap.data().stock ?? 0);
              const currentSold = Number(pSnap.data().sold ?? 0);
              const qty = Number(it.qty || it.quantity || 1);
              txn.update(pRef, {
                stock: currentStock + qty,
                sold: Math.max(0, currentSold - qty),
                updatedAt: serverTimestamp()
              });
            }
          }
        }

        // 2. Update order status to 'returned', paymentStatus to 'refunded', returnStatus to 'refunded'
        const logs = tOData.logs || [];
        logs.push({
          status: 'returned',
          actorRole: 'seller',
          actorName: cur.shop_name || cur.full_name,
          note: statusNote,
          at: new Date().toISOString()
        });

        txn.update(orderRef, {
          status: 'returned',
          paymentStatus: 'refunded',
          returnStatus: 'refunded',
          'returnRequest.status': 'refunded',
          'returnRequest.sellerNote': payload.seller_note || null,
          logs,
          updatedAt: serverTimestamp()
        });

        // 3. Update return doc to 'refunded'
        txn.update(retRef, {
          status: 'refunded',
          sellerNote: payload.seller_note || null,
          updatedAt: serverTimestamp()
        });
      });

      // Send completion notification to buyer
      if (buyerUid) {
        try {
          await setDoc(doc(db, 'notifications', `notif_ret_done_${orderCode}_${Date.now()}`), {
            toUid: buyerUid,
            fromUid: cur.uid,
            type: 'order_status',
            title: `Hoàn tất trả hàng #${orderCode}`,
            body: `Yêu cầu trả hàng đơn #${orderCode} đã hoàn tất. Bạn đã được hoàn ${refundAmount.toLocaleString('vi-VN')}đ.`,
            link: `/orders/${orderCode}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch {}
      }

      return { message: 'Đã hoàn tiền và khôi phục tồn kho thành công' };
    } else {
      // Normal return stage update: approved, shipping_back, received, rejected
      await updateDoc(retRef, {
        status: payload.status,
        sellerNote: payload.seller_note || null,
        updatedAt: serverTimestamp()
      });

      if (orderSnap.exists()) {
        const logs = oData?.logs || [];
        logs.push({
          status: oData?.status || 'shipping',
          actorRole: 'seller',
          actorName: cur.shop_name || cur.full_name,
          note: statusNote,
          at: new Date().toISOString()
        });

        await updateDoc(orderRef, {
          returnStatus: payload.status,
          'returnRequest.status': payload.status,
          'returnRequest.sellerNote': payload.seller_note || null,
          logs,
          updatedAt: serverTimestamp()
        });
      }

      if (buyerUid) {
        try {
          const notifMsg = payload.status === 'rejected'
            ? `Shop đã từ chối yêu cầu trả hàng đơn #${orderCode}: ${payload.seller_note || ''}`
            : `Đơn #${orderCode}: ${statusNote}`;

          await setDoc(doc(db, 'notifications', `notif_ret_${payload.status}_${orderCode}_${Date.now()}`), {
            toUid: buyerUid,
            fromUid: cur.uid,
            type: 'order_status',
            title: `Cập nhật trả hàng #${orderCode}`,
            body: notifMsg,
            link: `/orders/${orderCode}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch {}
      }

      return { message: 'Đã cập nhật trạng thái yêu cầu trả hàng' };
    }
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
      const shopAvatar = data.shopAvatar && !data.shopAvatar.includes('unsplash.com')
        ? data.shopAvatar
        : createShopAvatarSvg(data.shopName || 'Shop', '#08482D', data.shopId);
      list.push({
        id: d.id as any,
        buyer_id: data.buyerUid as any,
        seller_id: data.sellerUid as any,
        shop_id: data.shopId as any,
        shop_name: data.shopName,
        shop_avatar: shopAvatar,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone || undefined,
        last_message: data.lastMessage,
        last_message_at: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : new Date().toISOString(),
        unread_count: cur.role === 'buyer' ? data.buyerUnread || 0 : data.sellerUnread || 0,
        buyer_unread: data.buyerUnread || 0,
        seller_unread: data.sellerUnread || 0,
        created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    list.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    return { conversations: list };
  }

  async startShopChat(
    shopId: number | string,
    context?: {
      type?: 'product' | 'order' | string;
      kind?: 'product' | 'order' | string;
      refId?: string | number;
      product_id?: number | string;
      order_code?: string;
      order_id?: number | string;
      title?: string;
      price?: number;
      status?: string;
      initial_message?: string;
    }
  ): Promise<{ conversation: ChatConversation; created: boolean }> {
    const cur = getCurrentUser();
    if (!cur) throw new Error('Vui lòng đăng nhập');

    const db = getActiveFirestore();
    const sDocId = String(shopId);
    let sData: any = null;
    let actualShopId = sDocId;
    const sSnap = await getDoc(doc(db, 'shops', sDocId));
    if (sSnap.exists()) {
      sData = sSnap.data();
      actualShopId = sSnap.id;
    } else {
      const { shops } = await this.getShops();
      const found = shops.find((s) => s.slug === sDocId || String(s.id) === sDocId);
      if (found) {
        actualShopId = found.slug || String(found.id);
        sData = found;
      }
    }

    if (!sData) {
      throw new Error('Không tìm thấy cửa hàng');
    }

    const shopName = sData.name || 'Cửa hàng';
    const sellerUid = sData.ownerUid || sData.owner_id;
    if (!sellerUid) {
      throw new Error('Không tìm thấy chủ cửa hàng');
    }

    const shopAvatar = sData.avatar && !sData.avatar.includes('unsplash.com') && !sData.avatar.includes('photo-1544816155-12df9643f363')
      ? sData.avatar
      : createShopAvatarSvg(shopName, sData.coverColor || '#08482D', actualShopId);

    const convId = `${cur.uid}_${actualShopId}`;
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);

    let created = false;
    if (!snap.exists()) {
      created = true;
      await setDoc(convRef, {
        buyerUid: cur.uid,
        buyerName: cur.full_name,
        buyerPhone: cur.phone || '',
        shopId: actualShopId,
        shopName,
        shopAvatar,
        sellerUid,
        lastMessage: context?.initial_message || (context?.type === 'product' ? 'Khách hỏi về sản phẩm' : 'Bắt đầu trò chuyện'),
        lastMessageAt: serverTimestamp(),
        buyerUnread: 0,
        sellerUnread: 0, // Requirement 4: initialize unread to 0
        createdAt: serverTimestamp()
      });
    } else {
      const existingData = snap.data();
      if (!existingData.shopAvatar || existingData.shopAvatar.includes('unsplash.com')) {
        await updateDoc(convRef, { shopAvatar });
      }
    }

    // Check if context is an order and if this conversation already has a context card for this order
    if (context && (context.kind === 'order' || context.type === 'order' || context.order_code)) {
      const targetRefId = String(context.refId || context.order_code || context.order_id);
      const msgsRef = collection(db, 'conversations', convId, 'messages');
      const msgSnap = await getDocs(msgsRef);
      const alreadyHasCard = msgSnap.docs.some(d => {
        const c = d.data().context;
        return c && (String(c.refId) === targetRefId || String(c.order_code) === targetRefId);
      });

      if (!alreadyHasCard) {
        let orderTitle = context.title || 'Đơn hàng';
        let orderPrice = Number(context.price || 0);
        let orderStatus = context.status || 'pending';
        if (!context.title) {
          try {
            const oSnap = await getDoc(doc(db, 'orders', targetRefId));
            if (oSnap.exists()) {
              const oData = oSnap.data();
              const oItems = oData.items || [];
              const firstItemName = oItems[0]?.name || oItems[0]?.product_name || oItems[0]?.productName || 'Đơn hàng';
              orderTitle = oItems.length > 1 ? `${firstItemName} +${oItems.length - 1} món khác` : firstItemName;
              orderPrice = Number(oData.total || 0);
              orderStatus = oData.status || orderStatus;
            }
          } catch {}
        }

        await this.sendMessage({
          conversation_id: convId,
          text: `Tôi cần hỗ trợ về đơn hàng #${targetRefId}`,
          context: {
            kind: 'order',
            refId: targetRefId,
            order_code: targetRefId,
            title: orderTitle,
            price: orderPrice,
            status: orderStatus
          }
        });
      }
    } else if (context && context.type === 'product' && context.product_id) {
      const targetPid = String(context.product_id);
      const msgsRef = collection(db, 'conversations', convId, 'messages');
      const msgSnap = await getDocs(msgsRef);
      const alreadyHasCard = msgSnap.docs.some(d => {
        const c = d.data().context;
        return c && (String(c.refId) === targetPid || String(c.product_id) === targetPid);
      });

      if (!alreadyHasCard) {
        let pName = 'Sản phẩm';
        let pPrice = 0;
        let pImg = '';
        try {
          const pSnap = await getDoc(doc(db, 'products', targetPid));
          if (pSnap.exists()) {
            pName = pSnap.data().name || pName;
            pPrice = Number(pSnap.data().price || 0);
            pImg = (pSnap.data().images && pSnap.data().images[0]) || pSnap.data().imageUrl || '';
          }
        } catch {}

        await this.sendMessage({
          conversation_id: convId,
          text: context.initial_message || `Tôi đang quan tâm đến "${pName}"`,
          context: {
            kind: 'product',
            refId: targetPid,
            product_id: targetPid,
            title: pName,
            price: pPrice,
            image: pImg
          }
        });
      }
    } else if (context?.initial_message && !created) {
      await this.sendMessage({
        conversation_id: convId,
        text: context.initial_message
      });
    }

    const { messages } = await this.getMessages(convId);
    const conv: ChatConversation = {
      id: convId as any,
      buyer_id: cur.uid as any,
      seller_id: sellerUid as any,
      shop_id: shopId as any,
      shop_name: shopName,
      shop_avatar: shopAvatar,
      buyer_name: cur.full_name,
      buyer_phone: cur.phone || '',
      last_message: context?.initial_message || 'Bắt đầu trò chuyện',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
      buyer_unread: 0,
      seller_unread: 0,
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
      buyer_phone: data.buyerPhone || '',
      last_message: data.lastMessage,
      last_message_at: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : new Date().toISOString(),
      unread_count: 0,
      buyer_unread: data.buyerUnread || 0,
      seller_unread: data.sellerUnread || 0,
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
      messages.push(mapChatMessageDoc(d.id, conversationId, d.data()));
    });

    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return { messages };
  }

  async sendMessage(payload: {
    conversation_id?: string;
    shop_id?: string | number;
    text?: string;
    type?: 'text' | 'context' | 'image';
    image?: string | null;
    width?: number | null;
    height?: number | null;
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

    const isImage = payload.type === 'image' || !!payload.image;
    const rawText = payload.text || '';
    const lastSummary = isImage ? '📷 Đã gửi một ảnh' : (rawText || 'Tin nhắn mới');

    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);

    let toUid = '';
    if (!convSnap.exists()) {
      const sDocId = String(payload.shop_id || '');
      let sData: any = null;
      let actualShopId = sDocId;
      if (sDocId) {
        const shopSnap = await getDoc(doc(db, 'shops', sDocId));
        if (shopSnap.exists()) {
          sData = shopSnap.data();
          actualShopId = shopSnap.id;
        } else {
          const { shops } = await this.getShops();
          const found = shops.find((s) => s.slug === sDocId || String(s.id) === sDocId);
          if (found) {
            actualShopId = found.slug || String(found.id);
            sData = found;
          }
        }
      }
      if (!sData) {
        throw new Error('Không tìm thấy cửa hàng');
      }
      toUid = sData.ownerUid || sData.owner_id;
      if (!toUid) {
        throw new Error('Không tìm thấy chủ cửa hàng');
      }

      await setDoc(convRef, {
        buyerUid: cur.uid,
        buyerName: cur.full_name,
        buyerPhone: cur.phone || '',
        shopId: actualShopId,
        shopName: sData.name || 'Cửa hàng',
        sellerUid: toUid,
        lastMessage: lastSummary,
        lastMessageAt: serverTimestamp(),
        buyerUnread: 0,
        sellerUnread: 1,
        createdAt: serverTimestamp()
      });
    } else {
      const data = convSnap.data();
      toUid = cur.role === 'buyer' ? data.sellerUid : data.buyerUid;
      await updateDoc(convRef, {
        lastMessage: lastSummary,
        lastMessageAt: serverTimestamp(),
        buyerUnread: cur.role === 'seller' ? increment(1) : 0,
        sellerUnread: cur.role === 'buyer' ? increment(1) : 0
      });
    }

    let resolvedContext = payload.context || null;
    if (resolvedContext) {
      const kind = resolvedContext.kind || resolvedContext.type || (resolvedContext.product_id ? 'product' : 'order');
      const refId = resolvedContext.refId || resolvedContext.product_id || resolvedContext.order_code;
      let title = resolvedContext.title || '';
      let price = resolvedContext.price;
      let image = resolvedContext.image || resolvedContext.image_url || '';

      if ((!title || !price || !image) && refId) {
        try {
          if (kind === 'product') {
            const pSnap = await getDoc(doc(db, 'products', String(refId)));
            if (pSnap.exists()) {
              const pData = pSnap.data();
              title = title || pData.name;
              price = price ?? pData.price;
              image = image || (pData.images?.[0] || '');
            }
          } else if (kind === 'order') {
            const oSnap = await getDoc(doc(db, 'orders', String(refId)));
            if (oSnap.exists()) {
              const oData = oSnap.data();
              title = title || `Đơn hàng #${refId}`;
              price = price ?? oData.total;
              image = image || (oData.items?.[0]?.image_url || '');
            }
          }
        } catch {}
      }

      const ctxObj: any = {
        kind,
        refId,
        title: title || '',
        price: Number(price ?? 0),
        image: image || ''
      };
      if (kind === 'product' && refId) {
        ctxObj.product_id = String(refId);
      } else if (kind === 'order' && refId) {
        ctxObj.order_code = String(refId);
      }
      resolvedContext = cleanObject(ctxObj);
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const msgDoc: any = {
      senderUid: cur.uid,
      senderRole: cur.role,
      type: isImage ? 'image' : (resolvedContext ? 'context' : 'text'),
      text: rawText,
      createdAt: serverTimestamp(),
      readAt: null
    };
    if (isImage) {
      msgDoc.image = payload.image || null;
      msgDoc.width = payload.width || null;
      msgDoc.height = payload.height || null;
    }
    if (resolvedContext) {
      msgDoc.context = resolvedContext;
    }

    await setDoc(doc(db, 'conversations', convId, 'messages', msgId), msgDoc);

    const notifId = `chat_${convId}_${toUid}`;
    await setDoc(
      doc(db, 'notifications', notifId),
      {
        toUid,
        fromUid: cur.uid,
        type: 'chat',
        title: `Tin nhắn mới từ ${cur.full_name}`,
        body: lastSummary,
        link: `/chat?conv=${convId}`,
        isRead: false,
        count: increment(1),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      message: mapChatMessageDoc(msgId, convId, {
        ...msgDoc,
        createdAt: new Date().toISOString()
      })
    };
  }

  async sendChatMessage(payload: any): Promise<{ message: ChatMessage }> {
    return this.sendMessage({
      conversation_id: payload.conversation_id ? String(payload.conversation_id) : undefined,
      shop_id: payload.shop_id,
      text: payload.content || payload.text || '',
      type: payload.type,
      image: payload.image,
      width: payload.width,
      height: payload.height,
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
    const q = cur.shop_id
      ? query(collection(db, 'coupons'), where('shopId', '==', String(cur.shop_id)))
      : query(collection(db, 'coupons'), where('ownerUid', '==', cur.uid));
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
    if (!cur.shop_id) {
      throw new Error('Vui lòng thiết lập thông tin shop trước khi tạo mã giảm giá');
    }

    const code = (data.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (!code || code.length < 4 || code.length > 15) {
      throw new Error('Mã giảm giá phải từ 4 đến 15 ký tự chữ hoa hoặc số (A-Z, 0-9)');
    }

    const type = data.type === 'shipping' ? 'freeship' : (data.type || 'percent');
    const val = Number(data.value || 0);
    const minOrder = Math.max(0, Number(data.min_order_amount || 0));
    const maxDiscount = Math.max(0, Number(data.max_discount || 0));

    if (type === 'percent') {
      if (val < 1 || val > 90) {
        throw new Error('Mức giảm theo phần trăm phải từ 1% đến 90%');
      }
    } else if (type === 'fixed') {
      if (val <= 0) {
        throw new Error('Số tiền giảm cố định phải lớn hơn 0đ');
      }
      if (minOrder > 0 && val >= minOrder) {
        throw new Error('Số tiền giảm cố định phải nhỏ hơn giá trị đơn hàng tối thiểu');
      }
    }

    const db = getActiveFirestore();
    const existingSnap = await getDoc(doc(db, 'coupons', code));
    if (existingSnap.exists()) {
      throw new Error('Mã này đã tồn tại, vui lòng chọn mã khác');
    }

    const couponDoc = {
      code,
      shopId: String(cur.shop_id),
      ownerUid: cur.uid,
      type,
      value: val,
      maxDiscount,
      minOrder,
      active: true,
      usedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'coupons', code), couponDoc);
    return { coupon: normalizeCouponDoc(couponDoc, code) };
  }

  async updateCoupon(code: string | number, data: any): Promise<{ coupon: Coupon; message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') throw new Error('Chỉ người bán mới được sửa mã');
    const db = getActiveFirestore();
    const strCode = String(code).toUpperCase().trim();
    const ref = doc(db, 'coupons', strCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Mã giảm giá không tồn tại');

    const cpnData = snap.data();
    if (cur.shop_id && String(cpnData.shopId) !== String(cur.shop_id) && cpnData.ownerUid !== cur.uid) {
      throw new Error('Bạn không có quyền sửa mã này');
    }

    const type = data.type === 'shipping' ? 'freeship' : (data.type || cpnData.type);
    const val = Number(data.value !== undefined ? data.value : cpnData.value);
    const minOrder = Math.max(0, Number(data.min_order_amount !== undefined ? data.min_order_amount : (cpnData.minOrder || 0)));
    const maxDiscount = Math.max(0, Number(data.max_discount !== undefined ? data.max_discount : (cpnData.maxDiscount || 0)));

    if (type === 'percent') {
      if (val < 1 || val > 90) {
        throw new Error('Mức giảm theo phần trăm phải từ 1% đến 90%');
      }
    } else if (type === 'fixed') {
      if (val <= 0) {
        throw new Error('Số tiền giảm cố định phải lớn hơn 0đ');
      }
      if (minOrder > 0 && val >= minOrder) {
        throw new Error('Số tiền giảm cố định phải nhỏ hơn giá trị đơn hàng tối thiểu');
      }
    }

    const updates: any = {
      type,
      value: val,
      minOrder,
      maxDiscount,
      updatedAt: serverTimestamp()
    };

    await updateDoc(ref, updates);
    return {
      coupon: normalizeCouponDoc({ ...cpnData, ...updates }, strCode),
      message: 'Cập nhật mã giảm giá thành công'
    };
  }

  async toggleCoupon(code: string | number): Promise<{ is_active: boolean; message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') throw new Error('Chỉ người bán mới được thao tác mã');
    const db = getActiveFirestore();
    const ref = doc(db, 'coupons', String(code));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Mã không tồn tại');

    const cpnData = snap.data();
    if (cur.shop_id && String(cpnData.shopId) !== String(cur.shop_id) && cpnData.ownerUid !== cur.uid) {
      throw new Error('Bạn không có quyền thao tác trên mã giảm giá này');
    }

    const current = snap.data().active !== false;
    await updateDoc(ref, { active: !current });
    return {
      is_active: !current,
      message: !current ? 'Đã kích hoạt mã giảm giá' : 'Đã tạm dừng mã giảm giá'
    };
  }

  async deleteCoupon(code: string | number): Promise<{ message: string }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') throw new Error('Chỉ người bán mới được xóa mã');
    const db = getActiveFirestore();
    const ref = doc(db, 'coupons', String(code));
    const snap = await getDoc(ref);
    if (!snap.exists()) return { message: 'Đã xóa mã' };

    const cpnData = snap.data();
    if (cur.shop_id && String(cpnData.shopId) !== String(cur.shop_id) && cpnData.ownerUid !== cur.uid) {
      throw new Error('Bạn không có quyền thao tác trên mã giảm giá này');
    }

    await deleteDoc(ref);
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

    if (raw.length === 1 && !raw[0].isDefault) {
      raw[0].isDefault = true;
    }
    const hasDefault = raw.some((a: any) => !!a.isDefault);
    if (!hasDefault && raw.length > 0) {
      raw[0].isDefault = true;
    }

    const list: Address[] = raw.map((a: any, idx: number) => ({
      id: a.id || idx + 1,
      user_id: cur.uid as any,
      recipient_name: a.receiver || a.recipient_name,
      phone: a.phone,
      address_line: a.address || a.address_line,
      is_default: Boolean(a.isDefault)
    }));

    // Default address sorted to top
    list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    return { addresses: list };
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
    const raw = uSnap.data()?.addresses || [];
    const deleting = raw.find((a: any) => a.id === id);
    const addresses = raw.filter((a: any) => a.id !== id);
    if (deleting?.isDefault && addresses.length > 0) {
      addresses[0].isDefault = true;
    }
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

  async uploadReviewVideo(
    blob: Blob,
    duration: number,
    onProgress?: (pct: number) => void,
    meta?: { productId?: string | number; orderId?: string | number; reviewId?: string; width?: number; height?: number; thumb?: string }
  ) {
    return uploadReviewVideo(blob, duration, onProgress, meta);
  }

  async deleteReviewMedia(mediaId: string): Promise<void> {
    return deleteReviewMedia(mediaId);
  }

  async getReviewVideoBlobUrl(mediaId: string): Promise<string> {
    return getReviewVideoBlobUrl(mediaId);
  }

  // --- SELLER STATS ---

  async getSellerStats(): Promise<{ stats: SellerStats }> {
    const cur = getCurrentUser();
    if (!cur || cur.role !== 'seller') {
      return {
        stats: {
          total_revenue: 0,
          total_orders: 0,
          status_counts: { pending: 0, confirmed: 0, shipping: 0, delivered: 0, completed: 0, cancelled: 0, returned: 0 },
          low_stock_count: 0,
          recent_orders: [],
          orders_pending: 0,
          orders_confirmed: 0,
          orders_shipping: 0,
          orders_completed: 0,
          orders_cancelled: 0,
          total_products: 0,
          rating_avg: 0,
          total_reviews: 0
        }
      };
    }

    const { orders } = await this.getSellerOrders('all');

    // Query products strictly belonging to this seller's shop or owned by seller
    const db = getActiveFirestore();
    const shopProducts: Product[] = [];
    if (cur.shop_id) {
      const qShop = query(collection(db, 'products'), where('shopId', '==', String(cur.shop_id)));
      const snap = await getDocs(qShop);
      snap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          shopProducts.push(normalizeProductDoc(data, d.id));
        }
      });
    } else {
      const qOwner = query(collection(db, 'products'), where('ownerUid', '==', cur.uid));
      const snap = await getDocs(qOwner);
      snap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          shopProducts.push(normalizeProductDoc(data, d.id));
        }
      });
    }

    let revenue = 0;
    let pending = 0;
    let confirmed = 0;
    let shipping = 0;
    let completed = 0;
    let cancelled = 0;
    let returned = 0;

    orders.forEach((o) => {
      const isRefundedOrReturned = o.status === 'returned' ||
                                  (o as any).status === 'refunded' ||
                                  o.payment_status === 'refunded' ||
                                  (o as any).return_status === 'refunded' ||
                                  (o as any).returnStatus === 'refunded';

      if ((o.status === 'completed' || o.payment_status === 'paid') && !isRefundedOrReturned) {
        const itemTotalAfterDiscount = Math.max(0, (o.subtotal || 0) - (o.discount_amount || (o as any).discount || 0));
        revenue += itemTotalAfterDiscount;
      }
      if (o.status === 'pending') pending++;
      else if (o.status === 'confirmed') confirmed++;
      else if (o.status === 'shipping') shipping++;
      else if (o.status === 'completed' && !isRefundedOrReturned) completed++;
      else if (o.status === 'returned' || isRefundedOrReturned) returned++;
      else if (o.status === 'cancelled') cancelled++;
    });

    let ratingAvg = 0;
    let totalReviews = 0;
    if (cur.shop_id) {
      try {
        const sSnap = await getDoc(doc(db, 'shops', String(cur.shop_id)));
        if (sSnap.exists()) {
          ratingAvg = Number(sSnap.data().ratingAvg || 0);
          totalReviews = Number(sSnap.data().ratingCount || 0);
        }
      } catch {}
    }

    // Tồn kho thấp: ≤ 1 món
    const lowStockCount = shopProducts.filter((p) => (p.stock || 0) <= 1).length;

    const stats: SellerStats = {
      total_revenue: revenue,
      total_orders: orders.length,
      status_counts: {
        pending,
        confirmed,
        shipping,
        delivered: 0,
        completed,
        cancelled,
        returned
      },
      low_stock_count: lowStockCount,
      recent_orders: orders.slice(0, 5),
      orders_pending: pending,
      orders_confirmed: confirmed,
      orders_shipping: shipping,
      orders_completed: completed,
      orders_cancelled: cancelled,
      orders_returned: returned,
      total_products: shopProducts.length,
      rating_avg: ratingAvg,
      total_reviews: totalReviews
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

    // Load any existing persistent backup media in seedMedia
    const seedMediaMap: Record<string, any> = {};
    try {
      const seedSnap = await getDocs(collection(db, 'seedMedia'));
      seedSnap.forEach((d) => {
        seedMediaMap[d.id] = d.data();
      });
    } catch (e) {
      console.warn('Could not read seedMedia in initMarketplace:', e);
    }

    onProgress?.('Tạo 3 shop mẫu...');
    const batch1 = writeBatch(db);

    const docuCover = seedMediaMap['shop_do-cu-con-thuong']?.coverImage || SEED_MEDIA_DEFAULTS.shops['do-cu-con-thuong'].coverImage;
    const gocCover = seedMediaMap['shop_goc-sach-nhac']?.coverImage || SEED_MEDIA_DEFAULTS.shops['goc-sach-nhac'].coverImage;
    const retroCover = seedMediaMap['shop_retro-tech']?.coverImage || SEED_MEDIA_DEFAULTS.shops['retro-tech'].coverImage;

    batch1.set(doc(db, 'shops', 'do-cu-con-thuong'), {
      slug: 'do-cu-con-thuong',
      ownerUid: adminUid,
      name: 'Đồ Cũ Còn Thương',
      description: 'Tiệm đồ second-hand có câu chuyện: thời trang, phụ kiện, đồ gia dụng đã kiểm định.',
      avatar: createShopAvatarSvg('Đồ Cũ Còn Thương', '#08482D'),
      coverColor: '#08482D',
      coverImage: docuCover,
      cover_image: docuCover,
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
      coverImage: gocCover,
      cover_image: gocCover,
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
      coverImage: retroCover,
      cover_image: retroCover,
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

    batch1.update(doc(db, 'users', adminUid), { shopId: 'do-cu-con-thuong' });
    batch1.update(doc(db, 'users', gocUid), { shopId: 'goc-sach-nhac' });
    batch1.update(doc(db, 'users', retroUid), { shopId: 'retro-tech' });

    await batch1.commit();

    onProgress?.('Tạo 10 sản phẩm mẫu...');
    const batch2 = writeBatch(db);

    const SAMPLE_PRODUCT_DEFECTS: Record<string, Array<{ location: string; description: string; text: string; image: string }>> = {
      prod_1: [
        { location: 'Khuỷu tay', description: 'Phai màu nhẹ tự nhiên ở hai khuỷu tay', text: 'Khuỷu tay: Phai màu nhẹ tự nhiên ở hai khuỷu tay', image: '' },
        { location: 'Gấu áo', description: 'Một sợi chỉ viền gấu bị sờn nhẹ, không bung', text: 'Gấu áo: Một sợi chỉ viền gấu bị sờn nhẹ, không bung', image: '' }
      ],
      prod_2: [
        { location: 'Quai xách', description: 'Sờn nhẹ ở mép quai do sử dụng', text: 'Quai xách: Sờn nhẹ ở mép quai do sử dụng', image: '' },
        { location: 'Đáy túi', description: 'Một vết xước mảnh dài khoảng 1cm', text: 'Đáy túi: Một vết xước mảnh dài khoảng 1cm', image: '' }
      ],
      prod_3: [
        { location: 'Mặt kính', description: 'Vài vết xước dăm rất nhỏ, chỉ thấy khi nghiêng dưới đèn', text: 'Mặt kính: Vài vết xước dăm rất nhỏ, chỉ thấy khi nghiêng dưới đèn', image: '' },
        { location: 'Dây kim loại', description: 'Mắt dây cuối có vết mờ nhẹ', text: 'Dây kim loại: Mắt dây cuối có vết mờ nhẹ', image: '' }
      ],
      prod_4: [
        { location: 'Vỏ ngoài', description: 'Một vết trầy nhỏ ở mặt sau thân nồi', text: 'Vỏ ngoài: Một vết trầy nhỏ ở mặt sau thân nồi', image: '' },
        { location: 'Tay cầm giỏ chiên', description: 'Mờ nhẹ lớp sơn ở chỗ cầm', text: 'Tay cầm giỏ chiên: Mờ nhẹ lớp sơn ở chỗ cầm', image: '' }
      ],
      prod_5: [
        { location: 'Gáy sách', description: 'Gáy hơi bạc màu', text: 'Gáy sách: Gáy hơi bạc màu', image: '' },
        { location: 'Trang giấy', description: 'Giấy ngả vàng, vài trang có gạch chân bút chì', text: 'Trang giấy: Giấy ngả vàng, vài trang có gạch chân bút chì', image: '' }
      ],
      prod_6: [
        { location: 'Mặt đàn', description: 'Hai vết xước nhỏ cạnh lỗ thoát âm do gảy pick', text: 'Mặt đàn: Hai vết xước nhỏ cạnh lỗ thoát âm do gảy pick', image: '' },
        { location: 'Cần đàn', description: 'Phím 1–3 hơi mòn nhẹ', text: 'Cần đàn: Phím 1–3 hơi mòn nhẹ', image: '' }
      ],
      prod_7: [
        { location: 'Thân máy', description: 'Tróc sơn nhẹ ở góc trên bên trái', text: 'Thân máy: Tróc sơn nhẹ ở góc trên bên trái', image: '' },
        { location: 'Ống ngắm', description: 'Có vài hạt bụi nhỏ, không ảnh hưởng ảnh chụp', text: 'Ống ngắm: Có vài hạt bụi nhỏ, không ảnh hưởng ảnh chụp', image: '' }
      ],
      prod_8: [
        { location: 'Viền nhôm', description: 'Cấn nhẹ ở góc dưới bên phải', text: 'Viền nhôm: Cấn nhẹ ở góc dưới bên phải', image: '' },
        { location: 'Pin', description: 'Dung lượng pin còn 84%', text: 'Pin: Dung lượng pin còn 84%', image: '' }
      ],
      prod_9: [
        { location: 'Vòm đầu', description: 'Lớp da trên vòm đầu hơi nhăn', text: 'Vòm đầu: Lớp da trên vòm đầu hơi nhăn', image: '' },
        { location: 'Hộp đựng', description: 'Hộp có vết bẩn nhẹ bên ngoài', text: 'Hộp đựng: Hộp có vết bẩn nhẹ bên ngoài', image: '' }
      ],
      prod_10: [
        { location: 'Keycap', description: 'Phím Space và Enter hơi bóng do dùng', text: 'Keycap: Phím Space và Enter hơi bóng do dùng', image: '' },
        { location: 'Cạnh khung', description: 'Một vết xước nhỏ ở cạnh trái', text: 'Cạnh khung: Một vết xước nhỏ ở cạnh trái', image: '' }
      ]
    };

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
      const defaultSeed = (SEED_MEDIA_DEFAULTS.products as any)[p.id];
      const seedProd = seedMediaMap[p.id];
      const prodImages = (seedProd?.images && Array.isArray(seedProd.images) && seedProd.images.length > 0)
        ? seedProd.images
        : (defaultSeed?.images || []);
      const prodThumb = seedProd?.thumb || (defaultSeed?.thumb || (prodImages[0] || ''));
      const prodImgUrl = prodImages[0] || '';

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
        defects: SAMPLE_PRODUCT_DEFECTS[p.id] || [{ text: p.note, image: '' }],
        inspection: {
          date: '2026-10-20',
          inspector: 'Trần Minh Tuấn (KTV Chuyên Sâu)',
          checks: [
            '✓ Hoạt động hoàn hảo mọi tính năng',
            '✓ Đã vệ sinh & khử khuẩn chuyên sâu',
            '✓ Đúng nguồn gốc và đúng như ảnh chụp thực tế'
          ]
        },
        images: prodImages,
        thumb: prodThumb,
        imageUrl: prodImgUrl,
        image_url: prodImgUrl,
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

  // --- SAMPLE MEDIA MANAGEMENT ---

  async getSeedMedia(): Promise<{
    products: Record<string, { images: string[]; thumb?: string }>;
    shops: Record<string, { coverImage: string }>;
  }> {
    const db = getActiveFirestore();
    const products: Record<string, { images: string[]; thumb?: string }> = {};
    const shops: Record<string, { coverImage: string }> = {};

    try {
      const snap = await getDocs(collection(db, 'seedMedia'));
      snap.forEach((d) => {
        const id = d.id;
        const data = d.data();
        if (id.startsWith('shop_')) {
          const slug = id.replace('shop_', '');
          shops[slug] = { coverImage: data.coverImage || data.cover_image || '' };
        } else {
          products[id] = { images: data.images || [], thumb: data.thumb || '' };
        }
      });
    } catch (err) {
      console.warn('Error reading seedMedia:', err);
    }

    return { products, shops };
  }

  async saveSampleMedia(
    payload: {
      products: Array<{ id: string; images: string[]; thumb?: string }> | Record<string, { images: string[]; thumb?: string }>;
      shops: Array<{ slug: string; coverImage: string }> | Record<string, { coverImage: string }>;
    },
    onProgress?: (msg: string, pct: number) => void
  ): Promise<{ message: string; updatedProducts: number; updatedShops: number }> {
    const cur = getCurrentUser();
    if (!cur || !cur.is_owner) {
      throw new Error('Chỉ tài khoản quản trị/gốc mới được cập nhật ảnh mẫu');
    }
    const db = getActiveFirestore();
    let updatedProducts = 0;
    let updatedShops = 0;

    const prodItems = Array.isArray(payload.products)
      ? payload.products
      : Object.entries(payload.products || {}).map(([id, d]) => ({ id, ...d }));

    const shopItems = Array.isArray(payload.shops)
      ? payload.shops
      : Object.entries(payload.shops || {}).map(([slug, d]) => ({ slug, ...d }));

    const total = prodItems.length + shopItems.length;
    let currentStep = 0;

    for (const p of prodItems) {
      currentStep++;
      onProgress?.(`Đang lưu ảnh sản phẩm ${p.id}...`, Math.round((currentStep / total) * 100));
      const ref = doc(db, 'products', p.id);
      const snap = await getDoc(ref);
      const images = p.images || [];
      const thumb = p.thumb || (images[0] || '');
      const imageUrl = images[0] || '';

      if (snap.exists()) {
        await updateDoc(ref, {
          images,
          thumb,
          imageUrl,
          image_url: imageUrl,
          updatedAt: serverTimestamp()
        });
        updatedProducts++;
      }

      // Save persistent backup to seedMedia
      await setDoc(
        doc(db, 'seedMedia', p.id),
        {
          productId: p.id,
          images,
          thumb,
          imageUrl,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    for (const s of shopItems) {
      currentStep++;
      onProgress?.(`Đang lưu ảnh bìa shop ${s.slug}...`, Math.round((currentStep / total) * 100));
      const ref = doc(db, 'shops', s.slug);
      const snap = await getDoc(ref);
      const coverImage = s.coverImage || '';

      if (snap.exists()) {
        await updateDoc(ref, {
          coverImage,
          cover_image: coverImage,
          updatedAt: serverTimestamp()
        });
        updatedShops++;
      }

      // Save persistent backup to seedMedia
      await setDoc(
        doc(db, 'seedMedia', `shop_${s.slug}`),
        {
          slug: s.slug,
          coverImage,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    return {
      message: `Đã cập nhật ảnh cho ${updatedProducts} sản phẩm, ${updatedShops} shop`,
      updatedProducts,
      updatedShops
    };
  }

  async applySeedPhotos(
    onProgress?: (msg: string, pct: number) => void
  ): Promise<{ message: string; updatedProducts: number; updatedShops: number }> {
    const cur = getCurrentUser();
    if (!cur || !cur.is_owner) {
      throw new Error('Chỉ tài khoản chủ/quản trị mới được cập nhật ảnh');
    }
    const db = getActiveFirestore();
    let updatedProducts = 0;
    let updatedShops = 0;

    const prodEntries = Object.entries(SEED_MEDIA_DEFAULTS.products);
    const shopEntries = Object.entries(SEED_MEDIA_DEFAULTS.shops);
    const total = prodEntries.length + shopEntries.length;
    let currentStep = 0;

    for (const [pid, pdata] of prodEntries) {
      currentStep++;
      onProgress?.(`Đang cập nhật ảnh sản phẩm ${pid}...`, Math.round((currentStep / total) * 100));
      const ref = doc(db, 'products', pid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          images: pdata.images,
          thumb: pdata.thumb,
          imageUrl: pdata.images[0] || '',
          image_url: pdata.images[0] || '',
          updatedAt: serverTimestamp()
        });
        updatedProducts++;
      }

      await setDoc(
        doc(db, 'seedMedia', pid),
        {
          productId: pid,
          images: pdata.images,
          thumb: pdata.thumb,
          imageUrl: pdata.images[0] || '',
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    for (const [slug, sdata] of shopEntries) {
      currentStep++;
      onProgress?.(`Đang cập nhật ảnh bìa shop ${slug}...`, Math.round((currentStep / total) * 100));
      const ref = doc(db, 'shops', slug);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          coverImage: sdata.coverImage,
          cover_image: sdata.coverImage,
          updatedAt: serverTimestamp()
        });
        updatedShops++;
      }

      await setDoc(
        doc(db, 'seedMedia', `shop_${slug}`),
        {
          slug,
          coverImage: sdata.coverImage,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    return {
      message: `Đã áp dụng ảnh có sẵn cho ${updatedProducts} sản phẩm và ${updatedShops} shop!`,
      updatedProducts,
      updatedShops
    };
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
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 400).forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    }

    // Clean all subcollection messages via collectionGroup
    try {
      const allMsgsSnap = await getDocs(collectionGroup(db, 'messages'));
      for (let i = 0; i < allMsgsSnap.docs.length; i += 400) {
        const msgBatch = writeBatch(db);
        allMsgsSnap.docs.slice(i, i + 400).forEach((md) => msgBatch.delete(md.ref));
        await msgBatch.commit();
      }
    } catch (e) {
      console.warn('Could not clear messages subcollection via collectionGroup:', e);
    }

    // Clean all subcollection chunks via collectionGroup
    try {
      const allChunksSnap = await getDocs(collectionGroup(db, 'chunks'));
      for (let i = 0; i < allChunksSnap.docs.length; i += 400) {
        const chunkBatch = writeBatch(db);
        allChunksSnap.docs.slice(i, i + 400).forEach((cd) => chunkBatch.delete(cd.ref));
        await chunkBatch.commit();
      }
    } catch (e) {
      console.warn('Could not clear chunks subcollection via collectionGroup:', e);
    }

    // Clear reviewMedia parent documents
    try {
      const rmSnap = await getDocs(collection(db, 'reviewMedia'));
      for (let i = 0; i < rmSnap.docs.length; i += 400) {
        const rmBatch = writeBatch(db);
        rmSnap.docs.slice(i, i + 400).forEach((d) => rmBatch.delete(d.ref));
        await rmBatch.commit();
      }
    } catch (e) {
      console.warn('Could not clear reviewMedia:', e);
    }

    // Reset user-specific volatile state on EVERY document in `users`
    // Requirement: đặt wishlist = [], followingShops = [], savedCoupons = []. KHÔNG xóa tài khoản, họ tên, số điện thoại, shopId và sổ địa chỉ.
    const usersSnap = await getDocs(collection(db, 'users'));
    for (let i = 0; i < usersSnap.docs.length; i += 400) {
      const uBatch = writeBatch(db);
      usersSnap.docs.slice(i, i + 400).forEach((uDoc) => {
        uBatch.update(uDoc.ref, {
          wishlist: [],
          followingShops: [],
          savedCoupons: [],
          updatedAt: serverTimestamp()
        });
      });
      await uBatch.commit();
    }

    const sampleProductIds = [
      'prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5',
      'prod_6', 'prod_7', 'prod_8', 'prod_9', 'prod_10'
    ];
    const initialStocks: Record<string, number> = {
      prod_1: 1, prod_2: 1, prod_3: 3, prod_4: 1, prod_5: 5,
      prod_6: 1, prod_7: 1, prod_8: 2, prod_9: 1, prod_10: 2
    };

    // Delete any seller-created products not in sampleProductIds
    const sampleSet = new Set(sampleProductIds);
    const allProdSnap = await getDocs(collection(db, 'products'));
    for (let i = 0; i < allProdSnap.docs.length; i += 400) {
      const delBatch = writeBatch(db);
      let count = 0;
      allProdSnap.docs.slice(i, i + 400).forEach((pDoc) => {
        if (!sampleSet.has(pDoc.id)) {
          delBatch.delete(pDoc.ref);
          count++;
        }
      });
      if (count > 0) {
        await delBatch.commit();
      }
    }

    const sampleDefectsMap: Record<string, Array<{ location: string; description: string; text: string; image: string }>> = {
      prod_1: [
        { location: 'Khuỷu tay', description: 'Phai màu nhẹ tự nhiên ở hai khuỷu tay', text: 'Khuỷu tay: Phai màu nhẹ tự nhiên ở hai khuỷu tay', image: '' },
        { location: 'Gấu áo', description: 'Một sợi chỉ viền gấu bị sờn nhẹ, không bung', text: 'Gấu áo: Một sợi chỉ viền gấu bị sờn nhẹ, không bung', image: '' }
      ],
      prod_2: [
        { location: 'Quai xách', description: 'Sờn nhẹ ở mép quai do sử dụng', text: 'Quai xách: Sờn nhẹ ở mép quai do sử dụng', image: '' },
        { location: 'Đáy túi', description: 'Một vết xước mảnh dài khoảng 1cm', text: 'Đáy túi: Một vết xước mảnh dài khoảng 1cm', image: '' }
      ],
      prod_3: [
        { location: 'Mặt kính', description: 'Vài vết xước dăm rất nhỏ, chỉ thấy khi nghiêng dưới đèn', text: 'Mặt kính: Vài vết xước dăm rất nhỏ, chỉ thấy khi nghiêng dưới đèn', image: '' },
        { location: 'Dây kim loại', description: 'Mắt dây cuối có vết mờ nhẹ', text: 'Dây kim loại: Mắt dây cuối có vết mờ nhẹ', image: '' }
      ],
      prod_4: [
        { location: 'Vỏ ngoài', description: 'Một vết trầy nhỏ ở mặt sau thân nồi', text: 'Vỏ ngoài: Một vết trầy nhỏ ở mặt sau thân nồi', image: '' },
        { location: 'Tay cầm giỏ chiên', description: 'Mờ nhẹ lớp sơn ở chỗ cầm', text: 'Tay cầm giỏ chiên: Mờ nhẹ lớp sơn ở chỗ cầm', image: '' }
      ],
      prod_5: [
        { location: 'Gáy sách', description: 'Gáy hơi bạc màu', text: 'Gáy sách: Gáy hơi bạc màu', image: '' },
        { location: 'Trang giấy', description: 'Giấy ngả vàng, vài trang có gạch chân bút chì', text: 'Trang giấy: Giấy ngả vàng, vài trang có gạch chân bút chì', image: '' }
      ],
      prod_6: [
        { location: 'Mặt đàn', description: 'Hai vết xước nhỏ cạnh lỗ thoát âm do gảy pick', text: 'Mặt đàn: Hai vết xước nhỏ cạnh lỗ thoát âm do gảy pick', image: '' },
        { location: 'Cần đàn', description: 'Phím 1–3 hơi mòn nhẹ', text: 'Cần đàn: Phím 1–3 hơi mòn nhẹ', image: '' }
      ],
      prod_7: [
        { location: 'Thân máy', description: 'Tróc sơn nhẹ ở góc trên bên trái', text: 'Thân máy: Tróc sơn nhẹ ở góc trên bên trái', image: '' },
        { location: 'Ống ngắm', description: 'Có vài hạt bụi nhỏ, không ảnh hưởng ảnh chụp', text: 'Ống ngắm: Có vài hạt bụi nhỏ, không ảnh hưởng ảnh chụp', image: '' }
      ],
      prod_8: [
        { location: 'Viền nhôm', description: 'Cấn nhẹ ở góc dưới bên phải', text: 'Viền nhôm: Cấn nhẹ ở góc dưới bên phải', image: '' },
        { location: 'Pin', description: 'Dung lượng pin còn 84%', text: 'Pin: Dung lượng pin còn 84%', image: '' }
      ],
      prod_9: [
        { location: 'Vòm đầu', description: 'Lớp da trên vòm đầu hơi nhăn', text: 'Vòm đầu: Lớp da trên vòm đầu hơi nhăn', image: '' },
        { location: 'Hộp đựng', description: 'Hộp có vết bẩn nhẹ bên ngoài', text: 'Hộp đựng: Hộp có vết bẩn nhẹ bên ngoài', image: '' }
      ],
      prod_10: [
        { location: 'Keycap', description: 'Phím Space và Enter hơi bóng do dùng', text: 'Keycap: Phím Space và Enter hơi bóng do dùng', image: '' },
        { location: 'Cạnh khung', description: 'Một vết xước nhỏ ở cạnh trái', text: 'Cạnh khung: Một vết xước nhỏ ở cạnh trái', image: '' }
      ]
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
          defects: sampleDefectsMap[pid] || [],
          updatedAt: serverTimestamp()
        });
      }
    }
    await prodBatch.commit();

    // Recreate coupons: delete all documents in coupons, then create 4 default coupons
    const allCpnSnap = await getDocs(collection(db, 'coupons'));
    for (let i = 0; i < allCpnSnap.docs.length; i += 400) {
      const delCpnBatch = writeBatch(db);
      allCpnSnap.docs.slice(i, i + 400).forEach((cDoc) => {
        delCpnBatch.delete(cDoc.ref);
      });
      await delCpnBatch.commit();
    }

    const defaultCoupons = [
      {
        code: 'DOCU10',
        shopId: 'do-cu-con-thuong',
        type: 'percent',
        value: 10,
        maxDiscount: 100000,
        minOrder: 300000,
        usedCount: 0,
        active: true,
        ownerUid: 'dcct_admin_uid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        code: 'FREESHIP',
        shopId: 'do-cu-con-thuong',
        type: 'freeship',
        value: 100,
        maxDiscount: 30000,
        minOrder: 0,
        usedCount: 0,
        active: true,
        ownerUid: 'dcct_admin_uid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        code: 'SACHHAY',
        shopId: 'goc-sach-nhac',
        type: 'fixed',
        value: 15000,
        maxDiscount: 15000,
        minOrder: 100000,
        usedCount: 0,
        active: true,
        ownerUid: 'dcct_goc_sach_nhac_uid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        code: 'TECH50',
        shopId: 'retro-tech',
        type: 'fixed',
        value: 50000,
        maxDiscount: 50000,
        minOrder: 1000000,
        usedCount: 0,
        active: true,
        ownerUid: 'dcct_retro_tech_uid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    const createCpnBatch = writeBatch(db);
    for (const c of defaultCoupons) {
      createCpnBatch.set(doc(db, 'coupons', c.code), c);
    }
    await createCpnBatch.commit();

    const sampleShops = [
      { id: 'do-cu-con-thuong', name: 'Đồ Cũ Còn Thương', color: '#08482D' },
      { id: 'goc-sach-nhac', name: 'Góc Sách & Nhạc', color: '#DAE7C7' },
      { id: 'retro-tech', name: 'Retro Tech', color: '#08482D' }
    ];
    const shopBatch = writeBatch(db);
    for (const s of sampleShops) {
      const ref = doc(db, 'shops', s.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        shopBatch.update(ref, {
          avatar: createShopAvatarSvg(s.name, s.color, s.id),
          followerUids: [],
          followerCount: 0,
          ratingAvg: 0,
          ratingCount: 0,
          updatedAt: serverTimestamp()
        });
      }
    }
    await shopBatch.commit();

    // Ensure all shops have 0 followers
    const allShopsSnap = await getDocs(collection(db, 'shops'));
    for (let i = 0; i < allShopsSnap.docs.length; i += 400) {
      const sBatch = writeBatch(db);
      allShopsSnap.docs.slice(i, i + 400).forEach((s) => {
        sBatch.update(s.ref, {
          followerUids: [],
          followerCount: 0,
          updatedAt: serverTimestamp()
        });
      });
      await sBatch.commit();
    }

    try {
      const adminSnap = await getDoc(doc(db, 'usernames', 'seller_admin'));
      const gocSnap = await getDoc(doc(db, 'usernames', 'seller_goc_sach_nhac'));
      const retroSnap = await getDoc(doc(db, 'usernames', 'seller_retro_tech'));
      const uBatch = writeBatch(db);
      if (adminSnap.exists() && adminSnap.data()?.uid) uBatch.update(doc(db, 'users', adminSnap.data().uid), { shopId: 'do-cu-con-thuong' });
      if (gocSnap.exists() && gocSnap.data()?.uid) uBatch.update(doc(db, 'users', gocSnap.data().uid), { shopId: 'goc-sach-nhac' });
      if (retroSnap.exists() && retroSnap.data()?.uid) uBatch.update(doc(db, 'users', retroSnap.data().uid), { shopId: 'retro-tech' });
      await uBatch.commit();
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dcct_demo_reset'));
    }

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

    const oData = snap.data();
    const steps = [
      { status: 'shipping', label: 'Đã bàn giao cho đơn vị vận chuyển', event: 'dispatched' },
      { status: 'shipping', label: 'Đã đến kho phân loại', event: 'hub_arrival' },
      { status: 'shipping', label: 'Đang vận chuyển liên tỉnh', event: 'transit' },
      { status: 'shipping', label: 'Đang giao hàng tới người mua', event: 'out_for_delivery' },
      { status: 'delivered', label: 'Giao hàng thành công', event: 'delivered' }
    ];

    const target = steps[Math.min(Math.max(0, step), steps.length - 1)];
    const events = oData.shipmentEvents || [];
    events.push({
      event: target.event,
      label: target.label,
      location: 'Hồ Chí Minh',
      note: 'Tua nhanh vận chuyển',
      at: new Date().toISOString()
    });

    const logs = oData.logs || [];
    logs.push({
      status: target.status,
      actorRole: 'seller',
      actorName: oData.shopName || 'Hệ thống',
      note: target.label,
      at: new Date().toISOString()
    });

    const updates: any = {
      status: target.status,
      shipmentEvents: events,
      logs,
      updatedAt: serverTimestamp()
    };
    if (target.status === 'delivered') {
      updates.deliveredAt = new Date().toISOString();
      if (oData.paymentMethod === 'cod') {
        updates.paymentStatus = 'paid';
      }
    }

    await updateDoc(ref, updates);
    return { message: `Đã cập nhật: ${target.label}` };
  }

  // --- REAL-TIME ON-SNAPSHOT SUBSCRIPTIONS (Requirement 3) ---

  subscribeBuyerOrders(cb: (orders: Order[]) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || cur.role !== 'buyer' || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([]);
      return () => {};
    }
    const db = getActiveFirestore();
    const q = query(collection(db, 'orders'), where('buyerUid', '==', cur.uid));
    return onSnapshot(q, (snap) => {
      const orders: Order[] = [];
      snap.forEach((d) => {
        orders.push(normalizeOrderDoc(d.data(), d.id));
      });
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      cb(orders);
    }, (err) => {
      console.warn('subscribeBuyerOrders error:', err);
    });
  }

  subscribeSellerOrders(cb: (orders: Order[]) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || cur.role !== 'seller' || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([]);
      return () => {};
    }
    const db = getActiveFirestore();
    const q = query(collection(db, 'orders'), where('sellerUid', '==', cur.uid));
    return onSnapshot(q, (snap) => {
      const orders: Order[] = [];
      snap.forEach((d) => {
        orders.push(normalizeOrderDoc(d.data(), d.id));
      });
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      cb(orders);
    }, (err) => {
      console.warn('subscribeSellerOrders error:', err);
    });
  }

  subscribeOrderDetail(code: string | number, cb: (order: Order | null) => void): Unsubscribe {
    const db = getActiveFirestore();
    return onSnapshot(doc(db, 'orders', String(code)), (snap) => {
      if (snap.exists()) {
        cb(normalizeOrderDoc(snap.data(), snap.id));
      } else {
        cb(null);
      }
    }, (err) => {
      console.warn('subscribeOrderDetail error:', err);
    });
  }

  subscribeConversations(cb: (conversations: ChatConversation[]) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([]);
      return () => {};
    }
    const db = getActiveFirestore();
    const field = cur.role === 'seller' ? 'sellerUid' : 'buyerUid';
    const q = query(collection(db, 'conversations'), where(field, '==', cur.uid));
    return onSnapshot(q, (snap) => {
      const list: ChatConversation[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const shopAvatar = data.shopAvatar && !data.shopAvatar.includes('unsplash.com') && !data.shopAvatar.includes('photo-1544816155-12df9643f363')
          ? data.shopAvatar
          : createShopAvatarSvg(data.shopName || 'Shop', '#08482D', data.shopId);
        list.push({
          id: d.id as any,
          buyer_id: data.buyerUid as any,
          seller_id: data.sellerUid as any,
          shop_id: data.shopId as any,
          shop_name: data.shopName,
          shop_avatar: shopAvatar,
          buyer_name: data.buyerName,
          buyer_phone: data.buyerPhone || undefined,
          last_message: data.lastMessage,
          last_message_at: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : new Date().toISOString(),
          unread_count: cur.role === 'buyer' ? data.buyerUnread || 0 : data.sellerUnread || 0,
          buyer_unread: data.buyerUnread || 0,
          seller_unread: data.sellerUnread || 0,
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      });
      list.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
      cb(list);
    }, (err) => {
      console.warn('subscribeConversations error:', err);
    });
  }

  subscribeMessages(conversationId: string, cb: (messages: ChatMessage[]) => void): Unsubscribe {
    const db = getActiveFirestore();
    const msgsRef = collection(db, 'conversations', String(conversationId), 'messages');
    return onSnapshot(msgsRef, (snap) => {
      const messages: ChatMessage[] = [];
      snap.forEach((d) => {
        messages.push(mapChatMessageDoc(d.id, conversationId, d.data()));
      });
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      cb(messages);
    }, (err) => {
      console.warn('subscribeMessages error:', err);
    });
  }

  subscribeNotifications(cb: (notifications: NotificationItem[], unreadCount: number) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([], 0);
      return () => {};
    }
    const db = getActiveFirestore();
    const q = query(collection(db, 'notifications'), where('toUid', '==', cur.uid));
    return onSnapshot(q, (snap) => {
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
      const unreadCount = list.filter((n) => !n.is_read).length;
      cb(list, unreadCount);
    }, (err) => {
      console.warn('subscribeNotifications error:', err);
    });
  }

  subscribeOffers(cb: (offers: Offer[]) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([]);
      return () => {};
    }
    const db = getActiveFirestore();
    const field = cur.role === 'seller' ? 'sellerUid' : 'buyerUid';
    const q = query(collection(db, 'offers'), where(field, '==', cur.uid));
    return onSnapshot(q, (snap) => {
      const list: Offer[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const pid = String(data.productId ?? data.product_id ?? '');
        const seedProd = (SEED_MEDIA_DEFAULTS.products as any)[pid];
        const rawImg = data.productImage || data.product_image;
        const effectiveImg = (rawImg && isValidImageSrc(rawImg) && !rawImg.startsWith('data:image/svg+xml'))
          ? rawImg
          : (seedProd?.thumb || (seedProd?.images && seedProd.images[0]) || (rawImg && isValidImageSrc(rawImg) ? rawImg : ''));

        list.push({
          id: d.id as any,
          shop_id: data.shopId as any,
          seller_id: data.sellerUid as any,
          buyer_id: data.buyerUid as any,
          buyer_name: data.buyerName,
          buyer_phone: data.buyerPhone || '',
          product_id: data.productId as any,
          product_name: data.productName,
          product_image: effectiveImg,
          original_price: data.originalPrice,
          offered_price: data.offeredPrice,
          counter_price: data.counterPrice,
          price: data.offeredPrice,
          status: data.status,
          expires_at: data.expiresAt,
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      cb(list);
    }, (err) => {
      console.warn('subscribeOffers error:', err);
    });
  }

  subscribeReturns(cb: (returns: ReturnRequest[]) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || cur.role !== 'seller' || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([]);
      return () => {};
    }
    const db = getActiveFirestore();
    const myUid = cur.uid;
    const myShopId = cur.shop_id ? String(cur.shop_id) : '';

    return onSnapshot(collection(db, 'returns'), async (snap) => {
      const list: ReturnRequest[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const isMine = (data.sellerUid && String(data.sellerUid) === myUid) ||
                       (myShopId && String(data.shopId) === myShopId);
        if (isMine) {
          let buyerName = data.buyerName;
          let buyerPhone = data.buyerPhone;
          let items = data.items;
          let refundAmount = Number(data.refundAmount || 0);

          if (!buyerName || !buyerPhone || !items || !Array.isArray(items) || items.length === 0 || !refundAmount) {
            try {
              const orderDocKey = String(data.orderCode || data.orderId || d.id.replace(/^ret_/, ''));
              const oSnap = await getDoc(doc(db, 'orders', orderDocKey));
              if (oSnap.exists()) {
                const oData = oSnap.data();
                if (!buyerName) buyerName = oData.receiver || oData.buyerName || 'Khách hàng';
                if (!buyerPhone) buyerPhone = oData.phone || oData.buyerPhone || '';
                if (!items || !Array.isArray(items) || items.length === 0) {
                  items = Array.isArray(oData.items) ? oData.items.map((it: any) => ({
                    productId: it.productId ?? it.product_id,
                    name: it.name || it.product_name || 'Sản phẩm',
                    thumb: it.thumb || it.image_url || it.imageUrl || '',
                    qty: Number(it.qty || it.quantity || 1),
                    price: Number(it.price || 0)
                  })) : [];
                }
                if (!refundAmount) refundAmount = Number(oData.total || 0);
              }
            } catch {}
          }

          const firstItem = Array.isArray(items) ? items[0] : undefined;
          list.push({
            id: d.id as any,
            shop_id: data.shopId as any,
            order_id: data.orderId,
            order_code: data.orderCode || data.orderId || d.id.replace(/^ret_/, ''),
            buyer_id: data.buyerUid,
            buyer_name: buyerName || 'Khách hàng',
            buyer_phone: buyerPhone || '',
            product_id: firstItem?.productId || 1,
            product_name: firstItem?.name || 'Sản phẩm theo đơn',
            product_image: firstItem?.thumb || '',
            reason: data.reason,
            description: data.detail || data.description || '',
            images: data.images || [],
            status: data.status,
            seller_note: data.sellerNote || '',
            refund_amount: refundAmount,
            refund_method: 'Ngân hàng / Ví điện tử',
            created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            items: items || []
          } as any);
        }
      }
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      cb(list);
    }, (err) => {
      console.warn('subscribeReturns error:', err);
    });
  }

  subscribeShop(shopId: number | string, cb: (shop: Shop) => void): Unsubscribe {
    const db = getActiveFirestore();
    const strId = String(shopId);
    return onSnapshot(doc(db, 'shops', strId), (snap) => {
      if (snap.exists()) {
        cb(normalizeShopDoc(snap.data(), snap.id));
      }
    }, (err) => {
      console.warn('subscribeShop error:', err);
    });
  }

  subscribePublicShopReviews(
    shopSlugOrId: string | number,
    cb: (res: { reviews: Review[]; avg: number; total: number; distribution: Record<string, number> }) => void
  ): Unsubscribe {
    const db = getActiveFirestore();
    const strSlug = String(shopSlugOrId);
    const q = query(collection(db, 'reviews'), where('shopId', '==', strSlug));

    return onSnapshot(q, async (snap) => {
      const prodMap = new Map<string, { name: string; image: string }>();
      for (const d of snap.docs) {
        const data = d.data();
        const pid = String(data.productId || '');
        if ((!data.productName || !data.productImage) && pid && !prodMap.has(pid)) {
          try {
            const pSnap = await getDoc(doc(db, 'products', pid));
            if (pSnap.exists()) {
              const pInfo = pSnap.data();
              prodMap.set(pid, {
                name: pInfo.name || '',
                image: (pInfo.images && pInfo.images[0]) || pInfo.imageUrl || ''
              });
            }
          } catch {}
        }
      }

      const list: Review[] = [];
      let sum = 0;
      const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

      snap.forEach((d) => {
        const data = d.data();
        if (data.hidden) return;
        const rating = Number(data.rating || 0);
        sum += rating;
        const k = String(rating);
        if (dist[k] !== undefined) dist[k]++;

        const pid = String(data.productId || '');
        const fallback = prodMap.get(pid);
        list.push({
          id: d.id as any,
          order_id: data.orderId,
          product_id: data.productId,
          product_name: data.productName || fallback?.name || '',
          product_image: data.productImage || fallback?.image || '',
          user_id: data.buyerUid,
          user_name: data.buyerDisplayName,
          buyer_name: data.buyerDisplayName,
          author_name: data.buyerDisplayName,
          is_anonymous: !!data.anonymous,
          rating,
          tags: data.tags || [],
          comment: data.comment || '',
          images: data.images || [],
          video_url: data.videoLocalId || data.videoUrl || null,
          video_poster: data.videoThumb || null,
          helpful_count: data.helpfulCount || 0,
          seller_reply: data.sellerReply?.text || (typeof data.sellerReply === 'string' ? data.sellerReply : null),
          seller_reply_at: data.sellerReply?.at || null,
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
        });
      });

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const total = list.length;
      const avg = total > 0 ? Number((sum / total).toFixed(1)) : 0;
      cb({ reviews: list, avg, total, distribution: dist });
    }, (err) => {
      console.warn('subscribePublicShopReviews error:', err);
    });
  }

  subscribeMyOfferForProduct(productId: number | string, cb: (offer: Offer | null) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb(null);
      return () => {};
    }
    const db = getActiveFirestore();
    const q = query(
      collection(db, 'offers'),
      where('buyerUid', '==', cur.uid),
      where('productId', '==', String(productId))
    );
    return onSnapshot(q, (snap) => {
      let matched: Offer | null = null;
      const now = Date.now();
      for (const d of snap.docs) {
        const data = d.data();
        let status = data.status;
        const isPast24h = data.expiresAt
          ? new Date(data.expiresAt).getTime() < now
          : (data.createdAt?.toDate ? now - data.createdAt.toDate().getTime() > 24 * 3600 * 1000 : false);

        if (status === 'pending' && isPast24h) {
          status = 'expired';
        }

        if (status === 'pending' || status === 'accepted' || status === 'countered') {
          const pid = String(data.productId ?? data.product_id ?? '');
          const seedProd = (SEED_MEDIA_DEFAULTS.products as any)[pid];
          const rawImg = data.productImage || data.product_image;
          const effectiveImg = (rawImg && isValidImageSrc(rawImg) && !rawImg.startsWith('data:image/svg+xml'))
            ? rawImg
            : (seedProd?.thumb || (seedProd?.images && seedProd.images[0]) || (rawImg && isValidImageSrc(rawImg) ? rawImg : ''));

          matched = {
            id: d.id as any,
            shop_id: data.shopId as any,
            seller_id: data.sellerUid as any,
            buyer_id: data.buyerUid as any,
            buyer_name: data.buyerName,
            buyer_phone: data.buyerPhone || '',
            product_id: data.productId as any,
            product_name: data.productName,
            product_image: effectiveImg,
            original_price: Number(data.originalPrice || 0),
            offered_price: Number(data.offeredPrice || data.price || 0),
            counter_price: data.counterPrice != null ? Number(data.counterPrice) : undefined,
            price: Number(data.offeredPrice || data.price || 0),
            status,
            expires_at: data.expiresAt,
            created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
          };
          break;
        }
      }
      cb(matched);
    }, (err) => {
      console.warn('subscribeMyOfferForProduct error:', err);
      cb(null);
    });
  }

  subscribeCart(cb: (data: { items: CartItem[]; itemCount: number }) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || cur.role !== 'buyer' || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb({ items: [], itemCount: 0 });
      return () => {};
    }
    const db = getActiveFirestore();
    const cartRef = doc(db, 'carts', cur.uid);
    return onSnapshot(cartRef, async (snap) => {
      if (!snap.exists()) {
        cb({ items: [], itemCount: 0 });
        return;
      }
      try {
        const data = snap.data();
        const rawItems = Array.isArray(data?.items) ? data.items : [];
        if (rawItems.length === 0) {
          cb({ items: [], itemCount: 0 });
          return;
        }

        const items: CartItem[] = [];
        let count = 0;
        for (const it of rawItems) {
          try {
            const prodSnap = await getDoc(doc(db, 'products', String(it.productId)));
            if (prodSnap.exists() && prodSnap.data()?.isActive !== false) {
              const p = normalizeProductDoc(prodSnap.data()!, prodSnap.id);
              const effectivePrice = it.negotiatedPrice ? Number(it.negotiatedPrice) : p.price;
              if (p.stock > 0) {
                count += (Number(it.qty) || 1);
              }
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
                is_sold_out: p.stock <= 0,
                image_url: p.image_url,
                shop_id: p.shop_id,
                shop_name: p.shop_name,
                shop_slug: p.shop_slug,
                created_at: new Date().toISOString(),
                product: p,
                effective_price: effectivePrice,
                offer_id: it.offerId ? String(it.offerId) : undefined,
                is_negotiated: !!it.negotiatedPrice,
                negotiated_price: it.negotiatedPrice
              });
            }
          } catch {}
        }
        cb({ items, itemCount: count });
      } catch (err) {
        console.warn('subscribeCart err:', err);
        cb({ items: [], itemCount: 0 });
      }
    }, (err) => {
      console.warn('subscribeCart onSnapshot error:', err);
    });
  }

  subscribeWishlist(cb: (productIds: (number | string)[]) => void): Unsubscribe {
    const cur = getCurrentUser();
    const auth = getActiveAuth();
    if (!cur || !auth.currentUser || auth.currentUser.uid !== cur.uid) {
      cb([]);
      return () => {};
    }
    const db = getActiveFirestore();
    const uRef = doc(db, 'users', cur.uid);
    return onSnapshot(uRef, (snap) => {
      if (!snap.exists()) {
        cb([]);
        return;
      }
      const raw = snap.data()?.wishlist || [];
      const ids = raw.map((i: any) => {
        const num = Number(i);
        return isNaN(num) ? i : num;
      });
      cb(ids);
    }, (err) => {
      console.warn('subscribeWishlist error:', err);
    });
  }
}

export const db = new DCCTDatabaseService();
