import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Package, Store, LogOut, User as UserIcon, Search, Menu, X, 
  Heart, Tag, ExternalLink, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { Product, Shop } from '../types';
import { api } from '../services/api';
import { formatVND } from '../utils/format';
import { Button } from './Button';

interface HeaderProps {
  currentView: any;
  onNavigate: (view: any) => void;
  onOpenCart: () => void;
  onOpenAuth: (role: 'buyer' | 'seller', isRegister?: boolean) => void;
  onSelectOrder?: (orderId: number) => void;
  onSelectProduct?: (product: Product) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
  onNavigateToShop?: (slug: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenCart,
  onOpenAuth,
  onSelectOrder,
  onSelectProduct,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onNavigateToShop
}) => {
  const { user, logout, cartCount, quickLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Autocomplete live search state
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [shopSuggestions, setShopSuggestions] = useState<Shop[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
      setSuggestions([]);
      setShopSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [prodRes, shopRes] = await Promise.all([
          api.getAutocomplete(searchQuery.trim()),
          api.searchShops(searchQuery.trim())
        ]);
        setSuggestions((prodRes.suggestions || []) as any);
        setShopSuggestions(shopRes.shops || []);
        setShowSuggestions(true);
      } catch (err) {
        // Silent autocomplete failure
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener to dismiss suggestions & dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      if (onSearchSubmit) onSearchSubmit();
    }
  };

  const handleSelectSuggestion = (p: Product) => {
    setShowSuggestions(false);
    if (onSelectProduct) {
      onSelectProduct(p);
    } else {
      if (onSearchChange) onSearchChange(p.name);
      if (onSearchSubmit) onSearchSubmit();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F5F8EF]/95 backdrop-blur-md border-b border-[#E2E8D8] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark with ♻ and leaf logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (user?.role === 'seller') onNavigate('seller');
              else onNavigate('home');
            }}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#08482D] text-white flex items-center justify-center font-bold text-lg shadow-sm transition-transform duration-200 group-hover:scale-105">
              ♻
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#101410] block leading-none">
                Đồ Cũ Còn Thương
              </span>
              <span className="text-[11px] text-[#5E5E61] font-medium tracking-wide mt-1 block">
                Tiệm đồ cũ còn thương, chờ người thương mới
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links & Live Search with Autocomplete */}
        <div ref={searchContainerRef} className="hidden md:flex items-center gap-6 flex-1 max-w-md mx-2 relative">
          {onSearchChange && (
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Tìm áo da, máy ảnh film, đồng hồ vintage..."
                className="w-full bg-[#FFFFFF] border border-[#E2E8D8] rounded-full pl-9 pr-8 py-2 text-xs text-[#101410] placeholder-[#5E5E61]/70 shadow-2xs focus:outline-none focus:border-[#08482D] focus:ring-1 focus:ring-[#08482D] transition-all"
              />
              <Search className="w-4 h-4 text-[#5E5E61] absolute left-3 top-2.5 pointer-events-none" />
              {isSearching && (
                <div className="w-3.5 h-3.5 border-2 border-[#08482D] border-t-transparent rounded-full animate-spin absolute right-3 top-2.5" />
              )}

              {/* Autocomplete Dropdown Popover */}
              {showSuggestions && (suggestions.length > 0 || shopSuggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E2E8D8] rounded-2xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                  {/* Shop suggestions if any */}
                  {shopSuggestions.length > 0 && (
                    <div className="p-2 border-b border-[#E2E8D8] bg-[#F5F8EF]/60">
                      <div className="text-[10px] uppercase font-bold text-[#5E5E61] tracking-wider mb-1.5 flex items-center gap-1 px-1">
                        <Store className="w-3 h-3 text-[#08482D]" />
                        Shop liên quan ({shopSuggestions.length})
                      </div>
                      <div className="space-y-1">
                        {shopSuggestions.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E2E8D8]/70 hover:border-[#08482D] transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
                                style={{ backgroundColor: s.cover_color || '#08482D' }}
                              >
                                {s.avatar ? (
                                  <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                                ) : (
                                  s.name.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#101410] truncate">{s.name}</p>
                                <p className="text-[10px] text-[#5E5E61] truncate">{s.description || `@${s.slug}`}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSuggestions(false);
                                if (onNavigateToShop) onNavigateToShop(s.slug);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#08482D] bg-[#DAE7C7]/50 hover:bg-[#DAE7C7] rounded-lg shrink-0 transition-colors"
                            >
                              Ghé shop
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <div className="p-2 border-b border-[#E2E8D8] bg-[#F5F8EF] flex items-center justify-between text-[11px] text-[#5E5E61] font-medium">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#08482D]" />
                          Gợi ý sản phẩm ({suggestions.length})
                        </span>
                        <span>Bấm để xem</span>
                      </div>
                      <div className="divide-y divide-[#E2E8D8]/50 max-h-60 overflow-y-auto">
                        {suggestions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(p)}
                            className="w-full p-2.5 flex items-center gap-3 text-left hover:bg-[#F5F8EF] transition-colors group"
                          >
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover border border-[#E2E8D8] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#101410] group-hover:text-[#08482D] truncate">
                                {p.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono font-bold text-[#C2522D]">
                                  {formatVND(p.price)}
                                </span>
                                <span className="text-[10px] text-[#08482D] bg-[#DAE7C7] px-1.5 py-0.2 rounded-sm font-mono">
                                  Mới {p.condition_pct}%
                                </span>
                                {p.shop_name && (
                                  <span className="text-[10px] text-[#5E5E61] truncate">
                                    • {p.shop_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zone 3: Primary Actions, Cart, Notification & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Navigation Tab Shortcuts */}
          <nav className="hidden sm:flex items-center gap-1 text-xs font-medium text-[#5E5E61]">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
                currentView === 'home'
                  ? 'bg-[#DAE7C7] text-[#08482D] font-bold'
                  : 'hover:bg-[#DAE7C7]/40 text-[#5E5E61]'
              }`}
            >
              Cửa hàng
            </button>

            {user && user.role === 'buyer' && (
              <>
                <button
                  onClick={() => onNavigate('orders')}
                  className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    currentView === 'orders'
                      ? 'bg-[#DAE7C7] text-[#08482D] font-bold'
                      : 'hover:bg-[#DAE7C7]/40 text-[#5E5E61]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Đơn mua
                </button>

                <button
                  onClick={() => onNavigate('account')}
                  className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    currentView === 'account'
                      ? 'bg-[#DAE7C7] text-[#08482D] font-bold'
                      : 'hover:bg-[#DAE7C7]/40 text-[#5E5E61]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Tài khoản
                </button>
              </>
            )}

            {user && user.role === 'seller' && (
              <button
                onClick={() => onNavigate('seller')}
                className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  currentView === 'seller'
                    ? 'bg-[#08482D] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#DAE7C7]/40 text-[#5E5E61]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Quản trị shop
              </button>
            )}
          </nav>

          {/* Live Notification Bell with unread counter & dropdown */}
          {user && (
            <NotificationBell onSelectOrder={onSelectOrder} />
          )}

          {/* Cart Icon (Buyer only) */}
          {user && user.role === 'buyer' && (
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl text-[#101410] hover:bg-[#DAE7C7]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08482D]"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5 text-[#08482D]" />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#C2522D] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Auth Buttons / Profile Menu */}
          {user ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (user.role === 'buyer') onNavigate('account');
                    else onNavigate('seller');
                  }}
                  className="hidden sm:flex flex-col text-right hover:opacity-80 transition-opacity"
                >
                  <span className="text-xs font-semibold text-[#101410] leading-tight">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-[#5E5E61] font-mono">
                    {user.role === 'seller' ? 'Người bán' : 'Khách mua'}
                  </span>
                </button>

                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl text-[#5E5E61] hover:text-[#B3362F] hover:bg-[#F6DDDB] transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenAuth('buyer', false)}
                className="text-xs font-semibold"
              >
                Đăng nhập
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenAuth('buyer', true)}
                className="text-xs font-semibold"
              >
                Đăng ký
              </Button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-xl text-[#101410] hover:bg-[#DAE7C7]/50"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[#F5F8EF] border-b border-[#E2E8D8] px-4 py-4 space-y-3">
          {onSearchChange && (
            <div className="relative w-full mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-white border border-[#E2E8D8] rounded-xl pl-9 pr-4 py-2 text-xs text-[#101410] focus:outline-none focus:border-[#08482D]"
              />
              <Search className="w-4 h-4 text-[#5E5E61] absolute left-3 top-2.5" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
              className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#101410] hover:bg-[#DAE7C7]/50"
            >
              Cửa hàng
            </button>
            {user && user.role === 'buyer' && (
              <>
                <button
                  onClick={() => { onNavigate('orders'); setMobileMenuOpen(false); }}
                  className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#101410] hover:bg-[#DAE7C7]/50"
                >
                  Đơn mua của tôi
                </button>
                <button
                  onClick={() => { onNavigate('account'); setMobileMenuOpen(false); }}
                  className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#101410] hover:bg-[#DAE7C7]/50"
                >
                  Tài khoản của tôi (/account)
                </button>
              </>
            )}
            {user && user.role === 'seller' && (
              <button
                onClick={() => { onNavigate('seller'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#08482D] hover:bg-[#DAE7C7]/50"
              >
                Quản trị người bán & Vận chuyển
              </button>
            )}
            {!user && (
              <button
                onClick={() => { onOpenAuth('seller', false); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#08482D] hover:bg-[#DAE7C7]/50"
              >
                Kênh người bán
              </button>
            )}
            {user && (
              <div className="pt-2 border-t border-[#E2E8D8]">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Đăng xuất ({user.full_name})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
