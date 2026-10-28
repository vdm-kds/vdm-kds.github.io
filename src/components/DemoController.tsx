import React, { useState, useEffect } from 'react';
import { Settings2, UserCheck, Shield, RotateCcw, X, Check, AlertTriangle, Eye, FastForward, Truck, Presentation } from 'lucide-react';
import { api, setStoredToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Order } from '../types';
import { formatVND } from '../utils/format';

interface DemoControllerProps {
  onRoleSwitched?: (role: 'buyer' | 'seller' | 'guest') => void;
  onDataReset?: () => void;
  onPresentationModeChange?: (enabled: boolean) => void;
}

export function DemoController({ onRoleSwitched, onDataReset, onPresentationModeChange }: DemoControllerProps) {
  const { user, logout, switchRole } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [resetConfirmStep, setResetConfirmStep] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Presentation Mode state
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [loadingPresentationMode, setLoadingPresentationMode] = useState<boolean>(false);

  // Fast-forward shipment states
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [fastForwarding, setFastForwarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Only owners (is_owner === true) can view or use DemoController
  if (!user || !user.is_owner) {
    return null;
  }

  const fetchPresentationMode = async () => {
    try {
      const res = await api.getPresentationMode();
      setPresentationMode(!!res.presentation_mode);
      if (onPresentationModeChange) onPresentationModeChange(!!res.presentation_mode);
    } catch {
      // quiet fail
    }
  };

  const handleTogglePresentationMode = async () => {
    setLoadingPresentationMode(true);
    try {
      const target = !presentationMode;
      const res = await api.setPresentationMode(target);
      setPresentationMode(res.presentation_mode);
      if (onPresentationModeChange) onPresentationModeChange(res.presentation_mode);
      showToast(
        res.presentation_mode 
          ? 'Đã BẬT Chế độ thuyết trình: Chỉ tài khoản chủ được đặt hàng/chat/trả giá' 
          : 'Đã TẮT Chế độ thuyết trình', 
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật chế độ thuyết trình', 'error');
    } finally {
      setLoadingPresentationMode(false);
    }
  };

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
    fetchPresentationMode();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleOrders();
      fetchPresentationMode();
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
        await api.advanceShipmentStep(selectedOrderId, s);
        showToast(`Bước ${s}/4: ${stepNames[s - 1]}`, 'info');
        
        if (s < 4) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      showToast('Đã tua nhanh vận chuyển 4 bước thành công! Đơn hàng đã chuyển sang ĐÃ GIAO.', 'success');
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
      await switchRole(2); // Buyer ID 2 (0987654321)
      setIsOpen(false);
      if (onRoleSwitched) onRoleSwitched('buyer');
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển vai người mua', 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchSeller = async () => {
    await handleSwitchSellerShop('admin');
  };

  const handleSwitchSellerShop = async (username: string) => {
    setSwitching(true);
    try {
      let targetUserId = 1;
      if (username === 'goc_sach_nhac') targetUserId = 3;
      else if (username === 'retro_tech') targetUserId = 4;
      await switchRole(targetUserId);
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
      setResetConfirmStep(0);
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
    <div className="fixed bottom-24 sm:bottom-5 left-4 sm:left-5 z-40 print:hidden font-sans">
      {/* Floating Controller Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 bg-[#08482D] text-white rounded-full shadow-2xl border-2 border-[#DAE7C7] hover:bg-[#063A24] transition-all duration-300 hover:scale-105 active:scale-95"
          title="Bảng điều khiển dành cho chủ tiệm"
        >
          <div className="relative">
            <Settings2 className="w-5 h-5 text-[#DAE7C7] group-hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DAE7C7] rounded-full border-2 border-[#08482D]" />
          </div>
          <span className="text-xs font-bold tracking-wide">
            Điều Khiển Demo
          </span>
          {presentationMode && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold uppercase">
              Thuyết trình
            </span>
          )}
        </button>
      )}

      {/* Floating Popup Card */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl overflow-hidden animate-fade-in text-[#101410]">
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
                  Dành riêng cho tài khoản chủ tiệm
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setResetConfirmStep(0);
              }}
              className="p-1.5 rounded-full hover:bg-[#DAE7C7]/40 text-[#5E5E61] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
            {/* Current Active Account Status */}
            <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#DAE7C7] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E5E61]">
                  Tài khoản đang đăng nhập:
                </span>
                <div className="font-bold text-sm text-[#101410]">
                  {user ? user.full_name : 'Khách vãng lai'}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                user?.role === 'seller' 
                  ? 'bg-[#08482D] text-white' 
                  : 'bg-[#DAE7C7] text-[#08482D]'
              }`}>
                {user?.role === 'seller' ? 'Chủ Tiệm (Seller)' : 'Khách Mua (Buyer)'}
              </span>
            </div>

            {/* PRESENTATION MODE TOGGLE */}
            <div className="p-3.5 bg-gradient-to-r from-[#F5F8EF] to-white rounded-2xl border border-[#DAE7C7] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Presentation className="w-4 h-4 text-[#08482D]" />
                  <span className="font-bold text-xs text-[#101410]">Chế độ thuyết trình</span>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePresentationMode}
                  disabled={loadingPresentationMode}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    presentationMode ? 'bg-[#08482D]' : 'bg-stone-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      presentationMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-[#5E5E61] leading-relaxed">
                Khi bật, chỉ tài khoản chủ được đặt hàng, chat, trả giá và đánh giá. Người dùng khác chỉ xem được sản phẩm.
              </p>
            </div>

            {/* Role Switcher Actions */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#5E5E61] uppercase tracking-wider block">
                Chuyển nhanh vai trò
              </label>

              {/* 1. Vào vai Khách mua chủ */}
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
                    <div className="text-[10px] text-[#5E5E61]">
                      Tài khoản khách mua chủ tiệm
                    </div>
                  </div>
                </div>
                {user?.role === 'buyer' && (
                  <Check className="w-4 h-4 text-[#08482D]" />
                )}
              </button>

              {/* 2. Vào vai Người bán (Chọn 1 trong 3 shop chủ) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-[#5E5E61] uppercase tracking-wider block px-1">
                  Vào vai Người bán (3 Shop Chủ)
                </span>
                {[
                  { username: 'admin', name: 'Đồ Cũ Còn Thương', desc: 'Thời trang, phụ kiện, gia dụng', color: '#08482D' },
                  { username: 'goc_sach_nhac', name: 'Góc Sách & Nhạc', desc: 'Sách xưa, guitar, nhạc cụ', color: '#7A4E2D' },
                  { username: 'retro_tech', name: 'Retro Tech', desc: 'Máy ảnh film, iPhone, tai nghe, phím cơ', color: '#2F4B6B' }
                ].map((s) => {
                  const isCurrent = user?.role === 'seller' && user?.username === s.username;
                  return (
                    <button
                      key={s.username}
                      onClick={() => handleSwitchSellerShop(s.username)}
                      disabled={switching}
                      className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all text-left ${
                        isCurrent
                          ? 'bg-[#DAE7C7]/50 border-[#08482D] font-bold shadow-2xs'
                          : 'bg-white border-[#E2E8D8] hover:border-[#08482D] hover:bg-[#F5F8EF]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ backgroundColor: s.color }}
                        >
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#101410] truncate">
                            {s.name}
                          </div>
                          <div className="text-[10px] text-[#5E5E61] truncate">
                            @{s.username} • {s.desc}
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="w-4 h-4 text-[#08482D] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 3. Xem như Khách vãng lai */}
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
                      Đăng xuất để thấy Hero landing
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

            {/* Reset Database Section (2 Confirmations Required) */}
            <div className="pt-2 border-t border-[#E2E8D8]">
              {resetConfirmStep === 0 && (
                <button
                  type="button"
                  onClick={() => setResetConfirmStep(1)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-[#B3362F]/40 text-[#B3362F] hover:bg-[#F6DDDB] font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset dữ liệu demo ban đầu
                </button>
              )}

              {resetConfirmStep === 1 && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-2.5 animate-fade-in">
                  <div className="flex items-start gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <p className="text-[11px] leading-snug font-medium">
                      <strong>Bạn có chắc?</strong> Toàn bộ đơn hàng mới, tin nhắn, trả giá và đánh giá thử nghiệm sẽ bị làm mới.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setResetConfirmStep(0)}
                      className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-[11px] font-bold text-[#5E5E61]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirmStep(2)}
                      className="px-3 py-1.5 rounded-xl bg-amber-700 text-white text-[11px] font-bold hover:bg-amber-800"
                    >
                      Tiếp tục
                    </button>
                  </div>
                </div>
              )}

              {resetConfirmStep === 2 && (
                <div className="p-3 bg-[#F6DDDB] rounded-2xl border border-[#B3362F]/40 space-y-2.5 animate-fade-in">
                  <div className="flex items-start gap-2 text-[#B3362F]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug font-medium">
                      <strong>Xác nhận lần 2:</strong> Khôi phục dữ liệu ban đầu về trạng thái ban đầu?
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setResetConfirmStep(0)}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-xl border border-[#E2E8D8] bg-white text-[11px] font-bold text-[#5E5E61]"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-xl bg-[#B3362F] text-white text-[11px] font-bold hover:bg-red-800 flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                      {resetting ? 'Đang xóa...' : 'Xác nhận xóa sạch và khởi tạo lại'}
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
