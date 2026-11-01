import React, { useState, useEffect, useRef } from 'react';
import {
  X, Upload, Image as ImageIcon, Trash2, ArrowLeft, ArrowRight,
  Check, AlertTriangle, Sparkles, RefreshCw, Layers, Store, ShoppingBag,
  ExternalLink, FileWarning, Eye
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  compressProductImage,
  createProductThumbnail,
  compressShopCoverImage,
  validateProductTotalMediaSize,
  parseBatchFilename,
  WORKSPACE_SAMPLE_ASSETS,
  SEED_MEDIA_DEFAULTS
} from '../utils/image';

interface SampleMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface ProductSlotState {
  id: string;
  name: string;
  shopName: string;
  shopId: string;
  images: (string | null)[]; // 4 slots
  thumb?: string | null;
}

interface ShopCoverState {
  slug: string;
  name: string;
  color: string;
  coverImage: string | null;
}

const DEFAULT_PRODUCTS: Array<{ id: string; name: string; shopName: string; shopId: string }> = [
  { id: 'prod_1', name: 'Áo khoác denim cũ size L', shopName: 'Đồ Cũ Còn Thương', shopId: 'do-cu-con-thuong' },
  { id: 'prod_2', name: 'Túi xách da thật vintage', shopName: 'Đồ Cũ Còn Thương', shopId: 'do-cu-con-thuong' },
  { id: 'prod_3', name: 'Đồng hồ Casio A168 vintage', shopName: 'Đồ Cũ Còn Thương', shopId: 'do-cu-con-thuong' },
  { id: 'prod_4', name: 'Nồi chiên không dầu Philips 4.1L', shopName: 'Đồ Cũ Còn Thương', shopId: 'do-cu-con-thuong' },
  { id: 'prod_5', name: 'Sách "Nhà giả kim" bản cũ', shopName: 'Góc Sách & Nhạc', shopId: 'goc-sach-nhac' },
  { id: 'prod_6', name: 'Đàn guitar acoustic Yamaha F310', shopName: 'Góc Sách & Nhạc', shopId: 'goc-sach-nhac' },
  { id: 'prod_7', name: 'Máy ảnh film Canon AE-1', shopName: 'Retro Tech', shopId: 'retro-tech' },
  { id: 'prod_8', name: 'iPhone 11 64GB', shopName: 'Retro Tech', shopId: 'retro-tech' },
  { id: 'prod_9', name: 'Tai nghe Sony WH-1000XM3', shopName: 'Retro Tech', shopId: 'retro-tech' },
  { id: 'prod_10', name: 'Bàn phím cơ Keychron K2', shopName: 'Retro Tech', shopId: 'retro-tech' },
];

const DEFAULT_SHOPS: Array<{ slug: string; name: string; color: string }> = [
  { slug: 'do-cu-con-thuong', name: 'Đồ Cũ Còn Thương', color: '#08482D' },
  { slug: 'goc-sach-nhac', name: 'Góc Sách & Nhạc', color: '#7A4E2D' },
  { slug: 'retro-tech', name: 'Retro Tech', color: '#2F4B6B' }
];

