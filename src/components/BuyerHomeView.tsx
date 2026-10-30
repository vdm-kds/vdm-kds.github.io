import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, ShoppingBag, Bell, Truck, ArrowRight, ChevronLeft, ChevronRight, 
  Clock, MapPin, CheckCircle2, Sparkles, Filter, SlidersHorizontal, RotateCcw, RefreshCw
} from 'lucide-react';
import { User, Product, Order } from '../types';
import { api } from '../services/api';
import { formatVND } from '../utils/format';
import { Button } from './Button';
import { ProductCard } from './ProductCard';
import { ProductFallbackImage } from './ProductFallbackImage';

interface BuyerHomeViewProps {
  user: User;
  products: Product[];
  loadingProducts: boolean;
  cartCount: number;
  selectedCategory: string;
  searchQuery: string;
  sortOption: string;
  showAdvancedFilters: boolean;
  minPrice: string;
  maxPrice: string;
  minCondition: number;
  inStockOnly: boolean;
  categories: string[];
  onSelectCategory: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  onSortChange: (sort: string) => void;
  onToggleAdvancedFilters: () => void;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onMinConditionChange: (v: number) => void;
  onInStockOnlyChange: (v: boolean) => void;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onOpenCart: () => void;
  onNavigateOrders: (tab?: string, orderCode?: string) => void;
  wishlistIds?: Set<number>;
  onToggleWishlist?: (productId: number) => void;
  onNavigateToShop?: (slug: string) => void;
}

