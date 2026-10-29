export type UserRole = 'buyer' | 'seller';

export interface Shop {
  id: any;
  owner_user_id: any;
  name: string;
  slug: string;
  avatar?: string;
  cover_image?: string;
  cover_color: string;
  description: string;
  pickup_address: string;
  phone: string;
  created_at: string;
  follower_ids: any[];
  follower_count?: number;
  rating_avg?: number;
  review_count?: number;
  response_rate?: number;
  joined_text?: string;
  product_count?: number;
}

export interface User {
  id: any;
  uid: string;
  role: UserRole;
  username: string;
  phone?: string;
  full_name: string;
  shop_id?: any;
  shop_name?: string;
  avatar_url?: string;
  is_owner?: boolean;
  created_at?: string;
}

export interface Address {
  id: any;
  user_id: any;
  recipient_name: string;
  phone: string;
  address_line: string;
  is_default: number | boolean;
}

export interface ProductFlaw {
  id?: any;
  description: string;
  photo_url?: string;
  image_url?: string;
  location?: string;
}

export interface Product {
  id: any;
  shop_id: any;
  seller_id?: any;
  shop_name?: string;
  shop_slug?: string;
  name: string;
  category: string;
  price: number;
  original_price: number;
  condition_pct: number;
  condition_detail: string;
  stock: number;
  image_url: string;
  images?: string[];
  flaws?: ProductFlaw[];
  description?: string;
  inspection_date?: string;
  inspector_name?: string;
  inspection_checklist?: string[];
  in_cart_count?: number;
  views_today?: number;
  view_count?: number;
  similar_products?: Product[];
  rating_avg?: number;
  review_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: any;
  shop_id?: any;
  order_id: any;
  product_id: any;
  product_name?: string;
  product_image?: string;
  product_condition_pct?: number;
  user_id?: any;
  user_name?: string;
  buyer_name?: string;
  rating: number;
  comment: string;
  tags?: string[];
  images?: string[];
  video_url?: string | null;
  video_duration?: number | null;
  video_poster?: string | null;
  is_anonymous?: boolean;
  author_name?: string;
  author_phone?: string;
  order_code?: string;
  helpful_count?: number;
  helpful_user_ids?: any[];
  is_helpful_by_me?: boolean;
  seller_reply?: string | null;
  seller_reply_at?: string | null;
  is_hidden?: boolean;
  is_hidden_notice?: string | null;
  report_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  edit_count?: number;
  can_edit?: boolean;
}

export interface ReviewsResponse {
  reviews: Review[];
  total_reviews: number;
  average_rating: number;
  distribution: Record<number, number>;
  media_count?: number;
  recent_reviews?: Review[];
}

export interface Coupon {
  id: any;
  shop_id: any;
  seller_id?: any;
  shop_name?: string;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  max_discount?: number;
  min_order_amount: number;
  is_active: number | boolean;
  usage_count: number;
  created_at?: string;
  description?: string;
}

