import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowRight, ChevronDown, X, Menu
} from 'lucide-react';
import { Product } from '../types';
import { Button } from './Button';
import CurvedCarousel, { CarouselProduct } from './CurvedCarousel';

interface HeroLandingProps {
  products: Product[];
  totalProductsCount: number;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onNavigate: (view: 'home' | 'orders' | 'seller' | 'account') => void;
  onOpenAuth: (role: 'buyer' | 'seller', isRegister?: boolean) => void;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = [
  'Thời trang',
  'Điện tử',
  'Máy ảnh',
  'Sách',
  'Nhạc cụ',
  'Phụ kiện',
  'Gia dụng'
];

export const HeroLanding: React.FC<HeroLandingProps> = ({
  products,
  totalProductsCount,
  onSelectProduct,
  onAddToCart,
  onNavigate,
  onOpenAuth,
  onSelectCategory
}) => {
  // Navigation & modals state
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Scroll listener for sticky header glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dismiss category popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToProducts = () => {
    const el = document.getElementById('products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Map store products to CarouselProduct format
  const carouselProducts: CarouselProduct[] = useMemo(() => {
    return (products || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      conditionPct: p.condition_pct,
      stock: p.stock,
      image: p.image_url
    }));
  }, [products]);

  const handleCarouselOpen = (cp: CarouselProduct) => {
    const orig = products.find(p => String(p.id) === String(cp.id));
    if (orig) {
      onSelectProduct(orig);
    }
  };

  const handleCarouselAddToCart = (cp: CarouselProduct) => {
    const orig = products.find(p => String(p.id) === String(cp.id));
    if (orig) {
      onAddToCart(orig);
    }
  };

  return (
    <section 
      className="relative w-full min-h-screen flex flex-col items-center justify-between text-center overflow-hidden bg-[#F5F8EF]"
      style={{
        minHeight: 'max(100vh, 680px)',
        alignSelf: 'stretch'
      }}
    >
      {/* Background radial subtle grid pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #08482D 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* ======================================================== */}
      {/* 1. TOP NAVBAR (1.2)                                      */}
      {/* Sticky top, absolute centered menu, glassmorphic blur    */}
      {/* ======================================================== */}
      <header
        className={`sticky top-0 left-0 right-0 z-40 w-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#F5F8EF]/90 backdrop-blur-md border-b border-[#E2E8D8] shadow-xs' 
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="w-full px-4 sm:px-10 h-20 flex items-center justify-between relative">
          {/* Logo pinned to LEFT (40px desktop, 16px mobile) */}
          <div className="flex items-center gap-2.5 shrink-0 z-20">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#08482D] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                ♻
              </div>
              <div>
                <span className="font-bold text-lg sm:text-xl text-[#101410] tracking-tight block leading-none">
                  Đồ Cũ Còn Thương
                </span>
                <span className="text-[10px] text-[#5E5E61] font-medium tracking-wide mt-1 block">
                  Tiệm đồ cũ phong cách tạp chí
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Links: ABSOLUTELY CENTERED on screen */}
          <nav className="hidden min-[1100px]:flex items-center gap-[calc(var(--u)*31)] absolute left-1/2 -translate-x-1/2 z-10 text-[calc(var(--u)*16.4)] font-semibold text-[#101410]">
            <button
              onClick={scrollToProducts}
              className="hover:text-[#08482D] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              Cửa hàng
            </button>

            {/* Category Dropdown Popover */}
            <div ref={categoryMenuRef} className="relative">
              <button
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className="flex items-center gap-1 hover:text-[#08482D] transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                <span>Danh mục</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCategoryMenu ? 'rotate-180' : ''}`} />
              </button>

              {showCategoryMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white rounded-2xl border border-[#E2E8D8] shadow-xl p-2 z-50 text-left animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold uppercase text-[#5E5E61] px-3 py-1.5 border-b border-[#E2E8D8]">
                    Tất cả danh mục đồ cũ
                  </div>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        onSelectCategory(cat);
                        setShowCategoryMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-[#101410] hover:bg-[#DAE7C7]/50 rounded-xl transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuideModal(true)}
              className="hover:text-[#08482D] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              Cách mua đồ cũ
            </button>

            <button
              onClick={() => onOpenAuth('seller', false)}
              className="hover:text-[#08482D] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              Kênh người bán
            </button>

            <a
              href="#footer-section"
              className="hover:text-[#08482D] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              Liên hệ
            </a>
          </nav>

          {/* Action Buttons pinned to RIGHT (40px desktop, 16px mobile) */}
          <div className="flex items-center gap-2 z-20">
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenAuth('buyer', false)}
                className="w-[92px] h-[40px] text-xs font-semibold"
              >
                Đăng nhập
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenAuth('buyer', true)}
                className="w-[97px] h-[40px] text-xs font-semibold"
              >
                Đăng ký
              </Button>
            </div>

            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="min-[1100px]:hidden p-2 rounded-xl text-[#101410] hover:bg-[#DAE7C7]/50 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="min-[1100px]:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
            <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E2E8D8]">
                  <span className="font-bold text-base text-[#101410]">Menu</span>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-[#5E5E61] hover:bg-[#F5F8EF]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-4 space-y-2 text-sm font-semibold text-[#101410] text-left">
                  <button
                    onClick={() => { setMobileMenuOpen(false); scrollToProducts(); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#DAE7C7]/40"
                  >
                    Cửa hàng
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowGuideModal(true); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#DAE7C7]/40"
                  >
                    Cách mua đồ cũ
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onOpenAuth('seller', false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#DAE7C7]/40"
                  >
                    Kênh người bán
                  </button>
                  <a
                    href="#footer-section"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#DAE7C7]/40"
                  >
                    Liên hệ
                  </a>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#E2E8D8]">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('buyer', false); }}
                  className="w-full text-xs"
                >
                  Đăng nhập người mua
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('buyer', true)} }
                  className="w-full text-xs"
                >
                  Đăng ký người mua
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. BADGE (1.3): auto width, 1 line, centered             */}
      {/* Gap from menu: 40u                                       */}
      {/* ======================================================== */}
      <div 
        className="w-full flex justify-center px-4"
        style={{
          marginTop: 'calc(var(--u) * 40)',
          marginBottom: 'calc(var(--u) * 28)'
        }}
      >
        <button
          onClick={scrollToProducts}
          className="inline-flex items-center justify-center bg-[#DAE7C7] text-[#08482D] rounded-full font-bold px-4 sm:px-5 py-2 shadow-2xs hover:bg-[#c9dcb2] hover:scale-105 transition-all duration-300 text-xs sm:text-sm whitespace-nowrap"
        >
          <span>♻ {totalProductsCount || products.length || 10} món đồ cũ đang chờ chủ mới</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3 & 4. HEADLINE & SUBTITLE (1.4 & 1.5)                   */}
      {/* Wrapped in relative block for non-overlapping hand notes */}
      {/* ======================================================== */}
      <div className="relative flex flex-col items-center max-w-4xl px-4 z-20">
        {/* Title: 2 lines */}
        <h1 
          className="font-bold text-[#101410] text-center tracking-tight"
          style={{
            fontSize: 'clamp(40px, calc(var(--u) * 88), 112px)',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            marginBottom: 'calc(var(--u) * 24)'
          }}
        >
          Đồ cũ còn thương, <br />
          chờ người thương mới
        </h1>

        {/* Handwritten Note 1: "Kiểm định / từng món" (Bước 4) */}
        {/* Placed to the right of headline: left: calc(100% + 32u), level with line 2, rotate: 14deg */}
        <div 
          className="absolute select-none pointer-events-none hidden xl:block text-left"
          style={{
            left: 'calc(100% + calc(var(--u) * 32))',
            top: 'calc(var(--u) * 40)'
          }}
        >
          <div 
            className="font-hand text-[#08482D] leading-tight whitespace-nowrap"
            style={{ 
              fontSize: 'calc(var(--u) * 26)',
              rotate: '14deg'
            }}
          >
            Kiểm định <br /> từng món
          </div>

          {/* Curved arrow: starts BELOW text, curves down, always at least 16px to right of subtitle */}
          <svg 
            className="overflow-visible"
            style={{
              width: 'calc(var(--u) * 90)',
              height: 'calc(var(--u) * 120)',
              marginTop: 'calc(var(--u) * 6)',
              marginLeft: 'calc(var(--u) * 6)'
            }}
            viewBox="0 0 90 120"
            fill="none"
          >
            <path
              d="M 30 10 C 45 40, 30 75, 10 110"
              stroke="#08482D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="180"
              strokeDashoffset="180"
              className="draw-stroke"
            />
            <path
              d="M 5 100 L 10 110 L 20 105"
              stroke="#08482D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Subtitle: 2 lines */}
        <div className="relative max-w-[calc(var(--u)*720)]">
          {/* Handwritten Note 2: "//" (Bước 4) placed to the left of subtitle */}
          <div 
            className="absolute font-hand text-[#08482D] select-none pointer-events-none hidden md:block"
            style={{
              right: 'calc(100% + calc(var(--u) * 40))',
              top: '0',
              fontSize: 'calc(var(--u) * 30)'
            }}
          >
            //
          </div>

          <p 
            className="text-[#5E5E61] font-medium leading-relaxed"
            style={{
              fontSize: 'clamp(15px, calc(var(--u) * 20.8), 22px)',
              lineHeight: 1.5,
              marginBottom: 'calc(var(--u) * 40)'
            }}
          >
            Đồ second-hand được kiểm tra kỹ, ghi rõ độ mới và tình trạng thật. <br className="hidden sm:inline" />
            Thanh toán thẻ hoặc khi nhận hàng, theo dõi đơn từng bước.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. CURVED CYLINDRICAL CAROUSEL (Bước 3)                  */}
      {/* Full width 100%, align-self: stretch, no horizontal pad  */}
      {/* Entrance animation strictly on outer wrapper             */}
      {/* ======================================================== */}
      <div
        className="w-full relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-700"
        style={{
          width: '100%',
          alignSelf: 'stretch',
          marginBottom: 'calc(var(--u) * 32)'
        }}
      >
        <CurvedCarousel
          products={carouselProducts}
          onOpen={handleCarouselOpen}
          onAddToCart={handleCarouselAddToCart}
        />
      </div>

      {/* ======================================================== */}
      {/* 6. MAIN CTA BUTTON & SELLER LINK                         */}
      {/* ======================================================== */}
      <div 
        className="w-full flex flex-col items-center justify-center pb-8 z-20 px-4"
      >
        <div className="relative inline-flex items-center">
          {/* Note 3: "Miễn ship / từ 1 triệu" (Bước 4) placed to left of button, 48u away, rotate: -10deg */}
          <div 
            className="absolute select-none pointer-events-none hidden md:flex items-center gap-1.5"
            style={{
              right: 'calc(100% + calc(var(--u) * 48))',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <div 
              className="font-hand text-[#08482D] leading-tight text-right whitespace-nowrap"
              style={{ 
                fontSize: 'calc(var(--u) * 24)',
                rotate: '-10deg'
              }}
            >
              Miễn ship <br /> từ 1 triệu
            </div>

            {/* Small curved arrow pointing to the main button */}
            <svg 
              style={{
                width: 'calc(var(--u) * 50)',
                height: 'calc(var(--u) * 36)'
              }}
              viewBox="0 0 50 36" 
              fill="none"
            >
              <path
                d="M 5 18 Q 25 8, 44 20"
                stroke="#08482D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="70"
                strokeDashoffset="70"
                className="draw-stroke"
              />
              <path
                d="M 35 13 L 44 20 L 37 25"
                stroke="#08482D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Main button: 172x58 in 190x74 dashed ring */}
          <Button
            variant="primary"
            size="lg"
            withDashedRing
            onClick={scrollToProducts}
            className="w-[172px] h-[58px] text-base font-bold shadow-md"
          >
            Săn đồ ngay
          </Button>
        </div>

        {/* Secondary link: "hoặc bán đồ của bạn →" opens seller register modal */}
        <button
          onClick={() => onOpenAuth('seller', true)}
          className="mt-3 text-xs sm:text-sm font-semibold text-[#5E5E61] hover:text-[#08482D] transition-colors hover:underline underline-offset-4"
        >
          hoặc bán đồ của bạn &rarr;
        </button>
      </div>

      {/* ======================================================== */}
      {/* 7. MODAL: "CÁCH MUA ĐỒ CŨ" (4 STEPS)                     */}
      {/* ======================================================== */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E2E8D8] p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8D8]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#DAE7C7] text-[#08482D] flex items-center justify-center font-bold">
                  ♻
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#101410]">
                    Cách mua đồ cũ tại tiệm
                  </h3>
                  <p className="text-xs text-[#5E5E61]">
                    4 bước an tâm tuyệt đối khi săn đồ second-hand độc bản
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full hover:bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#08482D] text-white flex items-center justify-center text-xs font-bold font-mono">
                  1
                </div>
                <h4 className="text-sm font-bold text-[#101410]">Chọn món đồ ưng ý</h4>
                <p className="text-xs text-[#5E5E61] leading-relaxed">
                  Xem rõ % độ mới, hình ảnh thực tế từng vết xước thời gian và câu chuyện độc bản của từng món đồ.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#08482D] text-white flex items-center justify-center text-xs font-bold font-mono">
                  2
                </div>
                <h4 className="text-sm font-bold text-[#101410]">Đặt hàng & Thanh toán</h4>
                <p className="text-xs text-[#5E5E61] leading-relaxed">
                  Lựa chọn trả tiền mặt khi nhận hàng (COD) hoặc thẻ quốc tế Visa / ATM NAPAS có mã xác thực OTP an toàn.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#08482D] text-white flex items-center justify-center text-xs font-bold font-mono">
                  3
                </div>
                <h4 className="text-sm font-bold text-[#101410]">Theo dõi vận chuyển</h4>
                <p className="text-xs text-[#5E5E61] leading-relaxed">
                  Hệ thống gửi thông báo tự động mỗi khi người bán đóng gói, bàn giao ĐVVC hoặc hàng đang trên đường tới.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#08482D] text-white flex items-center justify-center text-xs font-bold font-mono">
                  4
                </div>
                <h4 className="text-sm font-bold text-[#101410]">Đồng kiểm & Đổi trả</h4>
                <p className="text-xs text-[#5E5E61] leading-relaxed">
                  Mở hộp kiểm tra cùng shipper. Cam kết hoàn tiền và đổi trả trong vòng 3 ngày nếu tình trạng sai lệch mô tả.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setShowGuideModal(false);
                  scrollToProducts();
                }}
              >
                Đã hiểu, đi xem đồ ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
