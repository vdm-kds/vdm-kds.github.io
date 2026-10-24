import React, { useState, useEffect } from 'react';
import { 
  X, ShoppingBag, ShieldCheck, Heart, ArrowRight, Check, Star, 
  MessageSquare, Tag, AlertTriangle, Eye, Flame, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, Maximize2 
} from 'lucide-react';
import { Product, ReviewsResponse, ProductFlaw } from '../types';
import { formatVND } from '../utils/format';
import { api } from '../services/api';
import { Button } from './Button';
import { ProductFallbackImage } from './ProductFallbackImage';
import { OfferModal } from './OfferModal';
import { ChatDrawer } from './ChatDrawer';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number) => void;
  disabledBuy?: boolean;
  onDisabledBuyClick?: () => void;
  currentUser?: any;
  onSelectProduct?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted = false,
  onToggleWishlist,
  disabledBuy = false,
  onDisabledBuyClick,
  currentUser,
  onSelectProduct
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState<number>(1);
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Dynamic social & details data
  const [fullProduct, setFullProduct] = useState<Product>(product);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Parse images array
  const imageList: string[] = React.useMemo(() => {
    let list: string[] = [];
    if (Array.isArray(fullProduct.images) && fullProduct.images.length > 0) {
      list = fullProduct.images;
    } else if (typeof fullProduct.images === 'string') {
      try {
        const parsed = JSON.parse(fullProduct.images);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      } catch (e) {
        list = [fullProduct.images];
      }
    }
    if (list.length === 0 && fullProduct.image_url) {
      list = [fullProduct.image_url];
    }
    return list.filter(Boolean);
  }, [fullProduct]);

  // Parse flaws array
  const flawsList: ProductFlaw[] = React.useMemo(() => {
    if (Array.isArray(fullProduct.flaws)) return fullProduct.flaws;
    if (typeof fullProduct.flaws === 'string') {
      try {
        return JSON.parse(fullProduct.flaws);
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [fullProduct]);

  // Parse inspection checklist
  const inspectionChecklist: string[] = React.useMemo(() => {
    if (Array.isArray(fullProduct.inspection_checklist)) return fullProduct.inspection_checklist;
    if (typeof fullProduct.inspection_checklist === 'string') {
      try {
        return JSON.parse(fullProduct.inspection_checklist);
      } catch (e) {
        return ['Độ nguyên bản linh kiện', 'Ngoại quan & trầy xước', 'Chức năng cơ học & điện tử', 'Vệ sinh & khử khuẩn'];
      }
    }
    return ['Độ nguyên bản linh kiện', 'Ngoại quan & trầy xước', 'Chức năng cơ học & điện tử', 'Vệ sinh & khử khuẩn'];
  }, [fullProduct]);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedImageIndex(0);
      setLoadingReviews(true);

      // Record daily view
      api.recordProductView(product.id);

      // Fetch fresh product detail including views_today, in_cart_count, similar_products
      api.getProduct(product.id)
        .then(res => {
          if (res.product) {
            setFullProduct(res.product);
          }
        })
        .catch(() => {
          setFullProduct(product);
        });

      api.getProductReviews(product.id)
        .then(res => setReviewsData(res))
        .catch(() => setReviewsData(null))
        .finally(() => setLoadingReviews(false));
    }
  }, [product?.id]);

  const discountPct = fullProduct.original_price > fullProduct.price
    ? Math.round(((fullProduct.original_price - fullProduct.price) / fullProduct.original_price) * 100)
    : 0;

  const isSoldOut = fullProduct.stock <= 0;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  const handleIncrease = () => {
    if (quantity < fullProduct.stock) setQuantity(q => q + 1);
  };

  const handleAdd = () => {
    if (disabledBuy) {
      if (onDisabledBuyClick) onDisabledBuyClick();
      return;
    }
    if (isSoldOut) return;
    onAddToCart(fullProduct, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuy = () => {
    if (disabledBuy) {
      if (onDisabledBuyClick) onDisabledBuyClick();
      return;
    }
    if (isSoldOut) return;
    onBuyNow(fullProduct, quantity);
  };

  // Condition annotation mapping
  const getConditionLabel = (pct: number) => {
    if (pct >= 95) return { label: 'Như mới', desc: 'Chưa qua sử dụng hoặc chỉ mở hộp trưng bày' };
    if (pct >= 85) return { label: 'Rất tốt', desc: 'Sử dụng ít, ngoại hình gần như hoàn hảo' };
    if (pct >= 70) return { label: 'Tốt', desc: 'Có vết xước nhẹ, hoạt động hoàn hảo' };
    return { label: 'Có dấu hiệu sử dụng', desc: 'Hao mòn nhìn thấy rõ, giá cực kỳ tiết kiệm' };
  };

  const conditionMeta = getConditionLabel(fullProduct.condition_pct);

  const totalReviews = reviewsData?.total_reviews || 0;
  const avgRating = reviewsData?.average_rating || 0;
  const distribution = reviewsData?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const currentDisplayImage = imageList[selectedImageIndex] || fullProduct.image_url;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div 
          className="relative w-full max-w-5xl bg-white rounded-3xl border border-[#E2E8D8] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col md:flex-row text-[#101410]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/95 border border-[#E2E8D8] text-[#101410] hover:bg-[#F5F8EF] flex items-center justify-center transition-colors shadow-sm"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          {/* LEFT COLUMN: Multi-image gallery & Lightbox triggers */}
          <div className="md:w-5/12 bg-[#F5F8EF]/80 p-4 md:p-6 flex flex-col border-b md:border-b-0 md:border-r border-[#E2E8D8] overflow-y-auto">
            {/* Main Image Container */}
            <div className="relative aspect-square rounded-2xl bg-white border border-[#E2E8D8] overflow-hidden group mb-3 shadow-xs flex items-center justify-center">
              {!imgError && currentDisplayImage ? (
                <img
                  src={currentDisplayImage}
                  alt={fullProduct.name}
                  onError={() => setImgError(true)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                  onClick={() => setIsLightboxOpen(true)}
                />
              ) : (
                <ProductFallbackImage 
                  productName={fullProduct.name} 
                  category={fullProduct.category} 
                  className="w-full h-full" 
                />
              )}

              {/* Scarcity / Single item Badge */}
              {fullProduct.stock === 1 && (
                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold font-mono shadow-sm flex items-center gap-1 animate-pulse">
                  <span>Chỉ có 1 món</span>
                </div>
              )}

              {/* Condition floating stamp badge */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <div className="stamp-badge px-2.5 py-0.5 text-xs shadow-sm">
                  {fullProduct.condition_pct}% MỚI
                </div>
              </div>

              {/* Zoom click hint */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/90 text-[#101410] shadow-sm hover:bg-white flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Phóng to</span>
              </button>

              {/* Wishlist button */}
              {onToggleWishlist && (
                <button
                  onClick={() => onToggleWishlist(fullProduct.id)}
                  className={`absolute bottom-3 left-3 z-10 p-2.5 rounded-full shadow-md transition-all ${
                    isWishlisted
                      ? 'bg-[#B3362F] text-white'
                      : 'bg-white/90 text-[#5E5E61] hover:text-[#B3362F]'
                  }`}
                  title={isWishlisted ? 'Đã yêu thích' : 'Thêm vào yêu thích'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            {imageList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-4">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                      selectedImageIndex === idx
                        ? 'border-[#08482D] ring-2 ring-[#08482D]/20'
                        : 'border-[#E2E8D8] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Social Proof & Scarcity Alerts */}
            <div className="space-y-2 mt-auto pt-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E2E8D8] text-xs">
                <Eye className="w-4 h-4 text-[#08482D] shrink-0" />
                <span className="text-[#5E5E61]">
                  <strong className="text-[#101410] font-mono">{fullProduct.views_today || 1} người</strong> đã xem hôm nay
                </span>
              </div>

              {(fullProduct.in_cart_count && fullProduct.in_cart_count > 0) ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950">
                  <Flame className="w-4 h-4 text-orange-600 shrink-0 animate-bounce" />
                  <span>
                    <strong>{fullProduct.in_cart_count} người khác</strong> đang để món này trong giỏ!
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT COLUMN: Details, Inspection, Flaws, Reviews & Actions */}
          <div className="md:w-7/12 p-6 md:p-8 overflow-y-auto flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Category & Stock */}
              <div className="flex items-center justify-between text-xs font-semibold text-[#5E5E61] uppercase tracking-wider">
                <span className="bg-[#DAE7C7]/50 text-[#08482D] px-2.5 py-0.5 rounded-md">
                  {fullProduct.category}
                </span>
                <span className="text-[#08482D] font-mono font-bold">
                  {fullProduct.stock > 0 ? `Còn ${fullProduct.stock} món trong kho` : 'Hết hàng'}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl md:text-3xl font-bold text-[#101410] leading-snug">
                {fullProduct.name}
              </h2>

              {/* Star Rating Overview summary */}
              {totalReviews > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-current' : 'text-[#E2E8D8]'}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-sm font-bold text-[#101410]">
                    {avgRating} / 5
                  </span>
                  <span className="text-xs text-[#5E5E61]">
                    ({totalReviews} lượt đánh giá)
                  </span>
                </div>
              ) : (
                <div className="text-xs text-[#5E5E61] italic">
                  Chưa có đánh giá nào cho sản phẩm này
                </div>
              )}

              {/* Price section */}
              <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8]">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl md:text-3xl font-bold text-[#C2522D]">
                    {formatVND(fullProduct.price)}
                  </span>
                  {fullProduct.original_price > fullProduct.price && (
                    <span className="font-mono text-sm text-[#5E5E61] line-through">
                      {formatVND(fullProduct.original_price)}
                    </span>
                  )}
                  {discountPct > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#C2522D]/10 text-[#C2522D] text-xs font-bold font-mono">
                      Tiết kiệm {discountPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Condition Gauge / Details */}
              <div className="space-y-2 p-3.5 bg-[#F5F8EF]/60 rounded-2xl border border-[#E2E8D8]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#101410]">Độ mới được kiểm định:</span>
                  <span className="font-mono font-bold text-[#08482D] text-sm">
                    {fullProduct.condition_pct}% · {conditionMeta.label}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#DAE7C7]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#08482D] rounded-full transition-all duration-500"
                    style={{ width: `${fullProduct.condition_pct}%` }}
                  />
                </div>
                <p className="text-xs text-[#5E5E61] italic pt-0.5">
                  {conditionMeta.desc}
                </p>
                <p className="text-xs text-[#101410] leading-relaxed pt-1 border-t border-[#E2E8D8]/60">
                  <strong>Mô tả chi tiết:</strong> {fullProduct.condition_detail}
                </p>
              </div>

              {/* SECTION: KHUYẾT ĐIỂM THẬT (Flaws) */}
              <div className="p-4 rounded-2xl bg-[#FBF1D9] border border-[#A86B12]/40 text-[#101410] space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-[#A86B12]" />
                  <span>Khuyết điểm thật (Minh bạch 100%)</span>
                </div>

                {flawsList.length > 0 ? (
                  <div className="space-y-2">
                    {flawsList.map((flaw, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 bg-white/70 rounded-xl border border-amber-200 text-xs">
                        {flaw.photo_url && (
                          <img
                            src={flaw.photo_url}
                            alt={`flaw-${idx}`}
                            className="w-12 h-12 rounded-lg object-cover bg-amber-50 border border-amber-300 shrink-0 cursor-pointer"
                            onClick={() => setIsLightboxOpen(true)}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-amber-950">
                            {flaw.location ? `[${flaw.location}] ` : ''}{flaw.description}
                          </p>
                          <span className="text-[10px] text-amber-800/80">Ảnh chụp phóng đại tại trung tâm kiểm định</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-900 italic">
                    ✓ Không phát hiện khuyết điểm đáng kể qua kiểm tra thực tế. Bề mặt và linh kiện giữ nguyên độ mới tối ưu.
                  </p>
                )}
              </div>

              {/* SECTION: THÔNG TIN KIỂM ĐỊNH (Inspection Cert) */}
              <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#DAE7C7] space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#DAE7C7] pb-2">
                  <div className="flex items-center gap-2 font-bold text-[#08482D]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Chứng nhận kiểm định Đồ Cũ Còn Thương</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#5E5E61]">
                    {fullProduct.inspection_date ? new Date(fullProduct.inspection_date).toLocaleDateString('vi-VN') : 'Đã kiểm định'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#5E5E61]">
                  <span>Chuyên viên kiểm định:</span>
                  <span className="font-semibold text-[#101410]">{fullProduct.inspector_name || 'Nguyễn Văn Minh (KTV-04)'}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#101410] block mb-1.5">Hạng mục đạt chuẩn:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {inspectionChecklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[#08482D]">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* REVIEWS SECTION */}
              <div className="pt-2 border-t border-[#E2E8D8] space-y-3">
                <h3 className="text-sm font-bold text-[#101410]">
                  Đánh Giá Từ Khách Mua ({totalReviews})
                </h3>

                {totalReviews > 0 && (
                  <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#E2E8D8] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="text-center sm:border-r border-[#E2E8D8] sm:pr-3">
                      <div className="font-mono text-2xl font-black text-[#08482D]">{avgRating}</div>
                      <div className="flex items-center justify-center text-amber-500 my-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= Math.round(avgRating) ? 'fill-current' : 'text-[#E2E8D8]'}`} />
                        ))}
                      </div>
                      <div className="text-[10px] text-[#5E5E61]">Dựa trên {totalReviews} đánh giá</div>
                    </div>
                    <div className="space-y-1 text-[10px] font-mono">
                      {[5, 4, 3, 2, 1].map(stars => {
                        const count = distribution[stars] || 0;
                        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2">
                            <span className="w-6 text-right text-gray-700">{stars}★</span>
                            <div className="flex-1 h-1.5 bg-[#DAE7C7]/50 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-5 text-[9px] text-[#5E5E61] text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {loadingReviews ? (
                    <p className="text-xs text-[#5E5E61] text-center py-2">Đang tải đánh giá...</p>
                  ) : (reviewsData?.reviews || []).length === 0 ? (
                    <p className="text-xs text-[#5E5E61] italic py-1">Chưa có nhận xét nào từ khách hàng.</p>
                  ) : (
                    reviewsData?.reviews.map(rev => (
                      <div key={rev.id} className="p-2.5 bg-white rounded-xl border border-[#E2E8D8] space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#101410]">{rev.author_name}</span>
                          <span className="text-[10px] font-mono text-[#5E5E61]">
                            {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-[#5E5E61] leading-relaxed">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MÓN TƯƠNG TỰ */}
              {fullProduct.similar_products && fullProduct.similar_products.length > 0 && (
                <div className="pt-2 border-t border-[#E2E8D8] space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5E5E61]">Món tương tự cùng loại</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {fullProduct.similar_products.slice(0, 4).map((sim: any) => (
                      <div
                        key={sim.id}
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(sim);
                        }}
                        className="p-2 rounded-xl bg-[#F5F8EF] border border-[#E2E8D8] hover:border-[#08482D] cursor-pointer transition-colors"
                      >
                        <img
                          src={sim.image_url}
                          alt={sim.name}
                          className="w-full h-16 object-cover rounded-lg mb-1"
                        />
                        <p className="text-[11px] font-semibold text-[#101410] truncate">{sim.name}</p>
                        <p className="text-[11px] font-bold text-[#08482D] font-mono">{formatVND(sim.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION MODULE: Quantity, Add to cart, Buy now, Trả giá, Hỏi shop */}
            <div className="pt-4 border-t border-[#E2E8D8] space-y-3">
              {!isSoldOut && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-[#101410]">Số lượng:</span>
                  <div className="flex items-center border border-[#E2E8D8] rounded-xl bg-[#F5F8EF] p-1 font-mono text-xs">
                    <button
                      onClick={handleDecrease}
                      disabled={quantity <= 1}
                      className="w-7 h-7 flex items-center justify-center hover:bg-[#DAE7C7]/50 rounded-lg disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-[#101410]">{quantity}</span>
                    <button
                      onClick={handleIncrease}
                      disabled={quantity >= fullProduct.stock}
                      className="w-7 h-7 flex items-center justify-center hover:bg-[#DAE7C7]/50 rounded-lg disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Main Buy Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={justAdded ? "soft" : "secondary"}
                  size="md"
                  onClick={handleAdd}
                  disabled={isSoldOut}
                  className={`w-full text-xs font-bold ${disabledBuy ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {justAdded ? <Check className="w-4 h-4 mr-1 text-[#08482D]" /> : <ShoppingBag className="w-4 h-4 mr-1 text-[#08482D]" />}
                  <span>{justAdded ? 'Đã thêm' : 'Thêm vào giỏ'}</span>
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleBuy}
                  disabled={isSoldOut}
                  className={`w-full text-xs font-bold ${disabledBuy ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span>Mua ngay</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              {/* Secondary Market-Specific Action Buttons: "Trả giá" & "Hỏi shop" */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (disabledBuy && onDisabledBuyClick) {
                      onDisabledBuyClick();
                      return;
                    }
                    setShowOfferModal(true);
                  }}
                  disabled={isSoldOut}
                  className="w-full text-xs font-bold gap-1.5 border-[#DAE7C7]"
                >
                  <Tag className="w-4 h-4 text-[#08482D]" />
                  <span>Trả giá</span>
                </Button>

                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setShowChatDrawer(true);
                  }}
                  className="w-full text-xs font-bold gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-[#08482D]" />
                  <span>Hỏi shop</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX WITH ZOOM & ARROW CONTROLS */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4">
          {/* Lightbox Controls */}
          <div className="w-full flex items-center justify-between text-white px-4 py-2">
            <span className="font-mono text-sm">
              {selectedImageIndex + 1} / {imageList.length || 1}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoomLevel(z => Math.max(z - 0.25, 1))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setIsLightboxOpen(false);
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Image */}
          <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
            <img
              src={currentDisplayImage}
              alt={fullProduct.name}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[80vh] max-w-[90vw] object-contain transition-transform duration-200"
            />

            {imageList.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(i => (i - 1 + imageList.length) % imageList.length)}
                  className="absolute left-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex(i => (i + 1) % imageList.length)}
                  className="absolute right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          {imageList.length > 1 && (
            <div className="flex gap-2 pb-2">
              {imageList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx ? 'border-white' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* POPUP: Trả giá */}
      {showOfferModal && (
        <OfferModal
          product={fullProduct}
          onClose={() => setShowOfferModal(false)}
          onSuccess={(newOffer) => {
            // refresh or toast
          }}
        />
      )}

      {/* DRAWER: Chat với shop */}
      {showChatDrawer && (
        <ChatDrawer
          isOpen={showChatDrawer}
          onClose={() => setShowChatDrawer(false)}
          product={fullProduct}
          currentRole="buyer"
        />
      )}
    </>
  );
};
