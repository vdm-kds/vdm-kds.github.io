/**
 * Image compression and media processing utilities.
 * Conforms to strict Firestore document size limits (< 1MB per document):
 * - Product images: max 1024px, WebP (fallback JPEG) 0.8 quality down to <= 150KB
 * - Product thumbnail: 240x240 center square crop, WebP <= 20KB
 * - Shop cover: 1600x900 (16:9) center crop, WebP <= 250KB
 * - Total media per product: < 800KB
 */

// Detect WebP support via canvas
let _isWebPSupported: boolean | null = null;
export function isWebPSupported(): boolean {
  if (_isWebPSupported !== null) return _isWebPSupported;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    _isWebPSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    _isWebPSupported = false;
  }
  return _isWebPSupported;
}

export function getPreferredMimeType(): 'image/webp' | 'image/jpeg' {
  return isWebPSupported() ? 'image/webp' : 'image/jpeg';
}

/**
 * Loads a File, Blob, or URL/DataURL into an HTMLImageElement
 */
export function loadImageElement(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không thể tải hình ảnh từ đường dẫn'));
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.onload = () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Định dạng ảnh không được hỗ trợ'));
        img.src = reader.result as string;
      };
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Compresses a product image:
 * - Max dimension: 1024px
 * - Initial quality: 0.8
 * - Progressive quality decrease until <= 150KB
 */
