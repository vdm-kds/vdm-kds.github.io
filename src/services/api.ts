import { Product, CartItem, Order, User, SellerStats, Address } from '../types';

const TOKEN_KEY = 'do_cu_con_thuong_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Lỗi yêu cầu: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string; role: 'buyer' | 'seller' }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (payload: { username?: string; phone?: string; password: string; full_name: string; role: 'buyer' | 'seller'; address?: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () =>
    request<{ user: User; address?: Address }>('/auth/me'),

  // Products
  getProducts: (params?: { category?: string; search?: string; sort?: string; min_price?: number; max_price?: number; min_condition?: number; in_stock?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.min_price !== undefined) query.set('min_price', String(params.min_price));
    if (params?.max_price !== undefined) query.set('max_price', String(params.max_price));
    if (params?.min_condition !== undefined) query.set('min_condition', String(params.min_condition));
    if (params?.in_stock) query.set('in_stock', 'true');
    return request<{ products: Product[] }>(`/products?${query.toString()}`);
  },

  getAutocomplete: (q: string) =>
    request<{ suggestions: Array<{ id: number; name: string; category: string; price: number; original_price: number; condition_pct: number; image_url: string; stock: number }> }>(`/products/autocomplete?q=${encodeURIComponent(q)}`),

  getProduct: (id: number) =>
    request<{ product: Product }>(`/products/${id}`),

  createProduct: (productData: Partial<Product>) =>
    request<{ message: string; product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    }),

  updateProduct: (id: number, productData: Partial<Product>) =>
    request<{ message: string; product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    }),

  deleteProduct: (id: number) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE'
    }),

  // Cart
  getCart: () =>
    request<{ items: CartItem[]; subtotal: number; shipping_fee: number; total: number; item_count: number }>('/cart'),

  addToCart: (productId: number, quantity: number = 1) =>
    request<{ message: string }>('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity })
    }),

  updateCartQty: (cartId: number, quantity: number) =>
    request<{ message: string }>(`/cart/${cartId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    }),

  removeFromCart: (cartId: number) =>
    request<{ message: string }>(`/cart/${cartId}`, {
      method: 'DELETE'
    }),

  clearCart: () =>
    request<{ message: string }>('/cart', {
      method: 'DELETE'
    }),

  // Orders (Buyer)
  getOrders: (status?: string) => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return request<{ orders: Order[] }>(`/orders${query}`);
  },

  getOrder: (id: number) =>
    request<{ order: Order }>(`/orders/${id}`),

  checkout: (orderData: {
    recipient_name: string;
    phone: string;
    address: string;
    note?: string;
    payment_method: 'card' | 'napas' | 'cod';
    card_last4?: string;
    card_type?: string;
    direct_items?: Array<{ product_id: number; quantity: number }>;
    coupon_code?: string;
  }) =>
    request<{ message: string; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    }),

  cancelOrder: (id: number, reason: string) =>
    request<{ message: string; order: Order }>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  completeOrder: (id: number) =>
    request<{ message: string; order: Order }>(`/orders/${id}/complete`, {
      method: 'POST'
    }),

  // Reviews
  getProductReviews: (productId: number) =>
    request<{
      reviews: any[];
      total_reviews: number;
      average_rating: number;
      distribution: Record<number, number>;
    }>(`/reviews/product/${productId}`),

  getOrderReviewedItems: (orderId: number) =>
    request<{ reviewed_product_ids: number[] }>(`/reviews/order/${orderId}/checked`),

  submitReview: (payload: { order_id: number; product_id: number; rating: number; comment: string; tags?: string[] }) =>
    request<{ message: string }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Coupons
  validateCoupon: (code: string, subtotal: number, shipping_fee: number) =>
    request<{
      valid: boolean;
      coupon: { code: string; type: string; value: number; max_discount?: number; min_order_amount: number; description: string };
      discount_amount: number;
    }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal, shipping_fee })
    }),

  getPublicCoupons: () =>
    request<{ coupons: any[] }>('/coupons/public'),

  getSellerCoupons: () =>
    request<{ coupons: any[] }>('/coupons/seller/list'),

  createSellerCoupon: (couponData: any) =>
    request<{ message: string; coupon: any }>('/coupons/seller/create', {
      method: 'POST',
      body: JSON.stringify(couponData)
    }),

  toggleSellerCoupon: (id: number) =>
    request<{ message: string; is_active: number }>(`/coupons/seller/${id}/toggle`, {
      method: 'PATCH'
    }),

  deleteSellerCoupon: (id: number) =>
    request<{ message: string }>(`/coupons/seller/${id}`, {
      method: 'DELETE'
    }),

  // Account & Profile & Wishlist
  getProfile: () =>
    request<{ user: User }>('/account/profile'),

  updateProfile: (data: { full_name: string; phone?: string }) =>
    request<{ message: string; user: User }>('/account/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  changePassword: (data: { old_password: string; new_password: string }) =>
    request<{ message: string }>('/account/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getAddresses: () =>
    request<{ addresses: Address[] }>('/account/addresses'),

  addAddress: (data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }) =>
    request<{ message: string; addresses: Address[] }>('/account/addresses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateAddress: (id: number, data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }) =>
    request<{ message: string; addresses: Address[] }>(`/account/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteAddress: (id: number) =>
    request<{ message: string; addresses: Address[] }>(`/account/addresses/${id}`, {
      method: 'DELETE'
    }),

  setDefaultAddress: (id: number) =>
    request<{ message: string; addresses: Address[] }>(`/account/addresses/${id}/default`, {
      method: 'POST'
    }),

  getWishlist: () =>
    request<{ products: Product[] }>('/account/wishlist'),

  getWishlistIds: () =>
    request<{ product_ids: number[] }>('/account/wishlist/ids'),

  toggleWishlist: (productId: number) =>
    request<{ liked: boolean; message: string }>(`/account/wishlist/${productId}/toggle`, {
      method: 'POST'
    }),

  // Demo controller
  switchBuyer: () =>
    request<{ message: string; token: string; user: User }>('/demo/switch-buyer', { method: 'POST' }),

  switchSeller: () =>
    request<{ message: string; token: string; user: User }>('/demo/switch-seller', { method: 'POST' }),

  resetDemo: () =>
    request<{ message: string }>('/demo/reset', { method: 'POST' }),

  // Seller operations & Bulk
  getSellerStats: () =>
    request<{ stats: SellerStats }>('/seller/stats'),

  getSellerOrders: (status?: string) => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return request<{ orders: Order[] }>(`/seller/orders${query}`);
  },

  getSellerOrder: (id: number) =>
    request<{ order: Order }>(`/seller/orders/${id}`),

  updateOrderStatus: (id: number, target_status: string, note?: string, cancel_reason?: string) =>
    request<{ message: string; order: Order }>(`/seller/orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ target_status, note, cancel_reason })
    }),

  bulkConfirmOrders: (orderIds: number[]) =>
    request<{ message: string; confirmed_count: number }>('/seller/orders/bulk-confirm', {
      method: 'POST',
      body: JSON.stringify({ order_ids: orderIds })
    }),

  bulkHandoverOrders: (orderIds: number[], carrier: string) =>
    request<{ message: string; handover_count: number }>('/seller/orders/bulk-handover', {
      method: 'POST',
      body: JSON.stringify({ order_ids: orderIds, carrier })
    }),

  assignCarrier: (id: number, carrier: string) =>
    request<{ message: string; order: Order; carrier: string; tracking_code: string }>(`/seller/orders/${id}/carrier`, {
      method: 'POST',
      body: JSON.stringify({ carrier })
    }),

  addShipmentEvent: (id: number, eventData: { status: string; location: string; note: string }) =>
    request<{ message: string; shipment_events: any[]; order: Order }>(`/seller/orders/${id}/shipment-events`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    }),

  handoverOrder: (id: number, handoverData: { carrier: string; location?: string; note?: string }) =>
    request<{ message: string; order: Order; shipment_events: any[] }>(`/seller/orders/${id}/handover`, {
      method: 'POST',
      body: JSON.stringify(handoverData)
    }),

  // Notifications
  getNotifications: () =>
    request<{ notifications: any[]; unread_count: number }>('/notifications'),

  markNotificationRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT'
    }),

  markAllNotificationsRead: () =>
    request<{ message: string }>('/notifications/read-all', {
      method: 'PUT'
    })
};
