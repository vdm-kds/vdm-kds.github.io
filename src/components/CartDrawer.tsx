import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Truck, Store, MessageCircle, ExternalLink } from 'lucide-react';
import { CartItem } from '../types';
import { formatVND } from '../utils/format';
import { Button } from './Button';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  onUpdateQty: (cartId: number, quantity: number) => void;
  onRemoveItem: (cartId: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onNavigateToShop?: (slug: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  shippingFee,
  total,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onNavigateToShop
}) => {
  if (!isOpen) return null;

  // Group items by shop
  const shopGroups = items.reduce<Record<number, { shop_id: number; shop_name: string; shop_slug: string; items: CartItem[]; subtotal: number; shippingFee: number }>>((acc, item) => {
    const sId = item.shop_id || 1;
    if (!acc[sId]) {
      acc[sId] = {
        shop_id: sId,
        shop_name: item.shop_name || 'Đồ Cũ Còn Thương',
        shop_slug: item.shop_slug || 'do-cu-con-thuong',
        items: [],
        subtotal: 0,
        shippingFee: 0
      };
    }
    acc[sId].items.push(item);
    acc[sId].subtotal += item.price * item.quantity;
    return acc;
  }, {});

  // Compute per-shop shipping fee
  Object.values(shopGroups).forEach(group => {
    group.shippingFee = group.subtotal >= 1000000 || group.subtotal === 0 ? 0 : 30000;
  });

  const shopList = Object.values(shopGroups);
  const totalShipping = shopList.reduce((sum, g) => sum + g.shippingFee, 0);
  const totalCart = subtotal + totalShipping;

  const handleOpenShopChat = (shopId: number) => {
    window.dispatchEvent(new CustomEvent('open-buyer-chat', {
      detail: { shopId }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-lg bg-white border-l border-[#E2E8D8] shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 border-b border-[#E2E8D8] flex items-center justify-between bg-[#F5F8EF]">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#08482D]" />
              <h3 className="text-lg sm:text-xl font-bold text-[#101410]">
                Giỏ hàng của bạn
              </h3>
              <span className="text-xs bg-[#DAE7C7] text-[#08482D] font-mono font-bold px-2 py-0.5 rounded-full">
                {items.length} món • {shopList.length} shop
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List grouped by Shop */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5E5E61]">
                <div className="w-16 h-16 rounded-2xl bg-[#DAE7C7] flex items-center justify-center text-[#5E5E61] mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-[#101410] mb-1">
                  Giỏ hàng đang trống
                </h4>
                <p className="text-xs max-w-xs leading-relaxed mb-6">
                  Bạn chưa chọn món đồ cũ nào. Hãy dạo quanh các gian hàng để tìm những món đồ độc bản có câu chuyện nhé!
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#C2522D] text-white rounded-xl text-xs font-semibold hover:bg-[#B33F33] transition-colors shadow-vintage-sm"
                >
                  Khám phá chợ đồ cũ
                </button>
              </div>
            ) : (
              shopList.map((group) => {
                const remainingForShopFreeship = Math.max(0, 1000000 - group.subtotal);
                return (
                  <div
                    key={group.shop_id}
                    className="border border-[#E2E8D8] rounded-2xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Shop Header */}
                    <div className="bg-[#F5F8EF] px-4 py-3 border-b border-[#E2E8D8] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Store className="w-4 h-4 text-[#08482D] shrink-0" />
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToShop) {
                              onNavigateToShop(group.shop_slug);
                              onClose();
                            }
                          }}
                          className="font-bold text-sm text-[#101410] hover:text-[#08482D] truncate flex items-center gap-1 group text-left"
                        >
                          <span className="truncate">{group.shop_name}</span>
                          <ExternalLink className="w-3 h-3 text-[#5E5E61] group-hover:text-[#08482D] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenShopChat(group.shop_id)}
                        className="px-2.5 py-1 text-xs font-medium text-[#08482D] bg-[#DAE7C7]/50 hover:bg-[#DAE7C7] rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>

                    {/* Shop Items */}
                    <div className="divide-y divide-[#E2E8D8]/60 p-2 sm:p-3 space-y-3">
                      {group.items.map((item) => (
                        <div key={item.id} className="pt-3 first:pt-0 flex gap-3 relative group">
                          <ProductImage
                            src={item.image_url}
                            alt={item.name}
                            category={item.category}
                            productName={item.name}
                            conditionPct={item.condition_pct}
                            className="w-16 h-16 rounded-xl object-cover bg-[#DAE7C7] shrink-0 border border-[#E2E8D8]"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-xs sm:text-sm font-bold text-[#101410] truncate">
                                {item.name}
                              </h5>
                              <button
                                onClick={() => onRemoveItem(item.id)}
                                className="text-[#5E5E61] hover:text-[#B33F33] p-1 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-[#5E5E61] mt-0.5">
                              <span>Mới {item.condition_pct}%</span>
                              <span>•</span>
                              <span>Còn {item.stock}</span>
                              {Boolean(item.is_negotiated) && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                                  Giá deal
                                </span>
                              )}
                            </div>

                            {item.stock <= 0 && (
                              <div className="mt-2 p-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                Món này vừa hết hàng
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2.5">
                              <div className="flex items-center border border-[#E2E8D8] rounded-lg bg-[#FFFFFF] p-0.5 font-mono text-xs">
                                <button
                                  onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || item.stock <= 0}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-[#DAE7C7] rounded disabled:opacity-30"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                                <button
                                  onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.stock || item.stock <= 0}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-[#DAE7C7] rounded disabled:opacity-30"
                                >
                                  +
                                </button>
                              </div>

                              <span className="font-mono text-xs font-bold text-[#C2522D]">
                                {formatVND(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Shop Subtotal & Shipping summary */}
                    <div className="bg-[#F5F8EF]/80 px-4 py-2.5 border-t border-[#E2E8D8] text-xs space-y-1">
                      <div className="flex justify-between items-center text-[#5E5E61]">
                        <span>Tạm tính shop:</span>
                        <span className="font-mono font-medium text-[#101410]">{formatVND(group.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1 text-[#5E5E61]">
                          <Truck className="w-3 h-3 text-[#08482D]" />
                          Phí ship shop:
                        </span>
                        <span className="font-mono">
                          {group.shippingFee === 0 ? (
                            <span className="text-[#08482D] font-bold">0đ (Freeship ≥ 1tr)</span>
                          ) : (
                            <span className="text-[#101410]">
                              {formatVND(30000)}
                              {remainingForShopFreeship > 0 && (
                                <span className="text-[#5E5E61] ml-1 text-[10px]">
                                  (mua thêm {formatVND(remainingForShopFreeship)} để freeship)
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 bg-white border-t border-[#E2E8D8] space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#5E5E61]">
                  <span>Tổng tiền hàng ({items.length} món từ {shopList.length} shop)</span>
                  <span className="font-mono text-[#101410] font-medium">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#5E5E61]">
                  <span>Tổng phí vận chuyển ({shopList.length} shop)</span>
                  <span className="font-mono text-[#101410]">
                    {totalShipping === 0 ? (
                      <span className="text-[#08482D] font-semibold">Tất cả Free</span>
                    ) : (
                      formatVND(totalShipping)
                    )}
                  </span>
                </div>
                <div className="border-t border-[#E2E8D8] pt-2 flex justify-between items-baseline font-bold text-sm">
                  <span className="text-base text-[#101410]">Tổng cộng đơn hàng</span>
                  <span className="font-mono text-lg text-[#C2522D]">{formatVND(totalCart)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onProceedToCheckout}
                  className="w-full text-xs font-bold"
                >
                  <span>Tiến hành Đặt hàng</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="flex items-center justify-between text-[11px] text-[#5E5E61] px-1">
                  <button
                    onClick={onClearCart}
                    className="hover:text-[#B33F33] transition-colors"
                  >
                    Xóa sạch giỏ hàng
                  </button>
                  <span>Đồng kiểm khi nhận hàng</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