export interface CartItem {
  id: any;
  shop_id?: any;
  shop_name?: string;
  shop_slug?: string;
  product_id?: any;
  product_name?: string;
  product_image?: string;
  quantity: number;
  name: string;
  category?: string;
  price: number;
  original_price: number;
  original_item_price?: number;
  condition_pct: number;
  condition_detail: string;
  stock: number;
  image_url: string;
  is_negotiated?: boolean | number;
  negotiated_price?: number;
  offer_id?: any;
  is_sold_out?: boolean;
  user_id?: any;
  product?: Product;
  effective_price?: number;
  created_at?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
export type PaymentMethod = 'card' | 'napas' | 'cod';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'pending';

export interface OrderItem {
  id: any;
  order_id: any;
  product_id: any;
  product_name: string;
  product_image?: string;
  category?: string;
  price: number;
  original_price?: number;
  quantity: number;
  condition_pct: number;
  image_url: string;
  is_negotiated?: boolean | number;
  negotiated_price?: number;
  offer_id?: any;
}

export interface ShipmentEvent {
  id: any;
  order_id: any;
  status?: string;
  event?: string;
  label?: string;
  location: string;
  note: string;
  created_at: string;
}

export interface OrderStatusLog {
  id: any;
  order_id: any;
  from_status?: string;
  to_status?: string;
  status?: string;
  actor_role: string;
  actor_name: string;
  note?: string;
  created_at: string;
}

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'shipping_back' | 'received' | 'refunded';

export interface ReturnRequest {
  id: any;
  shop_id: any;
  shop_name?: string;
  order_id: any;
  order_code?: string;
  buyer_id: any;
  buyer_name?: string;
  buyer_phone?: string;
  product_id: any;
  product_name?: string;
  product_image?: string;
  reason: string;
  description: string;
  images?: string[] | string;
  status: ReturnStatus;
  seller_note?: string;
  refund_amount: number;
  refund_method: string;
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: any;
  shop_id: any;
  shop_name?: string;
  shop_slug?: string;
  code: string;
  buyer_id: any;
  user_id?: any;
  seller_id?: any;
  buyer_name?: string;
  buyer_phone?: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount?: number;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  card_last4?: string;
  card_type?: string;
  card_brand?: string;
  card_category?: 'intl' | 'domestic';
  recipient_name: string;
  phone: string;
  address: string;
  note?: string;
  carrier?: string;
  tracking_code?: string;
  cancel_reason?: string;
  coupon_code?: string;
  current_location?: string;
  shipper_name?: string;
  shipper_phone?: string;
  completed_at?: string;
  items_count?: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  shipment_events?: ShipmentEvent[];
  status_logs?: OrderStatusLog[];
  return_request?: ReturnRequest | null;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';

export interface Offer {
  id: any;
  shop_id: any;
  shop_name?: string;
  buyer_id: any;
  user_id?: any;
  seller_id?: any;
  buyer_name?: string;
  buyer_phone?: string;
  product_id: any;
  product_name?: string;
  product_image?: string;
  product_stock?: number;
  product_category?: string;
  original_price: number;
  offered_price: number;
  price?: number;
  counter_price?: number;
  message?: string;
  seller_note?: string;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessageContext {
  type?: 'product' | 'order' | string;
  kind?: string;
  id?: any;
  ref_id?: any;
  product_id?: any;
  order_code?: string;
  title: string;
  subtitle?: string;
  image?: string;
  image_url?: string;
  price?: number;
  status?: string;
  status_text?: string;
  code?: string;
}

export interface ChatMessage {
  id: any;
  conversation_id: any;
  sender_role: 'buyer' | 'seller';
  sender_id: any;
  content?: string;
  message?: string;
  type?: 'text' | 'context';
  context_type?: string;
  context_id?: any;
  is_read?: number | boolean;
  context_card?: ChatMessageContext | null;
  created_at: string;
  read_at?: string | null;
}

export interface CheckoutShopBreakdown {
  shop_id: any;
  shop_name: string;
  shop_slug: string;
  items: CartItem[];
  subtotal: number;
  shipping_fee: number;
  coupon_code?: string;
  discount_amount: number;
  total: number;
  applied_coupon?: Coupon | null;
}

export interface CheckoutCalculation {
  shops: CheckoutShopBreakdown[];
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  grand_total: number;
}

export interface ChatConversation {
  id: any;
  shop_id: any;
  buyer_id: any;
  seller_id?: any;
  shop_name?: string;
  shop_slug?: string;
  shop_avatar?: string;
  buyer_name?: string;
  buyer_phone?: string;
  product_id?: any;
  product_name?: string;
  product_image?: string;
  product_price?: number;
  product_condition_pct?: number;
  order_id?: any;
  order_code?: string;
  order_status?: string;
  order_total?: number;
  last_message?: string;
  last_message_at?: string;
  buyer_unread?: number;
  seller_unread?: number;
  unread_count?: number;
  created_at: string;
  messages?: ChatMessage[];
}

export interface SellerStats {
  total_orders: number;
  status_counts: Record<OrderStatus, number>;
  total_revenue: number;
  low_stock_count: number;
  recent_orders: Order[];
  orders_pending?: number;
  orders_confirmed?: number;
  orders_shipping?: number;
  orders_completed?: number;
  orders_cancelled?: number;
  total_products?: number;
  rating_avg?: number;
  total_reviews?: number;
}

export interface AppNotification {
  id: any;
  user_id: any;
  role?: string;
  order_id?: any;
  type?: string;
  title: string;
  message: string;
  is_read: number | boolean;
  created_at: string;
}

export type NotificationItem = AppNotification;
