import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, Clock, RefreshCw, XCircle, CheckCircle2, ChevronRight, 
  AlertCircle, ShieldCheck, X, Copy, Check, ArrowLeft, MapPin, Star 
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { formatVND, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { ReviewModal } from './ReviewModal';

interface OrdersViewProps {
  onBackToShop: () => void;
  selectedOrderCode?: string | null;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onBackToShop,
  selectedOrderCode
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Review modal state
  const [reviewModalProduct, setReviewModalProduct] = useState<{
    id: number;
    name: string;
    image_url: string;
    condition_pct: number;
  } | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Đổi ý không muốn mua nữa');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch reviewed items for currently selected order
  const fetchReviewedItems = async (orderId: number) => {
    try {
      const res = await api.getOrderReviewedItems(orderId);
      setReviewedProductIds(res.reviewed_product_ids || []);
    } catch {
      setReviewedProductIds([]);
    }
  };

  useEffect(() => {
    if (selectedOrder && selectedOrder.status === 'completed') {
      fetchReviewedItems(selectedOrder.id);
    } else {
      setReviewedProductIds([]);
    }
  }, [selectedOrder?.id, selectedOrder?.status]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await api.getOrders(activeTab);
      setOrders(data.orders);

      if (selectedOrder) {
        const refreshedCurrent = data.orders.find(o => o.id === selectedOrder.id);
        if (refreshedCurrent) {
          const detailRes = await api.getOrder(refreshedCurrent.id);
          setSelectedOrder(detailRes.order);
        }
      } else if (selectedOrderCode) {
        const found = data.orders.find(o => o.code === selectedOrderCode);
        if (found) {
          const detailRes = await api.getOrder(found.id);
          setSelectedOrder(detailRes.order);
        }
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Lỗi tải danh sách đơn hàng', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);
  }, [activeTab]);

  // Polling every 10s for real-time order updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOrders(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [activeTab, selectedOrder?.id]);

  const handleSelectOrder = async (orderId: number) => {
    try {
      const data = await api.getOrder(orderId);
      setSelectedOrder(data.order);
    } catch {
      showToast('Lỗi xem chi tiết đơn hàng', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã: ${code}`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCancelOrder = async () => {
    if (!cancelModalOrder) return;
    setIsCancelling(true);
    try {
      const finalReason = cancelReason === 'Khác' ? customCancelReason : cancelReason;
      await api.cancelOrder(cancelModalOrder.id, finalReason);
      showToast('Đã hủy đơn hàng thành công, tồn kho đã được hoàn lại', 'success');
      setCancelModalOrder(null);
      await fetchOrders(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi hủy đơn hàng', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await api.completeOrder(orderId);
      showToast('Cảm ơn bạn đã xác nhận đã nhận hàng!', 'success');
      await fetchOrders(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi xác nhận nhận hàng', 'error');
    }
  };

  const tabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Chờ duyệt' },
    { id: 'confirmed', label: 'Chờ lấy hàng' },
    { id: 'shipping', label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao' },
    { id: 'completed', label: 'Hoàn thành' },
    { id: 'cancelled', label: 'Đã hủy' }
  ];

  const stepperStages = [
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'confirmed', label: 'Shop chuẩn bị hàng' },
    { key: 'shipping', label: 'Đang giao hàng' },
    { key: 'delivered', label: 'Đã giao tới nơi' },
    { key: 'completed', label: 'Hoàn tất đơn' }
  ];

  const getStepperIndex = (status: OrderStatus): number => {
    if (status === 'cancelled') return -1;
    switch (status) {
      case 'pending': return 0;
      case 'confirmed': return 1;
      case 'shipping': return 2;
      case 'delivered': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCCDB6] pb-5">
        <div>
          <button
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#74665B] hover:text-[#D9542B] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại cửa hàng
          </button>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241A14]">
            Hành trình Đơn mua của bạn
          </h1>
          <p className="text-xs text-[#74665B] mt-0.5">
            Cập nhật lộ trình theo thời gian thực mỗi 10 giây từ đơn vị vận chuyển
          </p>
        </div>

        <button
          onClick={() => fetchOrders(false)}
          disabled={loading || isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFBF4] border border-[#DCCDB6] text-xs font-semibold text-[#241A14] hover:bg-[#EADFCC] transition-colors shadow-vintage-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedOrder(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#241A14] text-white shadow-vintage-sm'
                : 'bg-[#FFFBF4] border border-[#DCCDB6] text-[#74665B] hover:text-[#241A14] hover:bg-[#EADFCC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Orders */}
        <div className={`space-y-4 ${selectedOrder ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {loading && orders.length === 0 ? (
            <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-12 text-center text-xs text-[#74665B]">
              Đang tải danh sách đơn hàng...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-[#74665B] stroke-1 mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#241A14] mb-1">
                Không tìm thấy đơn hàng nào
              </h3>
              <p className="text-xs text-[#74665B] mb-4">
                Bạn chưa có đơn hàng nào trong mục này
              </p>
              <button
                onClick={onBackToShop}
                className="px-4 py-2 bg-[#D9542B] text-white text-xs font-semibold rounded-xl hover:bg-[#B33F33] transition-colors shadow-sm"
              >
                Khám phá tiệm đồ cũ ngay
              </button>
            </div>
          ) : (
            orders.map(order => {
              const isSelected = selectedOrder?.id === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order.id)}
                  className={`bg-[#FFFBF4] border rounded-2xl p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#D9542B] ring-2 ring-[#D9542B]/20 shadow-vintage-lg'
                      : 'border-[#DCCDB6] hover:border-[#74665B] shadow-vintage-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#D9542B]">
                          #{order.code}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          order.status === 'shipping' ? 'bg-[#D9542B] text-white' :
                          order.status === 'delivered' ? 'bg-[#5E7048] text-white' :
                          order.status === 'completed' ? 'bg-[#241A14] text-white' :
                          order.status === 'cancelled' ? 'bg-[#B33F33] text-white' :
                          'bg-[#EADFCC] text-[#241A14]'
                        }`}>
                          {order.status === 'pending' ? 'Chờ duyệt' :
                           order.status === 'confirmed' ? 'Đã duyệt' :
                           order.status === 'shipping' ? 'Đang giao' :
                           order.status === 'delivered' ? 'Đã giao' :
                           order.status === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#74665B] mt-0.5 block">
                        Ngày đặt: {formatDate(order.created_at)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-[#241A14] block">
                        {formatVND(order.total)}
                      </span>
                      <span className="text-[10px] text-[#74665B] uppercase font-mono">
                        {order.payment_method === 'cod' ? 'Thanh toán COD' : 'Thanh toán thẻ'}
                      </span>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="border-t border-[#DCCDB6]/50 pt-3 space-y-2">
                    {order.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover bg-[#EADFCC] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#241A14] truncate">
                            {item.product_name}
                          </p>
                          <span className="text-[11px] text-[#74665B]">
                            {item.quantity} × {formatVND(item.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 2 && (
                      <p className="text-[11px] text-[#74665B] italic pt-1">
                        + {(order.items?.length || 0) - 2} món đồ khác...
                      </p>
                    )}
                  </div>

                  {/* Carrier info pill */}
                  {order.carrier && (
                    <div className="mt-3 pt-2 border-t border-[#DCCDB6]/40 flex items-center justify-between text-xs text-[#74665B]">
                      <span className="flex items-center gap-1 font-medium text-[#241A14]">
                        <Truck className="w-3.5 h-3.5 text-[#D9542B]" />
                        {order.carrier}
                      </span>
                      {order.tracking_code && (
                        <span className="font-mono text-[11px]">
                          {order.tracking_code}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-2 flex items-center justify-end text-xs font-semibold text-[#D9542B]">
                    <span>Xem hành trình chi tiết</span>
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail Panel */}
        {selectedOrder && (
          <div className="lg:col-span-7 space-y-6">
            {/* Friendly Status Hero Banner */}
            <div className={`p-6 rounded-3xl border shadow-vintage-sm ${
              selectedOrder.status === 'shipping' ? 'bg-[#D9542B]/10 border-[#D9542B]/30' :
              selectedOrder.status === 'delivered' ? 'bg-[#5E7048]/10 border-[#5E7048]/30' :
              selectedOrder.status === 'completed' ? 'bg-[#EADFCC] border-[#DCCDB6]' :
              selectedOrder.status === 'cancelled' ? 'bg-[#B33F33]/10 border-[#B33F33]/30' :
              'bg-[#FFFBF4] border-[#DCCDB6]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#74665B] block mb-1">
                    Trạng thái đơn #{selectedOrder.code}
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#241A14]">
                    {selectedOrder.status === 'shipping' ? 'Kiện hàng đang lăn bánh trên đường tới bạn' :
                     selectedOrder.status === 'delivered' ? 'Kiện hàng đã giao thành công!' :
                     selectedOrder.status === 'completed' ? 'Đơn hàng đã hoàn tất trọn vẹn' :
                     selectedOrder.status === 'confirmed' ? 'Tiệm đã xác nhận đơn & đang đóng gói' :
                     selectedOrder.status === 'cancelled' ? 'Đơn hàng đã được hủy' : 'Tiệm đang chuẩn bị đơn'}
                  </h3>
                  <p className="text-xs text-[#74665B] mt-1.5 leading-relaxed">
                    {selectedOrder.status === 'shipping' ? (
                      `Được vận chuyển bởi ${selectedOrder.carrier || 'đơn vị đối tác'}. Bưu tá đang di chuyển theo lộ trình dự kiến.`
                    ) : selectedOrder.status === 'delivered' ? (
                      'Bạn hãy kiểm tra sản phẩm cẩn thận, sau đó bấm nút "Đã nhận được hàng" bên dưới để hoàn tất nhé!'
                    ) : selectedOrder.status === 'completed' ? (
                      'Cảm ơn bạn đã tin tưởng và chọn Đồ Cũ Còn Thương. Chúc bạn có trải nghiệm tuyệt vời cùng món đồ!'
                    ) : selectedOrder.status === 'cancelled' ? (
                      `Lý do hủy: ${selectedOrder.cancel_reason || 'Khách hàng / Shop yêu cầu'}`
                    ) : 'Tiệm sẽ sớm bàn giao kiện hàng cho đối tác vận chuyển.'}
                  </p>
                </div>

                {selectedOrder.status === 'shipping' && (
                  <div className="w-12 h-12 rounded-2xl bg-[#D9542B] text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                    <Truck className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* 5-Step Stepper Progress Bar */}
              {selectedOrder.status !== 'cancelled' && (
                <div className="mt-6 pt-5 border-t border-[#DCCDB6]/60">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting line */}
                    <div className="absolute top-4 left-4 right-4 h-1 bg-[#DCCDB6] -z-0" />
                    <div 
                      className="absolute top-4 left-4 h-1 bg-[#D9542B] transition-all duration-500 -z-0"
                      style={{
                        width: `${(Math.max(0, getStepperIndex(selectedOrder.status)) / 4) * 100}%`
                      }}
                    />

                    {stepperStages.map((stg, idx) => {
                      const currentIdx = getStepperIndex(selectedOrder.status);
                      const isPast = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={stg.key} className="flex flex-col items-center relative z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shadow-xs ${
                            isCurrent
                              ? 'bg-[#D9542B] text-white ring-4 ring-[#D9542B]/20 scale-110'
                              : isPast
                              ? 'bg-[#5E7048] text-white'
                              : 'bg-[#FFFBF4] border border-[#DCCDB6] text-[#74665B]'
                          }`}>
                            {isPast && !isCurrent ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] sm:text-xs mt-2 text-center max-w-[70px] leading-tight font-medium ${
                            isCurrent ? 'font-bold text-[#D9542B]' : isPast ? 'text-[#241A14]' : 'text-[#74665B]'
                          }`}>
                            {stg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Carrier & Tracking details box */}
            {selectedOrder.carrier && (
              <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-5 shadow-vintage-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-sm font-bold text-[#241A14] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#D9542B]" />
                    Thông tin vận đơn
                  </h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EADFCC] text-[#241A14]">
                    {selectedOrder.carrier}
                  </span>
                </div>

                {selectedOrder.tracking_code && (
                  <div className="flex items-center justify-between bg-[#F4ECDF] rounded-xl px-4 py-2.5 border border-[#DCCDB6]">
                    <div>
                      <span className="text-[10px] text-[#74665B] block">Mã vận đơn:</span>
                      <span className="font-mono text-sm font-bold text-[#241A14]">
                        {selectedOrder.tracking_code}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(selectedOrder.tracking_code!)}
                      className="p-2 text-[#74665B] hover:text-[#D9542B] transition-colors rounded-lg bg-white/70"
                      title="Sao chép mã"
                    >
                      {copiedCode === selectedOrder.tracking_code ? (
                        <Check className="w-4 h-4 text-[#5E7048]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Vertical Shipment Timeline */}
            <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-5 shadow-vintage-sm space-y-4">
              <h4 className="font-serif text-sm font-bold text-[#241A14] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#74665B]" />
                Nhật ký hành trình chi tiết
              </h4>

              {(!selectedOrder.shipment_events || selectedOrder.shipment_events.length === 0) ? (
                <div className="text-xs text-[#74665B] py-4 text-center">
                  Đang khởi tạo lộ trình từ kho tiệm...
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DCCDB6]">
                  {selectedOrder.shipment_events.map((evt, idx) => {
                    const isLatest = idx === selectedOrder.shipment_events!.length - 1;

                    return (
                      <div key={evt.id} className="relative group">
                        {/* Dot indicator (pulsing for latest) */}
                        <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-[#FFFBF4] ${
                          isLatest ? 'bg-[#D9542B] ring-4 ring-[#D9542B]/20 animate-pulse' : 'bg-[#5E7048]'
                        }`} />

                        <div className="bg-[#F4ECDF]/60 rounded-xl p-3 border border-[#DCCDB6]/60">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className={`text-xs font-bold ${isLatest ? 'text-[#D9542B]' : 'text-[#241A14]'}`}>
                              {evt.status}
                            </span>
                            <span className="text-[10px] text-[#74665B] font-mono">
                              {evt.created_at}
                            </span>
                          </div>

                          <div className="text-xs text-[#74665B] flex items-center gap-1.5 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-[#74665B] shrink-0" />
                            <span>{evt.location}</span>
                          </div>

                          {evt.note && (
                            <p className="text-[11px] text-[#74665B] italic pt-1 border-t border-[#DCCDB6]/40">
                              {evt.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chi tiết kiện hàng & Nút Đánh Giá khi Hoàn thành */}
            <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-5 shadow-vintage-sm space-y-3">
              <h4 className="font-serif text-sm font-bold text-[#241A14] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#D9542B]" />
                Sản phẩm trong kiện hàng
              </h4>

              <div className="divide-y divide-[#DCCDB6]/50">
                {(selectedOrder.items || []).map((item, idx) => {
                  const isReviewed = reviewedProductIds.includes(item.product_id);

                  return (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-12 h-12 rounded-xl object-cover bg-[#EADFCC] border border-[#DCCDB6] shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="font-serif font-bold text-xs text-[#241A14] truncate">
                            {item.product_name}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-[#74665B] mt-0.5">
                            <span>x{item.quantity}</span>
                            <span>·</span>
                            <span className="font-mono text-[#D9542B]">Độ mới {item.condition_pct}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-mono font-bold text-[#241A14]">
                          {formatVND(item.price * item.quantity)}
                        </span>

                        {/* Nút đánh giá khi đơn đã Hoàn thành */}
                        {selectedOrder.status === 'completed' && (
                          isReviewed ? (
                            <span className="text-[11px] font-mono text-[#5E7048] font-bold flex items-center gap-1 bg-[#5E7048]/10 px-2 py-0.5 rounded-full">
                              ✓ Đã đánh giá
                            </span>
                          ) : (
                            <button
                              onClick={() => setReviewModalProduct({
                                id: item.product_id,
                                name: item.product_name,
                                image_url: item.image_url,
                                condition_pct: item.condition_pct
                              })}
                              className="px-2.5 py-1 bg-[#D9542B] text-white text-[11px] font-bold rounded-lg hover:bg-[#B33F33] transition-colors shadow-xs"
                            >
                              ⭐ Đánh giá
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thông tin tài chính & Mã giảm giá */}
              <div className="border-t border-[#DCCDB6] pt-3 space-y-1.5 text-xs text-[#74665B]">
                <div className="flex justify-between">
                  <span>Tạm tính hàng:</span>
                  <span className="font-mono text-[#241A14]">{formatVND(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 ? (
                  <div className="flex justify-between text-[#5E7048] font-semibold">
                    <span>Giảm giá ({selectedOrder.coupon_code || 'Khuyến mãi'}):</span>
                    <span className="font-mono">-{formatVND(selectedOrder.discount_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-mono text-[#241A14]">
                    {selectedOrder.shipping_fee === 0 ? '0đ (Miễn phí)' : formatVND(selectedOrder.shipping_fee)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#DCCDB6]/40 font-bold text-sm text-[#241A14]">
                  <span className="font-serif">Tổng thanh toán:</span>
                  <span className="font-mono text-[#D9542B]">{formatVND(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions for buyer: Complete Order (if delivered) / Cancel Order (if pending/confirmed) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {selectedOrder.status === 'delivered' && (
                <button
                  onClick={() => handleCompleteOrder(selectedOrder.id)}
                  className="flex-1 py-3 px-4 bg-[#5E7048] hover:bg-[#4D5E3B] text-white rounded-xl text-xs font-bold transition-all shadow-vintage-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Đã nhận được hàng
                </button>
              )}

              {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                <button
                  onClick={() => setCancelModalOrder(selectedOrder)}
                  className="py-2.5 px-4 bg-transparent border border-[#B33F33] text-[#B33F33] hover:bg-[#B33F33] hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Yêu cầu hủy đơn hàng
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-6 w-full max-w-md shadow-vintage-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCCDB6] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#241A14]">
                Xác nhận hủy đơn #{cancelModalOrder.code}
              </h3>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-[#74665B] hover:text-[#241A14]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#74665B]">
              Bạn có chắc chắn muốn hủy đơn hàng này? Tồn kho của các món đồ sẽ được hoàn lại cho cửa hàng.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#241A14]">
                Lý do hủy đơn:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-xl px-3 py-2 text-xs text-[#241A14]"
              >
                <option value="Đổi ý không muốn mua nữa">Đổi ý không muốn mua nữa</option>
                <option value="Muốn thay đổi địa chỉ nhận hàng">Muốn thay đổi địa chỉ nhận hàng</option>
                <option value="Muốn mua thêm sản phẩm khác">Muốn mua thêm sản phẩm khác</option>
                <option value="Khác">Khác (tự nhập)</option>
              </select>

              {cancelReason === 'Khác' && (
                <input
                  type="text"
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể..."
                  className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-xl px-3 py-2 text-xs text-[#241A14] mt-2"
                />
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2 rounded-xl border border-[#DCCDB6] text-xs font-semibold text-[#74665B] hover:bg-[#EADFCC]"
              >
                Giữ đơn hàng
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-2 rounded-xl bg-[#B33F33] text-white text-xs font-semibold hover:bg-[#8F2F25] transition-colors"
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Review Modal */}
      {reviewModalProduct && selectedOrder && (
        <ReviewModal
          isOpen={!!reviewModalProduct}
          onClose={() => setReviewModalProduct(null)}
          orderId={selectedOrder.id}
          orderCode={selectedOrder.code}
          product={reviewModalProduct}
          onSuccess={() => {
            fetchReviewedItems(selectedOrder.id);
            fetchOrders(true);
          }}
        />
      )}
    </div>
  );
};
