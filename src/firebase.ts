import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  Firestore
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
  return getAccountAuth(getDefaultApp());
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
const STORAGE_KEY_LAST_ACTIVE = 'dcct_last_active';

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

export function getLastActiveAccountKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
  } catch {
    return null;
  }
}

export function setActiveAccountKey(key: string | null): void {
  try {
    if (key) {
      sessionStorage.setItem(STORAGE_KEY_ACTIVE, key);
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, key);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
    }
  } catch {
    // quiet catch
  }
}

export function getAppKeyFor(role: 'buyer' | 'seller', username: string): string {
  const clean = role === 'buyer' 
    ? username.trim().replace(/\D/g, '')
    : username.toLowerCase().trim();
  return 'acc_' + role + '_' + clean;
}

// Cache of initialized Auth instances per app name
const authInstances = new Map<string, Auth>();

export function getAccountAuth(app: FirebaseApp): Auth {
  if (authInstances.has(app.name)) {
    return authInstances.get(app.name)!;
  }
  let auth: Auth;
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });
  } catch {
    auth = getAuth(app);
  }
  authInstances.set(app.name, auth);
  return auth;
}

// Get or initialize a named Firebase App for this account
export function getOrCreateAccountApp(role: 'buyer' | 'seller', username: string): FirebaseApp {
  const appName = getAppKeyFor(role, username);
  const existing = getApps().find((a) => a.name === appName);
  const app = existing || initializeApp(firebaseConfig, appName);
  getAccountAuth(app); // Ensure Auth is initialized with indexedDBLocalPersistence + browserLocalPersistence
  return app;
}

// App currently active for read/write
export function getActiveApp(): FirebaseApp {
  const activeKey = getActiveAccountKey();
  if (activeKey) {
    const existing = getApps().find((a) => a.name === activeKey);
    if (existing) {
      const auth = getAccountAuth(existing);
      if (auth.currentUser) return existing;
    } else {
      // Re-create from stored accounts if exists
      const accounts = getStoredAccounts();
      const found = accounts.find((a) => getAppKeyFor(a.role, a.username) === activeKey);
      if (found) {
        const app = getOrCreateAccountApp(found.role, found.username);
        const auth = getAccountAuth(app);
        if (auth.currentUser) return app;
      }
    }
  }
  return getDefaultApp();
}

export function getActiveAuth(): Auth {
  return getAccountAuth(getActiveApp());
}

export function getActiveFirestore(): Firestore {
  return getFirestore(getActiveApp());
}

// Startup verification: cleans default app, verifies all remembered accounts
export async function syncAndValidateAccounts(): Promise<{ validAccounts: StoredAccount[]; activeAccount: StoredAccount | null }> {
  // 7. Dọn dữ liệu cũ: xóa các khóa localStorage cũ của bản trước Firebase ("dcct_db", demo keys)
  try {
    localStorage.removeItem('dcct_db');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('dcct_demo_') || k.startsWith('dcct_mock_'))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}

  // 4. Dọn lỗi cũ: khi tải trang, nếu app [DEFAULT] đang có currentUser thì gọi signOut trên app [DEFAULT]
  try {
    const defApp = getDefaultApp();
    const defAuth = getAccountAuth(defApp);
    await defAuth.authStateReady();
    if (defAuth.currentUser) {
      await signOut(defAuth);
    }
  } catch {}

  // 3. Với mỗi tài khoản trong "dcct_accounts", khởi tạo app + auth và await authStateReady()
  const stored = getStoredAccounts();
  const validAccounts: StoredAccount[] = [];

  for (const acc of stored) {
    try {
      const app = getOrCreateAccountApp(acc.role, acc.username);
      const auth = getAccountAuth(app);
      await auth.authStateReady();
      if (auth.currentUser && auth.currentUser.uid === acc.uid) {
        validAccounts.push(acc);
      }
    } catch {}
  }

  // Cập nhật lại "dcct_accounts" chỉ giữ các tài khoản còn session hợp lệ
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(validAccounts));
  } catch {}

  // 5. Kiểm tra tài khoản trong "dcct_active"; nếu trống thì kiểm tra "dcct_last_active"
  let activeKey = getActiveAccountKey();
  if (!activeKey) {
    const lastActiveKey = getLastActiveAccountKey();
    if (lastActiveKey) {
      const matched = validAccounts.find((a) => getAppKeyFor(a.role, a.username) === lastActiveKey);
      if (matched) {
        activeKey = lastActiveKey;
        setActiveAccountKey(lastActiveKey);
      }
    }
  }

  let activeAccount: StoredAccount | null = null;

  if (activeKey) {
    const found = validAccounts.find((a) => getAppKeyFor(a.role, a.username) === activeKey);
    if (found) {
      const app = getOrCreateAccountApp(found.role, found.username);
      const auth = getAccountAuth(app);
      if (auth.currentUser && auth.currentUser.uid === found.uid) {
        activeAccount = found;
      }
    }
  }

  // Nếu tài khoản trong "dcct_active" không có currentUser thì coi như khách vãng lai
  if (!activeAccount) {
    setActiveAccountKey(null);
  }

  return { validAccounts, activeAccount };
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
