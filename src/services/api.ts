import { db, getCurrentSession, setCurrentSession, clearCurrentSession } from './db';
import { Product, CartItem, Order, User, SellerStats, Address, ReturnRequest, Review, NotificationItem, Offer, ChatConversation, ChatMessage, Coupon } from '../types';

export function getStoredToken(): string | null {
  const session = getCurrentSession();
  return session ? session.token : null;
}

export function setStoredToken(token: string): void {
  // Session is maintained in sessionStorage via db.ts
}

export function clearStoredToken(): void {
  clearCurrentSession();
}

export const api = {
  // --- AUTH ---
  login: (credentials: { username: string; password: string; role: 'buyer' | 'seller' }) =>
    db.login(credentials),

  register: (payload: { username?: string; phone?: string; password: string; full_name: string; role: 'buyer' | 'seller'; address?: string; shop_name?: string }) =>
    db.register(payload),

  getMe: () =>
    db.getMe(),

  changePassword: (data: { old_password?: string; new_password?: string; confirm_password?: string }) =>
    db.changePassword(data),

  // --- PRODUCTS ---
  getProducts: (params?: { category?: string; search?: string; sort?: string; min_price?: number; max_price?: number; min_condition?: number; in_stock?: boolean }) =>
    db.getProducts(params),

  getAutocomplete: (q: string) =>
    db.getAutocomplete(q),

  getProduct: (id: number) =>
    db.getProduct(id),

  createProduct: (productData: Partial<Product>) =>
    db.createProduct(productData),

  updateProduct: (id: number, productData: Partial<Product>) =>
    db.updateProduct(id, productData),

  deleteProduct: (id: number) =>
    db.deleteProduct(id),

  recordProductView: (productId: number) =>
    db.recordProductView(productId),

  // --- CART ---
  getCart: () =>
    db.getCart(),

  addToCart: (productId: number, quantity: number = 1, offerId?: number) =>
    db.addToCart(productId, quantity),

  updateCartQty: (cartId: number, quantity: number) =>
    db.updateCartQty(cartId, quantity),

  removeFromCart: (cartId: number) =>
    db.removeFromCart(cartId),

  clearCart: () =>
    db.clearCart(),

  // --- SHOPS (MULTI-SHOP MARKETPLACE) ---
  getShops: () =>
    db.getShops(),

  getShopBySlug: (slug: string) =>
    db.getShopBySlug(slug),

  getShopById: (id: number) =>
    db.getShopById(id),

  getShopByOwnerUserId: (userId: number) =>
    db.getShopByOwnerUserId(userId),

  createShop: (payload: { name: string; slug?: string; description?: string; avatar?: string; cover_color?: string; cover_image?: string; pickup_address?: string; phone?: string }) =>
    db.createShop(payload),

  updateShop: (shopId: number, payload: Partial<any>) =>
    db.updateShop(shopId, payload),

  toggleFollowShop: (shopId: number) =>
    db.toggleFollowShop(shopId),

  getFollowedShops: () =>
    db.getFollowedShops(),

  saveShopVoucher: (code: string, shopId: number) =>
    db.saveShopVoucher(code, shopId),

  getSavedShopVouchers: (shopId?: number) =>
    db.getSavedShopVouchers(shopId),

  listProductsByShop: (shopId: number) =>
    db.listProductsByShop(shopId),

  listCouponsByShop: (shopId: number) =>
    db.listCouponsByShop(shopId),

  searchShops: (q: string) =>
    db.searchShops(q),

  // --- ORDERS (BUYER) ---
  getOrders: (status?: string) =>
    db.getMyOrders(status),

  getOrder: (id: number | string) =>
    db.getOrder(id),

  checkout: async (orderData: {
    recipient_name: string;
    phone: string;
    address: string;
    note?: string;
    payment_method: 'card' | 'napas' | 'cod';
    card_last4?: string;
    card_type?: string;
    direct_items?: Array<{ product_id: number; quantity: number; offer_id?: number }>;
    coupon_code?: string;
    shop_coupons?: Record<number, string>;
  }) => {
    let items = orderData.direct_items;
    if (!items || items.length === 0) {
      const cart = await db.getCart();
      items = cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
    }
    return db.createOrder({
      items,
      recipient_name: orderData.recipient_name,
      phone: orderData.phone,
      address: orderData.address,
      note: orderData.note,
      payment_method: orderData.payment_method === 'cod' ? 'cod' : 'card',
      card_info: {
        number: '****' + (orderData.card_last4 || '1111'),
        expiry: '',
        cvv: '',
        card_type: orderData.card_type
      },
      coupon_code: orderData.coupon_code,
      shop_coupons: orderData.shop_coupons
    });
  },

  cancelOrder: (id: number, reason: string) =>
    db.cancelOrder(id, reason),

  completeOrder: (id: number) =>
    db.confirmOrderReceived(id),

  // --- REVIEWS ---
  getProductReviews: (productId: number) =>
    db.getProductReviews(productId),

  getShopReviews: () =>
    db.getShopReviews(),

  getSellerReviews: () =>
    db.getSellerReviews(),

  getOrderReviewedItems: (orderId: number) =>
    db.getOrderReviewedItems(orderId),

  submitReview: (payload: {
    order_id: number;
    product_id: number;
    rating: number;
    comment: string;
    tags?: string[];
    images?: string[];
    video_url?: string | null;
    video_duration?: number | null;
    video_poster?: string | null;
    is_anonymous?: boolean;
  }) =>
    db.submitReview(payload as any),

  updateReview: (id: number, payload: any) =>
    db.updateReview(id, payload),

  toggleHelpfulReview: (id: number) =>
    db.toggleHelpfulReview(id),

  replyReview: (id: number, reply: string) =>
    db.replyReview(id, reply),

  reportReview: (id: number, reason: string) =>
    db.reportReview(id, reason),

  // --- UPLOAD ---
  uploadFile: (dataUrl: string, type: 'image' | 'video' = 'image') =>
    db.uploadFile(dataUrl, type),

  // --- COUPONS ---
  validateCoupon: (code: string, subtotal: number, shipping_fee?: number) =>
    db.validateCoupon(code, subtotal),

  getPublicCoupons: () =>
    db.getPublicCoupons(),

  getSellerCoupons: () =>
    db.getSellerCoupons(),

  createSellerCoupon: (couponData: any) =>
    db.createCoupon(couponData),

  toggleSellerCoupon: (id: number) =>
    db.toggleCoupon(id),

  deleteSellerCoupon: (id: number) =>
    db.deleteCoupon(id),

  // --- ACCOUNT & PROFILE & WISHLIST ---
  getProfile: () =>
    db.getMe(),

  updateProfile: (data: { full_name: string; phone?: string }) =>
    db.updateProfile(data),

  getAddresses: () =>
    db.getAddresses(),

  addAddress: (data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }) =>
    db.addAddress(data),

  updateAddress: (id: number, data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }) =>
    db.updateAddress(id, data),

  deleteAddress: (id: number) =>
    db.deleteAddress(id),

  setDefaultAddress: (id: number) =>
    db.setDefaultAddress(id),

  getWishlist: () =>
    db.getWishlist(),

  getWishlistIds: () =>
    db.getWishlistIds(),

  toggleWishlist: (productId: number) =>
    db.toggleWishlist(productId),

  // --- DEMO CONTROLLER ---
  switchBuyer: () =>
    db.switchBuyer(),

  switchSeller: (username?: string) =>
    db.switchSeller(username),

  resetDemo: () =>
    db.resetDemo(),

  getPresentationMode: () =>
    db.getPresentationMode(),

  setPresentationMode: (enabled: boolean) =>
    db.setPresentationMode(enabled),

  // --- SELLER OPERATIONS & KANBAN ---
  getSellerStats: () =>
    db.getSellerStats(),

  getSellerOrders: (status?: string) =>
    db.getSellerOrders(status),

  getSellerOrder: (id: number) =>
    db.getOrder(id),

  updateOrderStatus: (id: number, target_status: string, note?: string, cancel_reason?: string) =>
    db.updateOrderStatus(id, target_status, note, cancel_reason),

  bulkConfirmOrders: (orderIds: number[]) =>
    db.bulkConfirmOrders(orderIds),

  bulkHandoverOrders: (orderIds: number[], carrier: string) =>
    db.bulkHandoverOrders(orderIds, carrier),

  assignCarrier: (id: number, carrier: string) =>
    db.assignCarrier(id, carrier),

  addShipmentEvent: (id: number, eventData: { status: string; location: string; note: string }) =>
    db.addShipmentEvent(id, eventData),

  handoverOrder: (id: number, handoverData: { carrier: string; location?: string; note?: string }) =>
    db.handoverOrder(id, handoverData),

  // --- NOTIFICATIONS ---
  getNotifications: () =>
    db.getNotifications(),

  markNotificationRead: (id: number) =>
    db.markNotificationRead(id),

  markAllNotificationsRead: () =>
    db.markAllNotificationsRead(),

  // --- OFFERS / TRẢ GIÁ ---
  getOffers: () =>
    db.getOffers(),

  getSellerOffers: () =>
    db.getSellerOffers(),

  createOffer: (payload: { product_id: number; offered_price: number; message?: string }) =>
    db.createOffer({ productId: payload.product_id, offeredPrice: payload.offered_price, message: payload.message }),

  acceptOffer: (id: number) =>
    db.acceptOffer(id),

  counterOffer: (id: number, counter_price: number, seller_note?: string) =>
    db.counterOffer(id, counter_price, seller_note),

  rejectOffer: (id: number, seller_note?: string) =>
    db.rejectOffer(id, seller_note),

  buyerAcceptCounter: (id: number) =>
    db.acceptCounterOffer(id),

  buyerRejectCounter: (id: number) =>
    db.rejectCounterOffer(id),

  // --- CHAT (MULTI-SHOP SHOPEE STYLE) ---
  getChatConversations: () =>
    db.getChatConversations(),

  startShopChat: (
    shopId: number,
    context?: {
      type: 'product' | 'order';
      product_id?: number;
      order_code?: string;
      initial_message?: string;
    }
  ) => db.startShopChat(shopId, context),

  startChat: async (payload: { shop_id?: number; product_id?: number; order_id?: number | string; initial_message?: string }) => {
    let targetShopId = payload.shop_id;
    if (!targetShopId && payload.product_id) {
      const prodRes = await db.getProduct(payload.product_id);
      targetShopId = prodRes.product.shop_id;
    }
    if (!targetShopId && payload.order_id) {
      const ordRes = await db.getOrder(payload.order_id);
      targetShopId = ordRes.order.shop_id;
    }

    if (!targetShopId) targetShopId = 1;

    const res = await db.startShopChat(targetShopId, {
      type: payload.product_id ? 'product' : (payload.order_id ? 'order' : 'product'),
      product_id: payload.product_id,
      order_code: payload.order_id ? String(payload.order_id) : undefined,
      initial_message: payload.initial_message
    });

    return {
      conversation: res.conversation,
      messages: res.conversation.messages || [],
      is_new: res.created
    };
  },

  getChatDetail: (id: number) =>
    db.getChatDetail(id),

  sendChatMessage: (idOrPayload: number | { conversation_id?: number; shop_id?: number; content: string; context_card?: any }, content?: string) => {
    if (typeof idOrPayload === 'number') {
      return db.sendChatMessage({ conversation_id: idOrPayload, content: content || '' });
    }
    return db.sendChatMessage(idOrPayload);
  },

  markChatRead: (id: number) =>
    db.markChatRead(id),

  // --- RETURNS & REFUNDS ---
  getMyReturns: () =>
    db.getMyReturns(),

  getSellerReturns: () =>
    db.getSellerReturns(),

  createReturn: (payload: { order_id: number; product_id?: number; reason: string; description: string; images?: string[] }) =>
    db.requestReturn({
      order_id: payload.order_id,
      reason: payload.reason,
      description: payload.description,
      images: payload.images,
      refund_method: 'Chuyển khoản ngân hàng / Ví điện tử'
    }),

  updateReturnStatus: (id: number, payload: { status: string; seller_note?: string }) =>
    db.updateReturnStatus(id, payload),

  // --- SHIPMENT FAST FORWARD ---
  getEligibleShipmentOrders: () =>
    db.getEligibleShipmentOrders(),

  advanceShipmentStep: (order_id: number, step?: number) =>
    db.advanceShipmentStep(order_id, step || 1)
};
