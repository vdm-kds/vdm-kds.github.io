import React, { useState, useEffect } from 'react';
import { X, Lock, Phone, User, Store, ArrowRight, ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from './Button';

interface AuthModalProps {
  isOpen: boolean;
  role?: 'buyer' | 'seller';
  initialIsRegister?: boolean;
  promptMessage?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  role = 'buyer',
  initialIsRegister = false,
  promptMessage,
  onClose,
  onSuccess
}) => {
  const { login, register } = useAuth();
  const [activeRole, setActiveRole] = useState<'buyer' | 'seller'>(role);
  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [loading, setLoading] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field values
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setActiveRole(role);
      setIsRegister(initialIsRegister);
      setFieldErrors({});
      setGeneralError('');
      // Check presentation mode
      api.getPresentationMode().then(res => setPresentationMode(!!res.presentation_mode)).catch(() => {});
    }
  }, [isOpen, role, initialIsRegister]);

  // Clear specific error on field change
  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value);
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) setGeneralError('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errors: Record<string, string> = {};

    if (isRegister && presentationMode) {
      setGeneralError('Chế độ thuyết trình đang bật — không thể tạo tài khoản mới. Vui lòng sử dụng 2 tài khoản chủ có sẵn.');
      return;
    }

    if (isRegister) {
      if (!fullName.trim()) {
        errors.fullName = 'Họ và tên không được để trống';
      }

      if (activeRole === 'buyer') {
        const rawPhone = phone.trim();
        const cleanPhone = rawPhone.replace(/[\s\-\.]/g, '').replace(/^\+84/, '0');
        if (!cleanPhone || !/^0\d{9}$/.test(cleanPhone)) {
          errors.phone = 'Số điện thoại phải gồm đúng 10 số và bắt đầu bằng số 0';
        }
      } else {
        // Seller
        if (!shopName.trim()) {
          errors.shopName = 'Vui lòng nhập tên gian hàng của bạn';
        }
        const cleanUsername = username.trim().toLowerCase();
        if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
          errors.username = 'Tên đăng nhập phải từ 3 đến 30 ký tự';
        } else if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
          errors.username = 'Tên đăng nhập chỉ gồm chữ thường, số và dấu gạch dưới';
        }
      }

      if (!password) {
        errors.password = 'Vui lòng nhập mật khẩu';
      } else if (password.length < 8) {
        errors.password = 'Mật khẩu phải có tối thiểu 8 ký tự';
      }

      if (password !== confirmPassword) {
        errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      }
    } else {
      // Login validation
      if (activeRole === 'buyer') {
        const clean = (phone || username).trim().replace(/[\s\-\.]/g, '').replace(/^\+84/, '0');
        if (!clean) {
          errors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^0\d{9}$/.test(clean)) {
          errors.phone = 'Số điện thoại phải gồm đúng 10 số và bắt đầu bằng số 0';
        }
      } else {
        if (!username.trim()) {
          errors.username = 'Vui lòng nhập tên đăng nhập';
        }
      }

      if (!password) {
        errors.password = 'Vui lòng nhập mật khẩu';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({
          username: activeRole === 'seller' ? username.trim().toLowerCase() : undefined,
          phone: activeRole === 'buyer' ? phone.trim().replace(/[\s\-\.]/g, '').replace(/^\+84/, '0') : (phone.trim() || undefined),
          password,
          full_name: fullName.trim(),
          role: activeRole,
          shop_name: activeRole === 'seller' ? shopName.trim() : undefined,
          address: activeRole === 'buyer' ? address.trim() : undefined
        });
      } else {
        const identifier = activeRole === 'buyer' 
          ? (phone || username).trim().replace(/[\s\-\.]/g, '').replace(/^\+84/, '0')
          : username.trim().toLowerCase();

        await login(identifier, password, activeRole);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setGeneralError(err.message || 'Thao tác không thành công, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-[#DAE7C7] shadow-2xl p-6 sm:p-8 space-y-4 relative text-[#101410] max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-[#E2E8D8] rounded-full mx-auto mb-2" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#5E5E61] hover:text-[#101410] p-1.5 rounded-full hover:bg-[#F5F8EF] transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 2 Tabs: Tôi là người mua | Tôi là người bán */}
        <div className="flex rounded-2xl bg-[#F5F8EF] p-1 border border-[#E2E8D8]">
          <button
            type="button"
            onClick={() => {
              setActiveRole('buyer');
              setFieldErrors({});
              setGeneralError('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeRole === 'buyer'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#08482D]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Tôi là người mua</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole('seller');
              setFieldErrors({});
              setGeneralError('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeRole === 'seller'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#08482D]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Tôi là người bán</span>
          </button>
        </div>

        {/* Title & subtitle */}
        <div className="text-center space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold text-[#101410]">
            {activeRole === 'seller'
              ? (isRegister ? 'Đăng ký tài khoản Người bán' : 'Đăng nhập Kênh Người bán')
              : (isRegister ? 'Đăng ký tài khoản Khách mua' : 'Đăng nhập Mua hàng')}
          </h3>
          <p className="text-xs text-[#5E5E61]">
            {activeRole === 'seller'
              ? 'Quản lý cửa hàng, duyệt đơn, tạo mã giảm giá và vận chuyển'
              : 'Đăng nhập bằng số điện thoại để đặt hàng, trả giá và theo dõi đơn'}
          </p>
        </div>

        {/* Contextual prompt message from guest actions */}
        {promptMessage && (
          <div className="p-3 bg-[#DAE7C7]/70 border border-[#08482D]/20 rounded-2xl text-xs text-[#08482D] font-semibold text-center flex items-center justify-center gap-2">
            <span>✨</span>
            <span>{promptMessage}</span>
          </div>
        )}

        {/* Presentation mode warning banner */}
        {presentationMode && isRegister && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Chế độ thuyết trình đang bật</strong> — không thể tạo tài khoản mới. Vui lòng sử dụng tài khoản có sẵn để tiếp tục.
            </p>
          </div>
        )}

        {/* General Error Message */}
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* SELLER REGISTRATION FIELDS */}
          {isRegister && activeRole === 'seller' && (
            <>
              <div>
                <label className="font-semibold text-[#101410] block mb-1">Tên gian hàng / Shop *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={e => handleFieldChange('shopName', e.target.value, setShopName)}
                  placeholder="Ví dụ: Tiệm Gỗ Cũ & Đồ Da Vintage"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm ${
                    fieldErrors.shopName ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                  }`}
                />
                {fieldErrors.shopName && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.shopName}</p>}
              </div>

              <div>
                <label className="font-semibold text-[#101410] block mb-1">Họ tên chủ shop *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => handleFieldChange('fullName', e.target.value, setFullName)}
                  placeholder="Nhập họ và tên đầy đủ..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm ${
                    fieldErrors.fullName ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                  }`}
                />
                {fieldErrors.fullName && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label className="font-semibold text-[#101410] block mb-1">
                  Tên đăng nhập (chữ thường, số, gạch dưới) *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => handleFieldChange('username', e.target.value, setUsername)}
                  placeholder="Tên đăng nhập của shop"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm font-mono ${
                    fieldErrors.username ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                  }`}
                />
                {fieldErrors.username && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.username}</p>}
              </div>

              <div>
                <label className="font-semibold text-[#101410] block mb-1">Số điện thoại liên hệ (tùy chọn)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => handleFieldChange('phone', e.target.value, setPhone)}
                  placeholder="09xxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm font-mono"
                />
              </div>
            </>
          )}

          {/* BUYER REGISTRATION FIELDS */}
          {isRegister && activeRole === 'buyer' && (
            <>
              <div>
                <label className="font-semibold text-[#101410] block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => handleFieldChange('fullName', e.target.value, setFullName)}
                  placeholder="Nhập họ và tên người nhận..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm ${
                    fieldErrors.fullName ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                  }`}
                />
                {fieldErrors.fullName && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label className="font-semibold text-[#101410] block mb-1">
                  Số điện thoại nhận hàng (10 chữ số) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => handleFieldChange('phone', e.target.value, setPhone)}
                  placeholder="09xxxxxxxx (10 chữ số)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm font-mono ${
                    fieldErrors.phone ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                  }`}
                />
                {fieldErrors.phone && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.phone}</p>}
              </div>

              <div>
                <label className="font-semibold text-[#101410] block mb-1">Địa chỉ giao hàng mặc định (tùy chọn)</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => handleFieldChange('address', e.target.value, setAddress)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm"
                />
              </div>
            </>
          )}

          {/* LOGIN IDENTIFIER FIELD */}
          {!isRegister && (
            <div>
              <label className="font-semibold text-[#101410] block mb-1">
                {activeRole === 'buyer' ? 'Số điện thoại của bạn *' : 'Tên đăng nhập người bán *'}
              </label>
              <input
                type={activeRole === 'buyer' ? 'tel' : 'text'}
                required
                value={activeRole === 'buyer' ? (phone || username) : username}
                onChange={e => {
                  const val = e.target.value;
                  if (activeRole === 'buyer') {
                    handleFieldChange('phone', val, setPhone);
                    setUsername(val);
                  } else {
                    handleFieldChange('username', val, setUsername);
                  }
                }}
                placeholder={activeRole === 'buyer' ? '09xxxxxxxx (10 chữ số)' : 'Tên đăng nhập của shop'}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm font-mono ${
                  fieldErrors[activeRole === 'buyer' ? 'phone' : 'username']
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#DAE7C7] focus:border-[#08482D]'
                }`}
              />
              {fieldErrors[activeRole === 'buyer' ? 'phone' : 'username'] && (
                <p className="text-red-600 text-[11px] mt-1">
                  {fieldErrors[activeRole === 'buyer' ? 'phone' : 'username']}
                </p>
              )}
            </div>
          )}

          {/* PASSWORD FIELD WITH EYE TOGGLE */}
          <div>
            <label className="font-semibold text-[#101410] block mb-1">Mật khẩu *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => handleFieldChange('password', e.target.value, setPassword)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm ${
                  fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E5E61] hover:text-[#101410] p-1"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-600 text-[11px] mt-1">{fieldErrors.password}</p>}
          </div>

          {/* CONFIRM PASSWORD FIELD FOR REGISTRATION */}
          {isRegister && (
            <div>
              <label className="font-semibold text-[#101410] block mb-1">Nhập lại mật khẩu *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => handleFieldChange('confirmPassword', e.target.value, setConfirmPassword)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-[#F5F8EF] focus:bg-white focus:outline-none text-sm ${
                    fieldErrors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-[#DAE7C7] focus:border-[#08482D]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E5E61] hover:text-[#101410] p-1"
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-red-600 text-[11px] mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={isRegister && presentationMode}
              className="w-full text-xs font-bold"
            >
              <span>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập ngay'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>

        {/* Toggle Login <-> Register */}
        <div className="pt-3 border-t border-[#E2E8D8] text-center text-xs text-[#5E5E61]">
          {isRegister ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setFieldErrors({});
                  setGeneralError('');
                }}
                className="font-bold text-[#08482D] hover:underline"
              >
                Đăng nhập ngay
              </button>
            </span>
          ) : (
            <span>
              Chưa có tài khoản {activeRole === 'seller' ? 'người bán' : 'khách hàng'}?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setFieldErrors({});
                  setGeneralError('');
                }}
                className="font-bold text-[#08482D] hover:underline"
              >
                Đăng ký mới
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
