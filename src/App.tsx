import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutView } from './components/CheckoutView';
import { OrdersView } from './components/OrdersView';
import { SellerDashboard } from './components/SellerDashboard';
import { AuthModal } from './components/AuthModal';
import { SuccessOrderModal } from './components/SuccessOrderModal';
import { AccountView } from './components/AccountView';
import { DemoController } from './components/DemoController';
import { PolicyModal } from './components/PolicyModal';
import { NotFoundView } from './components/NotFoundView';
import { HeroLanding } from './components/HeroLanding';
import { BuyerHomeView } from './components/BuyerHomeView';
import { ShopView } from './components/ShopView';
import { ShopSetupWizard } from './components/ShopSetupWizard';
import { BuyerChatDock } from './components/BuyerChatDock';
import { Button } from './components/Button';
import { Product, CartItem, Order } from './types';
import { api } from './services/api';
import { formatVND } from './utils/format';
import { 
  Search, SlidersHorizontal, Sparkles, ShieldCheck, Heart, Truck, RefreshCw, 
  ArrowRight, Tag, Check, Filter, RotateCcw, HelpCircle, PhoneCall, Info, Eye
} from 'lucide-react';

type PendingAction =
  | { type: 'cart'; product: Product; quantity: number }
  | { type: 'buy'; product: Product; quantity: number; offerId?: string | number; negotiatedPrice?: number }
  | { type: 'offer'; product: Product }
  | { type: 'chat'; product: Product }
  | { type: 'wishlist'; productId: number };

