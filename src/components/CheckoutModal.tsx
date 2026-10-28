import React, { useState, useRef } from 'react';
import { X, CreditCard, Building2, Truck, ShieldAlert, CheckCircle2, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Product, CartItem, Order, PaymentMethod } from '../types';
import { formatVND, validateLuhn } from '../utils/format';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from './Button';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  directItem?: { product: Product; quantity: number };
  onSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  shippingFee,
  total,
  directItem,
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

  if (!isOpen) return null;

  const currentItems = directItem ? [{
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
    image_url: directItem.product.image_url
  }] : items;

  const orderSubtotal = directItem ? directItem.product.price * directItem.quantity : subtotal;
  const orderShippingFee = directItem ? (orderSubtotal >= 1000000 ? 0 : 30000) : shippingFee;
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
        description: res.coupon.description
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
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Lỗi khi đặt hàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-4xl bg-[#F5F8EF] rounded-3xl border border-[#E2E8D8] shadow-vintage-lg overflow-hidden my-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#E2E8D8] bg-[#FFFFFF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#C2522D] text-white flex items-center justify-center font-bold text-sm shadow-vintage-sm">
                ✓
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#101410]">
                  Xác nhận & Đặt hàng
                </h3>
                <p className="text-xs text-[#5E5E61]">
                  Bước cuối để đón món đồ cũ yêu thích về nhà
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleValidateAndProceed} className="p-6 sm:p-8 grid md:grid-cols-12 gap-8">
            {/* Cột trái: Thông tin nhận hàng & Thanh toán */}
            <div className="md:col-span-7 space-y-6">
              {/* Notice */}
              <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E8D8] flex items-start gap-2.5 text-xs text-[#5E5E61]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#C2522D]" />
                <div>
                  <strong className="text-[#101410]">Môi trường thử nghiệm an toàn:</strong> Bạn có thể dùng thẻ Visa test <code className="bg-[#DAE7C7] px-1 py-0.5 rounded text-[#101410] font-mono">4111 1111 1111 1111</code>, OTP <code className="bg-[#DAE7C7] px-1 py-0.5 rounded text-[#101410] font-mono">123456</code>.
                </div>
              </div>

              {/* 1. Thông tin giao hàng */}
              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8D8] space-y-4 shadow-vintage-sm">
                <h4 className="text-sm font-bold text-[#101410]">
                  1. Địa chỉ giao hàng
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                      Người nhận *
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410] focus:outline-none focus:border-[#C2522D]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0909 246 135"
                      className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410] focus:outline-none focus:border-[#C2522D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                    Địa chỉ chi tiết (Số nhà, đường, phường, quận) *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="123 Đường Nam Kỳ Khởi Nghĩa, Quận 3, TP. Hồ Chí Minh"
                    className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410] focus:outline-none focus:border-[#C2522D]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                    Ghi chú cho tiệm (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Giao giờ hành chính, gọi trước khi đến..."
                    className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410] focus:outline-none focus:border-[#C2522D]"
                  />
                </div>
              </div>

              {/* 2. Phương thức thanh toán */}
              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8D8] space-y-4 shadow-vintage-sm">
                <h4 className="text-sm font-bold text-[#101410]">
                  2. Chọn phương thức thanh toán
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'card'
                        ? 'bg-[#DAE7C7] border-[#C2522D] text-[#101410] shadow-xs font-bold'
                        : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#C2522D]" />
                    <span className="text-xs">Visa / Master</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('napas')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'napas'
                        ? 'bg-[#DAE7C7] border-[#C2522D] text-[#101410] shadow-xs font-bold'
                        : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410]'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-[#08482D]" />
                    <span className="text-xs">Thẻ ATM NAPAS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'cod'
                        ? 'bg-[#DAE7C7] border-[#C2522D] text-[#101410] shadow-xs font-bold'
                        : 'border-[#E2E8D8] bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410]'
                    }`}
                  >
                    <Truck className="w-5 h-5 text-[#E3B23C]" />
                    <span className="text-xs">Thanh toán COD</span>
                  </button>
                </div>

                {/* Simulated Virtual Card UI (Live preview + 3D Flip on CVV focus) */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4 pt-2">
                    {/* Interactive Virtual Card */}
                    <div className="perspective-1000 max-w-sm mx-auto">
                      <div
                        className={`relative w-full h-48 rounded-2xl p-5 text-white transition-transform duration-500 transform-style-3d shadow-vintage-lg ${
                          isCardFlipped ? 'rotate-y-180' : ''
                        }`}
                        style={{
                          background: 'linear-gradient(135deg, #101410 0%, #4D382B 60%, #C2522D 100%)',
                          transformStyle: 'preserve-3d',
                          transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                        }}
                      >
                        {/* Front Face */}
                        {!isCardFlipped ? (
                          <div className="h-full flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="italic font-bold tracking-wider text-sm opacity-90">
                                Đồ Cũ Còn Thương
                              </span>
                              <span className="font-mono font-bold text-xs uppercase bg-white/20 px-2 py-0.5 rounded">
                                {cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD'}
                              </span>
                            </div>

                            <div className="font-mono text-base tracking-widest font-bold my-2 text-center text-amber-100">
                              {cardNumber || '•••• •••• •••• ••••'}
                            </div>

                            <div className="flex items-end justify-between text-xs">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider opacity-70 block">Chủ thẻ</span>
                                <span className="font-mono font-bold truncate max-w-[170px] block">
                                  {cardHolder || 'NGUYEN VAN A'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] uppercase tracking-wider opacity-70 block">Hạn dùng</span>
                                <span className="font-mono font-bold">{cardExpiry || 'MM/YY'}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Back Face (when CVV focused) */
                          <div className="h-full flex flex-col justify-between py-1" style={{ transform: 'rotateY(180deg)' }}>
                            <div className="w-full h-8 bg-black/80 -mx-5 mt-2" />
                            <div className="flex items-center justify-end pr-4">
                              <span className="text-[9px] mr-2 text-white/70">CVV:</span>
                              <div className="bg-white text-[#101410] font-mono font-bold px-3 py-1 rounded text-xs">
                                {cardCvv || '•••'}
                              </div>
                            </div>
                            <div className="text-[9px] text-white/60 text-center">
                              Thẻ thử nghiệm bảo mật bởi hệ thống Đồ Cũ Còn Thương
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Test Buttons */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fillTestCard('success')}
                        className="text-[11px] font-mono px-2.5 py-1 bg-[#DAE7C7] hover:bg-[#E2E8D8] text-[#101410] rounded-lg transition-colors"
                      >
                        ⚡ Điền thẻ thành công (4111)
                      </button>
                      <button
                        type="button"
                        onClick={() => fillTestCard('decline')}
                        className="text-[11px] font-mono px-2.5 py-1 bg-[#DAE7C7] hover:bg-[#E2E8D8] text-[#B33F33] rounded-lg transition-colors"
                      >
                        ✕ Thẻ từ chối (4000)
                      </button>
                    </div>

                    {/* Card inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                          Số thẻ quốc tế (16 số) *
                        </label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4111 1111 1111 1111"
                          className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs font-mono text-[#101410] focus:outline-none focus:border-[#C2522D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                          Tên chủ thẻ (không dấu) *
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="NGUYEN VAN A"
                          className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs font-mono text-[#101410] focus:outline-none focus:border-[#C2522D]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                            Hạn thẻ (MM/YY) *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs font-mono text-[#101410] focus:outline-none focus:border-[#C2522D]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                            Mã CVV (3 số) *
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
                            className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs font-mono text-[#101410] focus:outline-none focus:border-[#C2522D]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'napas' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-[#5E5E61] block mb-1">
                        Ngân hàng phát hành
                      </label>
                      <select
                        value={napasBank}
                        onChange={(e) => setNapasBank(e.target.value)}
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410] focus:outline-none focus:border-[#C2522D]"
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
                        Số thẻ ATM nội địa *
                      </label>
                      <input
                        type="text"
                        required
                        value={napasCardNumber}
                        onChange={(e) => setNapasCardNumber(e.target.value)}
                        placeholder="9704 1234 5678 9012"
                        className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs font-mono text-[#101410] focus:outline-none focus:border-[#C2522D]"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="p-3 bg-[#DAE7C7]/50 border border-[#E2E8D8] rounded-xl text-xs text-[#5E5E61] leading-relaxed">
                    Bạn sẽ thanh toán tiền mặt cho nhân viên giao hàng khi nhận kiện hàng. Vui lòng chuẩn bị đúng số tiền <strong className="text-[#101410]">{formatVND(orderTotal)}</strong>.
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Tóm tắt đơn hàng */}
            <div className="md:col-span-5 flex flex-col justify-between">
              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8D8] space-y-4 shadow-vintage-sm">
                <h4 className="text-sm font-bold text-[#101410]">
                  Kiện hàng của bạn ({currentItems.length} món)
                </h4>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#E2E8D8]/50 pr-1">
                  {currentItems.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center gap-3">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover bg-[#DAE7C7] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-[#101410] truncate">
                          {item.name}
                        </h5>
                        <p className="text-[11px] text-[#5E5E61]">
                          Số lượng: {item.quantity} · Độ mới: {item.condition_pct}%
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#101410] shrink-0">
                        {formatVND(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mã giảm giá */}
                <div className="border-t border-[#E2E8D8] pt-3 space-y-2">
                  <label className="block text-[11px] font-bold text-[#101410] uppercase tracking-wider">
                    Mã giảm giá
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
                          placeholder="VD: DOCU10, FREESHIP"
                          className="flex-1 px-3 py-2 bg-white border border-[#E2E8D8] rounded-xl text-xs font-mono uppercase text-[#101410] focus:outline-none focus:ring-1 focus:ring-[#C2522D]"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={isValidatingCoupon || !couponInput.trim()}
                          className="px-4 py-2 bg-[#101410] text-[#FFFFFF] rounded-xl text-xs font-bold hover:bg-[#C2522D] transition-colors disabled:opacity-50"
                        >
                          {isValidatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                        </button>
                      </div>

                      {/* Quick seeds */}
                      <div className="flex items-center gap-1.5 text-[10px] text-[#5E5E61]">
                        <span>Gợi ý:</span>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon('DOCU10')}
                          className="font-mono px-2 py-0.5 rounded bg-[#F5F8EF] border border-[#E2E8D8] hover:border-[#C2522D] font-bold text-[#C2522D]"
                        >
                          DOCU10 (-10%)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon('FREESHIP')}
                          className="font-mono px-2 py-0.5 rounded bg-[#F5F8EF] border border-[#E2E8D8] hover:border-[#08482D] font-bold text-[#08482D]"
                        >
                          FREESHIP
                        </button>
                      </div>

                      {couponError && (
                        <p className="text-[11px] text-[#B33F33] font-medium leading-tight">
                          ✕ {couponError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#08482D]/10 rounded-xl border border-[#08482D]/40 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-[#08482D] flex items-center gap-1">
                          ✓ Đã áp dụng: {appliedCoupon.code}
                        </div>
                        <div className="text-[11px] text-[#5E5E61]">
                          {appliedCoupon.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-bold text-[#B33F33] hover:underline ml-2"
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  )}
                </div>

                {/* Chi phí */}
                <div className="border-t border-[#E2E8D8] pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-[#5E5E61]">
                    <span>Tạm tính hàng</span>
                    <span className="font-mono text-[#101410]">{formatVND(orderSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#5E5E61]">
                    <span>Phí vận chuyển</span>
                    <span className="font-mono text-[#101410]">
                      {orderShippingFee === 0 ? (
                        <span className="text-[#08482D] font-semibold">Miễn phí (Đơn &gt; 1 triệu)</span>
                      ) : (
                        formatVND(orderShippingFee)
                      )}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#08482D] font-semibold">
                      <span>Giảm giá ({appliedCoupon?.code})</span>
                      <span className="font-mono">-{formatVND(discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-[#E2E8D8] pt-2 flex justify-between items-baseline font-bold">
                    <span className="text-sm text-[#101410]">Tổng cộng</span>
                    <span className="font-mono text-lg text-[#C2522D]">{formatVND(orderTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full text-sm font-semibold"
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  {paymentMethod === 'cod' ? 'Xác nhận đặt hàng COD' : 'Xác thực OTP & Thanh toán'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 6-Box Auto-Advancing OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-3xl w-full max-w-sm p-6 shadow-vintage-lg space-y-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#C2522D]/10 text-[#C2522D] flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#101410]">
                Xác thực giao dịch (OTP)
              </h3>
              <p className="text-xs text-[#5E5E61] mt-1">
                Nhập mã xác thực 6 số gửi đến điện thoại đăng ký
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-[#DAE7C7] text-[#101410] text-xs font-mono font-bold rounded-lg">
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
                  className="w-10 h-12 text-center font-mono text-lg font-bold bg-[#F5F8EF] border-2 border-[#E2E8D8] rounded-xl text-[#101410] focus:outline-none focus:border-[#C2522D] focus:ring-1 focus:ring-[#C2522D] transition-all"
                />
              ))}
            </div>

            {otpError && (
              <p className="text-xs text-[#B33F33] font-medium leading-relaxed">
                {otpError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
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
    </>
  );
};
