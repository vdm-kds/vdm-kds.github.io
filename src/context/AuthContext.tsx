import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Address } from '../types';
import { api, getStoredToken } from '../services/api';
import { getCurrentSession, clearCurrentSession, subscribeDb } from '../services/db';
import { useToast } from './ToastContext';

export type AuthStatus = 'loading' | 'guest' | 'buyer' | 'seller';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  address: Address | null;
  loading: boolean;
  cartCount: number;
  login: (username: string, password: string, role: 'buyer' | 'seller') => Promise<void>;
  register: (payload: {
    username?: string;
    phone?: string;
    password: string;
    full_name: string;
    role: 'buyer' | 'seller';
    address?: string;
    shop_name?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCartCount: () => Promise<void>;
  quickLogin: (role: 'buyer' | 'seller') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<{
    status: AuthStatus;
    user: User | null;
    address: Address | null;
  }>({
    status: 'loading',
    user: null,
    address: null
  });

  const [cartCount, setCartCount] = useState<number>(0);
  const { showToast } = useToast();
  const mountedRef = useRef(true);

  // Refresh cart count
  const refreshCartCount = async () => {
    const session = getCurrentSession();
    if (!session || !session.user || session.user.role !== 'buyer') {
      if (mountedRef.current) setCartCount(0);
      return;
    }
    try {
      const data = await api.getCart();
      if (mountedRef.current) {
        setCartCount(data.item_count || 0);
      }
    } catch {
      // quiet catch
    }
  };

  // Refresh user from current tab session
  const refreshUser = async () => {
    const session = getCurrentSession();
    if (!session || !session.user) {
      if (mountedRef.current) {
        setAuthState({
          status: 'guest',
          user: null,
          address: null
        });
        setCartCount(0);
      }
      return;
    }

    try {
      const data = await api.getMe();
      if (mountedRef.current) {
        setAuthState({
          status: data.user.role === 'seller' ? 'seller' : 'buyer',
          user: data.user,
          address: data.address || null
        });
        if (data.user.role === 'buyer') {
          const cartData = await api.getCart();
          if (mountedRef.current) {
            setCartCount(cartData.item_count || 0);
          }
        } else {
          setCartCount(0);
        }
      }
    } catch {
      clearCurrentSession();
      if (mountedRef.current) {
        setAuthState({
          status: 'guest',
          user: null,
          address: null
        });
        setCartCount(0);
      }
    }
  };

  // On mount: initialize session with max 3s timeout to fallback to 'guest'
  useEffect(() => {
    mountedRef.current = true;

    // Timeout guard: if loading takes > 3 seconds, fallback to guest
    const timeoutTimer = setTimeout(() => {
      setAuthState((prev) => {
        if (prev.status === 'loading') {
          return { status: 'guest', user: null, address: null };
        }
        return prev;
      });
    }, 3000);

    refreshUser().finally(() => {
      clearTimeout(timeoutTimer);
    });

    // Subscribe to cross-tab storage changes
    const unsubscribe = subscribeDb(() => {
      if (mountedRef.current) {
        refreshCartCount();
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string, role: 'buyer' | 'seller') => {
    try {
      const data = await api.login({ username, password, role });
      if (!mountedRef.current) return;

      // Single atomic setState
      setAuthState({
        status: data.user.role === 'seller' ? 'seller' : 'buyer',
        user: data.user,
        address: null
      });

      if (data.user.role === 'buyer') {
        refreshCartCount();
      } else {
        setCartCount(0);
      }

      showToast(`Chào mừng ${data.user.full_name} (${data.user.role === 'seller' ? 'Chủ Tiệm' : 'Khách mua'}) đã quay trở lại!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Đăng nhập thất bại', 'error');
      throw error;
    }
  };

  const register = async (payload: {
    username?: string;
    phone?: string;
    password: string;
    full_name: string;
    role: 'buyer' | 'seller';
    address?: string;
    shop_name?: string;
  }) => {
    try {
      const data = await api.register(payload);
      if (!mountedRef.current) return;

      // Single atomic setState
      setAuthState({
        status: data.user.role === 'seller' ? 'seller' : 'buyer',
        user: data.user,
        address: null
      });

      if (data.user.role === 'buyer') {
        refreshCartCount();
        showToast('Tạo tài khoản thành công', 'success');
      } else {
        setCartCount(0);
        showToast('Tạo tài khoản người bán thành công', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Đăng ký thất bại', 'error');
      throw error;
    }
  };

  const logout = () => {
    clearCurrentSession();
    if (mountedRef.current) {
      setAuthState({
        status: 'guest',
        user: null,
        address: null
      });
      setCartCount(0);
    }
    showToast('Đã đăng xuất', 'info');
  };

  const quickLogin = async (targetRole: 'buyer' | 'seller') => {
    try {
      if (targetRole === 'seller') {
        const res = await api.switchSeller();
        if (mountedRef.current) {
          setAuthState({
            status: 'seller',
            user: res.user,
            address: null
          });
          setCartCount(0);
        }
      } else {
        const res = await api.switchBuyer();
        if (mountedRef.current) {
          setAuthState({
            status: 'buyer',
            user: res.user,
            address: null
          });
          refreshCartCount();
        }
      }
      showToast('Đã chuyển đổi tài khoản thành công', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển đổi tài khoản', 'error');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        status: authState.status,
        user: authState.user,
        address: authState.address,
        loading: authState.status === 'loading',
        cartCount,
        login,
        register,
        logout,
        refreshUser,
        refreshCartCount,
        quickLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
