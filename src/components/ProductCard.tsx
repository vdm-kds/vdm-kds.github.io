import React, { useState } from 'react';
import { ShoppingBag, Check, Star, Heart, Store } from 'lucide-react';
import { Product } from '../types';
import { formatVND } from '../utils/format';
import { Button } from './Button';
import { ProductFallbackImage } from './ProductFallbackImage';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onClick?: () => void;
  onAddToCart?: (product: Product) => void;
  onNavigateToShop?: (slug: string) => void;
  isAddingToCart?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number) => void;
  disabledBuy?: boolean;
  onDisabledBuyClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onClick,
  onAddToCart,
  onNavigateToShop,
  isAddingToCart = false,
  isWishlisted = false,
  onToggleWishlist,
  disabledBuy = false,
  onDisabledBuyClick
}) => {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isSoldOut = product.stock <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabledBuy) {
      if (onDisabledBuyClick) onDisabledBuyClick();
      return;
    }
    if (isSoldOut) return;
    if (onAddToCart) onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product.id);
    }
  };

  const handleCardClick = () => {
    if (onSelect) onSelect(product);
    else if (onClick) onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-3xl border border-[#E2E8D8] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col h-full hover:border-[#DAE7C7]"
    >
      {/* Product Image Container */}
      <div className="relative aspect-4/3 w-full bg-[#F5F8EF] overflow-hidden">
        {!imgError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ProductFallbackImage 
            name={product.name}
            category={product.category}
            conditionPct={product.condition_pct}
          />
        )}

        {/* Mint Studio Condition Badge */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="bg-[#DAE7C7]/95 backdrop-blur-xs text-[#08482D] font-bold font-mono text-[11px] px-2.5 py-1 rounded-full border border-white/60 shadow-2xs">
            {product.condition_pct}% MỚI
          </div>
        </div>

        {/* Wishlist Heart Button */}
        {onToggleWishlist && (
          <button
            onClick={handleHeartClick}
            className={`absolute top-3 right-3 z-20 p-2 rounded-full transition-transform active:scale-90 shadow-2xs ${
              isWishlisted
                ? 'bg-[#B3362F] text-white'
                : 'bg-white/85 hover:bg-white text-[#5E5E61] hover:text-[#B3362F]'
            }`}
            title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Sold-out overlay */}
        {isSoldOut ? (
          <div className="absolute inset-0 bg-[#101410]/75 backdrop-blur-2xs flex items-center justify-center z-20">
            <div className="border border-white/80 px-4 py-1.5 rounded-full text-white font-bold text-xs tracking-wider uppercase shadow-lg">
              Đã Có Chủ Mới
            </div>
          </div>
        ) : product.stock === 1 && !onToggleWishlist ? (
          <div className="absolute top-3 right-3 bg-[#101410]/80 text-white text-[10px] font-mono font-medium px-2 py-0.5 rounded-full shadow-2xs">
            Độc bản (Chỉ 1)
          </div>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata Category & Rating */}
          <div className="flex items-center justify-between text-xs text-[#5E5E61] mb-1 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-[#F5F8EF] text-[#08482D] text-[10px] font-bold">
                {product.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px]">Kho: {product.stock}</span>
            </div>

            {/* Star Rating display if reviewed */}
            {product.rating_avg && product.rating_avg > 0 ? (
              <div className="flex items-center gap-1 font-mono text-[11px] text-[#101410] font-bold">
                <Star className="w-3 h-3 text-[#C2522D] fill-[#C2522D]" />
                <span>{product.rating_avg}</span>
                <span className="text-[#5E5E61] font-normal">({product.review_count || 1})</span>
              </div>
            ) : null}
          </div>

          {/* Product Name */}
          <h3 className="text-base font-bold text-[#101410] line-clamp-1 group-hover:text-[#08482D] transition-colors mt-1">
            {product.name}
          </h3>

          {/* Shop Badge */}
          {product.shop_name && (
            <div 
              onClick={(e) => {
                if (product.shop_slug) {
                  e.stopPropagation();
                  if (onNavigateToShop) onNavigateToShop(product.shop_slug);
                  else window.location.href = `/shop/${product.shop_slug}`;
                }
              }}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#08482D] hover:underline cursor-pointer group/shop font-medium"
            >
              <Store className="w-3 h-3 text-[#08482D] shrink-0" />
              <span className="truncate">{product.shop_name}</span>
            </div>
          )}

          {/* Condition Detail Note */}
          <p className="text-xs text-[#5E5E61] line-clamp-2 mt-1.5 leading-relaxed">
            {product.condition_detail}
          </p>
        </div>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-[#E2E8D8] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-bold text-[#C2522D] tabular-nums">
                {formatVND(product.price)}
              </span>
            </div>
            {product.original_price > product.price && (
              <span className="text-[11px] text-[#5E5E61] line-through font-mono">
                {formatVND(product.original_price)}
              </span>
            )}
          </div>

          <Button
            variant={isSoldOut ? 'secondary' : justAdded ? 'soft' : 'primary'}
            size="sm"
            onClick={handleAdd}
            disabled={isSoldOut || isAddingToCart}
            title={disabledBuy ? 'Chế độ xem trước — Không thể mua hàng' : isSoldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
            className={`px-3 ${disabledBuy ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
          >
            {justAdded ? (
              <Check className="w-4 h-4 text-[#08482D]" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
