import React, { useState, useEffect } from 'react';
import { 
  Store, Star, Users, MessageSquare, Clock, ShieldCheck, Ticket, Check, 
  Search, SlidersHorizontal, ArrowLeft, Heart, ShoppingBag, MessageCircle, 
  ExternalLink, Sparkles, MapPin, Phone, Eye, Edit3
} from 'lucide-react';
import { Shop, Product, Coupon, Review } from '../types';
import { api } from '../services/api';
import { formatVND } from '../utils/format';
import { Button } from './Button';
import { ProductCard } from './ProductCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ShopViewProps {
  slug: string;
  onBackToHome: () => void;
  onOpenProductDetail?: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onOpenChatWithShop?: (shopId: number, product?: Product) => void;
  onEditShopProfile?: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  slug,
  onBackToHome,
  onOpenProductDetail,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOpenChatWithShop,
  onEditShopProfile
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'showcase' (Dạo shop), 'products' (Tất cả sản phẩm), 'reviews' (Đánh giá shop)
  const [activeTab, setActiveTab] = useState<'showcase' | 'products' | 'reviews'>('showcase');

  // Shop Products & Coupons & Reviews
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [savedCouponCodes, setSavedCouponCodes] = useState<Set<string>>(new Set());
  const [reviewsData, setReviewsData] = useState<{
    reviews: Review[];
    total_reviews: number;
    average_rating: number;
    distribution: Record<string, number>;
  }>({
    reviews: [],
    total_reviews: 0,
    average_rating: 5.0,
    distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  });

  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Product tab filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'condition'>('newest');

  // Review star filter
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'all'>('all');

  const isOwnerOfShop = user?.role === 'seller' && shop?.owner_user_id === user?.id;

  const loadShopData = async () => {
    try {
      setLoading(true);
      setError(null);
      const shopRes = await api.getShopBySlug(slug);
      const currentShop = shopRes.shop;
      setShop(currentShop);

      // Check following status
      if (user?.role === 'buyer' && currentShop.follower_ids) {
        setIsFollowing(currentShop.follower_ids.includes(user.id));
      }

      // Load products of this shop
      const prodRes = await api.listProductsByShop(currentShop.id);
      setProducts(prodRes.products || []);

      // Load shop vouchers
      const cpnRes = await api.listCouponsByShop(currentShop.id);
      setCoupons(cpnRes.coupons || []);

      // Load saved vouchers
      if (user?.role === 'buyer') {
        const savedRes = await api.getSavedShopVouchers(currentShop.id);
        const codeSet = new Set<string>((savedRes.vouchers || []).map((v: any) => typeof v === 'string' ? v : v.code));
        setSavedCouponCodes(codeSet);
      }

      // Load public shop reviews
      const revRes = await api.getPublicShopReviews(currentShop.slug || slug);
      setReviewsData({
        reviews: revRes.reviews || [],
        total_reviews: revRes.total || 0,
        average_rating: revRes.avg || 0,
        distribution: revRes.distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      });

    } catch (err: any) {
      setError(err?.message || 'Không tìm thấy shop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadShopData();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const unsubShop = api.subscribeShop(slug, (updatedShop: any) => {
        setShop(updatedShop);
      });

      const unsubReviews = api.subscribePublicShopReviews(slug, (res: any) => {
        setReviewsData({
          reviews: res.reviews || [],
          total_reviews: res.total || 0,
          average_rating: res.avg || 0,
          distribution: res.distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        });
      });

      return () => {
        unsubShop();
        unsubReviews();
      };
    }
  }, [slug, user]);

  const handleToggleFollow = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản người mua để theo dõi shop', 'info');
      return;
    }
    if (user.role !== 'buyer') {
      showToast('Chỉ tài khoản người mua mới có thể theo dõi shop', 'error');
      return;
    }
    if (isOwnerOfShop) {
      showToast('Bạn không thể theo dõi chính shop của mình', 'error');
      return;
    }
    if (!shop) return;

    try {
      setFollowLoading(true);
      const res = await api.toggleFollowShop(shop.id);
      setIsFollowing(res.is_following);
      setShop(prev => prev ? {
        ...prev,
        follower_ids: res.is_following 
          ? [...(prev.follower_ids || []), user.id]
          : (prev.follower_ids || []).filter(id => id !== user.id)
      } : null);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Thao tác không thành công', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSaveCoupon = async (code: string) => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản người mua để lưu mã giảm giá', 'info');
      return;
    }
    if (user.role !== 'buyer') {
      showToast('Chỉ người mua mới có thể lưu mã giảm giá', 'error');
      return;
    }
    if (!shop) return;

    try {
      const res = await api.saveShopVoucher(code, shop.id);
      setSavedCouponCodes(prev => new Set(prev).add(code));
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu mã', 'error');
    }
  };

  const handleChatClick = () => {
    if (!shop) return;
    if (isOwnerOfShop) {
      showToast('Bạn không thể tự chat với shop của chính mình', 'error');
      return;
    }
    if (onOpenChatWithShop) {
      onOpenChatWithShop(shop.id);
    } else {
      window.dispatchEvent(new CustomEvent('open-buyer-chat', {
        detail: { shopId: shop.id }
      }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#08482D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-600">Đang mở cửa tiệm...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Store className="w-16 h-16 text-stone-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Không tìm thấy shop</h2>
        <p className="text-stone-600 mb-6">{error || 'Shop bạn tìm kiếm không tồn tại hoặc đã đổi tên.'}</p>
        <Button onClick={onBackToHome} variant="primary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Về trang chủ
        </Button>
      </div>
    );
  }

  const handleProductClick = (prod: Product) => {
    if (onSelectProduct) onSelectProduct(prod);
    else if (onOpenProductDetail) onOpenProductDetail(prod);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'Tất cả' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.condition_detail?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'condition') return b.condition_pct - a.condition_pct;
    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
  });

  const categories = ['Tất cả', ...Array.from(new Set(products.map(p => p.category)))];

  // Filter reviews
  const filteredReviews = reviewsData.reviews.filter(r => {
    if (reviewRatingFilter !== 'all' && r.rating !== reviewRatingFilter) return false;
    return true;
  });

  const followerCount = shop.follower_ids?.length || 0;

  const displayReviewsCount = Number(
    shop?.total_reviews ?? shop?.rating_count ?? shop?.review_count ?? reviewsData.total_reviews ?? 0
  );
  const displayRatingAvg = Number(
    shop?.average_rating ?? shop?.rating_avg ?? reviewsData.average_rating ?? (displayReviewsCount > 0 ? 5.0 : 0)
  );

  return (
    <div className="min-h-screen bg-[#F5F8EF] pb-20">
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#08482D] transition-colors py-1 px-2.5 rounded-lg hover:bg-stone-200/50"
        >
          <ArrowLeft className="w-4 h-4" /> Về chợ Đồ Cũ Còn Thương
        </button>
      </div>

      {/* Owner Banner */}
      {isOwnerOfShop && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <div className="bg-[#DAE7C7] border border-[#08482D]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-900 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#08482D] text-[#DAE7C7] flex items-center justify-center font-bold">
                🏪
              </span>
              <div>
                <p className="font-bold text-sm text-[#08482D]">Đây là shop của bạn</p>
                <p className="text-xs text-stone-700">Khách hàng sẽ nhìn thấy trang shop này khi bấm xem tiệm của bạn.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onEditShopProfile) onEditShopProfile();
                else window.location.href = '/seller';
              }}
              className="px-4 py-2 bg-[#08482D] text-white text-xs font-bold rounded-xl hover:bg-[#08482D]/90 transition-colors inline-flex items-center gap-2 shadow"
            >
              <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa hồ sơ shop
            </button>
          </div>
        </div>
      )}

      {/* Shopee-style Shop Header Box */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          {/* Cover Banner (Color or Image) */}
          <div 
            className="h-32 sm:h-44 w-full relative transition-colors"
            style={{ 
              backgroundColor: shop.cover_color || '#08482D',
              backgroundImage: shop.cover_image ? `url(${shop.cover_image})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-stone-800 backdrop-blur-sm shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#08482D]" /> Đã xác thực
              </span>
            </div>
          </div>

          {/* Shop Card Content */}
          <div className="p-5 sm:p-6 relative">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Left: Avatar & Title */}
              <div className="flex items-start sm:items-center gap-4 -mt-16 sm:-mt-20">
                <img
                  src={shop.avatar}
                  alt={shop.name}
                  className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-white object-cover shadow-md bg-stone-100 flex-shrink-0"
                />
                <div className="mt-8 sm:mt-12">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-stone-900">{shop.name}</h1>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DAE7C7] text-[#08482D]">
                      Chính chủ
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">@{shop.slug}</p>
                  {shop.description && (
                    <p className="text-xs sm:text-sm text-stone-600 mt-1.5 line-clamp-2 max-w-xl">
                      {shop.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto">
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading || isOwnerOfShop}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    isFollowing
                      ? 'bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200'
                      : 'bg-[#08482D] text-white hover:bg-[#08482D]/90'
                  } ${isOwnerOfShop ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#08482D]" /> Đang theo dõi
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5" /> + Theo dõi
                    </>
                  )}
                </button>

                <button
                  onClick={handleChatClick}
                  disabled={isOwnerOfShop}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all border border-[#08482D] text-[#08482D] hover:bg-[#DAE7C7]/50 ${
                    isOwnerOfShop ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Chat ngay
                </button>
              </div>
            </div>

            {/* Shopee-style Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5 mt-5 border-t border-stone-100 text-xs">
              <div className="flex items-center gap-2 text-stone-600">
                <ShoppingBag className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Sản phẩm:</span>
                  <span className="font-bold text-stone-800">{products.length} món</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-600">
                <Users className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Người theo dõi:</span>
                  <span className="font-bold text-stone-800">{followerCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-600">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Đánh giá:</span>
                  <span className="font-bold text-stone-800">
                    {displayReviewsCount > 0 ? `★ ${displayRatingAvg.toFixed(1)} (${displayReviewsCount} đánh giá)` : 'Chưa có đánh giá'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-600">
                <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Tỉ lệ phản hồi chat:</span>
                  <span className="font-bold text-emerald-700">{shop.response_rate || 100}% (trong vài phút)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-600 col-span-2 sm:col-span-1">
                <Clock className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[10px]">Tham gia:</span>
                  <span className="font-bold text-stone-800">{shop.joined_text || '2 tháng trước'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scalloped Shop Vouchers Section */}
        {coupons.length > 0 && (
          <div className="mt-6 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3.5">
              <Ticket className="w-4 h-4 text-[#C2522D]" />
              <h3 className="font-bold text-sm text-stone-900">Mã giảm giá của shop</h3>
              <span className="text-xs text-stone-500">Lưu để dùng khi thanh toán đơn hàng tại shop này</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {coupons.map(cpn => {
                const isSaved = savedCouponCodes.has(cpn.code);
                return (
                  <div
                    key={cpn.id}
                    className="relative bg-gradient-to-r from-amber-50/80 to-amber-100/60 border border-amber-300/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                  >
                    {/* Left decoration */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm tracking-wider text-[#C2522D] bg-white px-2 py-0.5 rounded-lg border border-amber-300">
                          {cpn.code}
                        </span>
                        {cpn.type === 'shipping' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            Freeship
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-stone-800 mt-1.5">
                        {cpn.type === 'shipping'
                          ? 'Giảm 30.000đ phí vận chuyển'
                          : cpn.type === 'percent'
                          ? `Giảm ${cpn.value}% tối đa ${formatVND(cpn.max_discount || 0)}`
                          : `Giảm ${formatVND(cpn.value)}`}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Đơn tối thiểu {formatVND(cpn.min_order_amount || 0)}
                      </p>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={() => handleSaveCoupon(cpn.code)}
                      disabled={isSaved}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                        isSaved
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-[#C2522D] text-white hover:bg-[#C2522D]/90 shadow-xs'
                      }`}
                    >
                      {isSaved ? '✓ Đã lưu' : 'Lưu mã'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3 Tabs Bar */}
        <div className="mt-6 flex border-b border-stone-200 bg-white rounded-2xl px-3 shadow-xs">
          <button
            onClick={() => setActiveTab('showcase')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'showcase'
                ? 'border-[#08482D] text-[#08482D]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Dạo shop
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-[#08482D] text-[#08482D]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Tất cả sản phẩm ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'border-[#08482D] text-[#08482D]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Star className="w-4 h-4" /> Đánh giá shop ({displayReviewsCount})
          </button>
        </div>

        {/* Tab 1: DẠO SHOP */}
        {activeTab === 'showcase' && (
          <div className="mt-6 space-y-8">
            {/* Featured items highlight */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-lg text-stone-900">Món đồ nổi bật của tiệm</h3>
                  <p className="text-xs text-stone-500">Tuyển chọn các món đồ được quan tâm nhất</p>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-[#08482D] hover:underline"
                >
                  Xem tất cả ({products.length}) →
                </button>
              </div>

              {products.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-stone-200">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-600">Tiệm chưa có sản phẩm nào đang bán.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {products.slice(0, 4).map(prod => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={handleProductClick}
                      onClick={() => handleProductClick(prod)}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Shop About & Story Card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <h3 className="font-bold text-base text-stone-900 mb-3 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#08482D]" /> Giới thiệu về {shop.name}
              </h3>
              <p className="text-stone-700 text-sm leading-relaxed mb-4">
                {shop.description || 'Tiệm đồ vintage & second-hand tuyển chọn, kiểm định nguồn gốc trước khi bàn giao.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-stone-100 text-xs text-stone-600">
                {shop.pickup_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-800">Địa chỉ gửi hàng:</span>
                      <p>{shop.pickup_address}</p>
                    </div>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-stone-800">Hotline hỗ trợ:</span>
                      <p>{shop.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: TẤT CẢ SẢN PHẨM */}
        {activeTab === 'products' && (
          <div className="mt-6">
            {/* Filters bar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search in shop */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Tìm kiếm trong ${shop.name}...`}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#08482D]"
                  />
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-500 whitespace-nowrap">Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-stone-50 border border-stone-200 py-2 px-3 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-[#08482D]"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="price-asc">Giá tăng dần</option>
                    <option value="price-desc">Giá giảm dần</option>
                    <option value="condition">Độ mới cao nhất</option>
                  </select>
                </div>
              </div>

              {/* Categories */}
              {categories.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#08482D] text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white p-16 text-center rounded-3xl border border-stone-200">
                <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h4 className="font-bold text-base text-stone-800 mb-1">Không tìm thấy món đồ nào</h4>
                <p className="text-xs text-stone-500">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={handleProductClick}
                    onClick={() => handleProductClick(prod)}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: ĐÁNH GIÁ SHOP */}
        {activeTab === 'reviews' && (
          <div className="mt-6 space-y-6">
            {/* Rating Summary Box */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="text-center md:border-r md:border-stone-100 md:pr-8">
                {displayReviewsCount > 0 ? (
                  <>
                    <span className="text-5xl font-black text-[#08482D]">
                      {displayRatingAvg.toFixed(1)}
                    </span>
                    <div className="flex items-center justify-center gap-1 text-amber-500 my-1">
                      {[1, 2, 3, 4, 5].map(st => (
                        <Star
                          key={st}
                          className={`w-4 h-4 ${st <= Math.round(displayRatingAvg) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-stone-500">{displayReviewsCount} lượt đánh giá</p>
                  </>
                ) : (
                  <div className="py-2">
                    <span className="text-base font-bold text-stone-700 block">
                      Chưa có đánh giá
                    </span>
                    <p className="text-xs text-stone-500 mt-1">Shop chưa có lượt đánh giá nào</p>
                  </div>
                )}
              </div>

              {/* Star Filter buttons */}
              <div className="flex-1 flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => setReviewRatingFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                    reviewRatingFilter === 'all'
                      ? 'bg-[#08482D] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Tất cả ({displayReviewsCount})
                </button>
                {[5, 4, 3, 2, 1].map(st => (
                  <button
                    key={st}
                    onClick={() => setReviewRatingFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl font-medium transition-all ${
                      reviewRatingFilter === st
                        ? 'bg-[#08482D] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {st} sao ({reviewsData.distribution[String(st)] || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-stone-200">
                <Star className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-600 text-sm">Chưa có đánh giá nào cho mục này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReviews.map(rev => {
                  const rawAuthorName = rev.buyer_name || rev.author_name || rev.user_name || 'Khách hàng';
                  const avatarInitial = (rawAuthorName.trim() || 'K')[0].toUpperCase();
                  const displayedName = rev.is_anonymous
                    ? (() => {
                        const parts = rawAuthorName.trim().split(/\s+/).filter(Boolean);
                        if (parts.length === 1) {
                          const single = parts[0];
                          return single.length > 2 ? `${single[0]}***${single.slice(-1)}` : `${single[0]}***`;
                        }
                        return `${parts[0][0]}***${parts[parts.length - 1].slice(-1)}`;
                      })()
                    : rawAuthorName;

                  return (
                    <div key={rev.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                      {/* Customer info & Product thumbnail */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#DAE7C7] text-[#08482D] font-bold flex items-center justify-center text-xs shrink-0">
                            {avatarInitial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-stone-900">{displayedName}</span>
                              <span className="text-[11px] text-stone-400">
                                {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-500 mt-0.5">
                              {[1, 2, 3, 4, 5].map(st => (
                                <Star
                                  key={st}
                                  className={`w-3.5 h-3.5 ${st <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {rev.product_name && (
                          <div className="flex items-center gap-2 bg-[#F5F8EF] border border-[#DAE7C7] px-2.5 py-1.5 rounded-xl self-start sm:self-auto max-w-full sm:max-w-xs">
                            {rev.product_image && (
                              <img
                                src={rev.product_image}
                                alt={rev.product_name}
                                className="w-8 h-8 rounded-lg object-cover border border-[#DAE7C7] shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="text-[10px] text-stone-500 block">Sản phẩm đã mua:</span>
                              <span className="text-xs font-bold text-stone-800 line-clamp-1 truncate block">{rev.product_name}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Criterion chips (tags) */}
                      {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rev.tags.map((tag: string, tIdx: number) => (
                            <span key={tIdx} className="text-[10px] bg-[#F5F8EF] border border-[#DAE7C7] text-[#08482D] font-medium px-2 py-0.5 rounded-md">
                              ✓ {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                        {rev.comment}
                      </p>

                      {/* Review Images */}
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 overflow-x-auto">
                          {rev.images.map((img: string, i: number) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="w-16 h-16 rounded-xl object-cover border border-stone-200"
                            />
                          ))}
                        </div>
                      )}

                      {/* Seller Reply */}
                      {rev.seller_reply && (
                        <div className="mt-3 bg-[#DAE7C7]/30 p-3 rounded-xl border border-[#DAE7C7] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#08482D]">Phản hồi của {shop.name}:</span>
                            {rev.seller_reply_at && (
                              <span className="text-[10px] font-mono text-[#5E5E61]">
                                {new Date(rev.seller_reply_at).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-800 italic">"{rev.seller_reply}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
