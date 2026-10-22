import React, { useState } from 'react';
import { Settings2, UserCheck, Shield, RotateCcw, X, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { api, setStoredToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface DemoControllerProps {
  onRoleSwitched?: (role: 'buyer' | 'seller') => void;
  onDataReset?: () => void;
}

export function DemoController({ onRoleSwitched, onDataReset }: DemoControllerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { user, quickLogin, refreshUser } = useAuth();
  const { showToast } = useToast();

  const handleSwitchBuyer = async () => {
    setSwitching(true);
    try {
      const res = await api.switchBuyer();
      setStoredToken(res.token);
      await refreshUser();
      showToast('Đã chuyển sang vai Khách Mua (Nguyễn Văn A)', 'success');
      setIsOpen(false);
      if (onRoleSwitched) onRoleSwitched('buyer');
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển vai người mua', 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchSeller = async () => {
    setSwitching(true);
    try {
      const res = await api.switchSeller();
      setStoredToken(res.token);
      await refreshUser();
      showToast('Đã chuyển sang vai Chủ Tiệm (admin)', 'success');
      setIsOpen(false);
      if (onRoleSwitched) onRoleSwitched('seller');
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển vai người bán', 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      const res = await api.resetDemo();
      showToast(res.message, 'success');
      setShowConfirmReset(false);
      setIsOpen(false);
      if (onDataReset) {
        onDataReset();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khôi phục dữ liệu demo', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 print:hidden font-sans">
      {/* Floating Controller Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 bg-[#241A14] text-[#FFFBF4] rounded-full shadow-2xl border-2 border-[#DCCDB6] hover:bg-[#D9542B] transition-all duration-300 hover:scale-105 active:scale-95"
          title="Bảng điều khiển Demo 1-1"
        >
          <div className="relative">
            <Settings2 className="w-5 h-5 animate-spin-slow text-[#E3B23C] group-hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5E7048] rounded-full border-2 border-[#241A14]" />
          </div>
          <span className="font-serif text-xs font-bold tracking-wide">
            Điều Khiển Demo
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 uppercase">
            1-1
          </span>
        </button>
      )}

      {/* Floating Popup Card */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-[#FFFBF4] rounded-3xl border-2 border-[#DCCDB6] shadow-2xl overflow-hidden animate-fade-in text-[#241A14]">
          {/* Card Header */}
          <div className="p-4 bg-[#F4ECDF] border-b border-[#DCCDB6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#D9542B] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                ⚙️
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#241A14]">
                  Bảng Điều Khiển Demo
                </h4>
                <p className="text-[10px] text-[#74665B]">
                  Chuyển nhanh vai trò & reset cơ sở dữ liệu
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowConfirmReset(false);
              }}
              className="p-1.5 rounded-full hover:bg-[#EADFCC] text-[#74665B] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* Current Active Account Status */}
            <div className="p-3 bg-[#EADFCC]/60 rounded-2xl border border-[#DCCDB6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#74665B]">
                  Đang đăng nhập:
                </span>
                <div className="font-serif font-bold text-sm text-[#241A14]">
                  {user ? user.full_name : 'Chưa đăng nhập (Khách vãng lai)'}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                user?.role === 'seller' 
                  ? 'bg-[#D9542B] text-white' 
                  : user?.role === 'buyer' 
                  ? 'bg-[#5E7048] text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {user?.role === 'seller' ? 'Chủ Tiệm (Seller)' : user?.role === 'buyer' ? 'Khách Mua (Buyer)' : 'Guest'}
              </span>
            </div>

            {/* Role Switcher Actions */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#74665B] uppercase tracking-wider font-serif">
                Chuyển nhanh vai trò (Mô hình 1-1)
              </label>

              {/* Vào vai Khách mua */}
              <button
                onClick={handleSwitchBuyer}
                disabled={switching}
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  user?.role === 'buyer'
                    ? 'bg-[#5E7048]/10 border-[#5E7048] font-bold'
                    : 'bg-white border-[#DCCDB6] hover:border-[#5E7048] hover:bg-[#F4ECDF]/50'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-[#5E7048] text-white flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-xs text-[#241A14]">
                      Vào vai Khách hàng (Buyer)
                    </div>
                    <div className="text-[10px] font-mono text-[#74665B]">
                      SĐT: 0987654321 · MK: nguoidung
                    </div>
                  </div>
                </div>
                {user?.role === 'buyer' && (
                  <Check className="w-4 h-4 text-[#5E7048]" />
                )}
              </button>

              {/* Vào vai Người bán */}
              <button
                onClick={handleSwitchSeller}
                disabled={switching}
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  user?.role === 'seller'
                    ? 'bg-[#D9542B]/10 border-[#D9542B] font-bold'
                    : 'bg-white border-[#DCCDB6] hover:border-[#D9542B] hover:bg-[#F4ECDF]/50'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-[#D9542B] text-white flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-xs text-[#241A14]">
                      Vào vai Người bán (Seller)
                    </div>
                    <div className="text-[10px] font-mono text-[#74665B]">
                      admin · MK: admin
                    </div>
                  </div>
                </div>
                {user?.role === 'seller' && (
                  <Check className="w-4 h-4 text-[#D9542B]" />
                )}
              </button>
            </div>

            {/* Reset Database Section */}
            <div className="pt-2 border-t border-[#EADFCC]">
              {!showConfirmReset ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-[#B33F33]/40 text-[#B33F33] hover:bg-[#B33F33]/10 font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset dữ liệu demo ban đầu
                </button>
              ) : (
                <div className="p-3 bg-[#B33F33]/10 rounded-2xl border border-[#B33F33]/40 space-y-2.5 animate-fade-in">
                  <div className="flex items-start gap-2 text-[#B33F33]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug font-medium">
                      Xác nhận đưa hệ thống về trạng thái sạch ban đầu? (2 tài khoản mẫu, 10 sản phẩm gốc, 2 mã giảm giá, xóa toàn bộ đơn và đánh giá).
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(false)}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-xl border border-[#DCCDB6] bg-white text-[11px] font-bold text-[#74665B] hover:bg-[#EADFCC]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-xl bg-[#B33F33] text-white text-[11px] font-bold hover:bg-red-800 flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                      {resetting ? 'Đang reset...' : 'Đồng ý Reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
