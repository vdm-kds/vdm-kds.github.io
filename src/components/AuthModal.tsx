import React, { useState, useEffect } from 'react';
import { X, Lock, Phone, User, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

interface AuthModalProps {
  isOpen: boolean;
  role: 'buyer' | 'seller';
  initialIsRegister?: boolean;
  promptMessage?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  role,
  initialIsRegister = false,
  promptMessage,
  onClose,
  onSuccess
}) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [loading, setLoading] = useState(false);

  // Sync initialIsRegister when modal opens
  useEffect(() => {
    setIsRegister(initialIsRegister);
  }, [initialIsRegister, isOpen]);

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
          username: role === 'seller' ? username.trim() : undefined,
          phone: role === 'buyer' ? (phone || username).trim() : undefined,
          password,
          full_name: fullName.trim(),
          role,
          address: role === 'buyer' ? address.trim() : undefined
        });
      } else {
        await login(
          role === 'buyer' ? (phone || username).trim() : username.trim(),
          password,
          role
        );
      }
      onSuccess();
      onClose();
    } catch {
      // toast error handled in context/api
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 relative text-[#101410]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#5E5E61] hover:text-[#101410] p-1 rounded-full hover:bg-[#F5F8EF]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#DAE7C7]/50 border border-[#DAE7C7] text-[#08482D] mx-auto flex items-center justify-center mb-2">
            {role === 'seller' ? <Store className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h3 className="text-2xl font-bold text-[#101410]">
            {role === 'seller' 
              ? (isRegister ? 'Đăng ký tài khoản Người bán' : 'Kênh Đăng nhập Người bán')
              : (isRegister ? 'Đăng ký tài khoản Khách mua' : 'Đăng nhập Mua hàng')}
          </h3>
          <p className="text-xs text-[#5E5E61]">
            {role === 'seller'
              ? 'Dành cho người bán quản lý kho hàng và xử lý đơn'
              : 'Đăng nhập bằng số điện thoại để mua hàng và theo dõi đơn'}
          </p>
        </div>

        {promptMessage && (
          <div className="p-3 bg-[#DAE7C7]/60 border border-[#08482D]/20 rounded-2xl text-xs text-[#08482D] font-medium text-center">
            {promptMessage}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegister && (
            <div>
              <label className="font-semibold text-[#101410] block mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nhập họ và tên..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm"
              />
            </div>
          )}

          {role === 'buyer' ? (
            <div>
              <label className="font-semibold text-[#101410] block mb-1">
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
                placeholder="09xxxxxxxx (10 chữ số)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="font-semibold text-[#101410] block mb-1">
                Tên đăng nhập người bán *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm"
              />
            </div>
          )}

          <div>
            <label className="font-semibold text-[#101410] block mb-1">Mật khẩu *</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm"
            />
          </div>

          {isRegister && role === 'buyer' && (
            <div>
              <label className="font-semibold text-[#101410] block mb-1">Địa chỉ giao hàng mặc định</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] focus:bg-white focus:outline-none focus:border-[#08482D] text-sm"
              />
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full text-xs font-bold"
            >
              <span>{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>

        {/* Toggle between Login and Register */}
        <div className="pt-3 border-t border-[#E2E8D8] text-center text-xs text-[#5E5E61]">
          {isRegister ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-bold text-[#08482D] hover:underline"
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
