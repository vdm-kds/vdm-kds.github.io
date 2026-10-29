import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyC0sAoFmmNcvCAZoSzgdd6fM2V8ELYfsvs",
  authDomain: "do-cu-con-thuong.firebaseapp.com",
  projectId: "do-cu-con-thuong",
  storageBucket: "do-cu-con-thuong.firebasestorage.app",
  messagingSenderId: "515526901972",
  appId: "1:515526901972:web:7ded7eefaeb9c888287b41"
};

// Default app for unauthenticated / guest access
export function getDefaultApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === '[DEFAULT]');
  if (existing) return existing;
  return initializeApp(firebaseConfig);
}

export function getDefaultFirestore(): Firestore {
  return getFirestore(getDefaultApp());
}

export function getDefaultAuth(): Auth {
  return getAuth(getDefaultApp());
}

// Owner accounts list
export const OWNER_KEYS = [
  'seller_admin',
  'seller_goc_sach_nhac',
  'seller_retro_tech',
  'buyer_0987654321'
];

export interface StoredAccount {
  role: 'buyer' | 'seller';
  username: string;
  fullName: string;
  uid: string;
  phone?: string;
  shopId?: string | null;
  shopName?: string;
}

const STORAGE_KEY_ACCOUNTS = 'dcct_accounts';
const STORAGE_KEY_ACTIVE = 'dcct_active';

export function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredAccount(account: StoredAccount): void {
  try {
    const list = getStoredAccounts().filter(
      (a) => !(a.role === account.role && a.username.toLowerCase() === account.username.toLowerCase())
    );
    list.push(account);
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(list));
  } catch {
    // quiet catch
  }
}

export function removeStoredAccount(role: 'buyer' | 'seller', username: string): void {
  try {
    const list = getStoredAccounts().filter(
      (a) => !(a.role === role && a.username.toLowerCase() === username.toLowerCase())
    );
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(list));
  } catch {
    // quiet catch
  }
}

export function getActiveAccountKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY_ACTIVE);
  } catch {
    return null;
  }
}

export function setActiveAccountKey(key: string | null): void {
  try {
    if (key) {
      sessionStorage.setItem(STORAGE_KEY_ACTIVE, key);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  } catch {
    // quiet catch
  }
}

export function getAppKeyFor(role: 'buyer' | 'seller', username: string): string {
  return 'acc_' + role + '_' + username.toLowerCase().trim();
}

// Get or initialize a named Firebase App for this account
export function getOrCreateAccountApp(role: 'buyer' | 'seller', username: string): FirebaseApp {
  const appName = getAppKeyFor(role, username);
  const existing = getApps().find((a) => a.name === appName);
  if (existing) return existing;
  return initializeApp(firebaseConfig, appName);
}

export function getActiveApp(): FirebaseApp {
  const activeKey = getActiveAccountKey();
  if (activeKey) {
    const existing = getApps().find((a) => a.name === activeKey);
    if (existing) return existing;
    // Attempt to recreate from stored accounts
    const accounts = getStoredAccounts();
    const found = accounts.find((a) => getAppKeyFor(a.role, a.username) === activeKey);
    if (found) {
      return getOrCreateAccountApp(found.role, found.username);
    }
  }
  return getDefaultApp();
}

export function getActiveAuth(): Auth {
  return getAuth(getActiveApp());
}

export function getActiveFirestore(): Firestore {
  return getFirestore(getActiveApp());
}

// Hidden email conversions
export function toBuyerEmail(phone: string): string {
  const clean = phone.trim().replace(/\D/g, '');
  return `${clean}@buyer.nhiptaman.store`;
}

export function toSellerEmail(username: string): string {
  const clean = username.trim().toLowerCase();
  return `${clean}@seller.nhiptaman.store`;
}

// Friendly Vietnamese error translation
export function mapFirebaseError(err: any): string {
  if (!err) return 'Có lỗi xảy ra, vui lòng thử lại';
  const code = err.code || (err.message && err.message.includes('auth/') ? err.message : '');

  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return 'Sai tên đăng nhập hoặc mật khẩu';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'Số điện thoại / tên đăng nhập này đã được đăng ký';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Bạn thử sai quá nhiều lần, vui lòng thử lại sau ít phút';
  }
  if (code.includes('auth/unauthorized-domain')) {
    // In AI Studio preview or unauthorized domain
    return 'Khung xem trước chưa được cấp phép đăng nhập. Hãy thử trên nhiptaman.store.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Mất kết nối mạng, vui lòng thử lại';
  }
  if (code.includes('permission-denied') || (err.message && err.message.includes('permission-denied'))) {
    return 'Bạn không có quyền thực hiện thao tác này';
  }
  return err.message || 'Thao tác không thành công, vui lòng thử lại';
}
