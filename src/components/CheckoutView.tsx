import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, Building2, Truck, ShieldAlert, CheckCircle2, Lock, 
  AlertTriangle, ArrowRight, ArrowLeft, Tag, ShoppingBag, Sparkles
} from 'lucide-react';
import { Product, CartItem, Order, PaymentMethod } from '../types';
import { formatVND, validateLuhn } from '../utils/format';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from './Button';

interface CheckoutViewProps {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  directItem?: { product: Product; quantity: number };
  onBackToCart: () => void;
  onSuccess: (order: Order) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  items,
  subtotal,
  shippingFee,
  total,
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

  // Discount Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; description?: string } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // 6-box OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpBoxes, setOtpBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate order items and totals
  const currentItems: CartItem[] = directItem ? [{
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
  }] : items;

  // Empty cart guard
  useEffect(() => {
    if (!directItem && items.length === 0) {
      onBackToCart();
    }
  }, [items, directItem, onBackToCart]);

  // Group items by shop
  const shopGroups = currentItems.reduce<Record<number, { shop_id: number; shop_name: string; shop_slug: string; items: typeof currentItems; subtotal: number; shippingFee: number }>>((acc, item) => {
    const sId = item.shop_id || 1;
    if (!acc[sId]) {
      acc[sId] = {
        shop_id: sId,
        shop_name: item.shop_name || 'Đồ Cũ Còn Thương',
        shop_slug: item.shop_slug || 'do-cu-con-thuong',
        items: [],
        subtotal: 0,
        shippingFee: 0
      };
    }
    acc[sId].items.push(item);
    acc[sId].subtotal += item.price * item.quantity;
    return acc;
  }, {});

  Object.values(shopGroups).forEach(group => {
    group.shippingFee = group.subtotal >= 1000000 || group.subtotal === 0 ? 0 : 30000;
  });

  const shopList = Object.values(shopGroups);
  const orderSubtotal = shopList.reduce((sum, g) => sum + g.subtotal, 0);
  const orderShippingFee = shopList.reduce((sum, g) => sum + g.shippingFee, 0);
  const orderTotal = Math.max(0, orderSubtotal + orderShippingFee - discountAmount);

