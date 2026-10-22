import React from 'react';
import { X, Printer, Package, Truck, ShieldCheck } from 'lucide-react';
import { Order } from '../types';
import { formatVND } from '../utils/format';

interface ShippingLabelModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

// Hàm sinh mã vạch Code128 dạng SVG giả lập trực quan chuẩn
function BarcodeSVG({ code }: { code: string }) {
  // Sinh các vạch đen trắng xen kẽ dựa trên chuỗi ký tự
  const bars: { width: number; fill: string }[] = [];
  bars.push({ width: 3, fill: '#000' });
  bars.push({ width: 2, fill: '#fff' });

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode >> 1) % 3) + 1, ((charCode >> 2) % 3) + 1, 2];
    pattern.forEach((w, idx) => {
      bars.push({ width: w * 2, fill: idx % 2 === 0 ? '#000' : '#fff' });
    });
  }
  bars.push({ width: 4, fill: '#000' });

  return (
    <div className="flex flex-col items-center my-1">
      <svg className="w-full h-14" viewBox="0 0 320 60" preserveAspectRatio="none">
        {bars.reduce<{ elements: React.ReactElement[]; currentX: number }>((acc, bar, index) => {
          acc.elements.push(
            <rect key={index} x={acc.currentX} y="0" width={bar.width} height="60" fill={bar.fill} />
          );
          acc.currentX += bar.width;
          return acc;
        }, { elements: [], currentX: 10 }).elements}
      </svg>
      <span className="font-mono text-xs font-bold tracking-widest text-black mt-1">
        *{code}*
      </span>
    </div>
  );
}

// SVG QR Code mô phỏng thông tin quét bưu tá
function QrCodeSVG({ data }: { data: string }) {
  return (
    <div className="w-20 h-20 p-1 border border-black bg-white flex flex-col items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 25 25">
        <rect width="25" height="25" fill="#fff" />
        {/* Góc trên trái */}
        <rect x="1" y="1" width="7" height="7" fill="#000" />
        <rect x="2" y="2" width="5" height="5" fill="#fff" />
        <rect x="3" y="3" width="3" height="3" fill="#000" />
        {/* Góc trên phải */}
        <rect x="17" y="1" width="7" height="7" fill="#000" />
        <rect x="18" y="2" width="5" height="5" fill="#fff" />
        <rect x="19" y="3" width="3" height="3" fill="#000" />
        {/* Góc dưới trái */}
        <rect x="1" y="17" width="7" height="7" fill="#000" />
        <rect x="2" y="18" width="5" height="5" fill="#fff" />
        <rect x="3" y="19" width="3" height="3" fill="#000" />
        {/* Các điểm dữ liệu ngẫu nhiên tạo hình QR */}
        <rect x="10" y="2" width="2" height="2" fill="#000" />
        <rect x="13" y="4" width="2" height="2" fill="#000" />
        <rect x="9" y="9" width="7" height="7" fill="#000" />
        <rect x="10" y="10" width="5" height="5" fill="#fff" />
        <rect x="11" y="11" width="3" height="3" fill="#000" />
        <rect x="2" y="10" width="3" height="2" fill="#000" />
        <rect x="6" y="13" width="2" height="3" fill="#000" />
        <rect x="18" y="10" width="3" height="3" fill="#000" />
        <rect x="21" y="15" width="2" height="4" fill="#000" />
        <rect x="10" y="18" width="4" height="2" fill="#000" />
        <rect x="15" y="21" width="3" height="2" fill="#000" />
      </svg>
    </div>
  );
}

