import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck, Tag } from 'lucide-react';
import { Order } from '../types';
import { formatVND } from '../utils/format';
import { Button } from './Button';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `HD-${order.code}`;
  const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const printDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl overflow-hidden p-8 text-[#101410] my-8 print:shadow-none print:border-none print:p-0 print:my-0 print:max-w-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex justify-between items-center pb-6 border-b border-[#E2E8D8] mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono px-2.5 py-1 rounded-full bg-[#DAE7C7]/50 text-[#08482D] font-bold">
              Bản xem trước hóa đơn điện tử
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              In hóa đơn
            </Button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F5F8EF] border border-[#E2E8D8] text-[#5E5E61] hover:text-[#101410] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div className="invoice-printable space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[#DAE7C7] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold tracking-tight text-[#08482D]">Đồ Cũ Còn Thương</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#DAE7C7] text-[#08482D] font-semibold">Verified</span>
              </div>
              <p className="text-xs text-[#5E5E61]">Chợ đồ cũ tuyển chọn & kiểm định chất lượng hàng đầu</p>
              <p className="text-xs text-[#5E5E61]">Website: docuconthuong.vn · Hotline: 1900 6868</p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold font-mono text-[#08482D] uppercase tracking-wider">HÓA ĐƠN BÁN HÀNG</h1>
              <p className="text-xs font-mono text-[#101410] mt-1 font-semibold">Số: {invoiceNumber}</p>
              <p className="text-xs text-[#5E5E61]">Ngày lập: {printDate}</p>
              <p className="text-xs text-[#5E5E61]">Ngày đặt: {orderDate}</p>
            </div>
          </div>

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-2 gap-6 bg-[#F5F8EF] p-4 rounded-2xl border border-[#E2E8D8] text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#5E5E61] tracking-wider block mb-1">
                Thông tin người mua
              </span>
              <p className="font-bold text-sm text-[#101410]">{order.recipient_name}</p>
              <p className="text-[#5E5E61] font-mono mt-0.5">SĐT: {order.phone}</p>
              <p className="text-[#5E5E61] mt-0.5 leading-relaxed">{order.address}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#5E5E61] tracking-wider block mb-1">
                Thông tin thanh toán & vận chuyển
              </span>
              <p className="text-[#101410]">
                Hình thức: <strong>{order.payment_method === 'card' ? `Thẻ tín dụng / Ghi nợ (*${order.card_last4 || '****'})` : order.payment_method === 'napas' ? 'Chuyển khoản NAPAS 24/7' : 'Thanh toán khi nhận hàng (COD)'}</strong>
              </p>
              <p className="text-[#101410] mt-1">
                Trạng thái: <strong className="text-emerald-700">{order.payment_status === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}</strong>
              </p>
              {order.carrier && (
                <p className="text-[#5E5E61] mt-1">
                  Đơn vị vận chuyển: {order.carrier} {order.tracking_code ? `(#${order.tracking_code})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#DAE7C7] text-left text-[#5E5E61] uppercase text-[10px] font-semibold">
                <th className="py-2.5">Sản phẩm</th>
                <th className="py-2.5 text-center">Tình trạng</th>
                <th className="py-2.5 text-right">Đơn giá</th>
                <th className="py-2.5 text-center">SL</th>
                <th className="py-2.5 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8D8]">
              {order.items?.map((item, idx) => (
                <tr key={idx} className="py-3">
                  <td className="py-3 pr-2">
                    <p className="font-semibold text-sm text-[#101410]">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.category && <span className="text-[11px] text-[#5E5E61]">{item.category}</span>}
                      {Boolean(item.is_negotiated) && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          <Tag className="w-2.5 h-2.5" />
                          Giá đã thương lượng
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="font-mono text-emerald-800 font-bold bg-[#DAE7C7]/50 px-2 py-0.5 rounded">
                      {item.condition_pct}%
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-medium">{formatVND(item.price)}</td>
                  <td className="py-3 text-center font-mono">{item.quantity}</td>
                  <td className="py-3 text-right font-mono font-bold text-[#08482D]">
                    {formatVND(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Calculation */}
          <div className="flex justify-end pt-4 border-t border-[#DAE7C7]">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[#5E5E61]">
                <span>Tạm tính hàng hóa:</span>
                <span className="font-mono font-medium text-[#101410]">{formatVND(order.subtotal)}</span>
              </div>
              {order.discount_amount && order.discount_amount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Mã giảm giá ({order.coupon_code}):</span>
                  <span className="font-mono font-medium">-{formatVND(order.discount_amount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#5E5E61]">
                <span>Phí vận chuyển bảo hiểm:</span>
                <span className="font-mono font-medium text-[#101410]">
                  {order.shipping_fee > 0 ? formatVND(order.shipping_fee) : 'Miễn phí'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#DAE7C7] text-sm font-bold text-[#08482D]">
                <span>TỔNG THANH TOÁN:</span>
                <span className="font-mono text-base">{formatVND(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Guarantee and verification note */}
          <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#DAE7C7] text-[11px] text-[#5E5E61] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#08482D] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#101410] mb-0.5">Cam kết bảo chứng từ Đồ Cũ Còn Thương</p>
              <p>
                Sản phẩm được xác thực bởi đội ngũ chuyên viên kiểm định độc lập. Người mua được quyền yêu cầu đổi trả và hoàn tiền trong vòng <strong>3 ngày</strong> kể từ khi đơn vị vận chuyển ghi nhận giao hàng thành công.
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 pt-6 text-center text-xs">
            <div>
              <p className="font-semibold text-[#101410]">Người mua hàng</p>
              <p className="text-[#5E5E61] text-[10px] italic mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-medium text-[#101410]">{order.recipient_name}</p>
            </div>
            <div>
              <p className="font-semibold text-[#101410]">Đại diện Đồ Cũ Còn Thương</p>
              <p className="text-[#5E5E61] text-[10px] italic mt-0.5">(Đã ký điện tử xác thực)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold rounded">
                  ✓ VERIFIED DIGITAL SIGNATURE
                </span>
              </div>
              <p className="font-medium text-[#08482D]">Ban Kiểm Định Đồ Cũ Còn Thương</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
