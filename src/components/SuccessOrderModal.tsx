import React from 'react';
import { CheckCircle2, Package, ArrowRight, Home } from 'lucide-react';
import { Order } from '../types';
import { formatVND, formatDate } from '../utils/format';

interface SuccessOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onViewOrders: (orderCode: string) => void;
}

export const SuccessOrderModal: React.FC<SuccessOrderModalProps> = ({
  order,
  onClose,
  onViewOrders
}) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-[#EBF5EE] text-[#337A47] mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold text-[#556B2F] uppercase tracking-wider block mb-1">
            Đặt hàng thành công
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#2C2724]">
            Cảm ơn bạn đã tin tưởng tiệm!
          </h3>
          <p className="text-xs text-[#786F66] mt-1 leading-relaxed">
            Đơn hàng đã được lưu vào hệ thống và trừ tồn kho tự động. Người bán đang chuẩn bị đóng gói cẩn thận cho bạn.
          </p>
        </div>

        {/* Order Code Box */}
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E6DFD5] text-center space-y-1">
          <span className="text-[11px] text-[#786F66] uppercase font-bold block">
            Mã đơn hàng của bạn:
          </span>
          <span className="font-mono text-xl font-bold text-[#47533E] tracking-wider block">
            {order.code}
          </span>
          <span className="text-[10px] text-stone-400 block">
            {formatDate(order.created_at)}
          </span>
        </div>

        {/* Short Summary */}
        <div className="text-xs text-[#524B46] space-y-1.5 text-left bg-[#F8F6F2] p-4 rounded-xl border border-[#EBE3D7]">
          <div><strong>Người nhận:</strong> {order.recipient_name} ({order.phone})</div>
          <div className="truncate"><strong>Giao tới:</strong> {order.address}</div>
          <div>
            <strong>Thanh toán:</strong>{' '}
            {order.payment_method === 'cod' ? 'Tiền mặt khi nhận hàng (COD)' : `${order.card_type} (•••• ${order.card_last4})`}
          </div>
          <div className="pt-2 border-t border-[#E6DFD5] flex justify-between font-bold text-[#2C2724]">
            <span>Tổng thanh toán:</span>
            <span className="font-mono text-sm">{formatVND(order.total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onViewOrders(order.code);
              onClose();
            }}
            className="w-full py-3 px-4 bg-[#47533E] hover:bg-[#384331] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Package className="w-4 h-4" />
            <span>Theo dõi đơn hàng này</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-semibold text-[#524B46] hover:bg-[#FAF7F2] rounded-xl transition-colors"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
};
