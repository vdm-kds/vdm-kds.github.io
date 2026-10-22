import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrdersView } from './components/OrdersView';
import { SellerDashboard } from './components/SellerDashboard';
import { AuthModal } from './components/AuthModal';
import { SuccessOrderModal } from './components/SuccessOrderModal';
import { AccountView } from './components/AccountView';
import { DemoController } from './components/DemoController';
import { PolicyModal } from './components/PolicyModal';
import { NotFoundView } from './components/NotFoundView';
import { Product, CartItem, Order } from './types';
import { api } from './services/api';
import { formatVND } from './utils/format';
import { 
  Search, SlidersHorizontal, Sparkles, ShieldCheck, Heart, Truck, RefreshCw, 
  ArrowRight, Tag, Check, Filter, RotateCcw, HelpCircle, PhoneCall, Info
} from 'lucide-react';

function MainShopApp() {
  const { user, refreshCartCount } = useAuth();
  const { showToast } = useToast();

  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'orders' | 'seller' | 'account' | '404'>('home');
  const [selectedOrderCodeForTracking, setSelectedOrderCodeForTracking] = useState<string | null>(null);

  // Products State & Filters
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minCondition, setMinCondition] = useState<number>(50);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Modal States
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [directCheckoutItem, setDirectCheckoutItem] = useState<{ product: Product; quantity: number } | undefined>(undefined);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; role: 'buyer' | 'seller' }>({ open: false, role: 'buyer' });
  const [policyType, setPolicyType] = useState<'returns' | 'shipping' | 'guide' | 'about' | 'contact' | null>(null);

  // Cart Data
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartShippingFee, setCartShippingFee] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Synchronize document.title based on current view
  useEffect(() => {
    switch (currentView) {
      case 'home':
        document.title = 'Đồ Cũ Còn Thương — Tiệm Đồ Cũ Vintage Tạp Chí';
        break;
      case 'orders':
        document.title = 'Đơn mua của tôi — Đồ Cũ Còn Thương';
        break;
      case 'seller':
        document.title = 'Quản trị Người bán & Vận chuyển — Đồ Cũ Còn Thương';
        break;
      case 'account':
        document.title = 'Tài khoản của tôi — Đồ Cũ Còn Thương';
        break;
      case '404':
        document.title = '404 Không tìm thấy — Đồ Cũ Còn Thương';
        break;
      default:
        document.title = 'Đồ Cũ Còn Thương';
    }
  }, [currentView]);

  // Synchronize route from browser pathname
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/seller')) {
      if (user && user.role === 'seller') {
        setCurrentView('seller');
      } else if (!user) {
        setAuthModal({ open: true, role: 'seller' });
      } else {
        showToast('Khu vực người bán chỉ dành riêng cho tài khoản Seller', 'error');
        setCurrentView('home');
      }
    } else if (path === '/orders') {
      setCurrentView('orders');
    } else if (path === '/account') {
      if (user && user.role === 'buyer') {
        setCurrentView('account');
      } else if (!user) {
        setAuthModal({ open: true, role: 'buyer' });
      } else {
        setCurrentView('seller');
      }
    } else if (path === '/login') {
      if (!user) setAuthModal({ open: true, role: 'buyer' });
    }
  }, [user]);

  // Load products with basic and advanced filters
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts({
        category: selectedCategory,
        search: searchQuery,
        sort: sortOption,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        min_condition: minCondition > 50 ? minCondition : undefined,
        in_stock: inStockOnly ? true : undefined
      });
      setProducts(data.products);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách sản phẩm', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortOption, minCondition, inStockOnly]);

  const handleSearchSubmit = () => {
    fetchProducts();
  };

  const handleResetFilters = () => {
    setSelectedCategory('Tất cả');
    setSearchQuery('');
    setSortOption('newest');
    setMinPrice('');
    setMaxPrice('');
    setMinCondition(50);
    setInStockOnly(false);
  };

  // Load Cart
  const loadCartData = async () => {
    if (!user || user.role !== 'buyer') return;
    try {
      const data = await api.getCart();
      setCartItems(data.items);
      setCartSubtotal(data.subtotal);
      setCartShippingFee(data.shipping_fee);
      setCartTotal(data.total);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isCartOpen || isCheckoutOpen) {
      loadCartData();
    }
  }, [isCartOpen, isCheckoutOpen, user]);

  // Add to cart handler
  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản khách mua để thêm vào giỏ', 'info');
      setAuthModal({ open: true, role: 'buyer' });
      return;
    }
    if (user.role !== 'buyer') {
      showToast('Tài khoản người bán không thể thêm sản phẩm vào giỏ', 'error');
      return;
    }

    try {
      await api.addToCart(product.id, quantity);
      showToast(`Đã thêm "${product.name}" vào giỏ hàng`, 'success');
      await refreshCartCount();
      await loadCartData();
      if (detailProduct) setDetailProduct(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi thêm vào giỏ', 'error');
    }
  };

  // Buy now handler
  const handleBuyNow = (product: Product, quantity: number = 1) => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản khách mua để đặt hàng', 'info');
      setAuthModal({ open: true, role: 'buyer' });
      return;
    }
    if (user.role !== 'buyer') {
      showToast('Tài khoản người bán không thể đặt mua hàng', 'error');
      return;
    }

    setDirectCheckoutItem({ product, quantity });
    if (detailProduct) setDetailProduct(null);
    setIsCheckoutOpen(true);
  };

  // Cart operations
  const handleUpdateCartQty = async (cartId: number, qty: number) => {
    try {
      await api.updateCartQty(cartId, qty);
      await loadCartData();
      await refreshCartCount();
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật giỏ', 'error');
    }
  };

  const handleRemoveCartItem = async (cartId: number) => {
    try {
      await api.removeFromCart(cartId);
      await loadCartData();
      await refreshCartCount();
      showToast('Đã xóa món khỏi giỏ hàng', 'info');
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa món', 'error');
    }
  };

  const handleClearCart = async () => {
    try {
      await api.clearCart();
      await loadCartData();
      await refreshCartCount();
      showToast('Đã xóa sạch giỏ hàng', 'info');
    } catch (err: any) {
      showToast(err.message || 'Lỗi làm trống giỏ', 'error');
    }
  };

  // Navigation Guard
  const handleNavigate = (view: 'home' | 'orders' | 'seller' | 'account') => {
    if (view === 'seller') {
      if (!user) {
        setAuthModal({ open: true, role: 'seller' });
        return;
      }
      if (user.role !== 'seller') {
        showToast('Khu vực quản trị chỉ dành riêng cho tài khoản Người bán (admin)', 'error');
        return;
      }
    } else if (view === 'orders') {
      if (!user) {
        setAuthModal({ open: true, role: 'buyer' });
        return;
      }
      if (user.role !== 'buyer') {
        showToast('Khu vực đơn mua chỉ dành cho Khách hàng', 'error');
        return;
      }
    } else if (view === 'account') {
      if (!user) {
        setAuthModal({ open: true, role: 'buyer' });
        return;
      }
      if (user.role !== 'buyer') {
        showToast('Khu vực tài khoản khách hàng chỉ dành cho Khách mua', 'error');
        return;
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOrderNotification = async (orderId: number) => {
    try {
      const res = await api.getOrder(orderId);
      setSelectedOrderCodeForTracking(res.order.code);
      setCurrentView('orders');
    } catch {
      setCurrentView('orders');
    }
  };

  const categories = [
    'Tất cả',
    'Thời trang',
    'Điện tử',
    'Máy ảnh',
    'Sách',
    'Nhạc cụ',
    'Phụ kiện',
    'Gia dụng'
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4ECDF] text-[#241A14]">
      {/* Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenCart={() => {
          if (!user) {
            setAuthModal({ open: true, role: 'buyer' });
          } else {
            setIsCartOpen(true);
          }
        }}
        onOpenAuth={role => setAuthModal({ open: true, role })}
        onSelectOrder={handleSelectOrderNotification}
        onSelectProduct={prod => setDetailProduct(prod)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'seller' ? (
          <SellerDashboard />
        ) : currentView === 'orders' ? (
          <OrdersView
            onBackToShop={() => setCurrentView('home')}
            selectedOrderCode={selectedOrderCodeForTracking}
          />
        ) : currentView === 'account' ? (
          <AccountView
            onBackToHome={() => setCurrentView('home')}
            onSelectProduct={prod => setDetailProduct(prod)}
            onAddToCart={prod => handleAddToCart(prod, 1)}
          />
        ) : currentView === '404' ? (
          <NotFoundView onBackToHome={() => setCurrentView('home')} />
        ) : (
          /* STOREFRONT HOME VIEW */
          <div className="space-y-12 pb-16">
            {/* Editorial Hero Section */}
            <section className="relative overflow-hidden border-b border-[#DCCDB6] py-12 md:py-20 bg-[#F4ECDF]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 items-center">
                  {/* Left Column: Editorial Headline */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EADFCC] border border-[#DCCDB6] text-xs font-semibold text-[#D9542B]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Tiệm đồ cũ vintage phong cách tạp chí
                    </div>

                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#241A14] leading-[1.12]">
                      Mỗi món đồ cũ <br />
                      <span className="italic font-normal text-[#D9542B]">đều còn một câu chuyện.</span>
                    </h1>

                    <p className="text-base sm:text-lg text-[#74665B] leading-relaxed max-w-xl">
                      Tuyển tập đồ second-hand độc bản đã được kiểm tra kỹ lưỡng độ mới, minh bạch từng vết xước thời gian và sẵn sàng tìm chủ mới trân quý.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href="#products-section"
                        className="px-6 py-3.5 bg-[#D9542B] hover:bg-[#B33F33] text-white rounded-2xl text-xs font-bold transition-all shadow-vintage flex items-center gap-2"
                      >
                        <span>Khám phá bộ sưu tập</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleNavigate('seller')}
                        className="px-5 py-3.5 bg-[#FFFBF4] hover:bg-[#EADFCC] border border-[#DCCDB6] text-[#241A14] rounded-2xl text-xs font-semibold transition-colors shadow-vintage-sm"
                      >
                        Kênh người bán & Vận chuyển
                      </button>
                    </div>

                    {/* Trust Proof Badges */}
                    <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#DCCDB6] text-xs text-[#74665B]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#5E7048] shrink-0" />
                        <span className="font-medium">Minh bạch % độ mới</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#D9542B] shrink-0" />
                        <span className="font-medium">Freeship từ 1.000.000đ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-[#B33F33] shrink-0" />
                        <span className="font-medium">Đồng kiểm khi nhận</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Polaroid Collage with Washi Tape */}
                  <div className="lg:col-span-5 relative flex items-center justify-center">
                    {/* Background decorative tilted Polaroid */}
                    <div className="hidden sm:block absolute w-64 h-80 bg-[#FFFBF4] rounded-2xl border border-[#DCCDB6] p-3 shadow-vintage-lg transform rotate-6 -right-2 top-0 pointer-events-none opacity-80">
                      <div className="w-full h-56 bg-[#EADFCC] rounded-xl overflow-hidden relative">
                        <img
                          src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80"
                          alt="Vintage Polaroid"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="pt-2 text-center">
                        <span className="font-serif italic text-xs text-[#74665B]">Khoảnh khắc vintage #02</span>
                      </div>
                    </div>

                    {/* Foreground Main Polaroid with Washi Tape */}
                    <div className="relative w-full max-w-sm bg-[#FFFBF4] rounded-2xl border border-[#DCCDB6] p-4 shadow-vintage-lg transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                      {/* Washi Tape */}
                      <div className="washi-tape" />

                      <div className="w-full aspect-4/3 bg-[#EADFCC] rounded-xl overflow-hidden relative">
                        <img
                          src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80"
                          alt="Canon AE-1"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {/* Stamp */}
                        <div className="absolute top-3 left-3 z-10">
                          <div className="stamp-badge px-2.5 py-0.5 text-[10px]">
                            85% MỚI
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#74665B] uppercase font-mono block">Món đồ tiêu điểm</span>
                          <h3 className="font-serif text-base font-bold text-[#241A14]">
                            Máy ảnh film Canon AE-1
                          </h3>
                          <span className="font-mono text-sm font-bold text-[#D9542B]">
                            3.200.000đ
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            const canon = products.find(p => p.id === 2);
                            if (canon) setDetailProduct(canon);
                          }}
                          className="px-3.5 py-2 bg-[#241A14] hover:bg-[#D9542B] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                        >
                          Xem món này
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Infinite Horizontal Running Marquee */}
            <div className="bg-[#241A14] text-[#FFFBF4] py-3 overflow-hidden whitespace-nowrap border-y border-[#DCCDB6]/30">
              <div className="inline-block animate-pulse text-xs uppercase tracking-widest font-mono">
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Đồ cũ chất lượng cao</span>
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Minh bạch % độ mới</span>
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Freeship toàn quốc từ 1.000.000đ hoặc mã FREESHIP</span>
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Đóng gói 2 lớp chống sốc</span>
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Theo dõi vận chuyển thời gian thực mỗi 10 giây</span>
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Cam kết hoàn tiền trong 3 ngày nếu sai mô tả</span>
                <span className="mx-4 text-[#D9542B]">★</span>
                <span>Mã giảm giá DOCU10 giảm ngay 10%</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-4 sm:p-5 rounded-3xl bg-[#FFFBF4] border border-[#DCCDB6] shadow-vintage-sm space-y-4">
                {/* Search & Sort Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Form */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                    className="relative flex-1"
                  >
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74665B]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên món đồ, mô tả tình trạng..."
                      className="w-full pl-10 pr-24 py-2.5 rounded-2xl border border-[#DCCDB6] bg-[#F4ECDF] text-xs text-[#241A14] focus:bg-white focus:outline-none focus:border-[#D9542B]"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#D9542B] text-white text-[11px] font-bold hover:bg-[#B33F33] transition-colors"
                    >
                      Tìm kiếm
                    </button>
                  </form>

                  {/* Filter & Sort Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        showAdvancedFilters || minPrice || maxPrice || minCondition > 50 || inStockOnly
                          ? 'bg-[#D9542B] text-white border-[#D9542B]'
                          : 'bg-[#F4ECDF] text-[#241A14] border-[#DCCDB6] hover:bg-[#EADFCC]'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Bộ lọc {showAdvancedFilters ? '▲' : '▼'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#74665B] hidden sm:inline" />
                      <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#DCCDB6] bg-[#F4ECDF] text-xs font-medium text-[#241A14] focus:outline-none focus:border-[#D9542B]"
                      >
                        <option value="newest">Mới đăng gần đây</option>
                        <option value="price_asc">Giá: Thấp đến Cao</option>
                        <option value="price_desc">Giá: Cao đến Thấp</option>
                        <option value="condition">Độ mới cao nhất</option>
                        <option value="rating">Đánh giá sao cao nhất</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Advanced Filters Expandable Panel */}
                {showAdvancedFilters && (
                  <div className="p-4 rounded-2xl bg-[#F4ECDF] border border-[#DCCDB6] grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs animate-in fade-in">
                    <div>
                      <label className="font-semibold text-[#241A14] block mb-1">Khoảng giá (VNĐ):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Từ (0đ)"
                          value={minPrice}
                          onChange={e => setMinPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCCDB6] bg-white font-mono text-xs"
                        />
                        <span className="text-stone-400">-</span>
                        <input
                          type="number"
                          placeholder="Đến (VNĐ)"
                          value={maxPrice}
                          onChange={e => setMaxPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCCDB6] bg-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-semibold text-[#241A14]">Độ mới tối thiểu:</label>
                        <span className="font-mono font-bold text-[#D9542B]">{minCondition}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={minCondition}
                        onChange={e => setMinCondition(Number(e.target.value))}
                        className="w-full accent-[#D9542B] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center gap-2 font-semibold text-[#241A14] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inStockOnly}
                          onChange={e => setInStockOnly(e.target.checked)}
                          className="w-4 h-4 rounded text-[#D9542B] accent-[#D9542B]"
                        />
                        <span>Chỉ hiển thị món còn hàng (Stock &gt; 0)</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCCDB6] text-[#74665B] hover:text-[#241A14] hover:bg-white text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Đặt lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={fetchProducts}
                        className="px-3.5 py-1.5 rounded-lg bg-[#241A14] text-white font-bold text-xs hover:bg-[#D9542B] transition-colors"
                      >
                        Áp dụng lọc
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Segmented Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-[#DCCDB6]/50">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#241A14] text-white shadow-vintage-sm'
                          : 'bg-[#F4ECDF] text-[#74665B] hover:bg-[#EADFCC] hover:text-[#241A14]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Products Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#241A14]">
                    Kho đồ cũ độc bản ({products.length} món)
                  </h2>
                  <p className="text-xs text-[#74665B]">
                    Mỗi sản phẩm đều mang một dấu ấn thời gian. Hãy bấm vào để xem chi tiết tình trạng thực tế và đánh giá!
                  </p>
                </div>
              </div>

              {loadingProducts ? (
                <div className="p-16 text-center bg-[#FFFBF4] rounded-3xl border border-[#DCCDB6]">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#D9542B] mx-auto mb-3" />
                  <p className="text-sm text-[#74665B]">Đang tải kho đồ cũ...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="p-16 text-center bg-[#FFFBF4] rounded-3xl border border-[#DCCDB6] space-y-3">
                  <p className="text-sm text-[#74665B]">
                    Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-[#D9542B] text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={prod => setDetailProduct(prod)}
                      onAddToCart={prod => handleAddToCart(prod, 1)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Footer (4 Columns) */}
      <footer className="bg-[#FFFBF4] border-t border-[#DCCDB6] py-12 text-xs text-[#74665B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Bio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#D9542B] text-white flex items-center justify-center font-serif font-bold">
                ♻
              </div>
              <span className="font-serif text-lg font-bold text-[#241A14]">
                Đồ Cũ Còn Thương
              </span>
            </div>
            <p className="leading-relaxed">
              Tiệm second-hand boutique phong cách tạp chí, lưu trữ dữ liệu SQLite và tích hợp hệ thống điều phối vận chuyển Kanban 3 chặng thông báo thời gian thực.
            </p>
            <div className="pt-2 text-[11px] text-[#74665B]">
              Đồ cũ không hề cũ, chỉ đợi một người thương tiếp tục gìn giữ.
            </div>
          </div>

          {/* Column 2: Policies & Support */}
          <div>
            <h4 className="font-bold text-[#241A14] uppercase mb-3 tracking-wider font-serif flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#D9542B]" />
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setPolicyType('returns')}
                  className="hover:text-[#D9542B] hover:underline transition-colors text-left"
                >
                  Chính sách đổi trả & hoàn tiền (3 ngày)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setPolicyType('shipping')}
                  className="hover:text-[#D9542B] hover:underline transition-colors text-left"
                >
                  Chính sách vận chuyển & đồng kiểm
                </button>
              </li>
              <li>
                <button
                  onClick={() => setPolicyType('guide')}
                  className="hover:text-[#D9542B] hover:underline transition-colors text-left"
                >
                  Hướng dẫn mua hàng & thanh toán thẻ
                </button>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-[#DCCDB6]/60">
              <span className="text-[10px] font-bold text-[#241A14] uppercase block mb-1.5">Mã giảm giá đang phát:</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="bg-[#EADFCC] text-[#D9542B] px-1.5 py-0.5 rounded font-bold border border-[#DCCDB6]">
                  DOCU10 (-10%)
                </span>
                <span className="bg-[#EADFCC] text-[#5E7048] px-1.5 py-0.5 rounded font-bold border border-[#DCCDB6]">
                  FREESHIP (0đ)
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: About & Contact */}
          <div>
            <h4 className="font-bold text-[#241A14] uppercase mb-3 tracking-wider font-serif flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#5E7048]" />
              Về chúng tôi
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setPolicyType('about')}
                  className="hover:text-[#D9542B] hover:underline transition-colors text-left"
                >
                  Câu chuyện tiệm Đồ Cũ Còn Thương
                </button>
              </li>
              <li>
                <button
                  onClick={() => setPolicyType('contact')}
                  className="hover:text-[#D9542B] hover:underline transition-colors text-left"
                >
                  Liên hệ cửa hàng & Góp ý
                </button>
              </li>
            </ul>

            <div className="mt-4 space-y-1 text-[11px]">
              <div>📍 128 Đường Hai Bà Trưng, Quận 1, TP.HCM</div>
              <div>📞 Hotline: 0987 654 321 (8:00 - 21:00)</div>
              <div>✉️ docuconthuong@vintage.vn</div>
            </div>
          </div>

          {/* Column 4: Payment Methods & Shipping Carriers */}
          <div>
            <h4 className="font-bold text-[#241A14] uppercase mb-3 tracking-wider font-serif">
              Thanh toán & Vận chuyển
            </h4>
            
            <span className="text-[10px] uppercase font-semibold text-[#74665B] block mb-1">Phương thức thanh toán:</span>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <span className="p-1.5 bg-[#F4ECDF] rounded-lg border border-[#DCCDB6] text-[11px] font-bold text-center text-[#241A14]">
                💳 Visa
              </span>
              <span className="p-1.5 bg-[#F4ECDF] rounded-lg border border-[#DCCDB6] text-[11px] font-bold text-center text-[#241A14]">
                💳 Mastercard
              </span>
              <span className="p-1.5 bg-[#F4ECDF] rounded-lg border border-[#DCCDB6] text-[11px] font-bold text-center text-[#241A14]">
                🏦 NAPAS ATM
              </span>
              <span className="p-1.5 bg-[#F4ECDF] rounded-lg border border-[#DCCDB6] text-[11px] font-bold text-center text-[#241A14]">
                💵 COD tiền mặt
              </span>
            </div>

            <span className="text-[10px] uppercase font-semibold text-[#74665B] block mb-1">Đơn vị vận chuyển liên kết:</span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#D9542B]" />
                <span>Giao Hàng Nhanh (GHN)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#5E7048]" />
                <span>Giao Hàng Tiết Kiệm (GHTK)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-red-600" />
                <span>Viettel Post</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-[#DCCDB6] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[#74665B]">
          <div>
            © 2026 Đồ Cũ Còn Thương. Nền tảng thương mại điện tử đồ cũ bền vững phong cách tạp chí vintage.
          </div>
          <div className="font-mono text-[11px]">
            Demo 1-1: admin / admin · 0987654321 / nguoidung
          </div>
        </div>
      </footer>

      {/* Floating Demo Controller Button at Bottom-Left */}
      <DemoController
        onRoleSwitched={(role) => {
          if (role === 'buyer') setCurrentView('home');
          if (role === 'seller') setCurrentView('seller');
          fetchProducts();
        }}
        onDataReset={() => {
          fetchProducts();
          setCurrentView('home');
        }}
      />

      {/* Policy Modal */}
      <PolicyModal
        type={policyType}
        isOpen={!!policyType}
        onClose={() => setPolicyType(null)}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
        onBuyNow={(prod, qty) => handleBuyNow(prod, qty)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        subtotal={cartSubtotal}
        shippingFee={cartShippingFee}
        total={cartTotal}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setDirectCheckoutItem(undefined);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setDirectCheckoutItem(undefined);
        }}
        items={cartItems}
        subtotal={cartSubtotal}
        shippingFee={cartShippingFee}
        total={cartTotal}
        directItem={directCheckoutItem}
        onSuccess={order => {
          setSuccessOrder(order);
          setIsCheckoutOpen(false);
        }}
      />

      {/* Success Order Modal */}
      <SuccessOrderModal
        order={successOrder}
        onClose={() => setSuccessOrder(null)}
        onViewOrders={code => {
          setSelectedOrderCodeForTracking(code);
          setCurrentView('orders');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        role={authModal.role}
        onClose={() => setAuthModal({ open: false, role: 'buyer' })}
        onSuccess={() => {
          if (authModal.role === 'seller') {
            setCurrentView('seller');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainShopApp />
      </AuthProvider>
    </ToastProvider>
  );
}
