import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Address } from '../types';
import { api } from '../services/api';
import {
  getCurrentSession,
  clearCurrentSession,
  subscribeDb,
  db
} from '../services/db';
import {
  getActiveAuth,
  getActiveAccountKey,
  setActiveAccountKey,
  getStoredAccounts,
  getOrCreateAccountApp,
  getAppKeyFor,
  StoredAccount,
  syncAndValidateAccounts
} from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
  switchRole: (targetUserId: number | string) => Promise<void>;
  switchAccount: (role: 'buyer' | 'seller', username: string) => Promise<void>;
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

  // Refresh user from active Firebase session
  const refreshUser = async () => {
    const activeKey = getActiveAccountKey();
    if (!activeKey) {
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
    } catch (err) {
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

  // On mount: clean default app, validate all remembered accounts and active session
  useEffect(() => {
    mountedRef.current = true;

    // Timeout guard: max 5 seconds wait
    const timeoutTimer = setTimeout(() => {
      setAuthState((prev) => {
        if (prev.status === 'loading') {
          return { status: 'guest', user: null, address: null };
        }
        return prev;
      });
    }, 5000);

    let unsubDb: (() => void) | null = null;

    syncAndValidateAccounts()
      .then(async ({ activeAccount }) => {
        if (!mountedRef.current) return;
        if (activeAccount) {
          await refreshUser();
        } else {
          setAuthState({ status: 'guest', user: null, address: null });
          setCartCount(0);
        }
        clearTimeout(timeoutTimer);
      })
      .catch(() => {
        if (mountedRef.current) {
          setAuthState({ status: 'guest', user: null, address: null });
          setCartCount(0);
        }
        clearTimeout(timeoutTimer);
      });

    unsubDb = subscribeDb(() => {
      if (mountedRef.current) {
        refreshCartCount();
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutTimer);
      if (unsubDb) unsubDb();
    };
  }, []);

  const login = async (username: string, password: string, role: 'buyer' | 'seller') => {
    try {
      const data = await api.login({ username, password, role });
      if (!mountedRef.current) return;

      setAuthState({
        status: data.user.role === 'seller' ? 'seller' : 'buyer',
        user: data.user,
        address: data.address || null
      });

      if (data.user.role === 'buyer') {
        refreshCartCount();
      } else {
        setCartCount(0);
      }

      showToast(
        `Chào mừng ${data.user.full_name} (${data.user.role === 'seller' ? 'Chủ Tiệm' : 'Khách mua'}) đã quay trở lại!`,
        'success'
      );
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
    db.logout().catch(() => {});
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

  const switchAccount = async (role: 'buyer' | 'seller', username: string) => {
    try {
      window.dispatchEvent(new CustomEvent('close-all-overlays'));
      window.dispatchEvent(new CustomEvent('close-buyer-chat'));

      const newUser = await db.switchAccount(role, username);
      if (!mountedRef.current) return;

      setAuthState({
        status: newUser.role === 'seller' ? 'seller' : 'buyer',
        user: newUser,
        address: null
      });

      if (newUser.role === 'buyer') {
        await refreshCartCount();
      } else {
        setCartCount(0);
      }

      const targetPath = newUser.role === 'seller' ? '/seller' : '/';
      window.dispatchEvent(new CustomEvent('navigate-path', { detail: { path: targetPath } }));

      showToast(`Đã chuyển sang ${newUser.full_name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển đổi tài khoản', 'error');
      throw err;
    }
  };

  const switchRole = async (targetUserId: number | string) => {
    try {
      window.dispatchEvent(new CustomEvent('close-all-overlays'));
      window.dispatchEvent(new CustomEvent('close-buyer-chat'));

      const res = await api.switchRole(targetUserId as any);
      if (!mountedRef.current) return;

      setAuthState({
        status: res.user.role === 'seller' ? 'seller' : 'buyer',
        user: res.user,
        address: null
      });

      if (res.user.role === 'buyer') {
        await refreshCartCount();
      } else {
        setCartCount(0);
      }

      const targetPath = res.user.role === 'seller' ? '/seller' : '/';
      window.dispatchEvent(new CustomEvent('navigate-path', { detail: { path: targetPath } }));

      showToast(`Đã chuyển sang ${res.role_name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi chuyển đổi vai', 'error');
      throw err;
    }
  };

  const quickLogin = async (targetRole: 'buyer' | 'seller') => {
    if (targetRole === 'seller') {
      await switchRole(1);
    } else {
      await switchRole(2);
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
        quickLogin,
        switchRole,
        switchAccount
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