function MainShopApp() {
  const { status: authStatus, user, loading: authLoading, refreshCartCount, logout } = useAuth();
  const { showToast } = useToast();

  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'orders' | 'seller' | 'account' | 'preview' | 'checkout' | 'shop' | '404'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/seller')) return 'seller';
      if (p === '/checkout') return 'checkout';
      if (p.startsWith('/orders')) return 'orders';
      if (p === '/account') return 'account';
      if (p.startsWith('/shop/')) return 'shop';
    }
    return 'home';
  });
  const [activeShopSlug, setActiveShopSlug] = useState<string | null>(null);
  const [showShopSetupWizard, setShowShopSetupWizard] = useState(false);
  const [selectedOrderCodeForTracking, setSelectedOrderCodeForTracking] = useState<string | null>(null);

  // Products State & Filters
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Wishlist IDs for quick lookup
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minCondition, setMinCondition] = useState<number>(50);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Modal States
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailOpenOffer, setDetailOpenOffer] = useState(false);
  const [detailOpenChat, setDetailOpenChat] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [directCheckoutItem, setDirectCheckoutItem] = useState<{
    product: Product;
    quantity: number;
    offer_id?: string | number;
    negotiated_price?: number;
  } | undefined>(undefined);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [successOrders, setSuccessOrders] = useState<Order[]>([]);

  const handleOpenProductDetail = (prod: Product) => {
    setDetailProduct(prod);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith(`/product/${prod.id}`)) {
      window.history.pushState(null, '', `/product/${prod.id}`);
    }
  };

  const handleCloseProductDetail = () => {
    setDetailProduct(null);
    setDetailOpenOffer(false);
    setDetailOpenChat(false);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product/')) {
      window.history.pushState(null, '', '/');
    }
  };
  const [authModal, setAuthModal] = useState<{ 
    open: boolean; 
    role: 'buyer' | 'seller'; 
    initialIsRegister?: boolean;
    initialUsername?: string;
    promptMessage?: string;
  }>({ open: false, role: 'buyer' });
  const [policyType, setPolicyType] = useState<'returns' | 'shipping' | 'guide' | 'about' | 'contact' | null>(null);

  // Online / Offline network state (Section 5)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Presentation Mode state
  const [presentationMode, setPresentationMode] = useState<boolean>(false);

  // Pending action for guest after login
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Cart Data
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartShippingFee, setCartShippingFee] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Synchronize document.title based on current view
  useEffect(() => {
    switch (currentView) {
      case 'home':
        document.title = user?.role === 'buyer' 
          ? 'Trang mua sắm — Đồ Cũ Còn Thương' 
          : 'Đồ Cũ Còn Thương — Tiệm Đồ Cũ Vintage Tạp Chí';
        break;
      case 'orders':
        document.title = 'Đơn mua của tôi — Đồ Cũ Còn Thương';
        break;
      case 'seller':
        document.title = 'Quản trị Người bán & Vận chuyển — Đồ Cũ Còn Thương';
        break;
      case 'preview':
        document.title = 'Chế độ xem trước cửa hàng — Đồ Cũ Còn Thương';
        break;
      case 'account':
        document.title = 'Tài khoản của tôi — Đồ Cũ Còn Thương';
        break;
      case 'checkout':
        document.title = 'Thanh toán đơn hàng — Đồ Cũ Còn Thương';
        break;
      case 'shop':
        document.title = 'Gian Hàng — Đồ Cũ Còn Thương';
        break;
      case '404':
        document.title = '404 Không tìm thấy — Đồ Cũ Còn Thương';
        break;
      default:
        document.title = 'Đồ Cũ Còn Thương';
    }
  }, [currentView, user]);

  const handleNavigateToShop = (slug: string) => {
    setActiveShopSlug(slug);
    setCurrentView('shop');
    window.history.pushState({}, '', `/shop/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle seller automatic redirect & route guard
  useEffect(() => {
    if (authLoading) return;

    if (user?.role === 'seller') {
      // If seller is on buyer-exclusive or home view (not preview/shop), send to seller dashboard
      if (currentView === 'home' || currentView === 'orders' || currentView === 'account') {
        setCurrentView('seller');
      }
    } else if (user?.role === 'buyer') {
      // If buyer tries to access seller dashboard, redirect to home
      if (currentView === 'seller') {
        showToast('Trang này dành cho người bán', 'error');
        setCurrentView('home');
      }
    }
  }, [user, currentView, authLoading]);

  // Fetch presentation mode & wishlist
  useEffect(() => {
    api.getPresentationMode().then(res => setPresentationMode(!!res.presentation_mode)).catch(() => {});
  }, []);

  const fetchWishlist = async () => {
    if (user?.role === 'buyer') {
      try {
        const res = await api.getWishlistIds();
        setWishlistIds(new Set(res.product_ids));
      } catch {
        // quiet catch
      }
    } else {
      setWishlistIds(new Set());
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [user]);

  // Synchronize route from browser pathname on initial mount & popstate
  useEffect(() => {
    if (authLoading) return;

    const handleRouteFromPath = () => {
      const path = window.location.pathname;

      // 1. PRODUCT DETAIL: /product/:id (Direct link & F5 support)
      if (path.startsWith('/product/')) {
        const idStr = decodeURIComponent(path.replace('/product/', '').split('/')[0].split('?')[0].trim());
        if (idStr) {
          if (!detailProduct || String(detailProduct.id) !== idStr) {
            api.getProduct(idStr).then(res => {
              if (res.product) {
                setDetailProduct(res.product);
                if (currentView === 'seller' && user?.role === 'buyer') {
                  setCurrentView('home');
                }
              }
            }).catch(() => {
              setCurrentView('404');
            });
          }
          return;
        }
      } else {
        // If path does not start with /product/, ensure product modal is closed on Back button
        if (detailProduct) {
          setDetailProduct(null);
        }
      }

      // 2. SHOP VIEW: /shop/:slug
      if (path.startsWith('/shop/')) {
        const slug = path.replace('/shop/', '').split('/')[0].split('?')[0];
        if (slug) {
          setActiveShopSlug(slug);
          setCurrentView('shop');
          return;
        }
      }

      // 3. POLICY MODAL: /policy/:slug
      if (path.startsWith('/policy/')) {
        const pSlug = path.replace('/policy/', '').split('/')[0].split('?')[0];
        if (['returns', 'shipping', 'guide', 'about', 'contact'].includes(pSlug)) {
          setPolicyType(pSlug as any);
          return;
        } else {
          setCurrentView('404');
          return;
        }
      }

      // 4. AUTH ROUTES (MODALS ON TOP OF CURRENT / HOME)
      if (path === '/seller/register') {
        if (!user) setAuthModal({ open: true, role: 'seller', initialIsRegister: true });
        else if (user.role === 'seller') {
          setCurrentView('seller');
          window.history.replaceState({}, '', '/seller');
        }
        return;
      }
      if (path === '/seller/login') {
        if (!user) setAuthModal({ open: true, role: 'seller', initialIsRegister: false });
        else if (user.role === 'seller') {
          setCurrentView('seller');
          window.history.replaceState({}, '', '/seller');
        }
        return;
      }
      if (path === '/register') {
        if (!user) setAuthModal({ open: true, role: 'buyer', initialIsRegister: true });
        return;
      }
      if (path === '/login') {
        if (!user) setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
        return;
      }

      // 5. SELLER ROUTES: /seller, /seller/orders, /seller/orders/:id, etc.
      if (path.startsWith('/seller')) {
        if (user && user.role === 'seller') {
          setCurrentView('seller');
        } else if (!user) {
          if (path !== '/seller/login' && path !== '/seller/register') {
            window.history.replaceState({}, '', '/seller/login');
          }
          setAuthModal({ open: true, role: 'seller', initialIsRegister: false });
        } else {
          showToast('Trang này dành cho người bán', 'error');
          setCurrentView('home');
        }
        return;
      }

      // 6. BUYER ORDERS: /orders, /orders/:id
      if (path.startsWith('/orders')) {
        const orderIdStr = path.replace('/orders', '').replace('/', '').split('?')[0];
        if (orderIdStr) {
          setSelectedOrderCodeForTracking(orderIdStr);
        }
        if (user && user.role === 'buyer') {
          setCurrentView('orders');
        } else if (!user) {
          setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
        } else {
          showToast('Bạn đang đăng nhập bằng tài khoản người bán', 'error');
          setCurrentView('seller');
        }
        return;
      }

      // 7. BUYER ACCOUNT: /account
      if (path === '/account') {
        if (user && user.role === 'buyer') {
          setCurrentView('account');
        } else if (!user) {
          setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
        } else {
          setCurrentView('seller');
        }
        return;
      }

      // 8. CART & CHECKOUT: /cart, /checkout, /order-success
      if (path === '/cart') {
        setIsCartOpen(true);
        return;
      }
      if (path === '/checkout') {
        if (user && user.role === 'buyer') {
          setCurrentView('checkout');
        } else if (!user) {
          setAuthModal({ open: true, role: 'buyer', initialIsRegister: false, promptMessage: 'Đăng nhập để tiếp tục thanh toán' });
        } else {
          setCurrentView('seller');
        }
        return;
      }
      if (path === '/order-success') {
        if (user && user.role === 'buyer') {
          setCurrentView('orders');
        }
        return;
      }

      // 9. CHAT: /chat
      if (path === '/chat') {
        window.dispatchEvent(new CustomEvent('open-buyer-chat', { detail: {} }));
        return;
      }

      // 10. ROOT: /
      if (path === '/' || path === '') {
        if (user?.role === 'seller') {
          setCurrentView('seller');
        } else {
          setCurrentView('home');
        }
        return;
      }

      // 11. UNKNOWN ROUTE -> 404
      setCurrentView('404');
    };

    handleRouteFromPath();
    window.addEventListener('popstate', handleRouteFromPath);
    return () => window.removeEventListener('popstate', handleRouteFromPath);
  }, [authLoading, user]);

  // Global listeners for overlay closing and role navigation (Requirement A1)
  useEffect(() => {
    const handleCloseAll = () => {
      setDetailProduct(null);
      setIsCartOpen(false);
      setAuthModal(prev => ({ ...prev, open: false }));
      setPolicyType(null);
      setSuccessOrder(null);
      setSuccessOrders([]);
    };

    const handleNavigatePath = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string }>;
      const targetPath = customEvent.detail?.path || '/';
      if (targetPath.startsWith('/seller')) {
        setCurrentView('seller');
      } else {
        setCurrentView('home');
      }
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    };

    window.addEventListener('close-all-overlays', handleCloseAll);
    window.addEventListener('navigate-path', handleNavigatePath);
    return () => {
      window.removeEventListener('close-all-overlays', handleCloseAll);
      window.removeEventListener('navigate-path', handleNavigatePath);
    };
  }, []);

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
    if (isCartOpen || currentView === 'checkout') {
      loadCartData();
    }
  }, [isCartOpen, currentView, user]);

  // Wishlist toggle handler
  const handleToggleWishlist = async (productId: number) => {
    if (!user) {
      setPendingAction({ type: 'wishlist', productId });
      setAuthModal({
        open: true,
        role: 'buyer',
        initialIsRegister: false,
        promptMessage: 'Đăng nhập để lưu món đồ yêu thích'
      });
      return;
    }
    if (user.role !== 'buyer') {
      showToast('Chức năng yêu thích chỉ dành cho tài khoản người mua', 'error');
      return;
    }
    try {
      const res = await api.toggleWishlist(productId);
      showToast(res.message, 'success');
      await fetchWishlist();
    } catch (err: any) {
      showToast(err.message || 'Lỗi thao tác yêu thích', 'error');
    }
  };

  // Add to cart handler
  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (currentView === 'preview') {
      showToast('Bạn đang ở chế độ xem trước — chức năng mua hàng bị vô hiệu hóa', 'info');
      return;
    }

    if (presentationMode && !user?.is_owner) {
      showToast('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!', 'info');
      return;
    }

    if (!user) {
      // Guest: save pending action, open buyer modal with prompt
      setPendingAction({ type: 'cart', product, quantity });
      setAuthModal({
        open: true,
        role: 'buyer',
        initialIsRegister: false,
        promptMessage: 'Đăng nhập để thêm món này vào giỏ hàng'
      });
      return;
    }

    if (user.role !== 'buyer') {
      showToast('Bạn đang đăng nhập bằng tài khoản người bán', 'error');
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
  const handleBuyNow = (
    product: Product,
    quantity: number = 1,
    offerId?: string | number,
    negotiatedPrice?: number
  ) => {
    if (currentView === 'preview') {
      showToast('Bạn đang ở chế độ xem trước — chức năng mua hàng bị vô hiệu hóa', 'info');
      return;
    }

    if (presentationMode && !user?.is_owner) {
      showToast('Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!', 'info');
      return;
    }

    if (!user) {
      setPendingAction({ type: 'buy', product, quantity, offerId, negotiatedPrice });
      setAuthModal({
        open: true,
        role: 'buyer',
        initialIsRegister: false,
        promptMessage: 'Đăng nhập để đặt mua sản phẩm này'
      });
      return;
    }

    if (user.role !== 'buyer') {
      showToast('Bạn đang đăng nhập bằng tài khoản người bán', 'error');
      return;
    }

    setDirectCheckoutItem({
      product,
      quantity,
      offer_id: offerId,
      negotiated_price: negotiatedPrice
    });
    if (detailProduct) setDetailProduct(null);
    setCurrentView('checkout');
    window.history.pushState({}, '', '/checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const handleNavigate = (view: 'home' | 'orders' | 'seller' | 'account' | 'checkout') => {
    if (view === 'checkout') {
      if (!user) {
        setAuthModal({ open: true, role: 'buyer', initialIsRegister: false, promptMessage: 'Đăng nhập để tiếp tục thanh toán' });
        return;
      }
      if (user.role !== 'buyer') {
        showToast('Bạn đang đăng nhập bằng tài khoản người bán', 'error');
        return;
      }
      window.history.pushState({}, '', '/checkout');
    } else if (view === 'seller') {
      if (!user) {
        setAuthModal({ open: true, role: 'seller', initialIsRegister: false });
        return;
      }
      if (user.role !== 'seller') {
        showToast('Trang này dành cho người bán', 'error');
        return;
      }
    } else if (view === 'orders') {
      if (!user) {
        setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
        return;
      }
      if (user.role !== 'buyer') {
        showToast('Bạn đang đăng nhập bằng tài khoản người bán', 'error');
        return;
      }
    } else if (view === 'account') {
      if (!user) {
        setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
        return;
      }
      if (user.role !== 'buyer') {
        showToast('Bạn đang đăng nhập bằng tài khoản người bán', 'error');
        return;
      }
    } else if (view === 'home') {
      if (user?.role === 'seller') {
        setCurrentView('seller');
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

  // Auth Modal Success Handler: Automatically resumes pending guest action
  const handleAuthSuccess = async () => {
    if (authModal.role === 'seller') {
      setCurrentView('seller');
      setPendingAction(null);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/seller');
      }
      return;
    }

    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      setTimeout(async () => {
        try {
          if (action.type === 'cart') {
            await api.addToCart(action.product.id, action.quantity);
            showToast(`Đã thêm "${action.product.name}" vào giỏ hàng`, 'success');
            await refreshCartCount();
            await loadCartData();
            setIsCartOpen(true);
          } else if (action.type === 'buy') {
            setDirectCheckoutItem({
              product: action.product,
              quantity: action.quantity,
              offer_id: action.offerId,
              negotiated_price: action.negotiatedPrice
            });
            if (detailProduct) setDetailProduct(null);
            setCurrentView('checkout');
            window.history.pushState({}, '', '/checkout');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (action.type === 'offer') {
            setDetailProduct(action.product);
            setDetailOpenOffer(true);
          } else if (action.type === 'chat') {
            setDetailProduct(action.product);
            setDetailOpenChat(true);
          } else if (action.type === 'wishlist') {
            const res = await api.toggleWishlist(action.productId);
            showToast(res.message, 'success');
            await fetchWishlist();
          }
        } catch (err: any) {
          showToast(err.message || 'Lỗi hoàn tất thao tác', 'error');
        }
      }, 350);
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

  // Splash Screen while restoring session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F8EF] flex flex-col items-center justify-center p-6 text-[#101410]">
        <div className="w-16 h-16 rounded-3xl bg-[#08482D] text-white flex items-center justify-center text-3xl font-bold shadow-lg animate-pulse">
          ♻
        </div>
        <p className="mt-4 font-bold text-lg text-[#08482D]">Đồ Cũ Còn Thương</p>
        <p className="text-xs text-[#5E5E61] mt-1 animate-pulse">Đang kiểm tra phiên làm việc...</p>
      </div>
    );
  }

  const isGuest = !user;
  const isBuyer = user?.role === 'buyer';
  const isSeller = user?.role === 'seller';
  const isPreview = currentView === 'preview';

  return (
    <div key={user?.id ?? 'guest'} className="min-h-screen flex flex-col bg-[#F5F8EF] text-[#101410]">
      {/* OFFLINE BANNER (Section 5) */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-2 px-4 text-center sticky top-0 z-50 animate-in fade-in">
          Đang mất kết nối, dữ liệu sẽ tự đồng bộ khi có mạng
        </div>
      )}

      {/* PREVIEW BANNER (Fixed on top when seller is previewing shop) */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-[#C2522D] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <Eye className="w-4 h-4 shrink-0" />
            <span>Bạn đang xem cửa hàng dưới góc nhìn của khách. Chức năng mua hàng đã tắt.</span>
          </div>
          <button
            onClick={() => setCurrentView('seller')}
            className="px-3.5 py-1 rounded-full bg-white text-[#C2522D] text-xs font-bold hover:bg-[#F5F8EF] transition-colors shrink-0 shadow-xs"
          >
            ← Quay lại kênh người bán
          </button>
        </div>
      )}

      {/* Top Banner when Presentation Mode is Active */}
      {presentationMode && (
        <div className="sticky top-0 z-50 bg-[#08482D] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <span>📢 Cửa hàng đang tạm dừng nhận đơn trong buổi thuyết trình. Bạn vẫn có thể xem sản phẩm nhé!</span>
          </div>
        </div>
      )}

      {/* HEADER:
          - Shown on Buyer home view, orders, seller, account, preview, shop, and 404
          - On Guest home view, HeroLanding has its own top navbar, so we don't duplicate Header there */}
      {(currentView !== 'home' || isBuyer || isPreview) && currentView !== 'seller' && (
        <Header
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenCart={() => {
            if (!user) {
              setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
            } else {
              setIsCartOpen(true);
            }
          }}
          onOpenAuth={(role, isRegister) => setAuthModal({ open: true, role, initialIsRegister: !!isRegister })}
          onSelectOrder={handleSelectOrderNotification}
          onSelectProduct={handleOpenProductDetail}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onNavigateToShop={handleNavigateToShop}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'seller' ? (
          <SellerDashboard
            onViewPreview={() => setCurrentView('preview')}
            currentUser={user}
            onLogout={() => {
              logout();
              setCurrentView('home');
              window.history.pushState({}, '', '/');
            }}
            onSwitchToBuyer={() => {
              logout();
              setCurrentView('home');
              setAuthModal({ open: true, role: 'buyer', initialIsRegister: false });
            }}
            onNavigateToShop={handleNavigateToShop}
          />
        ) : currentView === 'orders' ? (
          <OrdersView
            onBackToShop={() => setCurrentView('home')}
            selectedOrderCode={selectedOrderCodeForTracking}
            onNavigateToShop={handleNavigateToShop}
          />
        ) : currentView === 'account' ? (
          <AccountView
            onBackToHome={() => setCurrentView('home')}
            onSelectProduct={handleOpenProductDetail}
            onAddToCart={prod => handleAddToCart(prod, 1)}
            onNavigateToShop={handleNavigateToShop}
          />
        ) : currentView === 'shop' ? (
          <ShopView
            slug={activeShopSlug || 'do-cu-con-thuong'}
            onSelectProduct={handleOpenProductDetail}
            onAddToCart={(prod: Product) => handleAddToCart(prod, 1)}
            onBuyNow={(prod: Product) => handleBuyNow(prod, 1)}
            onBackToHome={() => {
              setCurrentView('home');
              window.history.pushState({}, '', '/');
            }}
          />
        ) : currentView === 'checkout' ? (
          <CheckoutView
            items={cartItems}
            subtotal={cartSubtotal}
            shippingFee={cartShippingFee}
            total={cartTotal}
            directItem={directCheckoutItem}
            onBackToCart={() => {
              setCurrentView('home');
              window.history.pushState({}, '', '/');
              setIsCartOpen(true);
            }}
            onSuccess={(order, allOrders) => {
              setDirectCheckoutItem(undefined);
              setSuccessOrder(null);
              setSuccessOrders([]);
              refreshCartCount();
              loadCartData();
              const primaryOrder = order || (allOrders && allOrders.length > 0 ? allOrders[0] : null);
              const orderCode = primaryOrder?.code || (primaryOrder?.id ? String(primaryOrder.id) : '');
              if (orderCode) {
                setSelectedOrderCodeForTracking(orderCode);
              }
              setCurrentView('orders');
              window.history.pushState({}, '', '/orders' + (orderCode ? `/${orderCode}` : ''));
              showToast(`Đặt hàng thành công — #${orderCode}`, 'success');
            }}
          />
        ) : currentView === '404' ? (
          <NotFoundView onBackToHome={() => setCurrentView('home')} />
        ) : isBuyer && !isPreview ? (
          /* TRẠNG THÁI 2: NGƯỜI MUA (BUYER) - SHOPPING DASHBOARD, KHÔNG HIỆN HERO */
          <BuyerHomeView
            user={user}
            products={products}
            loadingProducts={loadingProducts}
            cartCount={cartItems.length}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            sortOption={sortOption}
            showAdvancedFilters={showAdvancedFilters}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minCondition={minCondition}
            inStockOnly={inStockOnly}
            categories={categories}
            onSelectCategory={cat => setSelectedCategory(cat)}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            onSortChange={setSortOption}
            onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            onMinConditionChange={setMinCondition}
            onInStockOnlyChange={setInStockOnly}
            onResetFilters={handleResetFilters}
            onApplyFilters={fetchProducts}
            onSelectProduct={handleOpenProductDetail}
            onAddToCart={prod => handleAddToCart(prod, 1)}
            onOpenCart={() => setIsCartOpen(true)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onNavigateOrders={(_tab, code) => {
              if (code) setSelectedOrderCodeForTracking(code);
              setCurrentView('orders');
            }}
            onNavigateToShop={handleNavigateToShop}
          />
        ) : (
          /* TRẠNG THÁI 1: KHÁCH VÃNG LAI (GUEST) HOẶC CHẾ ĐỘ XEM TRƯỚC (PREVIEW) */
          <div className="space-y-12 pb-16">
            {/* If guest: Show Mint Studio Hero Landing Screen with Cylindrical Cards */}
            {!isPreview && (
              <HeroLanding
                products={products}
                totalProductsCount={products.length}
                onSelectProduct={handleOpenProductDetail}
                onAddToCart={prod => handleAddToCart(prod, 1)}
                onNavigate={handleNavigate}
                onOpenAuth={(role, isRegister) => setAuthModal({ open: true, role, initialIsRegister: !!isRegister })}
                onSelectCategory={cat => {
                  setSelectedCategory(cat);
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onNavigateToShop={handleNavigateToShop}
              />
            )}

            {/* Filter & Search Bar */}
            <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E2E8D8] shadow-sm space-y-4">
                {/* Search & Sort Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Form */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                    className="relative flex-1"
                  >
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E5E61]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên món đồ, mô tả tình trạng..."
                      className="w-full pl-10 pr-24 py-2.5 rounded-2xl border border-[#E2E8D8] bg-[#F5F8EF] text-xs text-[#101410] focus:bg-white focus:outline-none focus:border-[#08482D]"
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

                  {/* Filter & Sort Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
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
                        onChange={e => setSortOption(e.target.value)}
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
                          onChange={e => setMinPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8D8] bg-white font-mono text-xs"
                        />
                        <span className="text-[#5E5E61]">-</span>
                        <input
                          type="number"
                          placeholder="Đến (VNĐ)"
                          value={maxPrice}
                          onChange={e => setMaxPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8D8] bg-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-semibold text-[#101410]">Độ mới tối thiểu:</label>
                        <span className="font-mono text-[#08482D] font-bold">{minCondition}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        step="5"
                        value={minCondition}
                        onChange={e => setMinCondition(Number(e.target.value))}
                        className="w-full accent-[#08482D]"
                      />
                    </div>

                    <div className="flex items-center sm:justify-center">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inStockOnly}
                          onChange={e => setInStockOnly(e.target.checked)}
                          className="w-4 h-4 rounded text-[#08482D] accent-[#08482D]"
                        />
                        <span className="font-semibold text-[#101410]">Chỉ hiện món còn hàng</span>
                      </label>
                    </div>

                    <div className="flex items-end justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Đặt lại
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={fetchProducts}
                        className="text-xs"
                      >
                        Áp dụng
                      </Button>
                    </div>
                  </div>
                )}

                {/* Category Pills Slider */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#08482D] text-white shadow-xs'
                          : 'bg-[#F5F8EF] text-[#5E5E61] hover:text-[#101410] hover:bg-[#DAE7C7]/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Products Grid Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#101410]">
                    {selectedCategory === 'Tất cả' ? 'Kho Đồ Cũ Tuyển Chọn' : `Danh mục: ${selectedCategory}`}
                  </h3>
                  <p className="text-xs text-[#5E5E61] mt-0.5">
                    {loadingProducts ? 'Đang tìm kiếm...' : `Tìm thấy ${products.length} món đồ cũ sẵn sàng giao`}
                  </p>
                </div>
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-80 rounded-3xl bg-white border border-[#E2E8D8] p-4 flex flex-col justify-between animate-pulse">
                      <div className="h-44 rounded-2xl bg-[#DAE7C7]/30" />
                      <div className="space-y-2 mt-3">
                        <div className="h-4 bg-[#DAE7C7]/30 rounded w-3/4" />
                        <div className="h-3 bg-[#DAE7C7]/20 rounded w-1/2" />
                      </div>
                      <div className="h-8 bg-[#DAE7C7]/30 rounded-xl mt-3" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-[#E2E8D8] max-w-xl mx-auto p-8 shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-[#DAE7C7]/60 text-[#08482D] flex items-center justify-center text-2xl mx-auto">
                    🔍
                  </div>
                  <h4 className="text-lg font-bold text-[#101410]">
                    Không tìm thấy món đồ nào phù hợp
                  </h4>
                  <p className="text-xs text-[#5E5E61] max-w-sm mx-auto">
                    Thử chọn lại danh mục hoặc tìm kiếm với từ khóa khác như "máy ảnh", "áo khoác", "bàn phím"...
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetFilters}
                    className="mt-2 text-xs"
                  >
                    Xem tất cả sản phẩm
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={handleOpenProductDetail}
                      onAddToCart={prod => handleAddToCart(prod, 1)}
                      isWishlisted={wishlistIds.has(product.id)}
                      onToggleWishlist={id => handleToggleWishlist(id)}
                      disabledBuy={isPreview}
                      onDisabledBuyClick={() => showToast('Bạn đang xem cửa hàng dưới góc nhìn của khách — chức năng mua hàng bị vô hiệu hóa', 'info')}
                      onNavigateToShop={handleNavigateToShop}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* FOOTER (hidden on seller channel) */}
      {currentView !== 'seller' && (
        <footer className="bg-white border-t border-[#E2E8D8] py-12 text-[#101410] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            {/* Column 1: Brand Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#08482D] text-white flex items-center justify-center font-bold text-base">
                  ♻
                </div>
                <span className="text-lg font-bold text-[#101410]">
                  Đồ Cũ Còn Thương
                </span>
              </div>
              <p className="text-[#5E5E61] leading-relaxed">
                Tiệm đồ cũ phong cách tạp chí vintage. Mỗi món đồ cũ đều mang một câu chuyện, kiểm định chất lượng minh bạch trước khi đến tay người thương mới.
              </p>
              <div className="flex items-center gap-2 text-[#08482D] font-medium pt-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Bảo vệ quyền lợi khách mua & người bán 100%</span>
              </div>
            </div>

            {/* Column 2: Policies & Guides */}
            <div>
              <h4 className="font-bold text-[#101410] uppercase mb-3 tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#08482D]" />
                Chính sách & Hỗ trợ
              </h4>
              <ul className="space-y-2 text-[#5E5E61]">
                <li>
                  <button
                    onClick={() => setPolicyType('returns')}
                    className="hover:text-[#08482D] hover:underline transition-colors text-left"
                  >
                    Chính sách đổi trả & hoàn tiền (3 ngày)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setPolicyType('shipping')}
                    className="hover:text-[#08482D] hover:underline transition-colors text-left"
                  >
                    Chính sách vận chuyển & đồng kiểm
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setPolicyType('guide')}
                    className="hover:text-[#08482D] hover:underline transition-colors text-left"
                  >
                    Hướng dẫn mua hàng & thanh toán thẻ
                  </button>
                </li>
              </ul>

              <div className="mt-4 pt-3 border-t border-[#E2E8D8]">
                <span className="text-[10px] font-bold text-[#101410] uppercase block mb-1.5">Mã giảm giá đang phát:</span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className="bg-[#DAE7C7] text-[#08482D] px-2 py-0.5 rounded-full font-bold border border-[#DAE7C7]">
                    DOCU10 (-10%)
                  </span>
                  <span className="bg-[#DAE7C7] text-[#08482D] px-2 py-0.5 rounded-full font-bold border border-[#DAE7C7]">
                    FREESHIP (miễn phí ship)
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: About & Contact */}
            <div>
              <h4 className="font-bold text-[#101410] uppercase mb-3 tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#08482D]" />
                Về chúng tôi
              </h4>
              <ul className="space-y-2 text-[#5E5E61]">
                <li>
                  <button
                    onClick={() => setPolicyType('about')}
                    className="hover:text-[#08482D] hover:underline transition-colors text-left"
                  >
                    Câu chuyện tiệm Đồ Cũ Còn Thương
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setPolicyType('contact')}
                    className="hover:text-[#08482D] hover:underline transition-colors text-left"
                  >
                    Liên hệ cửa hàng & Góp ý
                  </button>
                </li>
              </ul>

              <div className="mt-4 space-y-1 text-[11px] text-[#5E5E61]">
                <div>📍 128 Đường Hai Bà Trưng, Quận 1, TP.HCM</div>
                <div>📞 Hotline: 0909 246 135 (8:00 - 21:00)</div>
                <div>✉️ docuconthuong@vintage.vn</div>
              </div>
            </div>

            {/* Column 4: Payment Methods & Shipping Carriers */}
            <div>
              <h4 className="font-bold text-[#101410] uppercase mb-3 tracking-wider">
                Thanh toán & Vận chuyển
              </h4>
              
              <span className="text-[10px] uppercase font-semibold text-[#5E5E61] block mb-1">Phương thức thanh toán:</span>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <span className="p-1.5 bg-[#F5F8EF] rounded-lg border border-[#E2E8D8] text-[11px] font-bold text-center text-[#101410]">
                  💳 Visa
                </span>
                <span className="p-1.5 bg-[#F5F8EF] rounded-lg border border-[#E2E8D8] text-[11px] font-bold text-center text-[#101410]">
                  💳 Mastercard
                </span>
                <span className="p-1.5 bg-[#F5F8EF] rounded-lg border border-[#E2E8D8] text-[11px] font-bold text-center text-[#101410]">
                  🏦 NAPAS ATM
                </span>
                <span className="p-1.5 bg-[#F5F8EF] rounded-lg border border-[#E2E8D8] text-[11px] font-bold text-center text-[#101410]">
                  💵 COD tiền mặt
                </span>
              </div>

              <span className="text-[10px] uppercase font-semibold text-[#5E5E61] block mb-1">Đơn vị vận chuyển liên kết:</span>
              <div className="space-y-1 text-[11px] text-[#5E5E61]">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#C2522D]" />
                  <span>Giao Hàng Nhanh (GHN)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#08482D]" />
                  <span>Giao Hàng Tiết Kiệm (GHTK)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-red-600" />
                  <span>Viettel Post</span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-[#E2E8D8] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[#5E5E61]">
            <div>
              <p>© 2026 Đồ Cũ Còn Thương. Nền tảng thương mại điện tử đồ cũ bền vững phong cách studio xanh bạc hà.</p>
              <p className="text-xs text-[#08482D] font-medium mt-1">Bản demo: dữ liệu được lưu trên Firebase và dùng chung cho mọi người.</p>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Demo Controller Button at Bottom-Left */}
      <DemoController
        onPresentationModeChange={setPresentationMode}
        onOpenFirstTimeLogin={(role, username) => {
          setAuthModal({
            open: true,
            role,
            initialIsRegister: false,
            initialUsername: username
          });
        }}
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
        initialOpenOffer={detailOpenOffer}
        initialOpenChat={detailOpenChat}
        isWishlisted={detailProduct ? wishlistIds.has(detailProduct.id) : false}
        onToggleWishlist={id => handleToggleWishlist(id)}
        currentUser={user}
        onRequestAuth={(actionType, prod) => {
          if (actionType === 'offer') {
            setPendingAction({ type: 'offer', product: prod });
            setAuthModal({
              open: true,
              role: 'buyer',
              initialIsRegister: false,
              promptMessage: 'Đăng nhập để gửi giá đề xuất cho shop'
            });
          } else if (actionType === 'chat') {
            setPendingAction({ type: 'chat', product: prod });
            setAuthModal({
              open: true,
              role: 'buyer',
              initialIsRegister: false,
              promptMessage: 'Đăng nhập để trò chuyện với người bán'
            });
          } else if (actionType === 'wishlist') {
            handleToggleWishlist(prod.id);
          } else if (actionType === 'cart') {
            handleAddToCart(prod, 1);
          } else if (actionType === 'buy') {
            handleBuyNow(prod, 1);
          }
        }}
        onClose={handleCloseProductDetail}
        onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
        onBuyNow={(prod, qty, offerId, negotiatedPrice) => handleBuyNow(prod, qty, offerId, negotiatedPrice)}
        disabledBuy={isPreview}
        onDisabledBuyClick={() => showToast('Bạn đang xem cửa hàng dưới góc nhìn của khách — chức năng mua hàng bị vô hiệu hóa', 'info')}
        onSelectProduct={(p) => handleOpenProductDetail(p)}
        onNavigateToShop={handleNavigateToShop}
      />

      {/* Cart Drawer (only on buyer/store channel) */}
      {currentView !== 'seller' && (
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
          onNavigateToShop={handleNavigateToShop}
          onProceedToCheckout={() => {
            setIsCartOpen(false);
            setDirectCheckoutItem(undefined);
            setCurrentView('checkout');
            window.history.pushState({}, '', '/checkout');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Success Order Modal (Requirement A4: shows all created orders) */}
      <SuccessOrderModal
        order={successOrder}
        orders={successOrders}
        onClose={() => {
          setSuccessOrder(null);
          setSuccessOrders([]);
        }}
        onViewOrders={code => {
          setSelectedOrderCodeForTracking(code);
          setCurrentView('orders');
          window.history.pushState({}, '', '/orders');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        role={authModal.role}
        initialIsRegister={authModal.initialIsRegister}
        initialUsername={authModal.initialUsername}
        promptMessage={authModal.promptMessage}
        onClose={() => setAuthModal({ open: false, role: 'buyer' })}
        onSuccess={handleAuthSuccess}
      />

      {/* Buyer Floating Chat Dock */}
      {user?.role !== 'seller' && (
        <BuyerChatDock onNavigateToShop={handleNavigateToShop} />
      )}

      {/* Shop Setup Wizard Modal */}
      <ShopSetupWizard
        isOpen={showShopSetupWizard}
        onClose={() => setShowShopSetupWizard(false)}
        onComplete={() => {
          setShowShopSetupWizard(false);
          setCurrentView('seller');
          window.history.pushState({}, '', '/seller');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <MainShopApp />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
