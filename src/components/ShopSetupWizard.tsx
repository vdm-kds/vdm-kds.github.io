import React, { useState } from 'react';
import { 
  Store, Image as ImageIcon, MapPin, Phone, ArrowRight, ArrowLeft, 
  Check, Upload, AlertCircle, Sparkles, Palette 
} from 'lucide-react';
import { api } from '../services/api';
import { slugify, createShopAvatarSvg } from '../services/db';
import { compressImageFile } from '../utils/image';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

interface ShopSetupWizardProps {
  isOpen?: boolean;
  onSuccess?: (newShop: any) => void;
  onCancel?: () => void;
  onComplete?: (newShop?: any) => void;
  onClose?: () => void;
}

const PRESET_COVER_COLORS = [
  { label: 'Xanh rừng thông (Mặc định)', color: '#08482D' },
  { label: 'Nâu vintage ấm cúng', color: '#7A4E2D' },
  { label: 'Xanh chàm cổ điển', color: '#2F4B6B' },
  { label: 'Đỏ gạch nung', color: '#8B3A2B' },
  { label: 'Xanh rêu nhung', color: '#3B5A40' }
];

export const ShopSetupWizard: React.FC<ShopSetupWizardProps> = ({ 
  isOpen = true, 
  onSuccess, 
  onCancel, 
  onComplete, 
  onClose 
}) => {
  if (!isOpen) return null;

  const { user, refreshCartCount } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState(user?.shop_name || '');
  const [slug, setSlug] = useState(slugify(user?.shop_name || ''));
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');

  // Image State
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverColor, setCoverColor] = useState('#08482D');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // Logistics State
  const [pickupAddress, setPickupAddress] = useState((user as any)?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Validation
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUploadLoading(true);
      const compressed = await compressImageFile(file, 512, 0.85);
      const res = await api.uploadFile(compressed, 'image');
      setAvatarUrl(res.url);
      showToast('Đã tải ảnh đại diện thành công', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải ảnh', 'error');
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUploadLoading(true);
      const compressed = await compressImageFile(file, 1280, 0.85);
      const res = await api.uploadFile(compressed, 'image');
      setCoverImageUrl(res.url);
      showToast('Đã tải ảnh bìa thành công', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải ảnh', 'error');
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleNextFromStep1 = () => {
    if (!name.trim()) {
      showToast('Vui lòng nhập tên shop của bạn', 'error');
      return;
    }
    if (!slug.trim()) {
      showToast('Vui lòng nhập đường dẫn shop (slug)', 'error');
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setStep(3);
  };

  const handleFinish = async () => {
    if (!pickupAddress.trim()) {
      showToast('Vui lòng nhập địa chỉ lấy hàng để bưu tá đến nhận', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Vui lòng nhập số điện thoại liên hệ của shop', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const generatedAvatar = avatarUrl || createShopAvatarSvg(name.trim(), coverColor);
      const res = await api.createShop({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        avatar: generatedAvatar,
        cover_color: coverColor,
        cover_image: coverImageUrl || undefined,
        pickup_address: pickupAddress.trim(),
        phone: phone.trim()
      });

      showToast(res.message || 'Thiết lập shop thành công!', 'success');
      if (onComplete) onComplete(res.shop);
      if (onSuccess) onSuccess(res.shop);
    } catch (err: any) {
      showToast(err.message || 'Không thể tạo shop', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 my-8">
        {/* Header with Step indicator */}
        <div className="bg-[#F5F8EF] p-6 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#08482D] text-[#DAE7C7] flex items-center justify-center font-bold text-sm">
                <Store className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-serif font-black text-lg text-stone-900">Thiết lập gian hàng</h2>
                <p className="text-xs text-stone-500">Bước {step} trên 3: {step === 1 ? 'Thông tin shop' : step === 2 ? 'Hình ảnh đại diện & bìa' : 'Địa chỉ lấy hàng'}</p>
              </div>
            </div>

            {(onClose || onCancel) && (
              <button 
                onClick={() => {
                  if (onClose) onClose();
                  if (onCancel) onCancel();
                }} 
                className="text-xs text-stone-400 hover:text-stone-700"
              >
                Bỏ qua
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#08482D] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6">
          {/* STEP 1: THÔNG TIN SHOP */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Tên shop <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: Tiệm Đồ Cũ An Nhiên, Retro Bookshop..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-[#08482D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Đường dẫn shop (slug) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-stone-100 border border-r-0 border-stone-300 rounded-l-xl text-xs text-stone-500 font-mono">
                    /shop/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugEdited(true);
                    }}
                    placeholder="tiem-do-cu-an-nhien"
                    className="w-full px-3 py-2.5 rounded-r-xl border border-stone-300 text-sm font-mono focus:outline-none focus:border-[#08482D]"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Đường dẫn dùng để khách truy cập trực tiếp vào shop của bạn.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Mô tả ngắn về tiệm
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chia sẻ về gu đồ, xuất xứ, triết lý hoặc lời nhắn gửi đến khách ghé tiệm..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-[#08482D]"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleNextFromStep1} variant="primary">
                  Tiếp theo: Hình ảnh <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: HÌNH ẢNH */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Cover Color or Image */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-2">
                  Màu nền bìa hoặc ảnh bìa shop
                </label>
                
                {/* Color choices */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {PRESET_COVER_COLORS.map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setCoverColor(c.color)}
                      className={`h-10 rounded-xl relative transition-transform ${
                        coverColor === c.color ? 'ring-2 ring-offset-2 ring-[#08482D] scale-105' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {coverColor === c.color && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Upload machine cover */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 border border-dashed border-stone-300 rounded-xl p-3 text-center cursor-pointer hover:bg-stone-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFile}
                      className="hidden"
                    />
                    <span className="text-xs text-stone-600 font-semibold inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-stone-400" /> Tải ảnh bìa từ máy (nén 1280px)
                    </span>
                  </label>
                </div>
                {coverImageUrl && (
                  <p className="text-[11px] text-emerald-600 mt-1">✓ Đã chọn ảnh bìa riêng</p>
                )}
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-2">
                  Ảnh đại diện shop
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl || createShopAvatarSvg(name || 'Shop', coverColor)}
                    alt=""
                    className="w-16 h-16 rounded-full border-2 border-stone-200 object-cover bg-stone-100"
                  />
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Tải ảnh từ máy
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-stone-400">Nếu không tải ảnh, hệ thống sẽ tự tạo avatar chữ cái đầu trên nền màu bìa.</p>
                  </div>
                </div>
              </div>

              {/* Preview Banner */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden mt-4">
                <div 
                  className="h-16 relative"
                  style={{ 
                    backgroundColor: coverColor,
                    backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
                    backgroundSize: 'cover'
                  }}
                />
                <div className="p-3 bg-stone-50 flex items-center gap-3">
                  <img
                    src={avatarUrl || createShopAvatarSvg(name || 'Shop', coverColor)}
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-white -mt-6 object-cover shadow"
                  />
                  <div>
                    <p className="font-bold text-xs text-stone-900">{name || 'Tên shop'}</p>
                    <p className="text-[10px] text-stone-400 font-mono">@{slug || 'slug'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={() => setStep(1)} variant="secondary">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại
                </Button>
                <Button onClick={handleNextFromStep2} variant="primary">
                  Tiếp theo: Lấy hàng <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: LẤY HÀNG & LIÊN HỆ */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Địa chỉ lấy hàng (kho gửi) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-[#08482D]"
                />
                <p className="text-[11px] text-stone-400 mt-1">Đơn vị vận chuyển (GHN, GHTK, Viettel Post...) sẽ đến địa chỉ này để nhận bọc hàng.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Số điện thoại shop <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-[#08482D]"
                />
                <p className="text-[11px] text-stone-400 mt-1">Dùng để bưu tá liên lạc khi lấy kiện hàng và khách hàng hỗ trợ.</p>
              </div>

              <div className="p-4 bg-[#DAE7C7]/50 rounded-2xl border border-[#08482D]/20 text-xs text-stone-700">
                <p className="font-bold text-[#08482D] mb-1">✓ Chuẩn bị sẵn sàng!</p>
                <p>Sau khi hoàn tất, shop của bạn sẽ chính thức mở cửa trên chợ Đồ Cũ Còn Thương và bạn có thể đăng món đồ đầu tiên ngay lập tức.</p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={() => setStep(2)} variant="secondary" disabled={submitting}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại
                </Button>
                <Button onClick={handleFinish} variant="primary" disabled={submitting}>
                  {submitting ? 'Đang tạo shop...' : 'Hoàn tất & Mở shop'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