  // Apply Coupon Handler
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      setCouponError('Vui lòng nhập mã giảm giá');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await api.validateCoupon(code, orderSubtotal, orderShippingFee);
      setAppliedCoupon({
        code: res.coupon.code,
        description: res.coupon.description || ''
      });
      setDiscountAmount(res.discount_amount);
      setCouponInput(res.coupon.code);
      showToast(`Áp dụng mã ${res.coupon.code} thành công (-${res.discount_amount.toLocaleString('vi-VN')}đ)`, 'success');
    } catch (err: any) {
      setCouponError(err.message || 'Mã không hợp lệ');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponInput('');
    setCouponError('');
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
      // Paste handling
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

    // Auto advance to next box
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

    // Giả lập từ chối với thẻ test 4000 0000 0000 0002
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
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined
      });

      await refreshCartCount();
      onSuccess(res.order);
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
          {/* CỘT TRÁI (Desktop): Thông báo thử nghiệm, địa chỉ, phương thức, form thẻ */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tiêu đề trang */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#101410]">
                Xác nhận & Đặt hàng
              </h1>
              <p className="text-xs sm:text-sm text-[#5E5E61] mt-1">
                Hoàn tất thông tin giao nhận để tiệm đóng gói kiện hàng cẩn thận cho bạn
              </p>
            </div>

            {/* Thông báo môi trường thử nghiệm */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8D8] flex items-start gap-3 shadow-2xs">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#C2522D]" />
              <div className="text-xs text-[#5E5E61] leading-relaxed">
                <strong className="text-[#101410] font-bold block mb-0.5">Môi trường thử nghiệm an toàn:</strong>
                Bạn có thể dùng thẻ Visa test <code className="bg-[#DAE7C7] px-1.5 py-0.5 rounded font-mono font-bold text-[#101410]">4111 1111 1111 1111</code>, mã OTP <code className="bg-[#DAE7C7] px-1.5 py-0.5 rounded font-mono font-bold text-[#101410]">123456</code>. Không có khoản trừ tiền thật nào phát sinh.
              </div>
            </div>

            {/* 1. Địa chỉ giao hàng */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2E8D8] space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8D8]">
                <span className="w-6 h-6 rounded-full bg-[#08482D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </span>
                <h2 className="text-sm sm:text-base font-bold text-[#101410]">
                  Địa chỉ giao hàng
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#5E5E61] block mb-1.5">
                    Họ và tên người nhận <span className="text-[#C2522D]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5E5E61] block mb-1.5">
                    Số điện thoại nhận hàng <span className="text-[#C2522D]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0987654321"
                    className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E5E61] block mb-1.5">
                  Địa chỉ chi tiết (Số nhà, đường, phường/xã, quận/huyện) <span className="text-[#C2522D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Ví dụ: 128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                  className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E5E61] block mb-1.5">
                  Ghi chú cho tiệm & đơn vị vận chuyển (tùy chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Giao giờ hành chính, gọi trước khi đến..."
                  className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#101410] focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D]"
                />
              </div>
            </div>

            {/* 2. Phương thức thanh toán */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2E8D8] space-y-5 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8D8]">
                <span className="w-6 h-6 rounded-full bg-[#08482D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </span>
                <h2 className="text-sm sm:text-base font-bold text-[#101410]">
                  Phương thức thanh toán
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-[#DAE7C7] border-[#08482D] text-[#101410] shadow-sm font-bold ring-2 ring-[#08482D]/20'
                      : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/30'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-[#C2522D] shrink-0" />
                  <span className="text-xs sm:text-sm">Visa / Mastercard</span>
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
                  {/* Thẻ ngân hàng ảo: rộng tối đa 360px, tỉ lệ 1.586:1, căn giữa, không tràn khung */}
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
                      {/* Front Face */}
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
                        /* Back Face (CVV focus) */
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

                  {/* Quick Test Buttons */}
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

                  {/* Card input fields */}
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
                        Tên chủ thẻ (in hoa không dấu) <span className="text-[#C2522D]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        placeholder="NGUYEN VAN A"
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101410] focus:outline-none focus:border-[#08482D]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                          Hạn thẻ (MM/YY) <span className="text-[#C2522D]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
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
                          maxLength={3}
                          value={cardCvv}
                          onFocus={() => setIsCardFlipped(true)}
                          onBlur={() => setIsCardFlipped(false)}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
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
                      <option value="MB Bank">MB Bank</option>
                      <option value="ACB">ACB</option>
                      <option value="BIDV">BIDV</option>
                      <option value="VietinBank">VietinBank</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                      Số thẻ ATM nội địa (bắt đầu 9704...) <span className="text-[#C2522D]">*</span>
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

              {/* COD Notice */}
              {paymentMethod === 'cod' && (
                <div className="p-4 bg-[#DAE7C7]/40 border border-[#DAE7C7] rounded-2xl text-xs text-[#5E5E61] leading-relaxed">
                  Bạn sẽ thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện hàng. Số tiền thu hộ COD đúng bằng tổng thanh toán là <strong className="text-[#101410] font-bold font-mono">{formatVND(orderTotal)}</strong>.
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (Desktop, rộng 400px, dính khi cuộn top-24): Kiện hàng, mã giảm giá, tổng tiền, nút xác nhận */}
          <div className="lg:col-span-5 lg:w-[400px] lg:shrink-0 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2E8D8] space-y-5 shadow-2xs">
              {/* Header kiện hàng */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8D8]">
                <h3 className="font-bold text-sm sm:text-base text-[#101410] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#08482D]" />
                  Kiện hàng của bạn ({currentItems.length} món)
                </h3>
              </div>

              {/* Danh sách món hàng theo từng Shop */}
              <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8D8]/60 pr-1 space-y-3">
                {shopList.map((group) => (
                  <div key={group.shop_id} className="pt-2 first:pt-0">
                    <div className="flex items-center justify-between text-xs font-bold text-[#08482D] mb-1.5 bg-[#F5F8EF] px-2.5 py-1 rounded-lg">
                      <span className="truncate">{group.shop_name}</span>
                      <span className="font-mono text-[11px] text-[#5E5E61] font-normal">
                        Ship: {group.shippingFee === 0 ? 'Free' : formatVND(group.shippingFee)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-1">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover bg-[#DAE7C7] border border-[#E2E8D8] shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
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
                  </div>
                ))}
              </div>

              {/* Mã giảm giá */}
              <div className="border-t border-[#E2E8D8] pt-4 space-y-2.5">
                <label className="block text-xs font-bold text-[#101410] uppercase tracking-wider">
                  Mã giảm giá shop / hệ thống
                </label>
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        placeholder="VD: DOCU10, SACHHAY, TECH50"
                        className="flex-1 px-3.5 py-2 bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl text-xs font-mono uppercase text-[#101410] focus:outline-none focus:border-[#08482D]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        className="px-4 py-2 bg-[#08482D] text-white rounded-xl text-xs font-bold hover:bg-[#063A24] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isValidatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                      </button>
                    </div>

                    {/* Quick suggestion buttons */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#5E5E61] flex-wrap">
                      <span>Gợi ý:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon('DOCU10')}
                        className="font-mono px-2 py-0.5 rounded-lg bg-[#DAE7C7]/50 border border-[#DAE7C7] hover:border-[#08482D] font-bold text-[#08482D] cursor-pointer"
                      >
                        DOCU10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon('SACHHAY')}
                        className="font-mono px-2 py-0.5 rounded-lg bg-[#DAE7C7]/50 border border-[#DAE7C7] hover:border-[#08482D] font-bold text-[#08482D] cursor-pointer"
                      >
                        SACHHAY
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon('TECH50')}
                        className="font-mono px-2 py-0.5 rounded-lg bg-[#DAE7C7]/50 border border-[#DAE7C7] hover:border-[#08482D] font-bold text-[#08482D] cursor-pointer"
                      >
                        TECH50
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon('FREESHIP')}
                        className="font-mono px-2 py-0.5 rounded-lg bg-[#DAE7C7]/50 border border-[#DAE7C7] hover:border-[#08482D] font-bold text-[#08482D] cursor-pointer"
                      >
                        FREESHIP
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-xs text-[#B33F33] font-medium leading-relaxed">
                        ✕ {couponError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#DAE7C7]/50 rounded-2xl border border-[#DAE7C7] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-[#08482D] flex items-center gap-1">
                        ✓ Đã áp dụng: {appliedCoupon.code}
                      </div>
                      <div className="text-[11px] text-[#5E5E61] mt-0.5">
                        {appliedCoupon.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-[#B33F33] hover:underline ml-2 cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
              </div>

              {/* Chi phí tổng cộng */}
              <div className="border-t border-[#E2E8D8] pt-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-[#5E5E61]">
                  <span>Tạm tính tiền hàng</span>
                  <span className="font-mono font-medium text-[#101410]">{formatVND(orderSubtotal)}</span>
                </div>

                <div className="flex justify-between text-[#5E5E61]">
                  <span>Phí vận chuyển</span>
                  <span>
                    {orderShippingFee === 0 ? (
                      <span className="font-sans font-medium text-[#08482D]">
                        Miễn phí (đơn từ 1 triệu)
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-[#101410]">
                        {formatVND(orderShippingFee)}
                      </span>
                    )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#08482D] font-semibold">
                    <span>Giảm giá ({appliedCoupon?.code})</span>
                    <span className="font-mono">-{formatVND(discountAmount)}</span>
                  </div>
                )}

                <div className="border-t border-[#E2E8D8] pt-3 flex justify-between items-baseline font-bold">
                  <span className="text-sm sm:text-base text-[#101410]">Tổng cộng</span>
                  <span className="font-mono text-xl sm:text-2xl text-[#C2522D]">{formatVND(orderTotal)}</span>
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

      {/* MOBILE STICKY BOTTOM BAR: Hiển thị Tổng cộng và Nút xác nhận */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E2E8D8] p-4 shadow-2xl lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-[#5E5E61] block leading-tight">Tổng cộng</span>
            <span className="font-mono text-lg font-bold text-[#C2522D] leading-tight block">
              {formatVND(orderTotal)}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleValidateAndProceed}
            variant="primary"
            size="md"
            loading={isSubmitting}
            icon={<Lock className="w-4 h-4 shrink-0" />}
            iconRight={<ArrowRight className="w-4 h-4 shrink-0" />}
            className="flex-1 font-bold text-xs sm:text-sm shadow-md"
          >
            {paymentMethod === 'cod' ? 'Xác nhận đặt hàng COD' : 'Xác thực OTP & Thanh toán'}
          </Button>
        </div>
      </div>

      {/* 6-Box Auto-Advancing OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8D8] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#08482D]/10 text-[#08482D] flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#101410]">
                Xác thực giao dịch (OTP)
              </h3>
              <p className="text-xs text-[#5E5E61] mt-1">
                Nhập mã xác thực 6 số gửi đến điện thoại đăng ký
              </p>
              <div className="mt-2.5 inline-block px-3 py-1 bg-[#DAE7C7] text-[#08482D] text-xs font-mono font-bold rounded-lg">
                Mã OTP thử nghiệm: 123456
              </div>
            </div>

            {/* 6 Input Boxes */}
            <div className="flex items-center justify-center gap-2">
              {otpBoxes.map((val, idx) => (
                <input
                  key={idx}
                  ref={el => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={val}
                  onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-10 h-12 text-center font-mono text-lg font-bold bg-[#F5F8EF] border-2 border-[#E2E8D8] rounded-xl text-[#101410] focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D] transition-all"
                />
              ))}
            </div>

            {otpError && (
              <p className="text-xs text-[#B33F33] font-medium leading-relaxed">
                {otpError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowOtpModal(false)}
                className="flex-1 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleVerifyOtpAndPay}
                className="flex-1 text-xs"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