export function ShippingLabelModal({ order, isOpen, onClose }: ShippingLabelModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaidOnline = order.payment_method === 'card' || order.payment_method === 'napas' || order.payment_status === 'paid';
  const codAmount = isPaidOnline ? 0 : order.total;
  const carrierName = order.carrier || 'Giao Hàng Nhanh (GHN)';
  const trackingCode = order.tracking_code || `GHN${order.code.slice(3)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:bg-white print:p-0">
      {/* CSS dành riêng cho in ấn khổ A6 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-waybill, #printable-waybill * {
            visibility: visible !important;
          }
          #printable-waybill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 105mm !important;
            height: 148mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            page-break-after: always;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#DCCDB6] shadow-2xl overflow-hidden print:max-w-none print:w-auto print:border-none print:shadow-none">
        {/* Modal Top Bar (Screen only) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-[#F4ECDF] border-b border-[#DCCDB6]">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D9542B]" />
            <h3 className="font-serif text-lg font-bold text-[#241A14]">
              Phiếu Giao Hàng Chuẩn A6
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#D9542B] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#B33F33] transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> In phiếu (A6)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#74665B] hover:bg-[#EADFCC] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Waybill Content Box - Optimized for 105x148mm A6 */}
        <div className="p-6 bg-white overflow-y-auto max-h-[80vh] print:p-0 print:max-h-none flex justify-center">
          <div
            id="printable-waybill"
            className="w-full max-w-[105mm] border-2 border-black p-4 text-black font-sans text-xs bg-white space-y-3"
          >
            {/* Top header: Carrier + QR */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sm">
                  <Truck className="w-4 h-4" /> {carrierName}
                </div>
                <div className="text-[11px] font-bold text-gray-700">
                  DỊCH VỤ CHUYỂN PHÁT NHANH TIÊU CHUẨN
                </div>
                <div className="text-[10px] text-gray-600">
                  Mã đơn hàng: <strong className="font-mono text-black">{order.code}</strong>
                </div>
              </div>
              <QrCodeSVG data={`https://docuconthuong.vn/track/${trackingCode}`} />
            </div>

            {/* Barcode & Large Tracking Code */}
            <div className="text-center border-b-2 border-black pb-2">
              <BarcodeSVG code={trackingCode} />
              <div className="text-lg font-black font-mono tracking-widest mt-1 bg-gray-100 py-0.5 border border-black">
                {trackingCode}
              </div>
            </div>

            {/* Sender & Recipient Columns */}
            <div className="grid grid-cols-2 gap-2 border-b-2 border-black pb-2 text-[11px] leading-tight">
              {/* Sender */}
              <div className="border-r border-black pr-2 space-y-0.5">
                <div className="font-bold uppercase text-[10px] text-gray-600">Người gửi:</div>
                <div className="font-bold text-xs">ĐỒ CŨ CÒN THƯƠNG</div>
                <div>SĐT: 0901 234 567</div>
                <div className="text-[10px] text-gray-700">
                  128 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
                </div>
              </div>

              {/* Recipient */}
              <div className="pl-1 space-y-0.5">
                <div className="font-bold uppercase text-[10px] text-gray-600">Người nhận:</div>
                <div className="font-bold text-xs uppercase">{order.recipient_name}</div>
                <div className="font-bold font-mono">{order.phone}</div>
                <div className="text-[10px] text-gray-800 font-medium">
                  {order.address}
                </div>
              </div>
            </div>

            {/* Items summary */}
            <div className="border-b-2 border-black pb-2">
              <div className="font-bold text-[10px] uppercase mb-1">Nội dung hàng hóa (Cho xem hàng, không thử):</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 text-left">
                    <th className="py-0.5">Sản phẩm</th>
                    <th className="py-0.5 text-center">SL</th>
                    <th className="py-0.5 text-right">Độ mới</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((it, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-0.5 pr-1 truncate max-w-[150px]">{it.product_name}</td>
                      <td className="py-0.5 text-center font-mono font-bold">x{it.quantity}</td>
                      <td className="py-0.5 text-right font-mono">{it.condition_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial / COD Box */}
            <div className="border-2 border-black p-2 bg-gray-50 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-gray-600">Tiền thu người nhận (COD):</div>
                <div className="text-xl font-black font-mono text-black">
                  {isPaidOnline ? '0 đ' : formatVND(codAmount)}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                  isPaidOnline 
                    ? 'bg-green-100 text-green-900 border-green-600' 
                    : 'bg-amber-100 text-amber-900 border-amber-600'
                }`}>
                  {isPaidOnline ? '✓ ĐÃ THANH TOÁN ONLINE' : 'THU HỘ TIỀN MẶT'}
                </span>
                <div className="text-[9px] text-gray-600 mt-1">
                  {isPaidOnline ? 'Bưu tá không thu thêm bất kỳ khoản phí nào' : 'Bưu tá thu đúng số tiền trên'}
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 text-center text-[10px] pt-1 border-t border-dashed border-black">
              <div>
                <div className="font-bold">Chữ ký người gửi</div>
                <div className="h-10"></div>
                <div className="text-[9px] text-gray-600">Đã kiểm hàng & đóng gói</div>
              </div>
              <div>
                <div className="font-bold">Chữ ký người nhận</div>
                <div className="h-10"></div>
                <div className="text-[9px] text-gray-600">Xác nhận nguyên vẹn</div>
              </div>
            </div>

            {/* Footer timestamp */}
            <div className="text-[9px] text-center text-gray-500 pt-1 border-t border-gray-300">
              Đồ Cũ Còn Thương · Ngày in: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
