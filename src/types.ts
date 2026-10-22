export type UserRole = 'buyer' | 'seller';

export interface User {
  id: number;
  role: UserRole;
  username: string;
  phone?: string;
  full_name: string;
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
  rating_avg?: number;
  review_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: number;
  order_id: number;
  product_id: number;
  rating: number;
  comment: string;
  tags?: string[];
  author_name: string;
  created_at: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  total_reviews: number;
  average_rating: number;
  distribution: Record<number, number>;
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
  condition_pct: number;
  condition_detail: string;
  stock: number;
  image_url: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
export type PaymentMethod = 'card' | 'napas' | 'cod';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  condition_pct: number;
  image_url: string;
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
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  shipment_events?: ShipmentEvent[];
  status_logs?: OrderStatusLog[];
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

