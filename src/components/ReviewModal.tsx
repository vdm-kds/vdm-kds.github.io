import React, { useState, useRef, useEffect } from 'react';
import { Star, X, Camera, Video, Upload, AlertCircle, Play, Check } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button } from './Button';

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
  initialReview?: {
    id: number;
    rating: number;
    comment: string;
    tags?: string[];
    images?: string[];
    video_url?: string | null;
    video_duration?: number | null;
    video_poster?: string | null;
    is_anonymous?: boolean;
  };
  onSuccess: () => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời'
};

const CRITERIA_CHIPS = [
  'Đúng mô tả',
  'Chất lượng tốt',
  'Đóng gói cẩn thận',
  'Giao nhanh',
  'Shop nhiệt tình'
];

// Helper: Tự nén ảnh JPEG 0.8, cạnh dài nhất 1280px
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxDim = 1280;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Lỗi canvas'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}

// Helper: Kiểm tra độ dài video và lấy ảnh bìa canvas
function processVideo(file: File): Promise<{ dataUrl: string; duration: number; poster: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      if (video.duration > 30) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error('Video tối đa 30 giây'));
      }
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const poster = canvas.toDataURL('image/jpeg', 0.8);
      const duration = Math.round(video.duration);
      URL.revokeObjectURL(objectUrl);

      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          duration,
          poster
        });
      };
      reader.onerror = () => reject(new Error('Lỗi đọc dữ liệu video'));
      reader.readAsDataURL(file);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể phát tệp video, vui lòng chọn định dạng MP4 hoặc WebM'));
    };
  });
}

