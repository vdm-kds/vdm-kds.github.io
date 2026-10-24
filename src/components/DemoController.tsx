import React, { useState, useEffect } from 'react';
import { Settings2, UserCheck, Shield, RotateCcw, X, Check, AlertTriangle, Eye, UserX, FastForward, Truck } from 'lucide-react';
import { api, setStoredToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Order } from '../types';
import { formatVND } from '../utils/format';

interface DemoControllerProps {
  onRoleSwitched?: (role: 'buyer' | 'seller' | 'guest') => void;
  onDataReset?: () => void;
}

export function DemoController({ onRoleSwitched, onDataReset }: DemoControllerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Fast-forward shipment states
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [fastForwarding, setFastForwarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const fetchEligibleOrders = async () => {
    try {
      const res = await api.getEligibleShipmentOrders();
      setEligibleOrders(res.orders || []);
      if (res.orders && res.orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(res.orders[0].id);
      }
    } catch {
      // quiet fail
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEligibleOrders();
    }
  }, [isOpen]);

  const handleFastForward = async () => {
    if (!selectedOrderId || fastForwarding) return;

    setFastForwarding(true);
    setCurrentStep(1);

    const stepNames = [
      'Bàn giao cho ĐVVC',
      'Đến kho phân loại',
      'Đang giao hàng',
      'Giao hàng thành công'
    ];

    try {
      for (let s = 1; s <= 4; s++) {
        setCurrentStep(s);
        const res = await api.advanceShipmentStep(selectedOrderId, s);
        showToast(`Bước ${s}/4: ${stepNames[s-1]}`, 'info');
        
        if (s < 4) {
          // 3 second delay
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      showToast('Đã tua nhanh vận chuyển 4 bước thành công! Đơn hàng đã ở trạng thái ĐÃ GIAO.', 'success');
      await fetchEligibleOrders();
      if (onDataReset) onDataReset();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tua nhanh vận chuyển', 'error');
    } finally {
      setFastForwarding(false);
      setCurrentStep(0);
    }
  };

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

  const handleSwitchGuest = () => {
    logout();
    setIsOpen(false);
    showToast('Đang xem giao diện dưới vai Khách vãng lai', 'info');
    if (onRoleSwitched) onRoleSwitched('guest');
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
          className="group relative flex items-center gap-2.5 px-4 py-2.5 bg-[#08482D] text-white rounded-full shadow-2xl border-2 border-[#DAE7C7] hover:bg-[#063A24] transition-all duration-300 hover:scale-105 active:scale-95"
          title="Bảng điều khiển Demo 1-1"
        >
          <div className="relative">
            <Settings2 className="w-5 h-5 text-[#DAE7C7] group-hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DAE7C7] rounded-full border-2 border-[#08482D]" />
          </div>
          <span className="text-xs font-bold tracking-wide">
            Điều Khiển Demo
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/15 uppercase">
            1-1
          </span>
        </button>
      )}

      {/* Floating Popup Card */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-3xl border border-[#E2E8D8] shadow-2xl overflow-hidden animate-fade-in text-[#101410]">
          {/* Card Header */}
          <div className="p-4 bg-[#F5F8EF] border-b border-[#E2E8D8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#08482D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                ⚙️
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#101410]">
                  Bảng Điều Khiển Demo
                </h4>
                <p className="text-[10px] text-[#5E5E61]">
                  Chuyển nhanh vai trò & reset cơ sở dữ liệu
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowConfirmReset(false);
              }}
              className="p-1.5 rounded-full hover:bg-[#DAE7C7]/40 text-[#5E5E61] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* Current Active Account Status */}
            <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#E2E8D8] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E5E61]">
                  Đang đăng nhập:
                </span>
                <div className="font-bold text-sm text-[#101410]">
                  {user ? user.full_name : 'Khách vãng lai (Chưa đăng nhập)'}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                user?.role === 'seller' 
                  ? 'bg-[#08482D] text-white' 
                  : user?.role === 'buyer' 
                  ? 'bg-[#DAE7C7] text-[#08482D]'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {user?.role === 'seller' ? 'Chủ Tiệm (Seller)' : user?.role === 'buyer' ? 'Khách Mua (Buyer)' : 'Khách'}
              </span>
            </div>

            {/* Role Switcher Actions */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#5E5E61] uppercase tracking-wider block">
                Chuyển nhanh vai trò (Mô hình 1-1)
              </label>

              {/* 1. Vào vai Khách mua */}
              <button
                onClick={handleSwitchBuyer}
                disabled={switching}
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  user?.role === 'buyer'
                    ? 'bg-[#DAE7C7]/40 border-[#08482D] font-bold'
                    : 'bg-white border-[#E2E8D8] hover:border-[#08482D] hover:bg-[#F5F8EF]'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-[#08482D] text-white flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#101410]">
                      Vào vai Khách hàng (Buyer)
                    </div>
                    <div className="text-[10px] font-mono text-[#5E5E61]">
                      SĐT: 0987654321 · MK: nguoidung
                    </div>
                  </div>
                </div>
                {user?.role === 'buyer' && (
                  <Check className="w-4 h-4 text-[#08482D]" />
                )}
              </button>

              {/* 2. Vào vai Người bán */}
              <button
                onClick={handleSwitchSeller}
                disabled={switching}
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  user?.role === 'seller'
                    ? 'bg-[#08482D]/10 border-[#08482D] font-bold'
                    : 'bg-white border-[#E2E8D8] hover:border-[#08482D] hover:bg-[#F5F8EF]'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-[#08482D] text-white flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#101410]">
                      Vào vai Người bán (Seller)
                    </div>
                    <div className="text-[10px] font-mono text-[#5E5E61]">
                      admin · MK: admin
                    </div>
                  </div>
                </div>
                {user?.role === 'seller' && (
                  <Check className="w-4 h-4 text-[#08482D]" />
                )}
              </button>

              {/* 3. Xem như Khách vãng lai (2.7) */}
              <button
                onClick={handleSwitchGuest}
                disabled={switching}
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  !user
                    ? 'bg-[#DAE7C7]/40 border-[#08482D] font-bold'
                    : 'bg-white border-[#E2E8D8] hover:border-[#08482D] hover:bg-[#F5F8EF]'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-[#DAE7C7] text-[#08482D] flex items-center justify-center font-bold">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#101410]">
                      Xem như khách vãng lai
                    </div>
                    <div className="text-[10px] text-[#5E5E61]">
                      Đăng xuất để thấy Hero dải thẻ cong
                    </div>
                  </div>
                </div>
                {!user && (
                  <Check className="w-4 h-4 text-[#08482D]" />
                )}
              </button>
            </div>

            {/* FAST-FORWARD SHIPMENT (TUA NHANH VẬN CHUYỂN) */}
            <div className="pt-2 border-t border-[#E2E8D8] space-y-2">
              <label className="text-[11px] font-bold text-[#08482D] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FastForward className="w-3.5 h-3.5" />
                  Tua nhanh vận chuyển (Demo)
                </span>
                {fastForwarding && (
                  <span className="text-[10px] text-amber-700 font-mono animate-pulse font-bold">
                    Đang tua: {currentStep}/4
                  </span>
                )}
              </label>

              {eligibleOrders.length === 0 ? (
                <p className="text-[11px] text-[#5E5E61] italic">
                  Không có đơn hàng nào ở trạng thái Chờ duyệt / Chờ lấy / Đang giao để tua.
                </p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                    disabled={fastForwarding}
                    className="w-full px-3 py-2 text-xs bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl focus:outline-none"
                  >
                    {eligibleOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        #{o.code} ({o.status === 'pending' ? 'Chờ duyệt' : o.status === 'confirmed' ? 'Chờ lấy' : 'Đang giao'} - {formatVND(o.total)})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleFastForward}
                    disabled={fastForwarding || !selectedOrderId}
                    className="w-full py-2.5 px-3 rounded-2xl bg-[#08482D] hover:bg-[#073d26] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
                  >
                    <Truck className={`w-4 h-4 ${fastForwarding ? 'animate-bounce' : ''}`} />
                    {fastForwarding ? `Đang tua: ${currentStep}/4...` : 'Tua nhanh 4 bước vận chuyển (3s)'}
                  </button>
                </div>
              )}
            </div>

            {/* Reset Database Section */}
            <div className="pt-2 border-t border-[#E2E8D8]">
              {!showConfirmReset ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-[#B3362F]/40 text-[#B3362F] hover:bg-[#F6DDDB] font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset dữ liệu demo ban đầu
                </button>
              ) : (
                <div className="p-3 bg-[#F6DDDB] rounded-2xl border border-[#B3362F]/40 space-y-2.5 animate-fade-in">
                  <div className="flex items-start gap-2 text-[#B3362F]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug font-medium">
                      Xác nhận đưa hệ thống về trạng thái sạch ban đầu? (2 tài khoản mẫu, 10 sản phẩm gốc, 2 mã giảm giá, xóa toàn bộ đơn và đánh giá).
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(false)}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-xl border border-[#E2E8D8] bg-white text-[11px] font-bold text-[#5E5E61] hover:bg-[#F5F8EF]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-xl bg-[#B3362F] text-white text-[11px] font-bold hover:bg-red-800 flex items-center gap-1.5 shadow-xs"
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
