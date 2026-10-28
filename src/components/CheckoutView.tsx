import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CreditCard, Building2, Truck, ShieldAlert, CheckCircle2, Lock, 
  AlertTriangle, ArrowRight, ArrowLeft, Tag, ShoppingBag, Sparkles, X
} from 'lucide-react';
import { Product, CartItem, Order, PaymentMethod, Coupon, CheckoutCalculation } from '../types';
import { formatVND, validateLuhn } from '../utils/format';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from './Button';
import { ProductImage } from './ProductImage';

interface CheckoutViewProps {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  directItem?: { product: Product; quantity: number };
  onBackToCart: () => void;
  onSuccess: (order: Order, allOrders?: Order[]) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  items,
  directItem,
  onBackToCart,
  onSuccess
}) => {
  const { user, address, refreshCartCount } = useAuth();
  const { showToast } = useToast();

  const [recipientName, setRecipientName] = useState(address?.recipient_name || user?.full_name || '');
  const [phone, setPhone] = useState(address?.phone || user?.phone || '');
  const [addressLine, setAddressLine] = useState(address?.address_line || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Thẻ quốc tế Visa/Mastercard
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardHolder, setCardHolder] = useState('NGUYEN VAN A');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Thẻ nội địa NAPAS
  const [napasCardNumber, setNapasCardNumber] = useState('9704 1234 5678 9012');
  const [napasBank, setNapasBank] = useState('Vietcombank');
  const [napasReleaseDate, setNapasReleaseDate] = useState('06/25');

  // Per-shop discount coupons: shop_id -> code
  const [couponsByShop, setCouponsByShop] = useState<Record<number, string>>({});
  const [couponInputs, setCouponInputs] = useState<Record<number, string>>({});
  const [couponErrors, setCouponErrors] = useState<Record<number, string>>({});
  const [validatingShops, setValidatingShops] = useState<Record<number, boolean>>({});

  // Available coupons suggestions by shop
  const [shopCoupons, setShopCoupons] = useState<Record<number, Coupon[]>>({});

  // 6-box OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpBoxes, setOtpBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate order items
  const currentItems: CartItem[] = useMemo(() => {
    if (directItem) {
      return [{
        id: 0,
        product_id: directItem.product.id,
        quantity: directItem.quantity,
        name: directItem.product.name,
        category: directItem.product.category,
        price: directItem.product.price,
        original_price: directItem.product.original_price,
        condition_pct: directItem.product.condition_pct,
        condition_detail: directItem.product.condition_detail,
        stock: directItem.product.stock,
        image_url: directItem.product.image_url,
        shop_id: directItem.product.shop_id || 1,
        shop_name: directItem.product.shop_name,
        shop_slug: directItem.product.shop_slug
      }];
    }
    return items;
  }, [directItem, items]);

  // Empty cart guard
  useEffect(() => {
    if (!directItem && items.length === 0) {
      onBackToCart();
    }
  }, [items, directItem, onBackToCart]);

  // Single source of truth: calculateCheckout
  const checkoutCalc: CheckoutCalculation = useMemo(() => {
    return api.calculateCheckout(currentItems, couponsByShop);
  }, [currentItems, couponsByShop]);

  // Fetch shop coupons for suggestion
  useEffect(() => {
    const fetchShopCoupons = async () => {
      const shopIds = Array.from(new Set(currentItems.map(it => it.shop_id || 1)));
      const map: Record<number, Coupon[]> = {};
      for (const sId of shopIds) {
        try {
          const res = await api.listCouponsByShop(sId);
          map[sId] = res.coupons || [];
        } catch {
          map[sId] = [];
        }
      }
      setShopCoupons(map);
    };
    if (currentItems.length > 0) {
      fetchShopCoupons();
    }
  }, [currentItems]);

  // Apply Coupon for a specific Shop
  const handleApplyShopCoupon = async (shopId: number, codeToApply?: string) => {
    const code = (codeToApply || couponInputs[shopId] || '').trim().toUpperCase();
    if (!code) {
      setCouponErrors(prev => ({ ...prev, [shopId]: 'Vui lòng nhập mã giảm giá' }));
      return;
    }

    const shopBreakdown = checkoutCalc.shops.find(s => s.shop_id === shopId);
    const shopSubtotal = shopBreakdown?.subtotal || 0;
    const shopShipping = shopBreakdown?.shipping_fee || 0;

    setValidatingShops(prev => ({ ...prev, [shopId]: true }));
    setCouponErrors(prev => ({ ...prev, [shopId]: '' }));

    try {
      const res = await api.validateCoupon(code, shopSubtotal, shopShipping, shopId);
      setCouponsByShop(prev => ({ ...prev, [shopId]: res.coupon.code }));
      setCouponInputs(prev => ({ ...prev, [shopId]: res.coupon.code }));
      showToast(`Đã áp dụng mã ${res.coupon.code} cho ${shopBreakdown?.shop_name || 'shop'} (-${formatVND(res.discount_amount)})`, 'success');
    } catch (err: any) {
      setCouponErrors(prev => ({ ...prev, [shopId]: err.message || 'Mã không hợp lệ cho shop này' }));
    } finally {
      setValidatingShops(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const handleRemoveShopCoupon = (shopId: number) => {
    setCouponsByShop(prev => {
      const updated = { ...prev };
      delete updated[shopId];
      return updated;
    });
    setCouponInputs(prev => ({ ...prev, [shopId]: '' }));
    setCouponErrors(prev => ({ ...prev, [shopId]: '' }));
  };

  // Điền thẻ test nhanh
  const fillTestCard = (type: 'success' | 'decline') => {
    if (type === 'success') {
      setCardNumber('4111 1111 1111 1111');
      setCardHolder('NGUYEN VAN A');
      setCardExpiry('12/28');
      setCardCvv('123');
      showToast('Đã điền thẻ Visa Test (Thành công)', 'info');
    } else {
      setCardNumber('4000 0000 0000 0002');
      setCardHolder('NGUYEN VAN A');
      setCardExpiry('10/28');
      setCardCvv('999');
      showToast('Đã điền thẻ Test Bị Từ Chối', 'info');
    }
  };

  const handleValidateAndProceed = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName.trim()) {
      showToast('Vui lòng nhập họ tên người nhận', 'error');
      return;
    }
    if (!phone.trim() || !/^0\d{9}$/.test(phone.trim())) {
      showToast('Số điện thoại phải gồm 10 số và bắt đầu bằng số 0', 'error');
      return;
    }
    if (!addressLine.trim()) {
      showToast('Vui lòng nhập địa chỉ nhận hàng', 'error');
      return;
    }

    if (paymentMethod === 'cod') {
      executeOrderCreation();
      return;
    }

    // Validate Thẻ quốc tế
    if (paymentMethod === 'card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (!validateLuhn(cleanNum)) {
        showToast('Số thẻ không hợp lệ (không thỏa mãn thuật toán Luhn)', 'error');
        return;
      }
      if (!cardHolder.trim()) {
        showToast('Vui lòng nhập tên chủ thẻ', 'error');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        showToast('Hạn thẻ phải có định dạng MM/YY', 'error');
        return;
      }
      if (!/^\d{3}$/.test(cardCvv.trim())) {
        showToast('Mã CVV phải gồm đúng 3 chữ số', 'error');
        return;
      }
      // Mở modal OTP 6 ô giả lập
      setOtpBoxes(['', '', '', '', '', '']);
      setOtpError('');
      setShowOtpModal(true);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      return;
    }

    // Validate NAPAS
    if (paymentMethod === 'napas') {
      const cleanNum = napasCardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 16) {
        showToast('Số thẻ ATM nội địa phải gồm ít nhất 16 số', 'error');
        return;
      }
      setOtpBoxes(['', '', '', '', '', '']);
      setOtpError('');
      setShowOtpModal(true);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      return;
    }
  };

  // OTP 6-box input handling
  const handleOtpBoxChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newBoxes = [...otpBoxes];
    if (val.length > 1) {
      const digits = val.slice(0, 6).split('');
      digits.forEach((d, i) => {
        newBoxes[i] = d;
      });
      setOtpBoxes(newBoxes);
      const nextIdx = Math.min(digits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    newBoxes[index] = val;
    setOtpBoxes(newBoxes);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpBoxes[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtpAndPay = () => {
    const fullOtp = otpBoxes.join('');
    if (fullOtp !== '123456') {
      setOtpError('Mã OTP không chính xác. Mã demo là: 123456');
      return;
    }

    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (cleanNum === '4000000000000002') {
      setOtpError('Ngân hàng từ chối giao dịch: Thẻ bị khóa hoặc không đủ hạn mức (Mã lỗi: 05_DECLINED)');
      return;
    }

    setShowOtpModal(false);
    executeOrderCreation();
  };

  const executeOrderCreation = async () => {
    setIsSubmitting(true);
    try {
      let cardLast4: string | undefined = undefined;
      let cardType: string | undefined = undefined;

      if (paymentMethod === 'card') {
        const clean = cardNumber.replace(/\s+/g, '');
        cardLast4 = clean.slice(-4);
        cardType = clean.startsWith('4') ? 'Visa' : 'Mastercard';
      } else if (paymentMethod === 'napas') {
        const clean = napasCardNumber.replace(/\s+/g, '');
        cardLast4 = clean.slice(-4);
        cardType = `NAPAS (${napasBank})`;
      }

      const res = await api.checkout({
        recipient_name: recipientName.trim(),
        phone: phone.trim(),
        address: addressLine.trim(),
        note: note.trim(),
        payment_method: paymentMethod,
        card_last4: cardLast4,
        card_type: cardType,
        direct_items: directItem ? [{ product_id: directItem.product.id, quantity: directItem.quantity }] : undefined,
        shop_coupons: couponsByShop
      });

      await refreshCartCount();
      onSuccess(res.order, res.orders);
    } catch (error: any) {
      showToast(error.message || 'Lỗi khi đặt hàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8EF] pb-32 lg:pb-16 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToCart}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#08482D] hover:text-[#063A24] transition-colors p-2 rounded-xl hover:bg-[#DAE7C7]/50"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Quay lại giỏ hàng</span>
          </button>

          <div className="text-right">
            <span className="text-xs uppercase font-mono tracking-wider text-[#5E5E61]">
              Trang thanh toán an toàn
            </span>
          </div>
        </div>

        <form onSubmit={handleValidateAndProceed} className="grid lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: Thông tin nhận hàng, phương thức, form thẻ */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#101410]">
                Xác nhận & Đặt hàng
              </h1>
              <p className="text-xs sm:text-sm text-[#5E5E61] mt-1">
                Vui lòng kiểm tra kỹ địa chỉ nhận hàng và hình thức thanh toán trước khi xác nhận.
              </p>
            </div>

            {/* Khung nhập thông tin giao hàng */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2E8D8] space-y-4 shadow-2xs">
              <h3 className="font-bold text-sm sm:text-base text-[#101410] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#08482D]" />
                Địa chỉ nhận hàng
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                    Họ và tên người nhận <span className="text-[#C2522D]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                    Số điện thoại liên hệ <span className="text-[#C2522D]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0909 246 135"
                    className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                  Địa chỉ chi tiết (Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP) <span className="text-[#C2522D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="VD: Số 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                  className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                  Ghi chú cho người bán / shipper (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Giao hàng vào giờ hành chính, gọi trước khi đến 15 phút..."
                  className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D]"
                />
              </div>
            </div>

            {/* Chọn phương thức thanh toán */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2E8D8] space-y-5 shadow-2xs">
              <h3 className="font-bold text-sm sm:text-base text-[#101410] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#08482D]" />
                Phương thức thanh toán
              </h3>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-[#DAE7C7] border-[#08482D] text-[#101410] shadow-sm font-bold ring-2 ring-[#08482D]/20'
                      : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/30'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-[#08482D] shrink-0" />
                  <span className="text-xs sm:text-sm">Thẻ Quốc Tế (Visa/Master)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('napas')}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'napas'
                      ? 'bg-[#DAE7C7] border-[#08482D] text-[#101410] shadow-sm font-bold ring-2 ring-[#08482D]/20'
                      : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/30'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-[#08482D] shrink-0" />
                  <span className="text-xs sm:text-sm">Thẻ ATM NAPAS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'bg-[#DAE7C7] border-[#08482D] text-[#101410] shadow-sm font-bold ring-2 ring-[#08482D]/20'
                      : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/30'
                  }`}
                >
                  <Truck className="w-5 h-5 text-[#C2522D] shrink-0" />
                  <span className="text-xs sm:text-sm">Tiền mặt khi nhận (COD)</span>
                </button>
              </div>

              {/* Form thẻ quốc tế + Virtual Card Preview */}
              {paymentMethod === 'card' && (
                <div className="space-y-5 pt-2">
                  <div className="w-full max-w-[360px] mx-auto">
                    <div
                      className={`relative w-full aspect-[1.586/1] rounded-2xl p-4 sm:p-5 text-white transition-transform duration-500 shadow-md ${
                        isCardFlipped ? 'rotate-y-180' : ''
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, #08482D 0%, #173827 50%, #C2522D 100%)',
                        transformStyle: 'preserve-3d',
                        transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {!isCardFlipped ? (
                        <div className="h-full flex flex-col justify-between select-none">
                          <div className="flex items-center justify-between">
                            <span className="italic font-bold tracking-wider text-xs sm:text-sm opacity-95">
                              Đồ Cũ Còn Thương
                            </span>
                            <span className="font-mono font-bold text-[10px] uppercase bg-white/20 px-2 py-0.5 rounded">
                              {cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD'}
                            </span>
                          </div>

                          <div className="font-mono text-sm sm:text-base tracking-widest font-bold my-1 text-center text-amber-100">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </div>

                          <div className="flex items-end justify-between text-[11px] sm:text-xs">
                            <div className="min-w-0 pr-2">
                              <span className="text-[8px] uppercase tracking-wider opacity-75 block">Chủ thẻ</span>
                              <span className="font-mono font-bold truncate block">
                                {cardHolder || 'NGUYEN VAN A'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[8px] uppercase tracking-wider opacity-75 block">Hạn dùng</span>
                              <span className="font-mono font-bold">{cardExpiry || 'MM/YY'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col justify-between py-1 select-none" style={{ transform: 'rotateY(180deg)' }}>
                          <div className="w-full h-7 bg-black/80 -mx-4 mt-2" />
                          <div className="flex items-center justify-end pr-4">
                            <span className="text-[9px] mr-2 text-white/80">CVV:</span>
                            <div className="bg-white text-[#101410] font-mono font-bold px-3 py-1 rounded text-xs">
                              {cardCvv || '•••'}
                            </div>
                          </div>
                          <div className="text-[8px] text-white/70 text-center">
                            Thẻ thử nghiệm bảo chứng bởi hệ thống Đồ Cũ Còn Thương
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fillTestCard('success')}
                      className="text-xs font-mono px-3 py-1 bg-[#DAE7C7] hover:bg-[#c9dcb2] text-[#08482D] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      ⚡ Điền thẻ test thành công (4111)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillTestCard('decline')}
                      className="text-xs font-mono px-3 py-1 bg-[#F6DDDB] hover:bg-[#f0c8c5] text-[#B33F33] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      ✕ Thẻ test từ chối (4000)
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                        Số thẻ quốc tế (16 chữ số) <span className="text-[#C2522D]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 1111 1111 1111"
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] focus:outline-none focus:border-[#08482D]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                        Tên in trên thẻ (không dấu) <span className="text-[#C2522D]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        placeholder="NGUYEN VAN A"
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] uppercase focus:outline-none focus:border-[#08482D]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                          Hạn sử dụng (MM/YY) <span className="text-[#C2522D]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          maxLength={5}
                          className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] focus:outline-none focus:border-[#08482D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                          Mã bảo mật CVV (3 số) <span className="text-[#C2522D]">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={cardCvv}
                          onFocus={() => setIsCardFlipped(true)}
                          onBlur={() => setIsCardFlipped(false)}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          maxLength={4}
                          className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] focus:outline-none focus:border-[#08482D]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form thẻ ATM NAPAS */}
              {paymentMethod === 'napas' && (
                <div className="space-y-4 pt-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                        Ngân hàng phát hành
                      </label>
                      <select
                        value={napasBank}
                        onChange={(e) => setNapasBank(e.target.value)}
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D]"
                      >
                        <option value="Vietcombank">Vietcombank</option>
                        <option value="Techcombank">Techcombank</option>
                        <option value="MBBank">MBBank (Quân Đội)</option>
                        <option value="BIDV">BIDV</option>
                        <option value="VietinBank">VietinBank</option>
                        <option value="ACB">ACB Á Châu</option>
                        <option value="TPBank">TPBank</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                        Tháng/Năm phát hành
                      </label>
                      <input
                        type="text"
                        value={napasReleaseDate}
                        onChange={(e) => setNapasReleaseDate(e.target.value)}
                        placeholder="06/25"
                        maxLength={5}
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] focus:outline-none focus:border-[#08482D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                      Số thẻ ATM (in dập nổi trên mặt trước thẻ) <span className="text-[#C2522D]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={napasCardNumber}
                      onChange={(e) => setNapasCardNumber(e.target.value)}
                      placeholder="9704 1234 5678 9012"
                      className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] focus:outline-none focus:border-[#08482D]"
                    />
                  </div>
                </div>
              )}

              {/* Thông báo thanh toán COD */}
              {paymentMethod === 'cod' && (
                <div className="p-4 rounded-2xl bg-[#DAE7C7]/40 border border-[#DAE7C7] text-xs text-[#08482D] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#08482D]" />
                    <span>Thanh toán tiền mặt khi shipper giao hàng</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Bạn được đồng kiểm gói hàng (kiểm tra ngoại quan và đúng mã đồ cũ trước khi thanh toán).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Kiện hàng theo từng Shop + Mã giảm giá theo từng shop + Chi phí tổng cộng */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2E8D8] space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8D8]">
                <h3 className="font-bold text-sm sm:text-base text-[#101410] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#08482D]" />
                  Kiện hàng của bạn ({currentItems.length} món)
                </h3>
              </div>

              {/* Danh sách nhóm theo từng Shop với mã giảm giá riêng */}
              <div className="space-y-4">
                {checkoutCalc.shops.map((group) => {
                  const availableShopCoupons = shopCoupons[group.shop_id] || [];
                  const inputVal = couponInputs[group.shop_id] || '';
                  const isValidating = !!validatingShops[group.shop_id];
                  const errorMsg = couponErrors[group.shop_id];

                  return (
                    <div key={group.shop_id} className="p-4 rounded-2xl border border-[#E2E8D8] bg-[#F5F8EF]/50 space-y-3">
                      {/* Tiêu đề Shop */}
                      <div className="flex items-center justify-between text-xs font-bold text-[#08482D] pb-2 border-b border-[#E2E8D8]/70">
                        <span className="font-bold text-sm text-[#08482D]">{group.shop_name}</span>
                        <span className="font-mono text-[11px] text-[#5E5E61] font-normal">
                          Phí ship: {group.shipping_fee === 0 ? <strong className="text-[#08482D]">Miễn phí</strong> : formatVND(group.shipping_fee)}
                        </span>
                      </div>

                      {/* Danh sách món hàng của shop */}
                      <div className="space-y-2">
                        {group.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 py-1">
                            <ProductImage
                              src={item.image_url}
                              alt={item.name}
                              category={item.category}
                              productName={item.name}
                              conditionPct={item.condition_pct}
                              className="w-10 h-10 rounded-xl object-cover bg-[#DAE7C7] border border-[#E2E8D8] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-[#101410] truncate">
                                {item.name}
                              </h4>
                              <p className="text-[11px] text-[#5E5E61]">
                                SL: {item.quantity} · Mới: {item.condition_pct}%
                              </p>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#08482D] shrink-0">
                              {formatVND(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Ô mã giảm giá riêng của shop này (Requirement A3) */}
                      <div className="pt-2 border-t border-[#E2E8D8]/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#101410] uppercase tracking-wider flex items-center gap-1">
                            <Tag className="w-3 h-3 text-[#08482D]" />
                            Mã giảm giá của {group.shop_name}
                          </label>
                        </div>

                        {group.applied_coupon ? (
                          <div className="p-2.5 bg-[#DAE7C7]/60 rounded-xl border border-[#DAE7C7] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-mono font-bold text-[#08482D] flex items-center gap-1">
                                ✓ {group.applied_coupon.code} (-{formatVND(group.discount_amount)})
                              </div>
                              <div className="text-[10px] text-[#5E5E61] mt-0.5">
                                {group.applied_coupon.description}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveShopCoupon(group.shop_id)}
                              className="text-xs font-bold text-[#B33F33] hover:underline ml-2 cursor-pointer"
                            >
                              Gỡ bỏ
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inputVal}
                                onChange={e => {
                                  const val = e.target.value.toUpperCase();
                                  setCouponInputs(prev => ({ ...prev, [group.shop_id]: val }));
                                  setCouponErrors(prev => ({ ...prev, [group.shop_id]: '' }));
                                }}
                                placeholder={`Nhập mã của ${group.shop_name}`}
                                className="flex-1 px-3 py-1.5 bg-white border border-[#E2E8D8] rounded-xl text-xs font-mono uppercase text-[#101410] focus:outline-none focus:border-[#08482D]"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyShopCoupon(group.shop_id)}
                                disabled={isValidating || !inputVal.trim()}
                                className="px-3 py-1.5 bg-[#08482D] text-white rounded-xl text-xs font-bold hover:bg-[#063A24] transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isValidating ? '...' : 'Áp dụng'}
                              </button>
                            </div>

                            {/* Gợi ý mã của đúng shop này (Requirement A3: mã không thuộc shop thì không hiển thị) */}
                            {availableShopCoupons.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] text-[#5E5E61] flex-wrap">
                                <span>Gợi ý:</span>
                                {availableShopCoupons.map((cpn) => (
                                  <button
                                    key={cpn.id}
                                    type="button"
                                    onClick={() => handleApplyShopCoupon(group.shop_id, cpn.code)}
                                    className="font-mono px-2 py-0.5 rounded-lg bg-white border border-[#DAE7C7] hover:border-[#08482D] font-bold text-[#08482D] cursor-pointer"
                                    title={cpn.description}
                                  >
                                    {cpn.code}
                                  </button>
                                ))}
                              </div>
                            )}

                            {errorMsg && (
                              <p className="text-[11px] text-[#B33F33] font-medium leading-tight">
                                ✕ {errorMsg}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tạm tính phần hàng của shop */}
                      <div className="pt-2 border-t border-[#E2E8D8]/60 flex items-center justify-between text-xs font-medium text-[#5E5E61]">
                        <span>Tổng tiền phần shop:</span>
                        <span className="font-mono font-bold text-[#101410] text-sm">
                          {formatVND(group.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chi phí tổng cộng tính từ calculateCheckout */}
              <div className="border-t border-[#E2E8D8] pt-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-[#5E5E61]">
                  <span>Tạm tính tiền hàng</span>
                  <span className="font-mono font-medium text-[#101410]">{formatVND(checkoutCalc.subtotal)}</span>
                </div>

                <div className="flex justify-between text-[#5E5E61]">
                  <span>Phí vận chuyển</span>
                  <span>
                    {checkoutCalc.shipping_fee === 0 ? (
                      <span className="font-sans font-medium text-[#08482D]">
                        Miễn phí
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-[#101410]">
                        {formatVND(checkoutCalc.shipping_fee)}
                      </span>
                    )}
                  </span>
                </div>

                {checkoutCalc.discount_amount > 0 && (
                  <div className="flex justify-between text-[#08482D] font-semibold">
                    <span>Tổng giảm giá voucher</span>
                    <span className="font-mono">-{formatVND(checkoutCalc.discount_amount)}</span>
                  </div>
                )}

                <div className="border-t border-[#E2E8D8] pt-3 flex justify-between items-baseline font-bold">
                  <span className="text-sm sm:text-base text-[#101410]">Tổng thanh toán</span>
                  <span className="font-mono text-xl sm:text-2xl text-[#C2522D]">{formatVND(checkoutCalc.grand_total)}</span>
                </div>
              </div>

              {/* Submit Button (Desktop) */}
              <div className="hidden lg:block pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  fullWidth
                  icon={<Lock className="w-4 h-4 shrink-0" />}
                  iconRight={<ArrowRight className="w-4 h-4 shrink-0" />}
                  className="font-bold text-sm tracking-wide shadow-md"
                >
                  {paymentMethod === 'cod' ? 'Xác nhận đặt hàng COD' : 'Xác thực OTP & Thanh toán'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E2E8D8] p-4 shadow-2xl lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-[#5E5E61] block leading-tight">Tổng thanh toán</span>
            <span className="font-mono text-lg font-bold text-[#C2522D] leading-tight block">
              {formatVND(checkoutCalc.grand_total)}
            </span>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            loading={isSubmitting}
            onClick={handleValidateAndProceed}
            icon={<Lock className="w-4 h-4 shrink-0" />}
            className="font-bold text-xs"
          >
            {paymentMethod === 'cod' ? 'Đặt hàng' : 'Thanh toán'}
          </Button>
        </div>
      </div>

      {/* MODAL OTP 6 Ô CHO GIAO DỊCH THẺ TEST */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#DAE7C7] text-[#08482D] flex items-center justify-center font-bold">
                  🔒
                </div>
                <h3 className="font-bold text-base text-[#101410]">Xác thực giao dịch (3D-Secure OTP)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="p-1.5 rounded-xl hover:bg-[#F5F8EF] text-[#5E5E61]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#5E5E61] space-y-1">
              <p>Mã OTP đã được gửi đến số điện thoại đã đăng ký với ngân hàng.</p>
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E6DFD5] text-[11px] text-[#101410] font-mono">
                Số tiền: <strong className="text-[#C2522D]">{formatVND(checkoutCalc.grand_total)}</strong>
                <span className="block text-stone-500 mt-0.5">Mã OTP thử nghiệm: <strong>123456</strong></span>
              </div>
            </div>

            {/* 6 ô OTP */}
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {otpBoxes.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpBoxChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  className="w-10 sm:w-12 h-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-2xl bg-[#F5F8EF] border border-[#DAE7C7] text-[#101410] focus:outline-none focus:border-[#08482D] focus:ring-2 focus:ring-[#08482D]/20 shadow-2xs"
                />
              ))}
            </div>

            {otpError && (
              <p className="text-xs text-[#B33F33] text-center font-medium">
                ✕ {otpError}
              </p>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleVerifyOtpAndPay}
                className="w-full py-3 bg-[#08482D] hover:bg-[#063A24] text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Xác nhận thanh toán {formatVND(checkoutCalc.grand_total)}
              </button>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full py-2 text-xs text-[#5E5E61] hover:text-[#101410]"
              >
                Hủy giao dịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
