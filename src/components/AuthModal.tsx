import React, { useState } from 'react';
import { X, Lock, Phone, User, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  role: 'buyer' | 'seller';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  role,
  onClose,
  onSuccess
}) => {
  const { login, register, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          username: role === 'seller' ? username : undefined,
          phone: role === 'buyer' ? (phone || username) : undefined,
          password,
          full_name: fullName,
          role,
          address: role === 'buyer' ? address : undefined
        });
      } else {
        await login(
          role === 'buyer' ? (phone || username) : username,
          password,
          role
        );
      }
      onSuccess();
      onClose();
    } catch {
      // toast shown in context
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async () => {
    setLoading(true);
    try {
      await quickLogin(role);
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E6DFD5] text-[#47533E] mx-auto flex items-center justify-center mb-2">
            {role === 'seller' ? <Store className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#2C2724]">
            {role === 'seller' 
              ? (isRegister ? 'Đăng ký tài khoản Người bán' : 'Kênh Đăng nhập Người bán')
              : (isRegister ? 'Đăng ký tài khoản Khách mua' : 'Đăng nhập Mua hàng')}
          </h3>
          <p className="text-xs text-[#786F66]">
            {role === 'seller'
              ? 'Dành cho chủ shop quản lý kho và xử lý đơn hàng'
              : 'Đăng nhập bằng số điện thoại để đặt và theo dõi đơn'}
          </p>
        </div>

        {/* Quick Demo Login Pill */}
        {!isRegister && (
          <div className="p-3 bg-[#FAF3E8] border border-[#E8DEC8] rounded-2xl flex items-center justify-between gap-2 text-xs">
            <div className="text-[#7A6436]">
              <span className="font-bold block">Tài khoản có sẵn:</span>
              <span className="font-mono text-[11px]">
                {role === 'seller' ? 'admin / admin' : '0987654321 / nguoidung'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuick}
              disabled={loading}
              className="px-3 py-1.5 bg-[#47533E] text-white rounded-xl text-xs font-bold hover:bg-[#384331] shrink-0"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegister && (
            <div>
              <label className="font-semibold text-[#524B46] block mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-sm"
              />
            </div>
          )}

          {role === 'buyer' ? (
            <div>
              <label className="font-semibold text-[#524B46] block mb-1">
                Số điện thoại (10 chữ số) *
              </label>
              <input
                type="tel"
                required
                value={phone || username}
                onChange={e => {
                  setPhone(e.target.value);
                  setUsername(e.target.value);
                }}
                placeholder="0987654321"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-sm font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="font-semibold text-[#524B46] block mb-1">
                Tên đăng nhập người bán *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-sm"
              />
            </div>
          )}

          <div>
            <label className="font-semibold text-[#524B46] block mb-1">Mật khẩu *</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-sm"
            />
          </div>

          {isRegister && role === 'buyer' && (
            <div>
              <label className="font-semibold text-[#524B46] block mb-1">Địa chỉ giao hàng mặc định</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="128 Đường Hai Bà Trưng, Quận 1, TP.HCM"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] focus:bg-white text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#47533E] hover:bg-[#384331] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <span>{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="pt-3 border-t border-[#E6DFD5] text-center text-xs text-[#786F66]">
          {isRegister ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-bold text-[#47533E] hover:underline"
              >
                Đăng nhập ngay
              </button>
            </span>
          ) : (
            <span>
              Chưa có tài khoản {role === 'seller' ? 'người bán' : 'khách hàng'}?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="font-bold text-[#47533E] hover:underline"
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