export const BuyerHomeView: React.FC<BuyerHomeViewProps> = ({
  user,
  products,
  loadingProducts,
  cartCount,
  selectedCategory,
  searchQuery,
  sortOption,
  showAdvancedFilters,
  minPrice,
  maxPrice,
  minCondition,
  inStockOnly,
  categories,
  onSelectCategory,
  onSearchChange,
  onSearchSubmit,
  onSortChange,
  onToggleAdvancedFilters,
  onMinPriceChange,
  onMaxPriceChange,
  onMinConditionChange,
  onInStockOnlyChange,
  onResetFilters,
  onApplyFilters,
  onSelectProduct,
  onAddToCart,
  onOpenCart,
  onNavigateOrders,
  wishlistIds = new Set(),
  onToggleWishlist,
  onNavigateToShop
}) => {
  // Active shipping order for quick tracker card
  const [shippingOrders, setShippingOrders] = useState<Order[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  // Fresh arrivals horizontal row scroll ref
  const freshScrollRef = useRef<HTMLDivElement>(null);

  // Real-time onSnapshot subscription for shipping orders & notifications (Requirement 3)
  useEffect(() => {
    let isMounted = true;
    setLoadingOrders(true);

    const unsubOrders = api.subscribeBuyerOrders((allOrders) => {
      if (!isMounted) return;
      const active = allOrders.filter(
        (o: Order) => o.status === 'shipping' || o.status === 'confirmed'
      );
      setShippingOrders(active);
      setLoadingOrders(false);
    });

    const unsubNotifs = api.subscribeNotifications((_notifs, unreadCount) => {
      if (!isMounted) return;
      setUnreadNotificationsCount(unreadCount);
    });

    return () => {
      isMounted = false;
      unsubOrders();
      unsubNotifs();
    };
  }, []);

  const activeTrackingOrder = shippingOrders.length > 0 ? shippingOrders[0] : null;

  // Fresh arrivals: sort by newest and take top 8
  const freshArrivals = [...products]
    .sort((a, b) => b.id - a.id)
    .slice(0, 10);

  const scrollFresh = (direction: 'left' | 'right') => {
    if (!freshScrollRef.current) return;
    const scrollAmount = 320;
    freshScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ======================================================== */}
      {/* 1. WELCOME BANNER (2.3)                                  */}
      {/* "Chào {tên người mua} 👋, hôm nay săn món gì nào?"       */}
      {/* 3 quick cards: Đơn đang giao, Giỏ hàng, Thông báo       */}
      {/* ======================================================== */}
      <section className="bg-gradient-to-b from-[#DAE7C7]/40 to-transparent pt-6 pb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DAE7C7] text-[#08482D] text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tiệm đồ cũ còn thương</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#101410] tracking-tight">
                Chào {user.full_name} 👋, hôm nay săn món gì nào?
              </h1>
              <p className="text-xs text-[#5E5E61] mt-1">
                Tuyển tập đồ cũ độc bản được kiểm tra chất lượng thực tế và cập nhật liên tục.
              </p>
            </div>

            {/* 3 Quick Action Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto shrink-0">
              {/* Card 1: Đơn đang giao */}
              <button
                onClick={() => onNavigateOrders('shipping')}
                className="p-3 bg-white border border-[#E2E8D8] rounded-2xl shadow-xs hover:border-[#08482D] hover:shadow-sm transition-all text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-[#DAE7C7]/60 text-[#08482D] flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-sm font-bold text-[#08482D]">
                    {shippingOrders.length}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[11px] font-bold text-[#101410] block group-hover:text-[#08482D] transition-colors leading-tight">
                    Đơn đang giao
                  </span>
                  <span className="text-[10px] text-[#5E5E61]">Xem lộ trình &rarr;</span>
                </div>
              </button>

              {/* Card 2: Giỏ hàng */}
              <button
                onClick={onOpenCart}
                className="p-3 bg-white border border-[#E2E8D8] rounded-2xl shadow-xs hover:border-[#08482D] hover:shadow-sm transition-all text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-[#DAE7C7]/60 text-[#08482D] flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-sm font-bold text-[#C2522D]">
                    {cartCount}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[11px] font-bold text-[#101410] block group-hover:text-[#08482D] transition-colors leading-tight">
                    Giỏ hàng
                  </span>
                  <span className="text-[10px] text-[#5E5E61]">Mở giỏ &rarr;</span>
                </div>
              </button>

              {/* Card 3: Thông báo */}
              <button
                onClick={() => onNavigateOrders()}
                className="p-3 bg-white border border-[#E2E8D8] rounded-2xl shadow-xs hover:border-[#08482D] hover:shadow-sm transition-all text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-[#DAE7C7]/60 text-[#08482D] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-sm font-bold text-[#08482D]">
                    {unreadNotificationsCount}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[11px] font-bold text-[#101410] block group-hover:text-[#08482D] transition-colors leading-tight">
                    Thông báo
                  </span>
                  <span className="text-[10px] text-[#5E5E61]">Cập nhật &rarr;</span>
                </div>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. MINI SHIPPING TRACKER CARD (nếu có đơn đang giao)    */}
          {/* ======================================================== */}
          {activeTrackingOrder && (
            <div className="p-4 sm:p-5 bg-white border-2 border-[#DAE7C7] rounded-3xl shadow-sm space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] overflow-hidden shrink-0">
                    {activeTrackingOrder.items && activeTrackingOrder.items[0]?.image_url ? (
                      <img 
                        src={activeTrackingOrder.items[0].image_url} 
                        alt="Đơn hàng"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#08482D]">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#101410]">
                        Kiện hàng đang giao:
                      </span>
                      <span className="font-mono text-xs font-bold text-[#08482D] bg-[#DAE7C7]/60 px-2 py-0.5 rounded-full">
                        {activeTrackingOrder.code}
                      </span>
                    </div>
                    <p className="text-xs text-[#5E5E61] mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#08482D]" />
                      <span>{activeTrackingOrder.current_location || 'Đang trung chuyển qua bưu cục trung tâm'}</span>
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateOrders('shipping', activeTrackingOrder.code)}
                  className="self-start sm:self-auto text-xs"
                >
                  <Truck className="w-3.5 h-3.5 mr-1" />
                  <span>Theo dõi đơn</span>
                </Button>
              </div>

              {/* Mini 4-Step Stepper */}
              <div className="pt-2 border-t border-[#E2E8D8]">
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="space-y-1">
                    <div className="h-1.5 bg-[#08482D] rounded-full" />
                    <span className="font-bold text-[#08482D]">1. Chờ duyệt</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-[#08482D] rounded-full" />
                    <span className="font-bold text-[#08482D]">2. Chuẩn bị</span>
                  </div>
                  <div className="space-y-1">
                    <div className={`h-1.5 rounded-full ${activeTrackingOrder.status === 'shipping' ? 'bg-[#08482D] animate-pulse' : 'bg-[#08482D]'}`} />
                    <span className="font-bold text-[#08482D]">3. Đang giao</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-[#E2E8D8] rounded-full" />
                    <span className="text-[#5E5E61]">4. Đã giao</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. "MỚI LÊN KỆ" (2.3): Flat horizontal scroll row        */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#101410]">
                Mới lên kệ hôm nay
              </h2>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#DAE7C7] text-[#08482D]">
                MỚI
              </span>
            </div>
            <p className="text-xs text-[#5E5E61] mt-0.5">
              Những món đồ vừa được kiểm định và đăng bán gần nhất
            </p>
          </div>

          {/* Scroll Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scrollFresh('left')}
              className="p-2 rounded-full border border-[#E2E8D8] bg-white text-[#101410] hover:bg-[#F5F8EF] hover:border-[#08482D] transition-colors shadow-2xs"
              aria-label="Cuộn trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollFresh('right')}
              className="p-2 rounded-full border border-[#E2E8D8] bg-white text-[#101410] hover:bg-[#F5F8EF] hover:border-[#08482D] transition-colors shadow-2xs"
              aria-label="Cuộn phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flat Horizontal Scrollable Row */}
        <div 
          ref={freshScrollRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth snap-x"
        >
          {freshArrivals.map((prod) => (
            <div 
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              className="w-64 sm:w-72 shrink-0 snap-start bg-white rounded-3xl border border-[#E2E8D8] p-3 flex flex-col justify-between hover:shadow-md hover:border-[#08482D] transition-all cursor-pointer group"
            >
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-[#F5F8EF] mb-3">
                {prod.image_url ? (
                  <img 
                    src={prod.image_url} 
                    alt={prod.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <ProductFallbackImage 
                    name={prod.name}
                    category={prod.category}
                    compact
                  />
                )}
                <div className="absolute top-2 left-2 bg-[#DAE7C7]/95 backdrop-blur-xs text-[#08482D] text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border border-white/60">
                  {prod.condition_pct}% MỚI
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#08482D] font-bold uppercase tracking-wider block">
                    {prod.category}
                  </span>
                  <h3 className="text-sm font-bold text-[#101410] line-clamp-1 group-hover:text-[#08482D] transition-colors">
                    {prod.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E2E8D8] flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#C2522D]">
                    {formatVND(prod.price)}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(prod);
                    }}
                    className="h-8 text-xs px-2.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                    <span>Thêm</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. FILTER BAR & PRODUCTS GRID                            */}
      {/* ======================================================== */}
      <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E2E8D8] shadow-sm space-y-4">
          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <form
              onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}
              className="relative flex-1"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Tìm áo da, máy ảnh film, đồng hồ vintage..."
                className="w-full pl-4 pr-24 py-2.5 rounded-2xl border border-[#E2E8D8] bg-[#F5F8EF] text-xs text-[#101410] focus:bg-white focus:outline-none focus:border-[#08482D]"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] h-8"
              >
                Tìm kiếm
              </Button>
            </form>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleAdvancedFilters}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all ${
                  showAdvancedFilters || minPrice || maxPrice || minCondition > 50 || inStockOnly
                    ? 'bg-[#08482D] text-white border-[#08482D]'
                    : 'bg-[#F5F8EF] text-[#101410] border-[#E2E8D8] hover:bg-[#DAE7C7]/50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Bộ lọc {showAdvancedFilters ? '▲' : '▼'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#5E5E61] hidden sm:inline" />
                <select
                  value={sortOption}
                  onChange={e => onSortChange(e.target.value)}
                  className="px-3.5 py-2 rounded-full border border-[#E2E8D8] bg-[#F5F8EF] text-xs font-medium text-[#101410] focus:outline-none focus:border-[#08482D]"
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
            <div className="p-4 rounded-2xl bg-[#F5F8EF] border border-[#E2E8D8] grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs animate-in fade-in">
              <div>
                <label className="font-semibold text-[#101410] block mb-1">Khoảng giá (VNĐ):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Từ (0đ)"
                    value={minPrice}
                    onChange={e => onMinPriceChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8D8] bg-white font-mono text-xs"
                  />
                  <span className="text-[#5E5E61]">-</span>
                  <input
                    type="number"
                    placeholder="Đến (VNĐ)"
                    value={maxPrice}
                    onChange={e => onMaxPriceChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8D8] bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-[#101410]">Độ mới tối thiểu:</label>
                  <span className="font-mono font-bold text-[#08482D]">{minCondition}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={minCondition}
                  onChange={e => onMinConditionChange(Number(e.target.value))}
                  className="w-full accent-[#08482D] cursor-pointer"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 font-semibold text-[#101410] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={e => onInStockOnlyChange(e.target.checked)}
                    className="w-4 h-4 rounded text-[#08482D] accent-[#08482D]"
                  />
                  <span>Chỉ hiển thị món còn hàng (Stock &gt; 0)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onResetFilters}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  <span>Đặt lại</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onApplyFilters}
                >
                  Áp dụng lọc
                </Button>
              </div>
            </div>
          )}

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-[#E2E8D8]">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#08482D] text-white shadow-xs'
                    : 'bg-[#F5F8EF] text-[#5E5E61] hover:bg-[#DAE7C7]/50 hover:text-[#08482D]'
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
            <h2 className="text-xl sm:text-2xl font-bold text-[#101410]">
              Tất cả món đồ cũ ({products.length} món)
            </h2>
            <p className="text-xs text-[#5E5E61] mt-1">
              Đã được kiểm định chất lượng thực tế. Bấm vào món đồ để xem hình ảnh và đánh giá chi tiết!
            </p>
          </div>
        </div>

        {loadingProducts ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8D8]">
            <RefreshCw className="w-8 h-8 animate-spin text-[#08482D] mx-auto mb-3" />
            <p className="text-sm text-[#5E5E61]">Đang tải kho đồ cũ...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8D8] space-y-3">
            <p className="text-sm text-[#5E5E61]">
              Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={onResetFilters}
            >
              Xem tất cả sản phẩm
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
                onAddToCart={onAddToCart}
                isWishlisted={wishlistIds.has(product.id)}
                onToggleWishlist={onToggleWishlist}
                onNavigateToShop={onNavigateToShop}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