export function ReviewModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  product,
  initialReview,
  onSuccess
}: ReviewModalProps) {
  const { showToast } = useToast();

  const [rating, setRating] = useState<number>(initialReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>(initialReview?.comment || '');
  const [selectedChips, setSelectedChips] = useState<string[]>(initialReview?.tags || []);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(initialReview?.is_anonymous || false);

  // Media
  const [images, setImages] = useState<string[]>(initialReview?.images || []);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialReview?.video_url || null);
  const [videoDuration, setVideoDuration] = useState<number | null>(initialReview?.video_duration || null);
  const [videoPoster, setVideoPoster] = useState<string | null>(initialReview?.video_poster || null);

  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Hidden inputs
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialReview) {
      setRating(initialReview.rating || 5);
      setComment(initialReview.comment || '');
      setSelectedChips(initialReview.tags || []);
      setIsAnonymous(Boolean(initialReview.is_anonymous));
      setImages(initialReview.images || []);
      setVideoUrl(initialReview.video_url || null);
      setVideoDuration(initialReview.video_duration || null);
      setVideoPoster(initialReview.video_poster || null);
    }
  }, [initialReview]);

  if (!isOpen) return null;

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const handleInsertSuggestion = (prefix: string) => {
    if (!comment.includes(prefix)) {
      setComment(prev => prev ? `${prev}\n${prefix} ` : `${prefix} `);
    }
  };

  // Process and upload photo
  const handlePhotoFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      showToast('Tối đa 5 hình ảnh cho mỗi đánh giá', 'error');
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Ảnh "${file.name}" vượt quá giới hạn 10MB`, 'error');
        continue;
      }
      try {
        setProcessing(true);
        setProcessMsg('Đang nén và tải ảnh lên...');
        const compressedBase64 = await compressImage(file);
        const res = await api.uploadFile(compressedBase64);
        setImages(prev => [...prev, res.url].slice(0, 5));
      } catch (err: any) {
        showToast(err.message || 'Lỗi khi xử lý hình ảnh', 'error');
      } finally {
        setProcessing(false);
        setProcessMsg('');
      }
    }
  };

  // Process and upload video
  const handleVideoFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    if (file.size > 20 * 1024 * 1024) {
      showToast('Dung lượng video tối đa 20MB', 'error');
      return;
    }

    try {
      setProcessing(true);
      setProcessMsg('Đang kiểm tra độ dài video và trích xuất ảnh bìa...');
      const { dataUrl, duration, poster } = await processVideo(file);

      setProcessMsg('Đang tải video lên kho lưu trữ...');
      const uploadRes = await api.uploadFile(dataUrl);

      // Upload poster as well
      const posterRes = await api.uploadFile(poster);

      setVideoUrl(uploadRes.url);
      setVideoDuration(duration);
      setVideoPoster(posterRes.url);
      showToast(`Đã thêm video (${duration}s)`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý video', 'error');
    } finally {
      setProcessing(false);
      setProcessMsg('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const imgFiles = files.filter(f => f.type.startsWith('image/'));
      const vidFiles = files.filter(f => f.type.startsWith('video/'));
      if (imgFiles.length > 0) {
        const dt = new DataTransfer();
        imgFiles.forEach(f => dt.items.add(f));
        handlePhotoFiles(dt.files);
      }
      if (vidFiles.length > 0 && !videoUrl) {
        const dt = new DataTransfer();
        dt.items.add(vidFiles[0]);
        handleVideoFile(dt.files);
      }
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const removeVideo = () => {
    setVideoUrl(null);
    setVideoDuration(null);
    setVideoPoster(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (trimmed.length < 10) {
      showToast('Nhận xét cần có tối thiểu 10 ký tự', 'error');
      return;
    }
    if (trimmed.length > 500) {
      showToast('Nhận xét tối đa 500 ký tự', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_id: orderId,
        product_id: product.id,
        rating,
        comment: trimmed,
        tags: selectedChips,
        images,
        video_url: videoUrl,
        video_duration: videoDuration,
        video_poster: videoPoster,
        is_anonymous: isAnonymous
      };

      if (initialReview?.id) {
        await api.updateReview(initialReview.id, payload);
        showToast('Đã cập nhật đánh giá thành công!', 'success');
      } else {
        await api.submitReview(payload);
        showToast('Cảm ơn bạn đã đánh giá!', 'success');
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-[#FFFFFF] rounded-3xl border border-[#DAE7C7] shadow-2xl overflow-hidden my-6 text-[#101410]"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DAE7C7]/60 bg-[#F5F8EF]/80">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#08482D]">
              {initialReview ? 'Chỉnh sửa đánh giá sản phẩm' : 'Đánh giá sản phẩm'}
            </h3>
            <p className="text-xs text-[#5E5E61] mt-0.5">
              Đơn hàng #{orderCode} · Đồ cũ còn thương
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/40 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Product Block */}
          <div className="flex items-center gap-3.5 p-3.5 bg-[#F5F8EF] rounded-2xl border border-[#DAE7C7]">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover border border-[#DAE7C7] flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-medium text-sm text-[#101410] line-clamp-1">{product.name}</h4>
              <p className="text-xs text-[#08482D] font-medium mt-1 inline-flex items-center gap-1.5 bg-[#DAE7C7]/60 px-2.5 py-0.5 rounded-full">
                Phân loại: <span className="font-bold">{product.condition_pct}% mới</span>
              </p>
            </div>
          </div>

          {/* Star Rating Block */}
          <div className="text-center py-2 bg-gradient-to-b from-[#F5F8EF]/50 to-transparent rounded-2xl border border-dashed border-[#DAE7C7]">
            <p className="text-xs text-[#5E5E61] mb-2 font-medium">Chất lượng món đồ bạn nhận được?</p>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 transition-all duration-150 transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                      star <= activeStar
                        ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm font-bold text-[#C2522D] transition-all">
              {STAR_LABELS[activeStar] || ''}
            </p>
          </div>

          {/* 5 Quick Criteria Chips */}
          <div>
            <label className="block text-xs font-semibold text-[#5E5E61] uppercase tracking-wider mb-2">
              Tiêu chí đánh giá nhanh (chọn nhiều)
            </label>
            <div className="flex flex-wrap gap-2">
              {CRITERIA_CHIPS.map((chip) => {
                const isSelected = selectedChips.includes(chip);
                return (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => toggleChip(chip)}
                    className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#08482D] text-white border-[#08482D] shadow-sm'
                        : 'bg-[#F5F8EF] text-[#101410] border-[#DAE7C7] hover:border-[#08482D]/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#5E5E61] uppercase tracking-wider">
                Nhận xét chi tiết (tối thiểu 10 ký tự)
              </label>
              <span className={`text-xs font-mono ${comment.trim().length < 10 ? 'text-[#C2522D]' : 'text-[#5E5E61]'}`}>
                {comment.trim().length}/500 ký tự
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Hãy chia sẻ cảm nhận thực tế về chất lượng món đồ, độ mới, sự sạch sẽ và trải nghiệm mua sắm của bạn..."
              rows={4}
              className="w-full p-3.5 text-sm rounded-2xl border border-[#DAE7C7] bg-[#F5F8EF]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#08482D]/30 focus:border-[#08482D] transition-all resize-none text-[#101410]"
            />
            {/* Suggestions */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] text-[#5E5E61] font-medium">Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => handleInsertSuggestion('Tình trạng thực tế:')}
                className="text-[11px] bg-[#DAE7C7]/50 hover:bg-[#DAE7C7] text-[#08482D] font-medium px-2.5 py-0.5 rounded-lg border border-[#DAE7C7] transition-colors"
              >
                + Tình trạng thực tế:
              </button>
              <button
                type="button"
                onClick={() => handleInsertSuggestion('Điều mình thích:')}
                className="text-[11px] bg-[#DAE7C7]/50 hover:bg-[#DAE7C7] text-[#08482D] font-medium px-2.5 py-0.5 rounded-lg border border-[#DAE7C7] transition-colors"
              >
                + Điều mình thích:
              </button>
            </div>
          </div>

          {/* Photo & Video Upload */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#5E5E61] uppercase tracking-wider">
                Hình ảnh & Video thực tế
              </label>
              <span className="text-xs text-[#5E5E61]">
                Ảnh: {images.length}/5 · Video: {videoUrl ? '1/1' : '0/1'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Photo buttons */}
              {images.length < 5 && (
                <>
                  <button
                    type="button"
                    onClick={() => photoCameraInputRef.current?.click()}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] hover:bg-[#DAE7C7]/40 text-[#08482D] transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#08482D]" /> Chụp ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => photoFileInputRef.current?.click()}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] hover:bg-[#DAE7C7]/40 text-[#101410] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#5E5E61]" /> Chọn từ máy
                  </button>
                </>
              )}

              {/* Video buttons */}
              {!videoUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => videoCameraInputRef.current?.click()}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] hover:bg-[#DAE7C7]/40 text-[#C2522D] transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-[#C2522D]" /> Quay video (&le;30s)
                  </button>
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] hover:bg-[#DAE7C7]/40 text-[#101410] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#5E5E61]" /> Chọn video
                  </button>
                </>
              )}
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={photoCameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />
            <input
              type="file"
              ref={photoFileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />
            <input
              type="file"
              ref={videoCameraInputRef}
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleVideoFile(e.target.files)}
            />
            <input
              type="file"
              ref={videoFileInputRef}
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoFile(e.target.files)}
            />

            {/* Processing banner */}
            {processing && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 animate-pulse">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span>{processMsg || 'Đang xử lý tập tin...'}</span>
              </div>
            )}

            {/* Previews grid */}
            {(images.length > 0 || videoUrl) && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-2">
                {/* Images */}
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-[#DAE7C7] bg-stone-100 shadow-xs">
                    <img src={img} alt={`Đánh giá ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-[#C2522D] text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                      title="Xóa ảnh"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                      Ảnh {idx + 1}
                    </span>
                  </div>
                ))}

                {/* Video */}
                {videoUrl && (
                  <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-[#C2522D]/40 bg-black shadow-xs">
                    {videoPoster ? (
                      <img src={videoPoster} alt="Video poster" className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-900 text-white text-xs">Video</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-[#C2522D] text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                      title="Xóa video"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {videoDuration && (
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                        {videoDuration}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <p className="text-[11px] text-[#5E5E61]">
              * Kéo thả ảnh/video vào đây. Ảnh tự nén chuẩn 1280px (gốc &le;10MB). Video tối đa 30 giây (&le;20MB).
            </p>
          </div>

          {/* Anonymous toggle */}
          <div className="pt-2 border-t border-[#DAE7C7]/60">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-[#08482D] focus:ring-[#08482D] border-[#DAE7C7] cursor-pointer"
              />
              <span className="font-medium text-[#101410]">
                Ẩn tên của tôi <span className="text-[#5E5E61] font-normal">(Hiển thị thành "Người mua ẩn danh" trên trang sản phẩm)</span>
              </span>
            </label>
          </div>

          {/* Notice on edit limit */}
          {initialReview ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Lưu ý: Bạn chỉ được chỉnh sửa đánh giá này 1 lần duy nhất trong vòng 7 ngày.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl text-[11px] text-[#5E5E61]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-[#08482D]" />
              <span>Đánh giá của bạn sẽ giúp người mua sau hiểu rõ tình trạng món đồ vintage này!</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DAE7C7]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting || processing}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || processing || comment.trim().length < 10}
              className="px-6"
            >
              {submitting ? 'Đang gửi...' : initialReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
