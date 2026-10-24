export type UserRole = 'buyer' | 'seller';

export interface User {
  id: number;
  role: UserRole;
  username: string;
  phone?: string;
  full_name: string;
  is_owner?: boolean;
  created_at?: string;
}

export interface Address {
  id: number;
  user_id: number;
  recipient_name: string;
  phone: string;
  address_line: string;
  is_default: number;
}

export interface ProductFlaw {
  id?: number | string;
  description: string;
  photo_url?: string;
  image_url?: string;
  location?: string;
}

export interface Product {
  id: number;
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
  inspection_date?: string;
  inspector_name?: string;
  inspection_checklist?: string[];
  in_cart_count?: number;
  views_today?: number;
  similar_products?: Product[];
  rating_avg?: number;
  review_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: number;
  order_id: number;
  product_id: number;
  product_name?: string;
  product_image?: string;
  product_condition_pct?: number;
  user_id?: number;
  rating: number;
  comment: string;
  tags?: string[];
  images?: string[];
  video_url?: string | null;
  video_duration?: number | null;
  video_poster?: string | null;
  is_anonymous?: boolean;
  author_name: string;
  author_phone?: string;
  order_code?: string;
  helpful_count?: number;
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
  id: number;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  max_discount?: number;
  min_order_amount: number;
  is_active: number;
  usage_count: number;
  created_at?: string;
  description?: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  category: string;
  price: number;
  original_price: number;
  original_item_price?: number;
  condition_pct: number;
  condition_detail: string;
  stock: number;
  image_url: string;
  is_negotiated?: boolean | number;
  negotiated_price?: number;
  offer_id?: number;
  is_sold_out?: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
export type PaymentMethod = 'card' | 'napas' | 'cod';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  category?: string;
  price: number;
  quantity: number;
  condition_pct: number;
  image_url: string;
  is_negotiated?: boolean | number;
  negotiated_price?: number;
  offer_id?: number;
}

export interface ShipmentEvent {
  id: number;
  order_id: number;
  status: string;
  location: string;
  note: string;
  created_at: string;
}

export interface OrderStatusLog {
  id: number;
  order_id: number;
  from_status?: string;
  to_status: string;
  actor_role: string;
  actor_name: string;
  note?: string;
  created_at: string;
}

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'shipping_back' | 'received' | 'refunded';

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_code?: string;
  buyer_id: number;
  buyer_name?: string;
  buyer_phone?: string;
  product_id: number;
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
  id: number;
  code: string;
  buyer_id: number;
  buyer_name?: string;
  buyer_phone?: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  card_last4?: string;
  card_type?: string;
  recipient_name: string;
  phone: string;
  address: string;
  note?: string;
  carrier?: string;
  tracking_code?: string;
  cancel_reason?: string;
  coupon_code?: string;
  discount_amount?: number;
  current_location?: string;
  shipper_name?: string;
  shipper_phone?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  shipment_events?: ShipmentEvent[];
  status_logs?: OrderStatusLog[];
  return_request?: ReturnRequest | null;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';

export interface Offer {
  id: number;
  buyer_id: number;
  buyer_name?: string;
  buyer_phone?: string;
  product_id: number;
  product_name?: string;
  product_image?: string;
  product_stock?: number;
  product_category?: string;
  original_price: number;
  offered_price: number;
  counter_price?: number;
  message?: string;
  seller_note?: string;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_role: 'buyer' | 'seller';
  sender_id: number;
  content: string;
  is_read: number;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  buyer_id: number;
  buyer_name?: string;
  buyer_phone?: string;
  product_id?: number;
  product_name?: string;
  product_image?: string;
  product_price?: number;
  product_condition_pct?: number;
  order_id?: number;
  order_code?: string;
  order_status?: string;
  order_total?: number;
  last_message?: string;
  last_message_at?: string;
  buyer_unread?: number;
  seller_unread?: number;
  created_at: string;
  messages?: ChatMessage[];
}

export interface SellerStats {
  total_orders: number;
  status_counts: Record<OrderStatus, number>;
  total_revenue: number;
  low_stock_count: number;
  recent_orders: Order[];
}

export interface AppNotification {
  id: number;
  user_id: number;
  order_id?: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}
