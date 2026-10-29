import React, { useState, useEffect } from 'react';
import { Settings2, UserCheck, Shield, RotateCcw, X, Check, AlertTriangle, Eye, FastForward, Truck, Presentation, Sparkles, LogIn } from 'lucide-react';
import { api } from '../services/api';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Order } from '../types';
import { formatVND } from '../utils/format';
import { getStoredAccounts, StoredAccount, setActiveAccountKey } from '../firebase';

interface DemoControllerProps {
  onRoleSwitched?: (role: 'buyer' | 'seller' | 'guest') => void;
  onDataReset?: () => void;
  onPresentationModeChange?: (enabled: boolean) => void;
  onOpenFirstTimeLogin?: (role: 'buyer' | 'seller', username: string) => void;
}

export function DemoController({
  onRoleSwitched,
  onDataReset,
  onPresentationModeChange,
  onOpenFirstTimeLogin
}: DemoControllerProps) {
  const { user, logout, switchAccount } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [resetConfirmStep, setResetConfirmStep] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);

  // Presentation Mode state
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [loadingPresentationMode, setLoadingPresentationMode] = useState<boolean>(false);

  // Marketplace initialization state (Section 8)
  const [initializingMarket, setInitializingMarket] = useState(false);
  const [initProgressMsg, setInitProgressMsg] = useState('');

  // Fast-forward shipment states
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | number | null>(null);
  const [fastForwarding, setFastForwarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Sync stored accounts list
  useEffect(() => {
    setStoredAccounts(getStoredAccounts());
  }, [isOpen, user]);

  // Only owners (is_owner === true) can view or use DemoController (Section 3)
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
      setStoredAccounts(getStoredAccounts());
    }
  }, [isOpen]);

  const handleFastForward = async () => {
    if (!selectedOrderId || fastForwarding) return;

    setFastForwarding(true);
    setCurrentStep(1);

    const stepNames = [
      'Bàn giao cho ĐVVC',
      'Đến kho phân loại',
      'Đang vận chuyển liên tỉnh',
      'Đang giao hàng',
      'Giao hàng thành công'
    ];

    try {
      for (let s = 1; s <= 5; s++) {
        setCurrentStep(s);
        await api.advanceShipmentStep(selectedOrderId as any, s);
        showToast(`Bước ${s}/5: ${stepNames[s - 1]}`, 'info');

        if (s < 5) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      showToast('Đã tua nhanh vận chuyển thành công! Đơn hàng đã chuyển sang GIAO THÀNH CÔNG.', 'success');
      await fetchEligibleOrders();
      if (onDataReset) onDataReset();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tua nhanh vận chuyển', 'error');
    } finally {
      setFastForwarding(false);
      setCurrentStep(0);
    }
  };

  const isAccountLoggedIn = (role: 'buyer' | 'seller', username: string) => {
    const clean = role === 'buyer' ? username.trim().replace(/\D/g, '') : username.trim().toLowerCase();
    return storedAccounts.some((a) => {
      if (a.role !== role) return false;
      const storedClean = a.role === 'buyer' ? (a.phone || a.username).trim().replace(/\D/g, '') : a.username.trim().toLowerCase();
      return storedClean === clean;
    });
  };

  const handleSwitchAccountRole = async (role: 'buyer' | 'seller', username: string) => {
    if (!isAccountLoggedIn(role, username)) {
      if (onOpenFirstTimeLogin) {
        setIsOpen(false);
        onOpenFirstTimeLogin(role, username);
      } else {
        showToast(`Tài khoản ${username} chưa đăng nhập trên máy này. Vui lòng đăng nhập lần đầu.`, 'info');
      }
      return;
    }

    setSwitching(true);
    try {
      await switchAccount(role, username);
      setIsOpen(false);
      if (onRoleSwitched) onRoleSwitched(role);
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển tài khoản', 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchGuest = () => {
    setActiveAccountKey(null);
    window.dispatchEvent(new CustomEvent('close-all-overlays'));
    window.dispatchEvent(new CustomEvent('close-buyer-chat'));
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

  const handleInitMarket = async () => {
    setInitializingMarket(true);
    try {
      await db.initMarketplaceData((msg) => setInitProgressMsg(msg));
      showToast('Khởi tạo dữ liệu chợ thành công (3 shop, 10 sản phẩm, 4 mã giảm giá)!', 'success');
      if (onDataReset) onDataReset();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khởi tạo dữ liệu chợ', 'error');
    } finally {
      setInitializingMarket(false);
      setInitProgressMsg('');
    }
  };

  const ownerAccounts = [
    {
      role: 'buyer' as const,
      username: '0987654321',
      name: 'Nguyễn Văn A',
      desc: 'Khách mua chủ tiệm',
      color: '#08482D'
    },
    {
      role: 'seller' as const,
      username: 'admin',
      name: 'Đồ Cũ Còn Thương',
      desc: 'Thời trang, phụ kiện, gia dụng',
      color: '#08482D'
    },
    {
      role: 'seller' as const,
      username: 'goc_sach_nhac',
      name: 'Góc Sách & Nhạc',
      desc: 'Sách xưa, guitar, nhạc cụ',
      color: '#7A4E2D'
    },
    {
      role: 'seller' as const,
      username: 'retro_tech',
      name: 'Retro Tech',
      desc: 'Máy ảnh film, iPhone, tai nghe, phím cơ',
      color: '#2F4B6B'
    }
  ];

  return (
    <div className="fixed bottom-24 sm:bottom-5 left-4 sm:left-5 z-40 print:hidden font-sans">
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
          <span className="text-xs font-bold tracking-wide">Điều Khiển Demo</span>
          {presentationMode && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold uppercase">
              Thuyết trình
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl overflow-hidden animate-fade-in text-[#101410] max-h-[85vh] flex flex-col">
          {/* Card Header */}
          <div className="p-4 bg-[#F5F8EF] border-b border-[#E2E8D8] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#08482D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                ⚙️
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#101410]">Điều Khiển Trình Diễn</h4>
                <p className="text-[10px] text-[#5E5E61]">Dành riêng cho 4 tài khoản chủ</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setResetConfirmStep(0);
              }}
              className="p-1.5 rounded-xl hover:bg-[#DAE7C7]/50 text-[#5E5E61] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 text-xs divide-y divide-[#E2E8D8]/60">
            {/* 1. CHUYỂN VAI / TÀI KHOẢN CHỦ (Section 3) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#5E5E61] uppercase tracking-wider block">
                Chuyển tài khoản chủ (Không cần gõ lại mật khẩu)
              </label>

              <div className="space-y-1.5">
                {ownerAccounts.map((acc) => {
                  const loggedIn = isAccountLoggedIn(acc.role, acc.username);
                  const isCurrent =
                    user?.role === acc.role &&
                    user?.username.toLowerCase() === acc.username.toLowerCase();

                  return (
                    <div
                      key={`${acc.role}_${acc.username}`}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[#DAE7C7]/50 border-[#08482D] font-bold shadow-2xs'
                          : loggedIn
                          ? 'bg-white border-[#E2E8D8] hover:border-[#08482D] hover:bg-[#F5F8EF] cursor-pointer'
                          : 'bg-stone-50 border-dashed border-[#E2E8D8] opacity-75'
                      }`}
                      onClick={() => {
                        if (loggedIn && !isCurrent) {
                          handleSwitchAccountRole(acc.role, acc.username);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ backgroundColor: acc.color }}
                        >
                          {acc.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#101410] truncate">
                            {acc.name}
                          </div>
                          <div className="text-[10px] text-[#5E5E61] truncate">
                            {acc.desc}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isCurrent ? (
                          <Check className="w-4 h-4 text-[#08482D]" />
                        ) : loggedIn ? (
                          <span className="text-[10px] font-bold text-[#08482D] px-2 py-0.5 rounded-md bg-[#DAE7C7]/60">
                            Chuyển
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenFirstTimeLogin) {
                                setIsOpen(false);
                                onOpenFirstTimeLogin(acc.role, acc.username);
                              }
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-[#08482D] bg-[#DAE7C7] hover:bg-[#c8dbb1] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <LogIn className="w-3 h-3" />
                            Đăng nhập lần đầu
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Xem như khách vãng lai */}
              <button
                onClick={handleSwitchGuest}
                disabled={switching}
                className="w-full p-2.5 rounded-2xl border border-[#E2E8D8] bg-white hover:bg-[#F5F8EF] flex items-center justify-between transition-all text-left mt-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#DAE7C7] text-[#08482D] flex items-center justify-center font-bold">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#101410]">Xem như khách vãng lai</div>
                    <div className="text-[10px] text-[#5E5E61]">Tab này không dùng tài khoản nào</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#5E5E61]">Xem</span>
              </button>
            </div>

            {/* 2. CHẾ ĐỘ THUYẾT TRÌNH (Section 9) */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Presentation className="w-4 h-4 text-[#08482D]" />
                  <div>
                    <span className="font-bold text-xs text-[#101410] block">
                      Chế độ thuyết trình
                    </span>
                    <span className="text-[10px] text-[#5E5E61]">
                      Khóa tạo đơn/trả giá/chat cho khách lạ
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleTogglePresentationMode}
                  disabled={loadingPresentationMode}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    presentationMode ? 'bg-[#08482D]' : 'bg-[#E2E8D8]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                      presentationMode ? 'translate-x-6' : 'translate-x-1'
                    } top-1 absolute`}
                  />
                </button>
              </div>
            </div>

            {/* 3. TUA NHANH VẬN CHUYỂN */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-2 text-[#08482D]">
                <FastForward className="w-4 h-4" />
                <span className="font-bold text-xs">Tua nhanh tiến độ giao hàng</span>
              </div>
              <p className="text-[10px] text-[#5E5E61]">
                Tự động đẩy đơn qua 5 trạng thái để kiểm tra mốc timeline giao hàng.
              </p>

              {eligibleOrders.length === 0 ? (
                <div className="p-2.5 rounded-xl bg-[#F5F8EF] text-[11px] text-[#5E5E61] italic text-center">
                  Không có đơn hàng nào đang trong quá trình vận chuyển.
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    disabled={fastForwarding}
                    className="w-full p-2 bg-white border border-[#E2E8D8] rounded-xl text-xs font-mono focus:outline-none focus:border-[#08482D]"
                  >
                    {eligibleOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.code} ({ord.shop_name}) - {formatVND(ord.total)}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleFastForward}
                    disabled={fastForwarding || !selectedOrderId}
                    className="w-full py-2 bg-[#08482D] hover:bg-[#063A24] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {fastForwarding ? (
                      <span>Đang tua bước {currentStep}/5...</span>
                    ) : (
                      <>
                        <Truck className="w-3.5 h-3.5 text-[#DAE7C7]" />
                        <span>Bắt đầu tua nhanh giao hàng</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 4. KHỞI TẠO DỮ LIỆU CHỢ (Section 8) */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-2 text-[#08482D]">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold text-xs">Khởi tạo dữ liệu chợ</span>
              </div>
              <p className="text-[10px] text-[#5E5E61]">
                Tạo 3 shop mẫu, 10 sản phẩm mẫu có sẵn icon, 4 voucher mẫu và cài đặt hệ thống.
              </p>

              <button
                onClick={handleInitMarket}
                disabled={initializingMarket}
                className="w-full py-2 bg-[#F5F8EF] border border-[#08482D]/40 text-[#08482D] hover:bg-[#DAE7C7]/50 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{initializingMarket ? (initProgressMsg || 'Đang tạo...') : 'Khởi tạo dữ liệu chợ'}</span>
              </button>
            </div>

            {/* 5. KHÔI PHỤC DỮ LIỆU DEMO (Section 8) */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <RotateCcw className="w-4 h-4" />
                <span className="font-bold text-xs">Reset dữ liệu demo</span>
              </div>
              <p className="text-[10px] text-[#5E5E61]">
                Xóa toàn bộ đơn, trả giá, tin nhắn, đánh giá; đặt lại tồn kho 10 món mẫu và voucher.
              </p>

              {resetConfirmStep === 0 && (
                <button
                  onClick={() => setResetConfirmStep(1)}
                  className="w-full py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục dữ liệu ban đầu</span>
                </button>
              )}

              {resetConfirmStep === 1 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-start gap-2 text-red-700 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Xác nhận lần 1: Dữ liệu giao dịch phát sinh sẽ bị xóa sạch?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResetConfirmStep(2)}
                      className="flex-1 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                    >
                      Tiếp tục xác nhận
                    </button>
                    <button
                      onClick={() => setResetConfirmStep(0)}
                      className="px-3 py-1.5 bg-white border border-stone-300 font-semibold rounded-lg"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {resetConfirmStep === 2 && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-2xl space-y-2">
                  <div className="text-red-900 font-bold text-xs">
                    ⚠️ Xác nhận lần 2: Hành động này không thể hoàn tác!
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleConfirmReset}
                      disabled={resetting}
                      className="flex-1 py-1.5 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 disabled:opacity-50"
                    >
                      {resetting ? 'Đang xóa...' : 'Đồng ý reset ngay'}
                    </button>
                    <button
                      onClick={() => setResetConfirmStep(0)}
                      className="px-3 py-1.5 bg-white border border-stone-300 font-semibold rounded-lg"
                    >
                      Hủy
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
