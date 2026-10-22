import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, ShieldCheck, Truck, Heart, ArrowRight, Check, Star } from 'lucide-react';
import { Product, Review, ReviewsResponse } from '../types';
import { formatVND } from '../utils/format';
import { api } from '../services/api';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted = false,
  onToggleWishlist
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState<number>(1);
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setLoadingReviews(true);
      api.getProductReviews(product.id)
        .then(res => setReviewsData(res))
        .catch(() => setReviewsData(null))
        .finally(() => setLoadingReviews(false));
    }
  }, [product]);

  const discountPct = product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isSoldOut = product.stock <= 0;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  const handleIncrease = () => {
    if (quantity < product.stock) setQuantity(q => q + 1);
  };

  const handleAdd = () => {
    if (isSoldOut) return;
    onAddToCart(product, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const totalReviews = reviewsData?.total_reviews || 0;
  const avgRating = reviewsData?.average_rating || 0;
  const distribution = reviewsData?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div 
        className="relative w-full max-w-4xl bg-[#FFFBF4] rounded-3xl border border-[#DCCDB6] shadow-vintage-lg overflow-hidden max-h-[92vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-[#FFFBF4]/90 border border-[#DCCDB6] text-[#241A14] hover:bg-[#EADFCC] flex items-center justify-center transition-colors shadow-vintage-sm"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Product Image */}
        <div className="md:w-5/12 bg-[#EADFCC]/50 relative flex items-center justify-center min-h-[280px] md:min-h-full overflow-hidden">
          {!imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover max-h-[380px] md:max-h-none"
            />
          ) : (
            <div className="p-8 text-center">
              <span className="text-[11px] uppercase tracking-wider text-[#74665B] font-bold block mb-2">
                {product.category}
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#241A14] mb-3">
                {product.name}
              </h2>
              <span className="text-sm font-semibold text-[#D9542B] font-mono">
                Độ mới {product.condition_pct}%
              </span>
            </div>
          )}

          {/* Condition floating stamp badge */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="stamp-badge px-3 py-1 text-xs shadow-sm">
              {product.condition_pct}% MỚI
            </div>
          </div>

          {/* Wishlist button */}
          {onToggleWishlist && (
            <button
              onClick={() => onToggleWishlist(product.id)}
              className={`absolute bottom-4 left-4 z-10 p-2.5 rounded-full shadow-md transition-all ${
                isWishlisted
                  ? 'bg-[#B33F33] text-white'
                  : 'bg-white/90 text-[#74665B] hover:text-[#B33F33]'
              }`}
              title={isWishlisted ? 'Đã yêu thích' : 'Thêm vào yêu thích'}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Right: Product Details, Purchase Module & Reviews */}
        <div className="md:w-7/12 p-6 md:p-8 overflow-y-auto flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Category & Stock */}
            <div className="flex items-center justify-between text-xs font-semibold text-[#74665B] uppercase tracking-wider">
              <span>{product.category}</span>
              <span className="text-[#5E7048] font-mono font-bold">
                {product.stock > 0 ? `Còn ${product.stock} món trong kho` : 'Hết hàng'}
              </span>
            </div>

            {/* Title */}
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#241A14] leading-snug">
              {product.name}
            </h2>

            {/* Star Rating Overview summary */}
            {totalReviews > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center text-[#E3B23C]">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-current' : 'text-[#DCCDB6]'}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-sm font-bold text-[#241A14]">
                  {avgRating} / 5
                </span>
                <span className="text-xs text-[#74665B]">
                  ({totalReviews} lượt đánh giá)
                </span>
              </div>
            ) : (
              <div className="text-xs text-[#74665B] italic">
                Chưa có đánh giá nào cho sản phẩm này
              </div>
            )}

            {/* Price section */}
            <div className="p-4 rounded-2xl bg-[#F4ECDF]/70 border border-[#DCCDB6]">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-bold text-[#D9542B]">
                  {formatVND(product.price)}
                </span>
                {product.original_price > product.price && (
                  <span className="font-mono text-sm text-[#74665B] line-through">
                    {formatVND(product.original_price)}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-[#D9542B]/10 text-[#D9542B] text-xs font-bold font-mono">
                    Tiết kiệm {discountPct}%
                  </span>
                )}
              </div>
            </div>

            {/* Condition Gauge / Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#241A14]">Thước đo độ mới:</span>
                <span className="font-mono font-bold text-[#D9542B]">{product.condition_pct}%</span>
              </div>
              <div className="w-full h-2 bg-[#EADFCC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D9542B] rounded-full transition-all duration-500"
                  style={{ width: `${product.condition_pct}%` }}
                />
              </div>
              <p className="text-xs text-[#74665B] leading-relaxed pt-1">
                <strong className="text-[#241A14]">Mô tả chi tiết:</strong> {product.condition_detail}
              </p>
            </div>

            {/* REVIEWS SECTION */}
            <div className="pt-4 border-t border-[#DCCDB6]/60 space-y-4">
              <h3 className="font-serif text-base font-bold text-[#241A14]">
                Đánh Giá Từ Khách Mua ({totalReviews})
              </h3>

              {totalReviews > 0 && (
                <div className="p-3.5 bg-[#F4ECDF]/60 rounded-2xl border border-[#DCCDB6] grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Left: Big Score */}
                  <div className="text-center sm:border-r border-[#DCCDB6]/60 sm:pr-4">
                    <div className="font-mono text-3xl font-black text-[#D9542B]">
                      {avgRating}
                    </div>
                    <div className="flex items-center justify-center text-[#E3B23C] my-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? 'fill-current' : 'text-[#DCCDB6]'}`} />
                      ))}
                    </div>
                    <div className="text-[11px] text-[#74665B]">
                      Dựa trên {totalReviews} đánh giá thực tế
                    </div>
                  </div>

                  {/* Right: Distribution Bars */}
                  <div className="space-y-1 text-[11px] font-mono">
                    {[5, 4, 3, 2, 1].map(stars => {
                      const count = distribution[stars] || 0;
                      const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="w-8 text-right text-gray-700">{stars}★</span>
                          <div className="flex-1 h-2 bg-[#EADFCC] rounded-full overflow-hidden">
                            <div className="h-full bg-[#E3B23C] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-[10px] text-[#74665B] text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {loadingReviews ? (
                  <p className="text-xs text-[#74665B] text-center py-2">Đang tải đánh giá...</p>
                ) : (reviewsData?.reviews || []).length === 0 ? (
                  <p className="text-xs text-[#74665B] italic py-1">Chưa có nhận xét nào từ khách hàng.</p>
                ) : (
                  reviewsData?.reviews.map(rev => (
                    <div key={rev.id} className="p-3 bg-white rounded-xl border border-[#DCCDB6] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-[#241A14]">
                          <span>{rev.author_name}</span>
                          <span className="text-[#5E7048] text-[10px] bg-[#5E7048]/10 px-1.5 py-0.2 rounded font-normal">
                            Đã mua hàng
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#74665B]">
                          {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <div className="flex items-center text-[#E3B23C]">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-current' : 'text-[#DCCDB6]'}`} />
                        ))}
                      </div>

                      {rev.tags && rev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 my-1">
                          {rev.tags.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-[#F4ECDF] text-[#5E7048] text-[10px] font-semibold">
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[#74665B] leading-relaxed pt-0.5">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-[#DCCDB6]/60 space-y-3">
            {!isSoldOut && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-[#241A14]">Số lượng:</span>
                <div className="flex items-center border border-[#DCCDB6] rounded-xl bg-[#F4ECDF] p-1 font-mono text-xs">
                  <button
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                    className="w-7 h-7 flex items-center justify-center hover:bg-[#EADFCC] rounded-lg disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-[#241A14]">{quantity}</span>
                  <button
                    onClick={handleIncrease}
                    disabled={quantity >= product.stock}
                    className="w-7 h-7 flex items-center justify-center hover:bg-[#EADFCC] rounded-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAdd}
                disabled={isSoldOut}
                className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isSoldOut
                    ? 'border-[#DCCDB6] bg-[#EADFCC] text-[#74665B] cursor-not-allowed opacity-50'
                    : justAdded
                    ? 'bg-[#5E7048] text-white border-[#5E7048]'
                    : 'border-[#241A14] text-[#241A14] bg-[#FFFBF4] hover:bg-[#EADFCC]'
                }`}
              >
                {justAdded ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                <span>{justAdded ? 'Đã thêm' : 'Thêm vào giỏ'}</span>
              </button>

              <button
                onClick={() => onBuyNow(product, quantity)}
                disabled={isSoldOut}
                className="py-3 px-3 rounded-xl bg-[#D9542B] hover:bg-[#B33F33] text-white text-xs font-bold transition-all shadow-vintage-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>Mua ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

