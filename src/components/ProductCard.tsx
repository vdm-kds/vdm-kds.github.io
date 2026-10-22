import React, { useState } from 'react';
import { ShoppingBag, Check, Star, Heart } from 'lucide-react';
import { Product } from '../types';
import { formatVND } from '../utils/format';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  isAddingToCart?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onAddToCart,
  isAddingToCart = false,
  isWishlisted = false,
  onToggleWishlist
}) => {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const discountPct = product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isSoldOut = product.stock <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) return;
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product.id);
    }
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative bg-[#FFFBF4] rounded-2xl border border-[#DCCDB6] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-vintage-lg cursor-pointer flex flex-col h-full"
    >
      {/* Product Image Container */}
      <div className="relative aspect-4/3 w-full bg-[#EADFCC]/60 overflow-hidden">
        {!imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#EADFCC]">
            <span className="text-[11px] uppercase tracking-wider text-[#74665B] font-semibold mb-2">
              {product.category}
            </span>
            <span className="font-serif text-base text-[#241A14] font-bold line-clamp-2">
              {product.name}
            </span>
            <span className="text-xs text-[#D9542B] mt-2 font-mono font-medium">
              Độ mới {product.condition_pct}%
            </span>
          </div>
        )}

        {/* Vintage Condition Stamp Badge */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="stamp-badge px-2.5 py-0.5 text-[11px] shadow-sm">
            {product.condition_pct}% MỚI
          </div>
        </div>

        {/* Wishlist Heart Button */}
        {onToggleWishlist && (
          <button
            onClick={handleHeartClick}
            className={`absolute top-3 right-3 z-20 p-2 rounded-full transition-transform active:scale-90 shadow-sm ${
              isWishlisted
                ? 'bg-[#B33F33] text-white'
                : 'bg-white/80 hover:bg-white text-[#74665B] hover:text-[#B33F33]'
            }`}
            title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Stock tag / Sold-out overlay */}
        {isSoldOut ? (
          <div className="absolute inset-0 bg-[#241A14]/75 backdrop-blur-2xs flex items-center justify-center z-20">
            <div className="border-2 border-white/80 px-4 py-1.5 rounded-lg text-white font-serif font-bold text-sm tracking-wider uppercase transform -rotate-6 shadow-lg">
              Đã Có Chủ Mới
            </div>
          </div>
        ) : product.stock === 1 && !onToggleWishlist ? (
          <div className="absolute top-3 right-3 bg-[#241A14]/90 text-[#FFFBF4] text-[10px] font-mono font-medium px-2 py-0.5 rounded-md shadow-xs">
            Độc bản (Chỉ 1)
          </div>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata Category & Rating */}
          <div className="flex items-center justify-between text-xs text-[#74665B] mb-1 font-medium">
            <div className="flex items-center gap-1.5">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Kho: {product.stock}</span>
            </div>

            {/* Star Rating display if reviewed */}
            {product.rating_avg && product.rating_avg > 0 ? (
              <div className="flex items-center gap-1 font-mono text-[11px] text-[#241A14] font-bold">
                <Star className="w-3 h-3 text-[#E3B23C] fill-[#E3B23C]" />
                <span>{product.rating_avg}</span>
                <span className="text-[#74665B] font-normal">({product.review_count || 1})</span>
              </div>
            ) : null}
          </div>

          {/* Product Name */}
          <h3 className="font-serif text-base font-bold text-[#241A14] line-clamp-1 group-hover:text-[#D9542B] transition-colors">
            {product.name}
          </h3>

          {/* Condition Detail Note */}
          <p className="text-xs text-[#74665B] line-clamp-2 mt-1 leading-relaxed">
            {product.condition_detail}
          </p>
        </div>

        {/* Hanging Price Tag & Action */}
        <div className="mt-4 pt-3 border-t border-[#DCCDB6]/60 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-bold text-[#D9542B] tabular-nums">
                {formatVND(product.price)}
              </span>
            </div>
            {product.original_price > product.price && (
              <span className="text-[11px] text-[#74665B] line-through font-mono">
                {formatVND(product.original_price)}
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={isSoldOut || isAddingToCart}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
              isSoldOut
                ? 'bg-[#EADFCC] text-[#74665B] cursor-not-allowed opacity-60'
                : justAdded
                ? 'bg-[#5E7048] text-white'
                : 'bg-[#241A14] hover:bg-[#D9542B] text-white shadow-vintage-sm active:scale-95'
            }`}
            title={isSoldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
            aria-label="Thêm vào giỏ"
          >
            {justAdded ? (
              <Check className="w-4 h-4" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
