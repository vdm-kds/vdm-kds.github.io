import React, { useState } from 'react';
import { Star, X, CheckCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderCode: string;
  product: {
    id: number;
    name: string;
    image_url: string;
    condition_pct: number;
  };
  onSuccess: () => void;
}

const QUICK_TAGS = [
  'Đúng như mô tả',
  'Đóng gói cẩn thận',
  'Giao hàng nhanh',
  'Đồ còn rất mới & thơm tho',
  'Chủ shop nhiệt tình',
  'Chất lượng vượt mong đợi'
];

const RATING_LABELS: Record<number, string> = {
  1: '1 sao: Rất thất vọng',
  2: '2 sao: Chưa hài lòng',
  3: '3 sao: Bình thường / Tạm được',
  4: '4 sao: Hài lòng & chất lượng',
  5: '5 sao: Tuyệt vời / Rất ưng ý'
};

export function ReviewModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  product,
  onSuccess
}: ReviewModalProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (trimmed.length < 10) {
      showToast('Nhận xét cần có tối thiểu 10 ký tự', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.submitReview({
        order_id: orderId,
        product_id: product.id,
        rating,
        comment: trimmed,
        tags: selectedTags
      });

      showToast('Đã gửi đánh giá thành công! Cảm ơn bạn.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi gửi đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStar = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FFFFFF] rounded-3xl border-2 border-[#E2E8D8] shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DAE7C7]">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#C2522D] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Đánh giá món đồ
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#101410]">
              Chia sẻ cảm nhận của bạn
            </h3>
            <p className="text-xs text-[#5E5E61] mt-0.5">
              Đơn hàng #{orderCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#DAE7C7] text-[#5E5E61] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product preview */}
        <div className="flex items-center gap-3 my-4 p-3 bg-[#F5F8EF] rounded-2xl border border-[#E2E8D8]">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-14 h-14 rounded-xl object-cover border border-[#E2E8D8] flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-[#101410] truncate">
              {product.name}
            </h4>
            <span className="inline-block px-2 py-0.5 text-[10px] font-mono bg-[#DAE7C7] text-[#08482D] rounded-full mt-1 font-semibold">
              Độ mới: {product.condition_pct}%
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star selector */}
          <div className="text-center py-2">
            <p className="text-xs text-[#5E5E61] mb-2 font-medium">
              Chất lượng món đồ so với kỳ vọng của bạn?
            </p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= activeStar
                        ? 'text-[#E3B23C] fill-[#E3B23C]'
                        : 'text-[#E2E8D8]'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs italic text-[#C2522D] mt-2 font-semibold min-h-[1.25rem]">
              {RATING_LABELS[activeStar]}
            </p>
          </div>

          {/* Quick tags */}
          <div>
            <label className="block text-xs font-bold text-[#101410] uppercase tracking-wider mb-2">
              Gợi ý nhanh (chọn nhiều)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-[#08482D] text-white border-[#08482D] shadow-sm'
                        : 'bg-[#FFFFFF] text-[#5E5E61] border-[#E2E8D8] hover:border-[#08482D]'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment text area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#101410] uppercase tracking-wider">
                Nhận xét chi tiết *
              </label>
              <span className={`text-[11px] font-mono ${comment.trim().length < 10 ? 'text-[#B33F33]' : 'text-[#08482D]'}`}>
                {comment.trim().length}/10 ký tự tối thiểu
              </span>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Hãy kể về tình trạng món đồ khi nhận, mùi hương, đóng gói và cảm nhận khi bạn sử dụng..."
              rows={4}
              required
              className="w-full px-4 py-3 bg-white border border-[#E2E8D8] rounded-2xl text-xs sm:text-sm text-[#101410] focus:outline-none focus:ring-2 focus:ring-[#C2522D] focus:border-transparent resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DAE7C7]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl border border-[#E2E8D8] text-xs font-bold text-[#5E5E61] hover:bg-[#DAE7C7] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || comment.trim().length < 10}
              className="px-6 py-2.5 rounded-2xl bg-[#C2522D] text-white text-xs font-bold hover:bg-[#B33F33] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
