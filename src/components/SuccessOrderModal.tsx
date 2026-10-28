import React from 'react';
import { CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { Order } from '../types';
import { formatVND, formatDate } from '../utils/format';

interface SuccessOrderModalProps {
  order: Order | null;
  orders?: Order[];
  onClose: () => void;
  onViewOrders: (orderCode: string) => void;
}

export const SuccessOrderModal: React.FC<SuccessOrderModalProps> = ({
  order,
  orders,
  onClose,
  onViewOrders
}) => {
  const displayOrders = orders && orders.length > 0 ? orders : (order ? [order] : []);
  if (displayOrders.length === 0) return null;

  const grandTotal = displayOrders.reduce((sum, o) => sum + o.total, 0);
  const primaryOrder = displayOrders[0];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-[#DAE7C7] text-[#08482D] mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="text-center">
          <span className="text-xs font-bold text-[#08482D] uppercase tracking-wider block mb-1">
            Đặt hàng thành công
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#101410]">
            Cảm ơn bạn đã tin tưởng tiệm!
          </h3>
          <p className="text-xs text-[#5E5E61] mt-1 leading-relaxed">
            Hệ thống đã tự động tạo {displayOrders.length} đơn hàng tương ứng theo từng shop và gửi thông báo trực tiếp đến người bán.
          </p>
        </div>

        {/* Danh sách các đơn vừa tạo (Requirement A4: mỗi đơn một dòng: tên shop, mã đơn, số món, tổng tiền, nút Theo dõi) */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold text-[#101410] uppercase tracking-wider block">
            Danh sách đơn hàng vừa đặt ({displayOrders.length} đơn):
          </span>
          <div className="border border-[#DAE7C7] rounded-2xl overflow-hidden divide-y divide-[#DAE7C7]/70 bg-[#F5F8EF]/40">
            {displayOrders.map((ord) => {
              const itemCount = ord.items?.reduce((sum, it) => sum + it.quantity, 0) || ord.items?.length || 1;
              return (
                <div key={ord.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#08482D] truncate">
                        {ord.shop_name || 'Đồ Cũ Còn Thương'}
                      </span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-md border border-[#DAE7C7] text-[#101410] font-bold">
                        {ord.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5E5E61] flex items-center gap-2">
                      <span>{itemCount} món</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-[#101410]">{formatVND(ord.total)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onViewOrders(ord.code);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-[#08482D] hover:bg-[#063A24] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Theo dõi</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thông tin nhận hàng & Tổng thanh toán của cả lần mua */}
        <div className="text-xs text-[#5E5E61] space-y-1.5 bg-[#F5F8EF] p-4 rounded-2xl border border-[#DAE7C7]">
          <div><strong>Người nhận:</strong> {primaryOrder.recipient_name} ({primaryOrder.phone})</div>
          <div className="truncate"><strong>Giao tới:</strong> {primaryOrder.address}</div>
          <div>
            <strong>Thanh toán:</strong>{' '}
            {primaryOrder.payment_method === 'cod' ? 'Tiền mặt khi nhận hàng (COD)' : `${primaryOrder.card_type} (•••• ${primaryOrder.card_last4})`}
          </div>
          <div className="pt-2 border-t border-[#DAE7C7] flex justify-between font-bold text-[#101410] items-baseline">
            <span className="text-xs sm:text-sm">Tổng thanh toán cả lần mua:</span>
            <span className="font-mono text-base sm:text-lg text-[#C2522D]">{formatVND(grandTotal)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onViewOrders(primaryOrder.code);
              onClose();
            }}
            className="w-full py-3 px-4 bg-[#08482D] hover:bg-[#063A24] text-white rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Xem tất cả đơn hàng đã mua</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-semibold text-[#5E5E61] hover:bg-[#F5F8EF] rounded-2xl transition-colors cursor-pointer"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
};
