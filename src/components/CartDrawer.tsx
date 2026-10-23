import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { CartItem } from '../types';
import { formatVND } from '../utils/format';
import { Button } from './Button';

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
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const freeshipThreshold = 1000000;
  const remainingForFreeship = Math.max(0, freeshipThreshold - subtotal);
  const freeshipProgress = Math.min(100, (subtotal / freeshipThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#E2E8D8] shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#E2E8D8] flex items-center justify-between bg-[#F5F8EF]">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#08482D]" />
              <h3 className="text-xl font-bold text-[#101410]">
                Giỏ hàng của bạn
              </h3>
              <span className="text-xs bg-[#DAE7C7] text-[#08482D] font-mono font-bold px-2 py-0.5 rounded-full">
                {items.length} món
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Freeship Alert Strip */}
          <div className="bg-[#F4ECDF] px-6 py-3 border-b border-[#DCCDB6]">
            <div className="flex items-center gap-2 text-xs font-medium text-[#241A14] mb-1.5">
              <Truck className="w-4 h-4 shrink-0 text-[#D9542B]" />
              {remainingForFreeship === 0 ? (
                <span className="text-[#5E7048] font-bold">🎉 Đơn hàng đã đạt mốc MIỄN PHÍ VẬN CHUYỂN!</span>
              ) : (
                <span>Mua thêm <strong className="font-mono text-[#D9542B]">{formatVND(remainingForFreeship)}</strong> để freeship (đơn &ge; 1.000.000đ)</span>
              )}
            </div>
            <div className="w-full bg-[#EADFCC] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#5E7048] h-full rounded-full transition-all duration-300"
                style={{ width: `${freeshipProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#74665B]">
                <div className="w-16 h-16 rounded-2xl bg-[#EADFCC] flex items-center justify-center text-[#74665B] mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#241A14] mb-1">
                  Giỏ hàng đang trống
                </h4>
                <p className="text-xs max-w-xs leading-relaxed mb-6">
                  Bạn chưa chọn món đồ cũ nào. Hãy dạo quanh cửa hàng để tìm những món đồ độc bản có câu chuyện nhé!
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#D9542B] text-white rounded-xl text-xs font-semibold hover:bg-[#B33F33] transition-colors shadow-vintage-sm"
                >
                  Khám phá đồ cũ ngay
                </button>
              </div>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#F4ECDF]/60 border border-[#DCCDB6] flex gap-4 relative group"
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover bg-[#EADFCC] shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-serif text-sm font-bold text-[#241A14] truncate">
                        {item.name}
                      </h5>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[#74665B] hover:text-[#B33F33] p-1 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[11px] text-[#74665B] mt-0.5">
                      Độ mới: {item.condition_pct}% · Tồn: {item.stock}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-[#DCCDB6] rounded-lg bg-[#FFFBF4] p-0.5 font-mono text-xs">
                        <button
                          onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[#EADFCC] rounded disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[#EADFCC] rounded disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono text-xs font-bold text-[#D9542B]">
                        {formatVND(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 bg-white border-t border-[#E2E8D8] space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#5E5E61]">
                  <span>Tạm tính ({items.length} món)</span>
                  <span className="font-mono text-[#101410] font-medium">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#5E5E61]">
                  <span>Phí giao hàng</span>
                  <span className="font-mono text-[#101410]">
                    {shippingFee === 0 ? (
                      <span className="text-[#08482D] font-semibold">Miễn phí</span>
                    ) : (
                      formatVND(shippingFee)
                    )}
                  </span>
                </div>
                <div className="border-t border-[#E2E8D8] pt-2 flex justify-between items-baseline font-bold text-sm">
                  <span className="text-base text-[#101410]">Tổng cộng</span>
                  <span className="font-mono text-lg text-[#C2522D]">{formatVND(total)}</span>
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
                    className="hover:text-[#B3362F] transition-colors"
                  >
                    Xóa sạch giỏ hàng
                  </button>
                  <span>Kiểm tra hàng trước khi nhận</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