export async function compressProductImage(
  source: File | Blob | string,
  maxDimension: number = 1024,
  maxBytes: number = 150 * 1024
): Promise<string> {
  const img = await loadImageElement(source);
  let { width, height } = img;

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
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');

  // Fill smooth background
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = getPreferredMimeType();
  let quality = 0.8;
  let dataUrl = canvas.toDataURL(mimeType, quality);

  // Fallback to jpeg if webp export failed or wasn't smaller
  if (mimeType === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  // Progressive compression loop
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.2) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL(dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', quality);
  }

  // If still above maxBytes, downscale dimensions slightly
  if (dataUrl.length * 0.75 > maxBytes && (width > 600 || height > 600)) {
    const scale = 0.75;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const scaledCtx = canvas.getContext('2d');
    if (scaledCtx) {
      scaledCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL(dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', 0.7);
    }
  }

  return dataUrl;
}

/**
 * Creates a small thumbnail from cover image:
 * - Center square crop 240x240px
 * - Max size <= 20KB
 */
export async function createProductThumbnail(
  source: File | Blob | string,
  targetSize: number = 240,
  maxBytes: number = 20 * 1024
): Promise<string> {
  const img = await loadImageElement(source);
  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide) / 2;
  const sy = (img.height - minSide) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');

  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

  const mimeType = getPreferredMimeType();
  let quality = 0.8;
  let dataUrl = canvas.toDataURL(mimeType, quality);
  if (mimeType === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  while (dataUrl.length * 0.75 > maxBytes && quality > 0.25) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL(dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', quality);
  }

  return dataUrl;
}

/**
 * Compresses shop cover image:
 * - Center crop 16:9 ratio, resized to 1600x900px
 * - Max size <= 250KB
 */
export async function compressShopCoverImage(
  source: File | Blob | string,
  targetWidth: number = 1600,
  targetHeight: number = 900,
  maxBytes: number = 250 * 1024
): Promise<string> {
  const img = await loadImageElement(source);
  const targetAspect = targetWidth / targetHeight; // 16 / 9
  const sourceAspect = img.width / img.height;

  let cropWidth = img.width;
  let cropHeight = img.height;
  let sx = 0;
  let sy = 0;

  if (sourceAspect > targetAspect) {
    // Source is wider than 16:9 -> crop horizontal edges
    cropWidth = Math.round(img.height * targetAspect);
    sx = Math.round((img.width - cropWidth) / 2);
  } else {
    // Source is taller than 16:9 -> crop vertical edges
    cropHeight = Math.round(img.width / targetAspect);
    sy = Math.round((img.height - cropHeight) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');

  ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

  const mimeType = getPreferredMimeType();
  let quality = 0.82;
  let dataUrl = canvas.toDataURL(mimeType, quality);
  if (mimeType === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  while (dataUrl.length * 0.75 > maxBytes && quality > 0.25) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL(dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', quality);
  }

  return dataUrl;
}

/**
 * Validates total size of all images for one product doc (< 800KB)
 */
export function validateProductTotalMediaSize(images: string[], thumb?: string): { valid: boolean; totalKb: number; message?: string } {
  let totalBytes = (thumb ? thumb.length * 0.75 : 0);
  for (const img of images) {
    totalBytes += (img.length * 0.75);
  }
  const totalKb = Math.round(totalBytes / 1024);
  if (totalBytes > 800 * 1024) {
    return {
      valid: false,
      totalKb,
      message: `Tổng kích thước ảnh của sản phẩm (${totalKb}KB) vượt quá 800KB. Vui lòng giảm bớt ảnh.`
    };
  }
  return { valid: true, totalKb };
}

/**
 * Legacy compatibility export for existing components
 */
export async function compressImageFile(file: File, maxDimension: number = 1024, quality: number = 0.8): Promise<string> {
  return compressProductImage(file, maxDimension, 150 * 1024);
}

/**
 * Default sample photo paths in public/seed/
 */
export const SEED_MEDIA_DEFAULTS = {
  products: {
    prod_1: { images: ['/seed/prod_1-1.jpg', '/seed/prod_1-2.jpg'], thumb: '/seed/prod_1-1.jpg' },
    prod_2: { images: ['/seed/prod_2-1.jpg', '/seed/prod_2-2.jpg'], thumb: '/seed/prod_2-1.jpg' },
    prod_3: { images: ['/seed/prod_3-1.jpg', '/seed/prod_3-2.jpg'], thumb: '/seed/prod_3-1.jpg' },
    prod_4: { images: ['/seed/prod_4-1.jpg', '/seed/prod_4-2.jpg'], thumb: '/seed/prod_4-1.jpg' },
    prod_5: { images: ['/seed/prod_5-1.jpg', '/seed/prod_5-2.jpg'], thumb: '/seed/prod_5-1.jpg' },
    prod_6: { images: ['/seed/prod_6-1.jpg', '/seed/prod_6-2.jpg'], thumb: '/seed/prod_6-1.jpg' },
    prod_7: { images: ['/seed/prod_7-1.jpg', '/seed/prod_7-2.jpg'], thumb: '/seed/prod_7-1.jpg' },
    prod_8: { images: ['/seed/prod_8-1.jpg', '/seed/prod_8-2.jpg'], thumb: '/seed/prod_8-1.jpg' },
    prod_9: { images: ['/seed/prod_9-1.jpg', '/seed/prod_9-2.jpg'], thumb: '/seed/prod_9-1.jpg' },
    prod_10: { images: ['/seed/prod_10-1.jpg', '/seed/prod_10-2.jpg'], thumb: '/seed/prod_10-1.jpg' }
  },
  shops: {
    'do-cu-con-thuong': { coverImage: '/seed/cover-do-cu-con-thuong.jpg' },
    'goc-sach-nhac': { coverImage: '/seed/cover-goc-sach-nhac.jpg' },
    'retro-tech': { coverImage: '/seed/cover-retro-tech.jpg' }
  }
};

/**
 * 23 default sample assets provided in public/seed/
 */
export const WORKSPACE_SAMPLE_ASSETS = [
  // Shop Covers
  { type: 'cover', slug: 'retro-tech', path: '/seed/cover-retro-tech.jpg', filename: 'cover-retro-tech.jpg' },
  { type: 'cover', slug: 'do-cu-con-thuong', path: '/seed/cover-do-cu-con-thuong.jpg', filename: 'cover-do-cu-con-thuong.jpg' },
  { type: 'cover', slug: 'goc-sach-nhac', path: '/seed/cover-goc-sach-nhac.jpg', filename: 'cover-goc-sach-nhac.jpg' },

  // Product 1 (Áo khoác denim)
  { type: 'product', productId: 'prod_1', index: 0, path: '/seed/prod_1-1.jpg', filename: 'prod_1-1.jpg' },
  { type: 'product', productId: 'prod_1', index: 1, path: '/seed/prod_1-2.jpg', filename: 'prod_1-2.jpg' },

  // Product 2 (Túi xách da thật)
  { type: 'product', productId: 'prod_2', index: 0, path: '/seed/prod_2-1.jpg', filename: 'prod_2-1.jpg' },
  { type: 'product', productId: 'prod_2', index: 1, path: '/seed/prod_2-2.jpg', filename: 'prod_2-2.jpg' },

  // Product 3 (Đồng hồ Casio)
  { type: 'product', productId: 'prod_3', index: 0, path: '/seed/prod_3-1.jpg', filename: 'prod_3-1.jpg' },
  { type: 'product', productId: 'prod_3', index: 1, path: '/seed/prod_3-2.jpg', filename: 'prod_3-2.jpg' },

  // Product 4 (Nồi chiên không dầu Philips)
  { type: 'product', productId: 'prod_4', index: 0, path: '/seed/prod_4-1.jpg', filename: 'prod_4-1.jpg' },
  { type: 'product', productId: 'prod_4', index: 1, path: '/seed/prod_4-2.jpg', filename: 'prod_4-2.jpg' },

  // Product 5 (Sách Nhà giả kim)
  { type: 'product', productId: 'prod_5', index: 0, path: '/seed/prod_5-1.jpg', filename: 'prod_5-1.jpg' },
  { type: 'product', productId: 'prod_5', index: 1, path: '/seed/prod_5-2.jpg', filename: 'prod_5-2.jpg' },

  // Product 6 (Đàn guitar acoustic Yamaha)
  { type: 'product', productId: 'prod_6', index: 0, path: '/seed/prod_6-1.jpg', filename: 'prod_6-1.jpg' },
  { type: 'product', productId: 'prod_6', index: 1, path: '/seed/prod_6-2.jpg', filename: 'prod_6-2.jpg' },

  // Product 7 (Máy ảnh film Canon AE-1)
  { type: 'product', productId: 'prod_7', index: 0, path: '/seed/prod_7-1.jpg', filename: 'prod_7-1.jpg' },
  { type: 'product', productId: 'prod_7', index: 1, path: '/seed/prod_7-2.jpg', filename: 'prod_7-2.jpg' },

  // Product 8 (iPhone 11)
  { type: 'product', productId: 'prod_8', index: 0, path: '/seed/prod_8-1.jpg', filename: 'prod_8-1.jpg' },
  { type: 'product', productId: 'prod_8', index: 1, path: '/seed/prod_8-2.jpg', filename: 'prod_8-2.jpg' },

  // Product 9 (Tai nghe Sony)
  { type: 'product', productId: 'prod_9', index: 0, path: '/seed/prod_9-1.jpg', filename: 'prod_9-1.jpg' },
  { type: 'product', productId: 'prod_9', index: 1, path: '/seed/prod_9-2.jpg', filename: 'prod_9-2.jpg' },

  // Product 10 (Bàn phím cơ Keychron)
  { type: 'product', productId: 'prod_10', index: 0, path: '/seed/prod_10-1.jpg', filename: 'prod_10-1.jpg' },
  { type: 'product', productId: 'prod_10', index: 1, path: '/seed/prod_10-2.jpg', filename: 'prod_10-2.jpg' },
];

/**
 * Parses a filename to identify product or shop cover assignment
 * Examples:
 * - prod_3-1.jpg -> { type: 'product', productId: 'prod_3', slotIndex: 0 }
 * - prod_3-1_064df187.jpg -> { type: 'product', productId: 'prod_3', slotIndex: 0 }
 * - cover-retro-tech.jpg -> { type: 'cover', slug: 'retro-tech' }
 * - cover-retro-tech_5fd7ab01.jpg -> { type: 'cover', slug: 'retro-tech' }
 */
export function parseBatchFilename(filename: string): {
  recognized: boolean;
  type?: 'product' | 'cover';
  productId?: string;
  slotIndex?: number;
  slug?: string;
  originalName: string;
} {
  const cleanName = filename.trim().toLowerCase();

  // Pattern 1: prod_<num>-<order>
  const prodMatch = cleanName.match(/^prod_(\d+)[-_](\d+)/);
  if (prodMatch) {
    const num = prodMatch[1];
    const order = parseInt(prodMatch[2], 10);
    return {
      recognized: true,
      type: 'product',
      productId: `prod_${num}`,
      slotIndex: Math.max(0, order - 1),
      originalName: filename
    };
  }

  // Pattern 2: cover-<slug>
  const coverMatch = cleanName.match(/^cover[-_]([a-z0-9-]+?)(?:[-_][a-f0-9]{6,12})?\.(?:jpg|jpeg|png|webp)$/i);
  if (coverMatch) {
    const rawSlug = coverMatch[1].replace(/[-_]$/, '');
    return {
      recognized: true,
      type: 'cover',
      slug: rawSlug,
      originalName: filename
    };
  }

  // Direct cover check
  if (cleanName.includes('cover') && cleanName.includes('retro-tech')) {
    return { recognized: true, type: 'cover', slug: 'retro-tech', originalName: filename };
  }
  if (cleanName.includes('cover') && (cleanName.includes('do-cu') || cleanName.includes('con-thuong'))) {
    return { recognized: true, type: 'cover', slug: 'do-cu-con-thuong', originalName: filename };
  }
  if (cleanName.includes('cover') && (cleanName.includes('goc-sach') || cleanName.includes('nhac'))) {
    return { recognized: true, type: 'cover', slug: 'goc-sach-nhac', originalName: filename };
  }

  return { recognized: false, originalName: filename };
}
