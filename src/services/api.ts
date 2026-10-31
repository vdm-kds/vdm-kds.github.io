import { db, getCurrentSession, setCurrentSession, clearCurrentSession, createVintageProductSvg, isLegacyOrEmptyImage, createShopAvatarSvg } from './db';
import { Product, CartItem, Order, User, SellerStats, Address, ReturnRequest, Review, NotificationItem, Offer, ChatConversation, ChatMessage, Coupon, CheckoutCalculation, CheckoutShopBreakdown } from '../types';

export { createVintageProductSvg, isLegacyOrEmptyImage, createShopAvatarSvg };

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

  getProduct: (id: number | string) =>
    db.getProduct(id),

  createProduct: (productData: Partial<Product>) =>
    db.createProduct(productData),

  updateProduct: (id: number | string, productData: Partial<Product>) =>
    db.updateProduct(id, productData),

  deleteProduct: (id: number | string) =>
    db.deleteProduct(id),

  recordProductView: (productId: number | string) =>
    db.recordProductView(productId),

  // --- CART ---
  getCart: () =>
    db.getCart(),

  addToCart: (productId: number | string, quantity: number = 1, offerId?: number | string) =>
    db.addToCart(productId, quantity, offerId as any),

  updateCartQty: (cartId: number | string, quantity: number) =>
    db.updateCartQty(cartId, quantity),

  removeFromCart: (cartId: number | string) =>
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

  toggleFollowShop: (shopId: number | string) =>
    db.toggleFollowShop(shopId),

  getFollowedShops: () =>
    db.getFollowedShops(),

  saveShopVoucher: (code: string, shopId: number | string) =>
    db.saveShopVoucher(code, shopId),

  getSavedShopVouchers: (shopId?: number | string) =>
    db.getSavedShopVouchers(shopId),

  listProductsByShop: (shopId: number | string) =>
    db.listProductsByShop(shopId),

  listCouponsByShop: (shopId: number | string) =>
    db.listCouponsByShop(shopId),

  searchShops: (q: string) =>
    db.searchShops(q),

  // --- ORDERS (BUYER) ---
  getOrders: (status?: string) =>
    db.getMyOrders(status),

  getMyOrders: (status?: string) =>
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
    direct_items?: Array<{ product_id: number | string; quantity: number; offer_id?: number | string }>;
    coupon_code?: string;
    shop_coupons?: Record<number | string, string>;
  }) => {
    let items = orderData.direct_items;
    if (!items || items.length === 0) {
      const cart = await db.getCart();
      items = cart.items.map((i) => ({ product_id: (i.product_id || i.id) as any, quantity: i.quantity, offer_id: i.offer_id as any }));
    }
    const res = await db.createOrder({
      items: (items || []) as any,
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
      shop_coupons: orderData.shop_coupons as any
    });
    return {
      order: res.orders[0],
      orders: res.orders,
      message: res.message
    };
  },

  cancelOrder: (id: number | string, reason: string) =>
    db.cancelOrder(id, reason),

  completeOrder: async (id: number | string) => {
    const res = await db.confirmOrderReceived(id);
    const orderRes = await db.getOrder(id).catch(() => null);
    return { message: res.message, order: orderRes?.order };
  },

  // --- REVIEWS ---
  getProductReviews: async (productId: number | string) => {
    const res = await db.getProductReviews(productId);
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of res.reviews || []) {
      if (dist[r.rating] !== undefined) dist[r.rating]++;
    }
    return {
      reviews: res.reviews,
      total_reviews: res.total,
      average_rating: res.avg,
      distribution: dist
    };
  },

  getShopReviews: () =>
    db.getShopReviews(),

  getPublicShopReviews: (shopSlugOrId: number | string) =>
    db.getPublicShopReviews(shopSlugOrId),

  getSellerReviews: async () => {
    const res = await db.getSellerReviews();
    return {
      ...res,
      total_reviews: res.total,
      average_rating: res.avg
    };
  },

  getOrderReviewedItems: async (orderId: number | string) => {
    const res = await db.getOrderReviewedItems(orderId);
    return { reviewed_product_ids: res.reviewed_product_ids, reviews: [] as Review[] };
  },

  submitReview: (payload: {
    order_id: number | string;
    product_id: number | string;
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

  updateReview: (id: number | string, payload: any) =>
    db.updateReview(id, payload),

  toggleHelpfulReview: async (id: number | string) => {
    const res = await db.toggleHelpfulReview(id);
    return { helpful_count: res.helpful_count, is_helpful: true };
  },

  replyReview: (id: number | string, reply: string) =>
    db.replyReview(id, reply),

  reportReview: (id: number | string, reason: string) =>
    db.reportReview(id, reason),

  // --- UPLOAD ---
  uploadFile: (dataUrl: string, type: 'image' | 'video' = 'image') =>
    db.uploadFile(dataUrl, type),

  // --- COUPONS ---
  calculateCheckout: (cartOrItems: any, couponsByShop?: Record<any, string>): CheckoutCalculation => {
    const rawItems: CartItem[] = Array.isArray(cartOrItems) ? cartOrItems : (cartOrItems?.items || []);
    const shopMap = new Map<string, CartItem[]>();
    for (const it of rawItems) {
      const sId = String(it.shop_id || it.product?.shop_id || it.product?.shop_slug || '1');
      if (!shopMap.has(sId)) shopMap.set(sId, []);
      shopMap.get(sId)!.push(it);
    }

    const shops: CheckoutShopBreakdown[] = [];
    let grandSubtotal = 0;
    let grandShipping = 0;
    let grandDiscount = 0;

    for (const [sId, sItems] of shopMap.entries()) {
      let subtotal = 0;
      const shopName = sItems[0]?.shop_name || sItems[0]?.product?.shop_name || 'Đồ Cũ Còn Thương';
      const shopSlug = sItems[0]?.shop_slug || sItems[0]?.product?.shop_slug || sId;

      for (const i of sItems) {
        const p = i.effective_price ?? i.negotiated_price ?? i.price ?? i.product?.price ?? 0;
        subtotal += p * (i.quantity || 1);
      }

      const shippingFee = subtotal >= 1000000 || subtotal === 0 ? 0 : 30000;
      const couponCode = couponsByShop ? (couponsByShop[sId] || (couponsByShop as any)[Number(sId)]) : undefined;
      let discountAmount = 0;

      if (couponCode) {
        const upper = String(couponCode).toUpperCase().trim();
        if (upper === 'FREESHIP' || upper === 'FREESHIP30') {
          discountAmount = Math.min(shippingFee, 30000);
        } else if (upper === 'RETRO10' || upper === 'GIAM10') {
          discountAmount = Math.min(Math.round(subtotal * 0.1), 100000);
        } else if (upper === 'WELCOME50' || upper === 'GIAM50K') {
          discountAmount = Math.min(50000, subtotal);
        } else if (upper === 'SACH20') {
          discountAmount = Math.min(Math.round(subtotal * 0.2), 50000);
        }
      }

      const total = Math.max(0, subtotal + shippingFee - discountAmount);
      grandSubtotal += subtotal;
      grandShipping += shippingFee;
      grandDiscount += discountAmount;

      shops.push({
        shop_id: sId,
        shop_name: shopName,
        shop_slug: shopSlug,
        items: sItems,
        subtotal,
        shipping_fee: shippingFee,
        coupon_code: couponCode,
        discount_amount: discountAmount,
        total,
        applied_coupon: couponCode ? {
          id: couponCode,
          shop_id: sId,
          code: couponCode,
          type: 'fixed',
          value: discountAmount,
          min_order_amount: 0,
          is_active: true,
          usage_count: 0
        } as any : null
      });
    }

    return {
      shops,
      subtotal: grandSubtotal,
      shipping_fee: grandShipping,
      discount_amount: grandDiscount,
      grand_total: Math.max(0, grandSubtotal + grandShipping - grandDiscount)
    };
  },

  validateCoupon: (code: string, subtotal: number, shipping_fee?: number, shop_id?: number) =>
    db.validateCoupon(code, subtotal, shipping_fee, shop_id),

  getPublicCoupons: () =>
    db.getPublicCoupons(),

  getSellerCoupons: () =>
    db.getSellerCoupons(),

  createSellerCoupon: (couponData: any) =>
    db.createCoupon(couponData),

  toggleSellerCoupon: (id: number | string) =>
    db.toggleCoupon(id),

  deleteSellerCoupon: (id: number | string) =>
    db.deleteCoupon(id),

  // --- ACCOUNT & PROFILE & WISHLIST ---
  getProfile: () =>
    db.getMe(),

  updateProfile: (data: { full_name: string; phone?: string }) =>
    db.updateProfile(data),

  getAddresses: () =>
    db.getAddresses(),

  addAddress: async (data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }) => {
    const res = await db.addAddress(data);
    const all = await db.getAddresses();
    return { address: res.address, addresses: all.addresses };
  },

  updateAddress: async (id: number | string, data: { recipient_name: string; phone: string; address_line: string; is_default?: boolean }) => {
    const res = await db.updateAddress(Number(id) as any, data);
    const all = await db.getAddresses();
    return { address: res.address, addresses: all.addresses };
  },

  deleteAddress: async (id: number | string) => {
    const res = await db.deleteAddress(Number(id) as any);
    const all = await db.getAddresses();
    return { message: res.message, addresses: all.addresses };
  },

  setDefaultAddress: async (id: number | string) => {
    const res = await db.setDefaultAddress(Number(id) as any);
    const all = await db.getAddresses();
    return { message: res.message, addresses: all.addresses };
  },

  getWishlist: () =>
    db.getWishlist(),

  getWishlistIds: () =>
    db.getWishlistIds(),

  toggleWishlist: (productId: number | string) =>
    db.toggleWishlist(productId),

  // --- DEMO CONTROLLER ---
  switchRole: (targetUserId: number | string) =>
    db.switchRole(targetUserId),

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

  getSellerOrder: (id: number | string) =>
    db.getOrder(id),

  updateOrderStatus: (id: number | string, target_status: string, note?: string, cancel_reason?: string) =>
    db.updateOrderStatus(id, target_status, note, cancel_reason),

  bulkConfirmOrders: (orderIds: (number | string)[]) =>
    db.bulkConfirmOrders(orderIds),

  bulkHandoverOrders: (orderIds: (number | string)[], carrier: string) =>
    db.bulkHandoverOrders(orderIds, carrier),

  assignCarrier: (id: number | string, carrier: string) =>
    db.assignCarrier(id, carrier),

  addShipmentEvent: (id: number | string, eventData: { status: string; location: string; note: string }) =>
    db.addShipmentEvent(id, eventData),

  handoverOrder: (id: number | string, handoverData: { carrier: string; location?: string; note?: string }) =>
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

  createOffer: (payload: { product_id?: number | string; productId?: number | string; offered_price?: number; offeredPrice?: number; price?: number; message?: string }) =>
    db.createOffer({
      productId: String(payload.productId ?? payload.product_id),
      offeredPrice: Number(payload.offeredPrice ?? payload.offered_price ?? (payload as any).price),
      message: payload.message
    }),

  acceptOffer: (id: number | string) =>
    db.acceptOffer(id),

  counterOffer: (id: number | string, counter_price: number, seller_note?: string) =>
    db.counterOffer(id, counter_price, seller_note),

  rejectOffer: (id: number | string, seller_note?: string) =>
    db.rejectOffer(id, seller_note),

  buyerAcceptCounter: (id: number | string) =>
    db.acceptCounterOffer(id),

  buyerRejectCounter: (id: number | string) =>
    db.rejectCounterOffer(id),

  cancelOffer: (id: number | string) =>
    db.cancelOffer(id),

  getMyOfferForProduct: (productId: number | string) =>
    db.getMyOfferForProduct(productId),

  // --- CHAT (MULTI-SHOP SHOPEE STYLE) ---
  getChatConversations: () =>
    db.getChatConversations(),

  startShopChat: (
    shopId: number | string,
    context?: {
      type: 'product' | 'order';
      product_id?: number | string;
      order_code?: string;
      initial_message?: string;
    }
  ) => db.startShopChat(shopId, context),

  startChat: async (payload: { shop_id?: number | string; product_id?: number | string; order_id?: number | string; initial_message?: string }) => {
    let targetShopId: number | string | undefined = payload.shop_id;
    if (!targetShopId && payload.product_id) {
      const prodRes = await db.getProduct(payload.product_id);
      targetShopId = prodRes.product.shop_id;
    }
    if (!targetShopId && payload.order_id) {
      const ordRes = await db.getOrder(payload.order_id);
      targetShopId = ordRes.order.shop_id;
    }

    if (!targetShopId) targetShopId = 'do-cu-con-thuong';

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

  getChatDetail: (id: number | string) =>
    db.getChatDetail(id),

  sendChatMessage: (idOrPayload: number | string | { conversation_id?: number | string; shop_id?: number | string; content: string; context_card?: any }, content?: string) => {
    if (typeof idOrPayload === 'number' || typeof idOrPayload === 'string') {
      return db.sendChatMessage({ conversation_id: idOrPayload, content: content || '' });
    }
    return db.sendChatMessage(idOrPayload);
  },

  markChatRead: (id: number | string) =>
    db.markChatRead(id),

  // --- RETURNS & REFUNDS ---
  getMyReturns: () =>
    db.getMyReturns(),

  getSellerReturns: () =>
    db.getSellerReturns(),

  createReturn: async (payload: { order_id: number | string; product_id?: number | string; reason: string; description: string; images?: string[] }) => {
    const res = await db.requestReturn({
      order_id: payload.order_id,
      reason: payload.reason,
      description: payload.description,
      images: payload.images,
      refund_method: 'Chuyển khoản ngân hàng / Ví điện tử'
    });
    return {
      message: res.message,
      return_request: {
        id: `ret_${Date.now()}`,
        shop_id: 1,
        order_id: payload.order_id,
        buyer_id: 1,
        product_id: payload.product_id || 1,
        reason: payload.reason,
        description: payload.description,
        status: 'pending',
        refund_amount: 0,
        refund_method: 'Ngân hàng',
        created_at: new Date().toISOString()
      } as ReturnRequest
    };
  },

  updateReturnStatus: (id: number | string, payload: { status: string; seller_note?: string }) =>
    db.updateReturnStatus(id, payload),

  // --- SHIPMENT FAST FORWARD ---
  getEligibleShipmentOrders: () =>
    db.getEligibleShipmentOrders(),

  advanceShipmentStep: (order_id: number | string, step?: number) =>
    db.advanceShipmentStep(order_id, step || 1),

  // --- REAL-TIME ON-SNAPSHOT SUBSCRIPTIONS (Requirement 3) ---
  subscribeBuyerOrders: (cb: (orders: Order[]) => void) =>
    db.subscribeBuyerOrders(cb),

  subscribeSellerOrders: (cb: (orders: Order[]) => void) =>
    db.subscribeSellerOrders(cb),

  subscribeOrderDetail: (code: string | number, cb: (order: Order | null) => void) =>
    db.subscribeOrderDetail(code, cb),

  subscribeConversations: (cb: (conversations: ChatConversation[]) => void) =>
    db.subscribeConversations(cb),

  subscribeMessages: (conversationId: string, cb: (messages: ChatMessage[]) => void) =>
    db.subscribeMessages(conversationId, cb),

  subscribeNotifications: (cb: (notifications: NotificationItem[], unreadCount: number) => void) =>
    db.subscribeNotifications(cb),

  subscribeOffers: (cb: (offers: Offer[]) => void) =>
    db.subscribeOffers(cb),

  subscribeReturns: (cb: (returns: ReturnRequest[]) => void) =>
    db.subscribeReturns(cb),

  subscribeShop: (shopId: number | string, cb: (shop: any) => void) =>
    db.subscribeShop(shopId, cb),

  subscribePublicShopReviews: (
    shopSlugOrId: number | string,
    cb: (res: { reviews: Review[]; avg: number; total: number; distribution: Record<string, number> }) => void
  ) =>
    db.subscribePublicShopReviews(shopSlugOrId, cb),

  subscribeMyOfferForProduct: (productId: number | string, cb: (offer: Offer | null) => void) =>
    db.subscribeMyOfferForProduct(productId, cb)
};
