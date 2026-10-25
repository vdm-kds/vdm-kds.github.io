import React, { useState } from 'react';
import { X, Tag, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Product } from '../types';
import { formatVND } from '../utils/format';
import { api } from '../services/api';
import { Button } from './Button';

interface OfferModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: (offer: any) => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({ product, onClose, onSuccess }) => {
  const minPrice = Math.ceil(product.price * 0.7);
  const maxPrice = product.price - 1000;

  const [priceInput, setPriceInput] = useState<string>(Math.round(product.price * 0.9).toLocaleString('vi-VN'));
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Parse numeric value from string
  const getNumericValue = (str: string): number => {
    const cleaned = str.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = getNumericValue(raw);
    if (num === 0 && raw === '') {
      setPriceInput('');
    } else {
      setPriceInput(num.toLocaleString('vi-VN'));
    }
    setError(null);
  };

  const handleShortcut = (discountPercent: number) => {
    const calculated = Math.round(product.price * (1 - discountPercent / 100));
    setPriceInput(calculated.toLocaleString('vi-VN'));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const offeredPrice = getNumericValue(priceInput);

    if (offeredPrice < minPrice) {
      setError(`Giá đề nghị tối thiểu là 70% giá bán (${formatVND(minPrice)}).`);
      return;
    }
    if (offeredPrice >= product.price) {
      setError(`Giá đề nghị phải thấp hơn giá hiện tại (${formatVND(product.price)}).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.createOffer({
        product_id: product.id,
        offered_price: offeredPrice,
        message: message.trim() || undefined
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess(res.offer);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lời trả giá lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const currentNumeric = getNumericValue(priceInput);
  const discountFromOrig = product.price > 0 && currentNumeric > 0
    ? Math.round(((product.price - currentNumeric) / product.price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-3xl border border-[#E2E8D8] shadow-2xl overflow-hidden p-6 text-[#101410]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#F5F8EF] border border-[#E2E8D8] text-[#5E5E61] hover:text-[#101410] flex items-center justify-center transition-colors shrink-0 z-10"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-[#DAE7C7]/50 flex items-center justify-center text-[#08482D] shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans text-[#101410]">Trả giá sản phẩm</h2>
            <p className="text-xs text-[#5E5E61]">Thương lượng giá trực tiếp cùng shop</p>
          </div>
        </div>

        {/* Product mini info */}
        <div className="p-3 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] flex items-center gap-3 mb-4 shrink-0">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-14 h-14 rounded-xl object-cover bg-white border border-[#E2E8D8] shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#101410] truncate">{product.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#5E5E61]">Giá niêm yết:</span>
              <span className="text-sm font-bold text-[#08482D]">{formatVND(product.price)}</span>
            </div>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-[#08482D] mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-[#101410] mb-1">Đã gửi lời trả giá thành công!</h3>
            <p className="text-sm text-[#5E5E61]">
              Shop sẽ phản hồi trong vòng 24 giờ. Bạn có thể theo dõi trong mục "Lời trả giá của tôi".
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#5E5E61] uppercase tracking-wider mb-1.5">
                  Giá bạn muốn đề nghị (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={priceInput}
                    onChange={handlePriceChange}
                    placeholder="Ví dụ: 850.000"
                    className="w-full px-4 py-3 text-lg font-bold font-mono text-[#08482D] bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D]"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#5E5E61]">
                    đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#5E5E61] mt-1.5">
                  <span>Khoảng giá hợp lệ: {formatVND(minPrice)} – {formatVND(maxPrice)}</span>
                  {discountFromOrig > 0 && discountFromOrig <= 30 && (
                    <span className="text-emerald-700 font-semibold font-mono">Giảm {discountFromOrig}%</span>
                  )}
                </div>
              </div>

              {/* Quick shortcuts */}
              <div>
                <span className="text-xs text-[#5E5E61] block mb-2 font-medium">Gợi ý trả nhanh:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleShortcut(5)}
                    className="py-2 px-3 text-xs font-semibold rounded-xl bg-[#F5F8EF] border border-[#DAE7C7] hover:bg-[#DAE7C7]/40 text-[#08482D] transition-colors"
                  >
                    -5% ({formatVND(Math.round(product.price * 0.95))})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShortcut(10)}
                    className="py-2 px-3 text-xs font-semibold rounded-xl bg-[#F5F8EF] border border-[#DAE7C7] hover:bg-[#DAE7C7]/40 text-[#08482D] transition-colors"
                  >
                    -10% ({formatVND(Math.round(product.price * 0.9))})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShortcut(15)}
                    className="py-2 px-3 text-xs font-semibold rounded-xl bg-[#F5F8EF] border border-[#DAE7C7] hover:bg-[#DAE7C7]/40 text-[#08482D] transition-colors"
                  >
                    -15% ({formatVND(Math.round(product.price * 0.85))})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E5E61] uppercase tracking-wider mb-1.5">
                  Lời nhắn gửi shop (không bắt buộc)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="VD: Em ở gần có thể qua lấy ngay trong ngày nếu shop đồng ý giá này..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DAE7C7] rounded-xl focus:outline-none focus:border-[#08482D]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  Khi shop đồng ý, bạn có <strong>24 giờ</strong> để đặt hàng với giá ưu đãi này. Mỗi sản phẩm bạn chỉ có 1 lời trả giá đang chờ.
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-3 mt-3 border-t border-[#E2E8D8] shrink-0 bg-white">
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
                Gửi lời trả giá
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
