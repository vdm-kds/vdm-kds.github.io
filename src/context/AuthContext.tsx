import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Address } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  address: Address | null;
  loading: boolean;
  cartCount: number;
  login: (username: string, password: string, role: 'buyer' | 'seller') => Promise<void>;
  register: (payload: { username?: string; phone?: string; password: string; full_name: string; role: 'buyer' | 'seller'; address?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCartCount: () => Promise<void>;
  quickLogin: (role: 'buyer' | 'seller') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cartCount, setCartCount] = useState<number>(0);
  const { showToast } = useToast();

  const refreshCartCount = async () => {
    if (!user || user.role !== 'buyer') {
      setCartCount(0);
      return;
    }
    try {
      const data = await api.getCart();
      setCartCount(data.item_count || 0);
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setAddress(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setAddress(data.address || null);
      if (data.user.role === 'buyer') {
        const cartData = await api.getCart();
        setCartCount(cartData.item_count || 0);
      }
    } catch (err) {
      clearStoredToken();
      setUser(null);
      setAddress(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string, role: 'buyer' | 'seller') => {
    try {
      const data = await api.login({ username, password, role });
      setStoredToken(data.token);
      setUser(data.user);
      await refreshUser();
      showToast(`Chào mừng ${data.user.full_name} (${data.user.role === 'seller' ? 'Người bán' : 'Khách mua'}) đã quay trở lại!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Đăng nhập thất bại', 'error');
      throw error;
    }
  };

  const register = async (payload: { username?: string; phone?: string; password: string; full_name: string; role: 'buyer' | 'seller'; address?: string }) => {
    try {
      const data = await api.register(payload);
      setStoredToken(data.token);
      setUser(data.user);
      await refreshUser();
      showToast(`Đăng ký tài khoản ${data.user.full_name} thành công!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Đăng ký thất bại', 'error');
      throw error;
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    setAddress(null);
    setCartCount(0);
    showToast('Đã đăng xuất tài khoản', 'info');
  };

  // Helper đăng nhập 1 click để tiện kiểm thử demo theo đúng yêu cầu đề bài
  const quickLogin = async (targetRole: 'buyer' | 'seller') => {
    if (targetRole === 'seller') {
      await login('admin', 'admin', 'seller');
    } else {
      await login('0987654321', 'nguoidung', 'buyer');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        address,
        loading,
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
