import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ShoppingBag, ArrowRight, CheckCircle2, ChevronDown, Sparkles, X, 
  Package, Store, User as UserIcon, LogOut, Truck, ShieldCheck, Heart, RotateCcw
} from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { formatVND } from '../utils/format';
import { Button } from './Button';

interface HeroLandingProps {
  products: Product[];
  totalProductsCount: number;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onNavigate: (view: 'home' | 'orders' | 'seller' | 'account') => void;
  onOpenAuth: (role: 'buyer' | 'seller') => void;
  onOpenCart: () => void;
  onSelectCategory: (category: string) => void;
  onSelectOrder?: (orderId: number) => void;
}

// 7 categories for the dropdown menu
const CATEGORIES = [
  'Thời trang',
  'Điện tử',
  'Máy ảnh',
  'Sách',
  'Nhạc cụ',
  'Phụ kiện',
  'Gia dụng'
];

interface Point {
  x: number;
  y: number;
}

// Helper to calculate rounded corner quad path
function computeRoundedQuadPath(p0: Point, p1: Point, p2: Point, p3: Point, r: number = 15): string {
  const pts = [p0, p1, p2, p3];
  const n = pts.length;
  const segments: string[] = [];

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    // Vector prev -> curr
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const len1 = Math.hypot(d1x, d1y) || 1;
    const u1x = d1x / len1;
    const u1y = d1y / len1;

    // Vector curr -> next
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len2 = Math.hypot(d2x, d2y) || 1;
    const u2x = d2x / len2;
    const u2y = d2y / len2;

    const actualR = Math.min(r, len1 / 2, len2 / 2);

    const startX = curr.x - u1x * actualR;
    const startY = curr.y - u1y * actualR;
    const endX = curr.x + u2x * actualR;
    const endY = curr.y + u2y * actualR;

    if (i === 0) {
      segments.push(`M ${startX.toFixed(1)} ${startY.toFixed(1)}`);
    } else {
      segments.push(`L ${startX.toFixed(1)} ${startY.toFixed(1)}`);
    }
    segments.push(`Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`);
  }

  segments.push('Z');
  return segments.join(' ');
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  products,
  totalProductsCount,
  onSelectProduct,
  onAddToCart,
  onNavigate,
  onOpenAuth,
  onOpenCart,
  onSelectCategory,
  onSelectOrder
}) => {
  const { user, logout, cartCount } = useAuth();

  // State
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  // References
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const stripContainerRef = useRef<HTMLDivElement>(null);

  // Motion reduced check
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  // Real items looped to fill strip smoothly
  const displayItems = useMemo(() => {
    if (!products || products.length === 0) return [];
    let items = [...products];
    while (items.length < 12) {
      items = items.concat(products);
    }
    return items.slice(0, 16);
  }, [products]);

  // Strip physics state
  const stripStateRef = useRef({
    offset: 0, // In units 'u'
    velocity: -50, // u per second (moving right to left)
    isDragging: false,
    dragStartX: 0,
    dragStartOffset: 0,
    lastDragX: 0,
    lastDragTime: 0,
    dragDistance: 0,
    isHovered: false,
    lastFrameTime: performance.now(),
    animationFrameId: 0
  });

  // Re-render trigger for card strip positions
  const [, setTick] = useState(0);

  // Scroll detection for sticky header glass blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to dismiss menus
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Strip Animation Loop using requestAnimationFrame
  useEffect(() => {
    const state = stripStateRef.current;
    state.lastFrameTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - state.lastFrameTime) / 1000, 0.1); // seconds
      state.lastFrameTime = now;

      if (!state.isDragging) {
        if (!state.isHovered && !prefersReducedMotion) {
          // If we have inertia velocity, decay it toward base speed (-50u/s)
          const targetVelocity = -50;
          if (Math.abs(state.velocity - targetVelocity) > 1) {
            // Decay inertia by 95% per second
            const decay = Math.pow(0.05, dt);
            state.velocity = targetVelocity + (state.velocity - targetVelocity) * decay;
          } else {
            state.velocity = targetVelocity;
          }

          state.offset += state.velocity * dt;
        }
      }

      setTick(t => (t + 1) % 100000);
      state.animationFrameId = requestAnimationFrame(loop);
    };

    state.animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(state.animationFrameId);
  }, [prefersReducedMotion]);

  // Pointer / Touch Handlers for Dragging
  const handlePointerDown = (clientX: number) => {
    const state = stripStateRef.current;
    state.isDragging = true;
    state.dragStartX = clientX;
    state.dragStartOffset = state.offset;
    state.lastDragX = clientX;
    state.lastDragTime = performance.now();
    state.dragDistance = 0;
  };

  const handlePointerMove = (clientX: number) => {
    const state = stripStateRef.current;
    if (!state.isDragging) return;

    const deltaX = clientX - state.dragStartX;
    state.dragDistance = Math.abs(clientX - state.dragStartX);

    // Get current scale factor u
    const rect = stripContainerRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / 1440 : 1;
    const deltaU = deltaX / scale;

    state.offset = state.dragStartOffset + deltaU;

    // Calculate instantaneous velocity
    const now = performance.now();
    const dt = (now - state.lastDragTime) / 1000;
    if (dt > 0.008) {
      const stepDeltaX = clientX - state.lastDragX;
      state.velocity = (stepDeltaX / scale) / dt;
      state.lastDragX = clientX;
      state.lastDragTime = now;
    }
  };

  const handlePointerUp = () => {
    const state = stripStateRef.current;
    state.isDragging = false;
  };

  const handleCardClick = (product: Product, e: React.MouseEvent) => {
    // If movement > 6px, treat as drag and DO NOT open product detail
    if (stripStateRef.current.dragDistance > 6) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelectProduct(product);
  };

  // Card math calculation
  const totalCards = displayItems.length;
  const baseSpacing = 196; // u
  const totalLoopWidth = totalCards * baseSpacing;

  const cardsData = useMemo(() => {
    const currentOffset = stripStateRef.current.offset;

    return displayItems.map((prod, index) => {
      // Calculate normalized position along loop
      let rawPos = (index * baseSpacing + currentOffset) % totalLoopWidth;
      if (rawPos < 0) rawPos += totalLoopWidth;

      // Center around 720: range from -totalLoopWidth/2 to +totalLoopWidth/2
      let t = rawPos - 720;
      if (t > totalLoopWidth / 2) t -= totalLoopWidth;
      if (t < -totalLoopWidth / 2) t += totalLoopWidth;

      // Cylindrical push-out formula:
      // x = 720 + t * (1 + 0.083 * (t / 706)^2)
      const ratioT = t / 706;
      const x = 720 + t * (1 + 0.083 * ratioT * ratioT);

      // Normalized distance from center
      const d = Math.abs(x - 720) / 706;

      // Card width
      const w = 170 + 48 * d * d;

      // Vertical center
      const yCenter = 687 - 12 * d * d;

      // Vertical heights at left & right edges
      const xLeft = x - w / 2;
      const qLeft = Math.abs(xLeft - 720) / 706;
      const hLeft = 280 + 92 * Math.pow(qLeft, 2.6);

      const xRight = x + w / 2;
      const qRight = Math.abs(xRight - 720) / 706;
      const hRight = 280 + 92 * Math.pow(qRight, 2.6);

      // 4 corners of the quad (in local coordinates 0..w and 0..maxH)
      const maxH = Math.max(hLeft, hRight);
      const topOffsetLeft = (maxH - hLeft) / 2;
      const topOffsetRight = (maxH - hRight) / 2;

      const p0 = { x: 0, y: topOffsetLeft };
      const p1 = { x: w, y: topOffsetRight };
      const p2 = { x: w, y: topOffsetRight + hRight };
      const p3 = { x: 0, y: topOffsetLeft + hLeft };

      const clipPathSvg = computeRoundedQuadPath(p0, p1, p2, p3, 15);

      // Visibility check: only render cards within screen canvas [-200, 1640]
      const isVisible = x > -220 && x < 1660;

      return {
        prod,
        index,
        x,
        w,
        maxH,
        top: yCenter - maxH / 2,
        clipPathSvg,
        isVisible,
        d
      };
    });
  }, [displayItems, stripStateRef.current.offset, totalLoopWidth]);

  // Scroll smoothly to products list
  const scrollToProducts = () => {
    const el = document.getElementById('products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#F5F8EF] select-none">
      {/* 1440x1080 Responsive Canvas Container */}
      <div 
        className="relative mx-auto w-full max-w-[1440px] aspect-[1440/1080] min-h-[720px] max-h-[1080px] flex flex-col justify-between"
        style={{
          // Dynamic scale unit --u
          ['--u' as any]: 'min(calc(100vw / 1440), calc(100vh / 1080))'
        }}
      >
        {/* ======================================================== */}
        {/* 1. TOP NAVIGATION BAR                                    */}
        {/* ======================================================== */}
        <header 
          className={`sticky top-0 left-0 right-0 z-40 transition-all duration-300 ${
            isScrolled 
              ? 'bg-[#F5F8EF]/92 backdrop-blur-md border-b border-[#E2E8D8] shadow-xs' 
              : 'bg-transparent'
          }`}
          style={{ height: 'calc(var(--u) * 98)' }}
        >
          <div className="relative w-full h-full max-w-[1440px] mx-auto px-4 sm:px-8 flex items-center justify-between">
            {/* Logo at (37u, 36u) */}
            <button
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#DAE7C7] rounded-xl"
              style={{
                marginLeft: 'calc(var(--u) * 20)',
                marginTop: 'calc(var(--u) * 4)'
              }}
            >
              {/* Green leaf icon with circular recycling arrows */}
              <div 
                className="rounded-full bg-[#08482D] text-white flex items-center justify-center font-bold shadow-xs transition-transform duration-200 group-hover:scale-105"
                style={{
                  width: 'calc(var(--u) * 42)',
                  height: 'calc(var(--u) * 42)'
                }}
              >
                <span style={{ fontSize: 'calc(var(--u) * 22)' }}>♻</span>
              </div>
              <div className="flex flex-col">
                <span 
                  className="font-bold tracking-tight text-[#101410] leading-none"
                  style={{ fontSize: 'calc(var(--u) * 23)' }}
                >
                  Đồ Cũ Còn Thương
                </span>
                <span 
                  className="text-[#5E5E61] font-medium tracking-wide uppercase mt-0.5"
                  style={{ fontSize: 'calc(var(--u) * 11)' }}
                >
                  Tiệm second-hand có câu chuyện
                </span>
              </div>
            </button>

            {/* Menu starting around x=505u, font 16.4u, gap 31u */}
            <nav 
              className="hidden lg:flex items-center text-[#101410] font-semibold"
              style={{
                fontSize: 'calc(var(--u) * 16.4)',
                gap: 'calc(var(--u) * 31)'
              }}
            >
              <button
                onClick={scrollToProducts}
                className="hover:text-[#08482D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAE7C7] rounded-lg px-1.5 py-1"
              >
                Cửa hàng
              </button>

              {/* Categories dropdown */}
              <div ref={categoryMenuRef} className="relative">
                <button
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="flex items-center gap-1 hover:text-[#08482D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAE7C7] rounded-lg px-1.5 py-1"
                >
                  <span>Danh mục</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {showCategoryMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-[#E2E8D8] rounded-2xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-1 text-xs font-medium">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          onSelectCategory(cat);
                          setShowCategoryMenu(false);
                          scrollToProducts();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-[#101410] hover:bg-[#DAE7C7]/40 hover:text-[#08482D] transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowGuideModal(true)}
                className="hover:text-[#08482D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAE7C7] rounded-lg px-1.5 py-1"
              >
                Cách mua đồ cũ
              </button>

              <button
                onClick={() => onNavigate('seller')}
                className="hover:text-[#08482D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAE7C7] rounded-lg px-1.5 py-1"
              >
                Kênh người bán
              </button>

              <a
                href="#footer-section"
                className="hover:text-[#08482D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAE7C7] rounded-lg px-1.5 py-1"
              >
                Liên hệ
              </a>
            </nav>

            {/* Auth Buttons / User actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  {/* Notification Bell */}
                  <NotificationBell onSelectOrder={onSelectOrder} />

                  {/* Cart Button */}
                  {user.role === 'buyer' && (
                    <button
                      onClick={onOpenCart}
                      className="relative p-2 rounded-full bg-white border border-[#E2E8D8] hover:bg-[#F5F8EF] text-[#101410] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#DAE7C7]"
                      aria-label="Giỏ hàng"
                    >
                      <ShoppingBag className="w-5 h-5 text-[#08482D]" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C2522D] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center animate-bounce">
                          {cartCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Avatar / Profile */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8D8] text-xs font-semibold text-[#101410] hover:bg-[#F5F8EF]"
                    >
                      <UserIcon className="w-4 h-4 text-[#08482D]" />
                      <span className="hidden sm:inline max-w-[100px] truncate">{user.full_name}</span>
                    </button>

                    {showUserDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E2E8D8] rounded-2xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                        {user.role === 'buyer' ? (
                          <>
                            <button
                              onClick={() => { onNavigate('account'); setShowUserDropdown(false); }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DAE7C7]/40 text-[#101410]"
                            >
                              Tài khoản của tôi
                            </button>
                            <button
                              onClick={() => { onNavigate('orders'); setShowUserDropdown(false); }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DAE7C7]/40 text-[#101410]"
                            >
                              Đơn mua của tôi
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { onNavigate('seller'); setShowUserDropdown(false); }}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DAE7C7]/40 text-[#101410]"
                          >
                            Quản trị người bán
                          </button>
                        )}
                        <div className="my-1 border-t border-[#E2E8D8]" />
                        <button
                          onClick={() => { logout(); setShowUserDropdown(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F6DDDB] text-[#B3362F] flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Login Button (white outline 92x40) */}
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => onOpenAuth('buyer')}
                    className="w-[92px] h-[40px] text-xs font-semibold"
                  >
                    Đăng nhập
                  </Button>

                  {/* Register Button (forest green 97x40) */}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onOpenAuth('buyer')}
                    className="w-[97px] h-[40px] text-xs font-semibold"
                  >
                    Đăng ký
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 2. BADGE: mint pill at (575u, 115u), 292x37             */}
        {/* ======================================================== */}
        <div 
          className="absolute z-20 flex justify-center w-full pointer-events-none"
          style={{ top: 'calc(var(--u) * 115)' }}
        >
          <button
            onClick={scrollToProducts}
            className="pointer-events-auto inline-flex items-center justify-center bg-[#DAE7C7] text-[#08482D] rounded-full font-bold px-6 py-2 shadow-2xs hover:bg-[#c9dcb2] hover:scale-105 transition-all duration-300"
            style={{
              width: 'calc(var(--u) * 292)',
              height: 'calc(var(--u) * 37)',
              fontSize: 'calc(var(--u) * 16.6)'
            }}
          >
            <span>♻ {totalProductsCount || products.length || 10} món đồ cũ đang chờ chủ mới</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 3. HEADLINE: centered at y=176u, size 88u, line 92u     */}
        {/* ======================================================== */}
        <div 
          className="absolute z-20 w-full text-center px-4"
          style={{ top: 'calc(var(--u) * 176)' }}
        >
          <h1 
            className="font-bold text-[#101410] leading-none tracking-tight max-w-4xl mx-auto"
            style={{
              fontSize: 'calc(var(--u) * 88)',
              lineHeight: 'calc(var(--u) * 92)',
              letterSpacing: '-0.035em'
            }}
          >
            Đồ cũ còn thương, <br />
            chờ người thương mới
          </h1>
        </div>

        {/* ======================================================== */}
        {/* 4. SUBHEADLINE: centered at y=394u, size 20.8u, line 32u */}
        {/* ======================================================== */}
        <div 
          className="absolute z-20 w-full text-center px-4"
          style={{ top: 'calc(var(--u) * 394)' }}
        >
          <p 
            className="text-[#5E5E61] max-w-2xl mx-auto font-medium"
            style={{
              fontSize: 'calc(var(--u) * 20.8)',
              lineHeight: 'calc(var(--u) * 32)'
            }}
          >
            Đồ second-hand được kiểm tra kỹ, ghi rõ độ mới và tình trạng thật. <br className="hidden sm:inline" />
            Thanh toán thẻ hoặc khi nhận hàng, theo dõi đơn từng bước.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 5. HANDWRITTEN ANNOTATIONS & SVG ARROWS (Patrick Hand)    */}
        {/* ======================================================== */}
        {/* Note 1: "//" small slash mark at (263u, 377u) */}
        <div 
          className="absolute z-20 font-hand text-[#08482D] select-none pointer-events-none hidden md:block"
          style={{
            left: 'calc(var(--u) * 263)',
            top: 'calc(var(--u) * 377)',
            fontSize: 'calc(var(--u) * 28)'
          }}
        >
          //
        </div>

        {/* Note 2: "Kiểm định / từng món" at (1212u, 310u) rotated 16deg + curved arrow */}
        <div 
          className="absolute z-20 select-none pointer-events-none hidden lg:block"
          style={{
            left: 'calc(var(--u) * 1180)',
            top: 'calc(var(--u) * 300)'
          }}
        >
          <div 
            className="font-hand text-[#08482D] leading-tight text-center transform rotate-[16deg]"
            style={{ fontSize: 'calc(var(--u) * 26)' }}
          >
            Kiểm định <br /> từng món
          </div>

          {/* Curved SVG arrow starting BELOW the text and curving down into card strip */}
          <svg 
            className="overflow-visible"
            style={{
              width: 'calc(var(--u) * 120)',
              height: 'calc(var(--u) * 160)',
              marginTop: 'calc(var(--u) * 8)',
              marginLeft: 'calc(var(--u) * 10)'
            }}
            viewBox="0 0 120 160"
            fill="none"
          >
            <path
              d="M 60 10 C 75 50, 40 100, 15 145"
              stroke="#08482D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="200"
              strokeDashoffset="200"
              className="draw-stroke"
            />
            {/* Arrowhead */}
            <path
              d="M 8 135 L 15 145 L 26 142"
              stroke="#08482D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Note 3: "Miễn ship / từ 1 triệu" at (521u, 937u) rotated 24deg + small arrow */}
        <div 
          className="absolute z-20 select-none pointer-events-none hidden md:flex items-center gap-2"
          style={{
            left: 'calc(var(--u) * 440)',
            top: 'calc(var(--u) * 920)'
          }}
        >
          <div 
            className="font-hand text-[#08482D] leading-tight transform -rotate-[14deg]"
            style={{ fontSize: 'calc(var(--u) * 24)' }}
          >
            Miễn ship <br /> từ 1 triệu
          </div>

          {/* Small curved arrow pointing to the main button */}
          <svg 
            style={{
              width: 'calc(var(--u) * 60)',
              height: 'calc(var(--u) * 40)'
            }}
            viewBox="0 0 60 40" 
            fill="none"
          >
            <path
              d="M 5 20 Q 30 10, 52 24"
              stroke="#08482D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="80"
              strokeDashoffset="80"
              className="draw-stroke"
            />
            <path
              d="M 42 16 L 52 24 L 44 29"
              stroke="#08482D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* ======================================================== */}
        {/* 6. CYLINDRICAL CURVED STRIP OF PRODUCT CARDS            */}
        {/* ======================================================== */}
        <div
          ref={stripContainerRef}
          onMouseEnter={() => { stripStateRef.current.isHovered = true; }}
          onMouseLeave={() => { 
            stripStateRef.current.isHovered = false; 
            stripStateRef.current.isDragging = false; 
            setHoveredCardIndex(null);
          }}
          onMouseDown={(e) => handlePointerDown(e.clientX)}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onMouseUp={handlePointerUp}
          onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
          onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
          onTouchEnd={handlePointerUp}
          className="absolute left-0 right-0 z-10 w-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{
            top: 'calc(var(--u) * 470)',
            height: 'calc(var(--u) * 410)'
          }}
        >
          {/* Loop over calculated card positions */}
          {cardsData.map((card) => {
            if (!card.isVisible) return null;
            const isHovered = hoveredCardIndex === card.index;
            const isOutOfStock = card.prod.stock <= 0;

            return (
              <div
                key={`${card.prod.id}-${card.index}`}
                onClick={(e) => handleCardClick(card.prod, e)}
                onMouseEnter={() => setHoveredCardIndex(card.index)}
                onFocus={() => {
                  stripStateRef.current.isHovered = true;
                  setHoveredCardIndex(card.index);
                }}
                onBlur={() => {
                  stripStateRef.current.isHovered = false;
                  setHoveredCardIndex(null);
                }}
                tabIndex={0}
                role="button"
                aria-label={`${card.prod.name}, giá ${formatVND(card.prod.price)}, độ mới ${card.prod.condition_pct}%`}
                className="absolute transition-opacity duration-300 group focus:outline-none focus:ring-3 focus:ring-[#DAE7C7]"
                style={{
                  left: `calc(var(--u) * ${card.x - card.w / 2})`,
                  top: `calc(var(--u) * ${card.top - 470})`,
                  width: `calc(var(--u) * ${card.w})`,
                  height: `calc(var(--u) * ${card.maxH})`,
                  zIndex: isHovered ? 30 : Math.round(100 - card.d * 10)
                }}
              >
                {/* SVG Clipped Card Container with 15u rounded corners */}
                <div 
                  className={`relative w-full h-full overflow-hidden bg-white transition-all duration-300 ${
                    isHovered ? 'brightness-105' : ''
                  }`}
                  style={{
                    clipPath: `path('${card.clipPathSvg}')`
                  }}
                >
                  {/* Ken Burns image */}
                  <img
                    src={card.prod.image_url}
                    alt={card.prod.name}
                    className={`w-full h-full object-cover ken-burns select-none pointer-events-none transition-transform duration-500 ${
                      isOutOfStock ? 'grayscale opacity-60' : ''
                    } ${isHovered ? 'scale-110' : ''}`}
                    style={{
                      animationDelay: `${(card.index * 1.7) % 6}s`
                    }}
                  />

                  {/* Top-Left Stamp: "95% mới" */}
                  <div className="absolute top-3 left-3 z-20">
                    <div className="bg-[#DAE7C7]/92 backdrop-blur-md text-[#08482D] text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border border-white/40 shadow-xs">
                      {isOutOfStock ? 'HẾT HÀNG' : `${card.prod.condition_pct}% MỚI`}
                    </div>
                  </div>

                  {/* Bottom-Left: Quick Add-to-Cart round frosted button */}
                  {!isOutOfStock && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(card.prod);
                      }}
                      className="absolute bottom-3 left-3 z-20 w-8 h-8 rounded-full bg-white/85 backdrop-blur-md border border-white/50 text-[#08482D] flex items-center justify-center shadow-xs hover:bg-[#08482D] hover:text-white transition-all duration-200 active:scale-95"
                      title="Thêm nhanh vào giỏ"
                      aria-label="Thêm vào giỏ"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  )}

                  {/* Bottom-Right: Frosted glass price pill */}
                  <div className="absolute bottom-3 right-3 z-20">
                    <div className="bg-[#101410]/80 backdrop-blur-md text-white font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
                      {isOutOfStock ? 'Đã có chủ' : formatVND(card.prod.price)}
                    </div>
                  </div>

                  {/* Hover Overlay: Show product name cleanly */}
                  <div 
                    className={`absolute inset-x-0 bottom-0 p-3 pt-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white transition-opacity duration-300 pointer-events-none ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <p className="text-xs font-semibold leading-tight truncate">
                      {card.prod.name}
                    </p>
                    <p className="text-[10px] text-white/80 font-mono mt-0.5">
                      {card.prod.category} · {card.prod.condition_pct}% mới
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* 7. MAIN CTA BUTTON & SELLER LINK                         */}
        {/* ======================================================== */}
        <div 
          className="absolute z-20 w-full flex flex-col items-center justify-center text-center"
          style={{ top: 'calc(var(--u) * 890)' }}
        >
          {/* Main button: 172x58 inside 190x74 dashed ring at (626u, 901u) */}
          <Button
            variant="primary"
            size="lg"
            withDashedRing
            onClick={scrollToProducts}
            className="w-[172px] h-[58px] text-base font-bold shadow-md"
          >
            Săn đồ ngay
          </Button>

          {/* Secondary link: "hoặc bán đồ của bạn →" */}
          <button
            onClick={() => onNavigate('seller')}
            className="mt-3 text-xs sm:text-sm font-semibold text-[#5E5E61] hover:text-[#08482D] transition-colors hover:underline underline-offset-4"
          >
            hoặc bán đồ của bạn &rarr;
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 8. MODAL: "CÁCH MUA ĐỒ CŨ" (4 STEPS)                     */}
      {/* ======================================================== */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E2E8D8] p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
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