export const SampleMediaModal: React.FC<SampleMediaModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { showToast } = useToast();

  const [productsState, setProductsState] = useState<ProductSlotState[]>(() =>
    DEFAULT_PRODUCTS.map(p => ({
      ...p,
      images: [null, null, null, null],
      thumb: null
    }))
  );

  const [shopsState, setShopsState] = useState<ShopCoverState[]>(() =>
    DEFAULT_SHOPS.map(s => ({
      ...s,
      coverImage: null
    }))
  );

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ step: string; pct: number }>({ step: '', pct: 0 });
  const [batchWarnings, setBatchWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'shops'>('products');
  const [processingFiles, setProcessingFiles] = useState(false);

  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ type: 'product'; prodId: string; slotIdx: number } | { type: 'cover'; slug: string } | null>(null);

  // Load existing media from Firestore (products and shops or seedMedia)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingInitial(true);

    const loadData = async () => {
      try {
        const { products } = await api.getProducts();
        const seedRes = await api.getSeedMedia();

        if (!isMounted) return;

        // Populate products
        setProductsState(DEFAULT_PRODUCTS.map(def => {
          const matchedProd = products.find(p => p.id === def.id);
          const seed = seedRes.products?.[def.id];
          const defaultSeed = SEED_MEDIA_DEFAULTS.products[def.id as keyof typeof SEED_MEDIA_DEFAULTS.products];

          const rawImages = (seed?.images && seed.images.length > 0)
            ? seed.images
            : (matchedProd?.images && matchedProd.images.length > 0
                ? matchedProd.images
                : (defaultSeed?.images || []));

          const slots: (string | null)[] = [null, null, null, null];
          rawImages.slice(0, 4).forEach((img, idx) => {
            if (img && !img.startsWith('data:image/svg+xml')) {
              slots[idx] = img;
            }
          });

          return {
            ...def,
            images: slots,
            thumb: seed?.thumb || matchedProd?.thumb || defaultSeed?.thumb || null
          };
        }));

        // Populate shops
        setShopsState(DEFAULT_SHOPS.map(def => {
          const seedCover = seedRes.shops?.[def.slug]?.coverImage;
          const defaultCover = SEED_MEDIA_DEFAULTS.shops[def.slug as keyof typeof SEED_MEDIA_DEFAULTS.shops]?.coverImage;
          return {
            ...def,
            coverImage: seedCover || defaultCover || null
          };
        }));

      } catch (err: any) {
        console.warn('Error loading initial sample media:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Single Slot Click handler
  const handleSlotClick = (prodId: string, slotIdx: number) => {
    setActiveUploadTarget({ type: 'product', prodId, slotIdx });
    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = '';
      singleFileInputRef.current.click();
    }
  };

  // Shop Cover Click handler
  const handleShopCoverClick = (slug: string) => {
    setActiveUploadTarget({ type: 'cover', slug });
    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = '';
      singleFileInputRef.current.click();
    }
  };

  // Process single or multiple files into targeted slot(s)
  const handleSingleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeUploadTarget) return;

    setProcessingFiles(true);
    try {
      if (activeUploadTarget.type === 'cover') {
        const file = files[0];
        const compressedCover = await compressShopCoverImage(file);
        setShopsState(prev => prev.map(s => s.slug === activeUploadTarget.slug ? { ...s, coverImage: compressedCover } : s));
        showToast(`Đã tải và nén ảnh bìa shop`, 'success');
      } else {
        const { prodId, slotIdx } = activeUploadTarget;
        // Process up to 4 images filling consecutive empty slots starting from slotIdx
        const compressedList: string[] = [];
        for (const file of files) {
          const comp = await compressProductImage(file);
          compressedList.push(comp);
        }

        setProductsState(prev => prev.map(p => {
          if (p.id !== prodId) return p;
          const newImages = [...p.images];
          let currentTargetIdx = slotIdx;

          for (const comp of compressedList) {
            if (currentTargetIdx < 4) {
              newImages[currentTargetIdx] = comp;
              currentTargetIdx++;
            }
          }
          return { ...p, images: newImages };
        }));

        showToast(`Đã thêm ${compressedList.length} ảnh cho sản phẩm #${prodId}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý file ảnh', 'error');
    } finally {
      setProcessingFiles(false);
      setActiveUploadTarget(null);
    }
  };

  // Batch upload file handler
  const handleBatchUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessingFiles(true);
    setBatchWarnings([]);

    const unrecognized: string[] = [];
    let recognizedCount = 0;

    const newProdUpdates: Record<string, { slots: Record<number, string> }> = {};
    const newShopUpdates: Record<string, string> = {};

    try {
      for (const file of files) {
        const parsed = parseBatchFilename(file.name);
        if (!parsed.recognized) {
          unrecognized.push(file.name);
          continue;
        }

        if (parsed.type === 'product' && parsed.productId && parsed.slotIndex !== undefined) {
          const comp = await compressProductImage(file);
          if (!newProdUpdates[parsed.productId]) {
            newProdUpdates[parsed.productId] = { slots: {} };
          }
          newProdUpdates[parsed.productId].slots[parsed.slotIndex] = comp;
          recognizedCount++;
        } else if (parsed.type === 'cover' && parsed.slug) {
          const comp = await compressShopCoverImage(file);
          newShopUpdates[parsed.slug] = comp;
          recognizedCount++;
        }
      }

      // Apply to state
      setProductsState(prev => prev.map(p => {
        const update = newProdUpdates[p.id];
        if (!update) return p;
        const newImages = [...p.images];
        Object.entries(update.slots).forEach(([slotStr, dataUrl]) => {
          const idx = parseInt(slotStr, 10);
          if (idx >= 0 && idx < 4) {
            newImages[idx] = dataUrl;
          }
        });
        return { ...p, images: newImages };
      }));

      setShopsState(prev => prev.map(s => {
        const update = newShopUpdates[s.slug];
        if (!update) return s;
        return { ...s, coverImage: update };
      }));

      if (unrecognized.length > 0) {
        setBatchWarnings(unrecognized);
      }

      showToast(`Đã nhận diện và nạp thành công ${recognizedCount} ảnh!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi nạp hàng loạt', 'error');
    } finally {
      setProcessingFiles(false);
    }
  };

  // Preload the 23 sample workspace assets
  const handlePreloadWorkspaceAssets = async () => {
    setProcessingFiles(true);
    setSaveProgress({ step: 'Đang nạp 23 ảnh mẫu từ workspace...', pct: 10 });

    try {
      const prodImagesMap: Record<string, (string | null)[]> = {};
      DEFAULT_PRODUCTS.forEach(p => {
        prodImagesMap[p.id] = [null, null, null, null];
      });
      const shopCoversMap: Record<string, string> = {};

      let count = 0;
      const total = WORKSPACE_SAMPLE_ASSETS.length;

      for (const asset of WORKSPACE_SAMPLE_ASSETS) {
        count++;
        setSaveProgress({
          step: `Đang xử lý ${asset.filename} (${count}/${total})...`,
          pct: Math.round((count / total) * 90)
        });

        if (asset.type === 'product' && asset.productId && asset.index !== undefined) {
          const comp = await compressProductImage(asset.path);
          if (prodImagesMap[asset.productId]) {
            prodImagesMap[asset.productId][asset.index] = comp;
          }
        } else if (asset.type === 'cover' && asset.slug) {
          const comp = await compressShopCoverImage(asset.path);
          shopCoversMap[asset.slug] = comp;
        }
      }

      // Apply to state
      setProductsState(prev => prev.map(p => {
        const imgs = prodImagesMap[p.id];
        return imgs ? { ...p, images: imgs } : p;
      }));

      setShopsState(prev => prev.map(s => {
        const cov = shopCoversMap[s.slug];
        return cov ? { ...s, coverImage: cov } : s;
      }));

      showToast('Đã nạp toàn bộ 23 ảnh mẫu thật vào danh sách!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi nạp ảnh mẫu workspace', 'error');
    } finally {
      setProcessingFiles(false);
      setSaveProgress({ step: '', pct: 0 });
    }
  };

  // Directly apply the 23 static seed photos to Firestore products & shops
  const handleApplySeedPhotos = async () => {
    setSaving(true);
    setSaveProgress({ step: 'Đang chuẩn bị áp dụng 23 ảnh có sẵn...', pct: 5 });
    try {
      const res = await api.applySeedPhotos((step, pct) => {
        setSaveProgress({ step, pct });
      });

      // Update local state to reflect the applied photos
      setProductsState(prev => prev.map(p => {
        const defaultData = SEED_MEDIA_DEFAULTS.products[p.id as keyof typeof SEED_MEDIA_DEFAULTS.products];
        if (!defaultData) return p;
        const slots: (string | null)[] = [null, null, null, null];
        defaultData.images.slice(0, 4).forEach((img, idx) => {
          slots[idx] = img;
        });
        return {
          ...p,
          images: slots,
          thumb: defaultData.thumb || defaultData.images[0] || null
        };
      }));

      setShopsState(prev => prev.map(s => {
        const defaultCover = SEED_MEDIA_DEFAULTS.shops[s.slug as keyof typeof SEED_MEDIA_DEFAULTS.shops]?.coverImage;
        return {
          ...s,
          coverImage: defaultCover || s.coverImage
        };
      }));

      showToast(res.message || 'Đã áp dụng ảnh có sẵn cho 10 sản phẩm & 3 shop!', 'success');
      if (onSaved) onSaved();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi áp dụng ảnh mẫu', 'error');
    } finally {
      setSaving(false);
      setSaveProgress({ step: '', pct: 0 });
    }
  };

  // Remove single image from slot
  const handleRemoveProductImage = (prodId: string, slotIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductsState(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      const newImages = [...p.images];
      newImages[slotIdx] = null;
      // Shift left to fill gap
      const compacted = newImages.filter(Boolean);
      while (compacted.length < 4) compacted.push(null);
      return { ...p, images: compacted };
    }));
  };

  // Reorder product image slots (left/right)
  const handleMoveProductImage = (prodId: string, fromIdx: number, toIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (toIdx < 0 || toIdx >= 4) return;
    setProductsState(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      const newImages = [...p.images];
      const temp = newImages[fromIdx];
      newImages[fromIdx] = newImages[toIdx];
      newImages[toIdx] = temp;
      return { ...p, images: newImages };
    }));
  };

  // Remove shop cover
  const handleRemoveShopCover = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShopsState(prev => prev.map(s => s.slug === slug ? { ...s, coverImage: null } : s));
  };

  // Save all media to Firestore (products, shops, seedMedia)
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveProgress({ step: 'Đang kiểm tra và chuẩn bị dữ liệu...', pct: 5 });

    try {
      // 1. Prepare products payload & thumbnails
      const productsPayload: Array<{ id: string; images: string[]; thumb: string }> = [];

      for (let i = 0; i < productsState.length; i++) {
        const prod = productsState[i];
        const validImages = prod.images.filter(Boolean) as string[];

        let thumb = '';
        if (validImages.length > 0) {
          thumb = await createProductThumbnail(validImages[0]);
        }

        // Validate size < 800KB
        const validation = validateProductTotalMediaSize(validImages, thumb);
        if (!validation.valid) {
          throw new Error(`Sản phẩm #${prod.id} (${prod.name}): ${validation.message}`);
        }

        productsPayload.push({
          id: prod.id,
          images: validImages,
          thumb
        });
      }

      // 2. Prepare shops payload
      const shopsPayload: Array<{ slug: string; coverImage: string }> = shopsState.map(s => ({
        slug: s.slug,
        coverImage: s.coverImage || ''
      }));

      // 3. Save via Database Service
      const res = await api.saveSampleMedia({
        products: productsPayload,
        shops: shopsPayload
      }, (step, pct) => {
        setSaveProgress({ step, pct });
      });

      showToast(res.message, 'success');
      if (onSaved) onSaved();
      onClose();

    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu ảnh mẫu', 'error');
    } finally {
      setSaving(false);
      setSaveProgress({ step: '', pct: 0 });
    }
  };

  // Calculate summary stats
  const totalProductsWithImages = productsState.filter(p => p.images.some(Boolean)).length;
  const totalShopsWithCovers = shopsState.filter(s => Boolean(s.coverImage)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/75 backdrop-blur-sm overflow-hidden animate-fade-in font-sans">
      {/* Hidden inputs */}
      <input
        ref={batchFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleBatchUploadChange}
      />
      <input
        ref={singleFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleSingleFileInputChange}
      />

      <div className="relative w-full h-full md:max-h-[94vh] md:max-w-6xl bg-white rounded-none md:rounded-3xl border-0 md:border border-[#DAE7C7] shadow-2xl flex flex-col overflow-hidden text-[#101410]">
        
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 bg-[#F5F8EF] border-b border-[#E2E8D8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#08482D] text-[#DAE7C7] flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-[#101410]">Quản Lý Ảnh Mẫu Trình Diễn</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DAE7C7] text-[#08482D]">
                  Chủ tiệm
                </span>
              </div>
              <p className="text-xs text-[#5E5E61]">
                Nén canvas tự động (WebP ≤ 150KB, thumb ≤ 20KB, bìa ≤ 250KB) & lưu bản sao vào Firestore seedMedia.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving || processingFiles}
            className="p-2 rounded-xl text-[#5E5E61] hover:bg-[#DAE7C7]/50 hover:text-[#101410] transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ACTION & TAB TOOLBAR */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E2E8D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-[#08482D] text-white shadow-xs'
                  : 'text-[#5E5E61] hover:text-[#101410]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ảnh Sản Phẩm ({totalProductsWithImages}/10)</span>
            </button>
            <button
              onClick={() => setActiveTab('shops')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'shops'
                  ? 'bg-[#08482D] text-white shadow-xs'
                  : 'text-[#5E5E61] hover:text-[#101410]'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Ảnh Bìa Shop ({totalShopsWithCovers}/3)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleApplySeedPhotos}
              disabled={saving || processingFiles}
              className="px-4 py-2 bg-[#08482D] hover:bg-[#063A24] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 border border-[#DAE7C7]/40 ring-2 ring-[#08482D]/20"
              title="Cập nhật trực tiếp vào Firestore cho 10 sản phẩm và 3 shop bằng đường dẫn /seed/..., không làm mất đơn hàng/chat"
            >
              <Sparkles className="w-4 h-4 text-[#DAE7C7]" />
              <span>Áp dụng ảnh có sẵn cho 10 sản phẩm & 3 shop</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (batchFileInputRef.current) {
                  batchFileInputRef.current.value = '';
                  batchFileInputRef.current.click();
                }
              }}
              disabled={saving || processingFiles}
              className="px-3 py-2 bg-[#F5F8EF] hover:bg-[#DAE7C7]/50 text-[#08482D] border border-[#DAE7C7] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Chọn nhiều file cùng lúc từ máy tính"
            >
              <Upload className="w-3.5 h-3.5 text-[#08482D]" />
              <span>Tải hàng loạt từ máy</span>
            </button>
          </div>
        </div>

        {/* BATCH WARNINGS ALERT */}
        {batchWarnings.length > 0 && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-900 shrink-0">
            <div className="flex items-start gap-2">
              <FileWarning className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Có {batchWarnings.length} file không nhận diện được mẫu tên:</strong>
                <p className="text-[11px] text-amber-800 line-clamp-2 mt-0.5 font-mono">
                  {batchWarnings.join(', ')}
                </p>
                <span className="text-[10px] text-amber-700 block mt-1">
                  * Tên hợp lệ: <code>prod_&lt;số&gt;-&lt;thứ tự&gt;.jpg</code> hoặc <code>cover-&lt;slug&gt;.jpg</code>
                </span>
              </div>
            </div>
            <button
              onClick={() => setBatchWarnings([])}
              className="p-1 hover:bg-amber-100 rounded-lg text-amber-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loadingInitial ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#08482D] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#5E5E61]">Đang kiểm tra thư viện ảnh từ Firestore...</p>
            </div>
          ) : activeTab === 'products' ? (
            /* PART A: 10 PRODUCT ROWS */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#5E5E61] px-1">
                <span>10 sản phẩm mẫu (mỗi món tối đa 4 ảnh, ô đầu tiên là ảnh bìa chính)</span>
                <span>Bấm vào ô để chọn ảnh · Dùng mũi tên để đổi thứ tự</span>
              </div>

              {productsState.map((prod) => {
                const filledCount = prod.images.filter(Boolean).length;
                return (
                  <div
                    key={prod.id}
                    className="p-4 bg-white rounded-2xl border border-[#DAE7C7] hover:border-[#08482D] transition-all shadow-2xs space-y-3"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-[#DAE7C7] text-[#08482D] shrink-0">
                          #{prod.id}
                        </span>
                        <h4 className="font-bold text-sm text-[#101410] truncate">{prod.name}</h4>
                        <span className="text-xs text-[#5E5E61] hidden sm:inline">· {prod.shopName}</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#08482D] shrink-0">
                        {filledCount}/4 ảnh
                      </span>
                    </div>

                    {/* 4 Image Slots */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {prod.images.map((img, slotIdx) => {
                        const isCover = slotIdx === 0;
                        const approxKb = img ? Math.round((img.length * 0.75) / 1024) : 0;

                        return (
                          <div
                            key={slotIdx}
                            onClick={() => !img && handleSlotClick(prod.id, slotIdx)}
                            className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all group ${
                              img
                                ? 'border-[#08482D]/20 bg-stone-50'
                                : 'border-dashed border-[#DAE7C7] hover:border-[#08482D] bg-[#F5F8EF]/40 hover:bg-[#F5F8EF] cursor-pointer'
                            }`}
                          >
                            {/* Slot Tag */}
                            <div className="absolute top-2 left-2 z-10 pointer-events-none">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs ${
                                  isCover
                                    ? 'bg-[#08482D] text-white'
                                    : 'bg-white/90 text-[#5E5E61] border border-stone-200'
                                }`}
                              >
                                {isCover ? 'Ảnh bìa' : `Ô ${slotIdx + 1}`}
                              </span>
                            </div>

                            {img ? (
                              <>
                                <img
                                  src={img}
                                  alt=""
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />

                                {/* Size Badge */}
                                <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/70 text-white">
                                    {approxKb} KB
                                  </span>
                                </div>

                                {/* Controls Overlay */}
                                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                  {slotIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleMoveProductImage(prod.id, slotIdx, slotIdx - 1, e)}
                                      className="w-6 h-6 rounded-md bg-white/95 text-[#08482D] hover:bg-[#08482D] hover:text-white flex items-center justify-center shadow-xs transition-colors"
                                      title="Chuyển sang trái"
                                    >
                                      <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {slotIdx < 3 && prod.images[slotIdx + 1] && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleMoveProductImage(prod.id, slotIdx, slotIdx + 1, e)}
                                      className="w-6 h-6 rounded-md bg-white/95 text-[#08482D] hover:bg-[#08482D] hover:text-white flex items-center justify-center shadow-xs transition-colors"
                                      title="Chuyển sang phải"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveProductImage(prod.id, slotIdx, e)}
                                    className="w-6 h-6 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs transition-colors"
                                    title="Xóa ảnh này"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center p-3 text-stone-400 group-hover:text-[#08482D] transition-colors">
                                <Upload className="w-5 h-5 mx-auto mb-1 opacity-70 group-hover:opacity-100" />
                                <span className="text-[11px] font-bold block">
                                  {isCover ? 'Thêm ảnh bìa' : 'Thêm ảnh'}
                                </span>
                                <span className="text-[9px] text-[#5E5E61] block mt-0.5">JPG, PNG, WEBP</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* PART B: 3 SHOP COVERS */
            <div className="space-y-6">
              <div className="text-xs text-[#5E5E61] px-1">
                Ảnh bìa đại diện cho 3 gian hàng chính (Tỉ lệ chuẩn 16:9, kích thước 1600×900px, dung lượng ≤ 250KB).
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {shopsState.map((shop) => {
                  const approxKb = shop.coverImage ? Math.round((shop.coverImage.length * 0.75) / 1024) : 0;

                  return (
                    <div
                      key={shop.slug}
                      className="bg-white rounded-3xl border border-[#DAE7C7] overflow-hidden shadow-2xs hover:border-[#08482D] transition-all flex flex-col"
                    >
                      {/* 16:9 Banner Box */}
                      <div
                        onClick={() => !shop.coverImage && handleShopCoverClick(shop.slug)}
                        className={`relative aspect-16/9 w-full flex items-center justify-center overflow-hidden transition-all group ${
                          shop.coverImage
                            ? 'bg-stone-100'
                            : 'border-b-2 border-dashed border-[#DAE7C7] hover:bg-[#F5F8EF] cursor-pointer'
                        }`}
                        style={{ backgroundColor: shop.color + '22' }}
                      >
                        {shop.coverImage ? (
                          <>
                            <img
                              src={shop.coverImage}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Dark gradient overlay matching shop header */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 pointer-events-none" />

                            {/* Size badge */}
                            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/75 text-white">
                                16:9 · {approxKb} KB
                              </span>
                            </div>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveShopCover(shop.slug, e)}
                              className="absolute top-3 right-3 z-20 w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-colors"
                              title="Xóa ảnh bìa này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-4 text-stone-400 group-hover:text-[#08482D] transition-colors">
                            <Upload className="w-8 h-8 mx-auto mb-1.5 opacity-70 group-hover:opacity-100" />
                            <span className="text-xs font-bold block">Tải ảnh bìa 16:9</span>
                            <span className="text-[10px] text-[#5E5E61] block mt-0.5">Tối đa 250KB · 1600×900</span>
                          </div>
                        )}
                      </div>

                      {/* Shop Info Footer */}
                      <div className="p-4 flex items-center justify-between gap-3 bg-white border-t border-[#E2E8D8]">
                        <div>
                          <h4 className="font-bold text-sm text-[#101410]">{shop.name}</h4>
                          <span className="text-[11px] font-mono text-[#5E5E61]">@{shop.slug}</span>
                        </div>
                        {shop.coverImage && (
                          <button
                            type="button"
                            onClick={() => handleShopCoverClick(shop.slug)}
                            className="text-xs font-bold text-[#08482D] hover:underline cursor-pointer"
                          >
                            Đổi ảnh
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM STICKY FOOTER */}
        <div className="p-4 sm:p-5 bg-[#F5F8EF] border-t border-[#E2E8D8] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Progress or Summary */}
          <div className="flex-1 min-w-0">
            {saving || processingFiles ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#08482D]">
                  <span className="truncate">{saveProgress.step || 'Đang xử lý ảnh...'}</span>
                  <span>{saveProgress.pct}%</span>
                </div>
                <div className="w-full h-2 bg-[#DAE7C7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#08482D] rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, saveProgress.pct)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#5E5E61]">
                <strong className="text-[#08482D] font-mono">{totalProductsWithImages}</strong>/10 sản phẩm đã có ảnh · <strong className="text-[#08482D] font-mono">{totalShopsWithCovers}</strong>/3 shop đã có ảnh bìa
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || processingFiles}
              className="px-4 py-2 bg-white border border-[#E2E8D8] text-[#101410] hover:bg-stone-50 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || processingFiles}
              className="px-5 py-2 bg-[#08482D] hover:bg-[#063A24] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#DAE7C7]" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-[#DAE7C7]" />
                  <span>Lưu tất cả vào Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
