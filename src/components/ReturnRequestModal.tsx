import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle, CheckCircle2, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Order } from '../types';
import { formatVND } from '../utils/format';
import { api } from '../services/api';
import { Button } from './Button';

interface ReturnRequestModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: (returnReq: any) => void;
}

const REASONS = [
  'Hàng không đúng mô tả hoặc ảnh chụp',
  'Hàng bị hỏng / nứt vỡ trong quá trình vận chuyển',
  'Thiếu phụ kiện / chi tiết đi kèm',
  'Lỗi chức năng không được thông báo trước',
  'Khác (ghi rõ trong mô tả)'
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  order,
  onClose,
  onSuccess
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(order.items?.[0]?.product_id || 0);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [description, setDescription] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500&auto=format&fit=crop&q=80'
  ]);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddImage = () => {
    if (newUrlInput.trim() && !imageUrls.includes(newUrlInput.trim())) {
      setImageUrls([...imageUrls, newUrlInput.trim()]);
      setNewUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Vui lòng cung cấp chi tiết lý do bạn muốn trả hàng.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.createReturn({
        order_id: order.id,
        product_id: selectedProductId || order.items?.[0]?.product_id,
        reason,
        description: description.trim(),
        images: imageUrls
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess(res.return_request);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo yêu cầu trả hàng lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E2E8D8] shadow-2xl overflow-hidden p-6 text-[#101410] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#F5F8EF] border border-[#E2E8D8] text-[#5E5E61] hover:text-[#101410] flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans text-[#101410]">Yêu cầu trả hàng & hoàn tiền</h2>
            <p className="text-xs text-[#5E5E61]">Đơn hàng #{order.code} · Áp dụng bảo chứng 3 ngày</p>
          </div>
        </div>

        {/* Order Info */}
        <div className="p-3 bg-[#F5F8EF] border border-[#E2E8D8] rounded-2xl mb-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#5E5E61]">Số món hàng:</span>
            <span className="font-semibold text-[#101410]">{order.items?.length || 1} sản phẩm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5E5E61]">Số tiền sẽ hoàn:</span>
            <span className="font-bold font-mono text-[#08482D] text-sm">{formatVND(order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5E5E61]">Hình thức hoàn tiền:</span>
            <span className="text-[#101410]">
              {order.payment_method === 'card' || order.payment_method === 'napas'
                ? 'Hoàn về thẻ thanh toán (mô phỏng)'
                : 'Hoàn qua chuyển khoản ngân hàng (mô phỏng)'}
            </span>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-[#08482D] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#101410] mb-1">Đã gửi yêu cầu trả hàng!</h3>
            <p className="text-xs text-[#5E5E61]">
              Shop sẽ xét duyệt trong 24 giờ. Bạn có thể theo dõi tiến trình ngay trong chi tiết đơn hàng.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#5E5E61] uppercase tracking-wider mb-1.5">
                Lý do trả hàng <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl focus:outline-none focus:border-[#08482D]"
              >
                {REASONS.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5E5E61] uppercase tracking-wider mb-1.5">
                Mô tả chi tiết tình trạng hàng <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Vui lòng mô tả cụ thể điểm không hài lòng hoặc khác biệt so với cam kết..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DAE7C7] rounded-xl focus:outline-none focus:border-[#08482D]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5E5E61] uppercase tracking-wider mb-1.5">
                Hình ảnh bằng chứng thực tế
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  placeholder="Dán link ảnh bằng chứng..."
                  className="flex-1 px-3 py-1.5 text-xs bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-3 py-1.5 text-xs font-medium bg-[#08482D] text-white rounded-xl hover:bg-[#073d26] transition-colors"
                >
                  Thêm ảnh
                </button>
              </div>

              {/* Thumbnails */}
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl border border-[#DAE7C7] overflow-hidden group">
                    <img src={url} alt={`proof-${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#DAE7C7]/30 border border-[#DAE7C7] rounded-xl text-[11px] text-[#08482D]">
              <strong>Chính sách bảo vệ người mua:</strong> Sau khi shop xác nhận nhận lại sản phẩm theo mã vận đơn chuyển trả, hệ thống sẽ tự động hoàn tiền 100% và cập nhật số lượng tồn kho.
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={loading}
              >
                Gửi yêu cầu
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
