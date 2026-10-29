import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, Clock, RefreshCw, XCircle, CheckCircle2, ChevronRight, 
  AlertCircle, ShieldCheck, X, Copy, Check, ArrowLeft, MapPin, Star,
  FileText, MessageSquare, RotateCcw, Tag, Store
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { formatVND, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { ReviewModal } from './ReviewModal';
import { Button } from './Button';
import { ChatDrawer } from './ChatDrawer';
import { ReturnRequestModal } from './ReturnRequestModal';
import { InvoiceModal } from './InvoiceModal';
import { ProductImage } from './ProductImage';

interface OrdersViewProps {
  onBackToShop: () => void;
  selectedOrderCode?: string | null;
  onNavigateToShop?: (slug: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onBackToShop,
  selectedOrderCode,
  onNavigateToShop
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
  const [reviewModalInitial, setReviewModalInitial] = useState<any | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);
  const [orderReviewsMap, setOrderReviewsMap] = useState<Record<number, any[]>>({});
  const [postCompletePromptOrder, setPostCompletePromptOrder] = useState<Order | null>(null);

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Đổi ý không muốn mua nữa');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // New Market Features states: Return request modal, Invoice modal, Chat drawer
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Fetch reviewed items for currently selected order
  const fetchReviewedItems = async (orderId: number) => {
    try {
      const res = await api.getOrderReviewedItems(orderId);
      setReviewedProductIds(res.reviewed_product_ids || []);
      if (res.reviews) {
        setOrderReviewsMap(prev => ({ ...prev, [orderId]: res.reviews || [] }));
      }
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

  // Real-time listener for buyer orders via onSnapshot (Requirement 3)
  useEffect(() => {
    const unsub = api.subscribeBuyerOrders((allOrders) => {
      let filtered = allOrders;
      if (activeTab && activeTab !== 'all') {
        filtered = allOrders.filter(o => o.status === activeTab);
      }
      setOrders(filtered);
      setLoading(false);

      if (selectedOrder) {
        const currentInList = allOrders.find(o => o.id === selectedOrder.id || o.code === selectedOrder.code);
        if (currentInList) setSelectedOrder(currentInList);
      } else if (selectedOrderCode) {
        const found = allOrders.find(o => o.code === selectedOrderCode);
        if (found) setSelectedOrder(found);
      }
    });

    return () => {
      unsub();
    };
  }, [activeTab, selectedOrder?.id, selectedOrderCode]);

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
      const res = await api.completeOrder(orderId);
      showToast('Cảm ơn bạn đã xác nhận đã nhận hàng!', 'success');
      await fetchOrders(false);
      const updated = res.order || orders.find(o => o.id === orderId) || selectedOrder;
      if (updated) {
        setPostCompletePromptOrder({ ...updated, status: 'completed' });
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8D8] pb-5">
        <div>
          <button
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E5E61] hover:text-[#08482D] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại cửa hàng
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101410]">
            Hành trình Đơn mua của bạn
          </h1>
          <p className="text-xs text-[#5E5E61] mt-0.5 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#08482D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#08482D]"></span>
            </span>
            <span className="text-[#08482D] font-bold">Trực tiếp</span>
            <span>· Cập nhật trạng thái và lộ trình giao hàng tức thì</span>
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => fetchOrders(false)}
          disabled={loading || isRefreshing}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
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
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'bg-white border border-[#E2E8D8] text-[#5E5E61] hover:text-[#08482D] hover:bg-[#DAE7C7]/40'
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
            <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-12 text-center text-xs text-[#5E5E61]">
              Đang tải danh sách đơn hàng...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-[#5E5E61] stroke-1 mb-3" />
              <h3 className="text-lg font-bold text-[#101410] mb-1">
                Không tìm thấy đơn hàng nào
              </h3>
              <p className="text-xs text-[#5E5E61] mb-4">
                Bạn chưa có đơn hàng nào trong mục này
              </p>
              <button
                onClick={onBackToShop}
                className="px-4 py-2 bg-[#C2522D] text-white text-xs font-semibold rounded-xl hover:bg-[#B33F33] transition-colors shadow-sm"
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
                  className={`bg-[#FFFFFF] border rounded-2xl p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#C2522D] ring-2 ring-[#C2522D]/20 shadow-vintage-lg'
                      : 'border-[#E2E8D8] hover:border-[#5E5E61] shadow-vintage-sm'
                  }`}
                >
                  {/* Shop Header */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E2E8D8]/60 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#08482D] truncate">
                      <Store className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{order.shop_name || 'Đồ Cũ Còn Thương'}</span>
                    </div>
                    {onNavigateToShop && order.shop_slug && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToShop(order.shop_slug!);
                        }}
                        className="text-[11px] text-[#5E5E61] hover:text-[#08482D] underline font-medium shrink-0"
                      >
                        Ghé shop
                      </button>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#C2522D]">
                          #{order.code}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          order.status === 'shipping' ? 'bg-[#C2522D] text-white' :
                          order.status === 'delivered' ? 'bg-[#08482D] text-white' :
                          order.status === 'completed' ? 'bg-[#101410] text-white' :
                          order.status === 'cancelled' ? 'bg-[#B33F33] text-white' :
                          'bg-[#DAE7C7] text-[#101410]'
                        }`}>
                          {order.status === 'pending' ? 'Chờ duyệt' :
                           order.status === 'confirmed' ? 'Đã duyệt' :
                           order.status === 'shipping' ? 'Đang giao' :
                           order.status === 'delivered' ? 'Đã giao' :
                           order.status === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5E5E61] mt-0.5 block">
                        Ngày đặt: {formatDate(order.created_at)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-[#101410] block">
                        {formatVND(order.total)}
                      </span>
                      <span className="text-[10px] text-[#5E5E61] uppercase font-mono">
                        {order.payment_method === 'cod'
                          ? 'Thanh toán COD'
                          : order.card_category === 'domestic'
                          ? 'Thẻ ATM NAPAS'
                          : 'Thẻ quốc tế'}
                      </span>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="border-t border-[#E2E8D8]/50 pt-3 space-y-2">
                    {order.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <ProductImage
                          src={item.image_url}
                          alt={item.product_name}
                          productName={item.product_name}
                          conditionPct={item.condition_pct}
                          className="w-10 h-10 rounded-lg object-cover bg-[#DAE7C7] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#101410] truncate">
                            {item.product_name}
                          </p>
                          <span className="text-[11px] text-[#5E5E61]">
                            {item.quantity} × {formatVND(item.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 2 && (
                      <p className="text-[11px] text-[#5E5E61] italic pt-1">
                        + {(order.items?.length || 0) - 2} món đồ khác...
                      </p>
                    )}
                  </div>

                  {/* Carrier info pill */}
                  {order.carrier && (
                    <div className="mt-3 pt-2 border-t border-[#E2E8D8]/40 flex items-center justify-between text-xs text-[#5E5E61]">
                      <span className="flex items-center gap-1 font-medium text-[#101410]">
                        <Truck className="w-3.5 h-3.5 text-[#C2522D]" />
                        {order.carrier}
                      </span>
                      {order.tracking_code && (
                        <span className="font-mono text-[11px]">
                          {order.tracking_code}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-2 flex items-center justify-end text-xs font-semibold text-[#C2522D]">
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
              selectedOrder.status === 'shipping' ? 'bg-[#C2522D]/10 border-[#C2522D]/30' :
              selectedOrder.status === 'delivered' ? 'bg-[#08482D]/10 border-[#08482D]/30' :
              selectedOrder.status === 'completed' ? 'bg-[#DAE7C7] border-[#E2E8D8]' :
              selectedOrder.status === 'cancelled' ? 'bg-[#B33F33]/10 border-[#B33F33]/30' :
              'bg-[#FFFFFF] border-[#E2E8D8]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#5E5E61] block mb-1">
                    Trạng thái đơn #{selectedOrder.code}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#101410]">
                    {selectedOrder.status === 'shipping' ? 'Kiện hàng đang lăn bánh trên đường tới bạn' :
                     selectedOrder.status === 'delivered' ? 'Kiện hàng đã giao thành công!' :
                     selectedOrder.status === 'completed' ? 'Đơn hàng đã hoàn tất trọn vẹn' :
                     selectedOrder.status === 'confirmed' ? 'Tiệm đã xác nhận đơn & đang đóng gói' :
                     selectedOrder.status === 'cancelled' ? 'Đơn hàng đã được hủy' : 'Tiệm đang chuẩn bị đơn'}
                  </h3>
                  <p className="text-xs text-[#5E5E61] mt-1.5 leading-relaxed">
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
                  <div className="w-12 h-12 rounded-2xl bg-[#C2522D] text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                    <Truck className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* 5-Step Stepper Progress Bar */}
              {selectedOrder.status !== 'cancelled' && (
                <div className="mt-6 pt-5 border-t border-[#E2E8D8]/60">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting line */}
                    <div className="absolute top-4 left-4 right-4 h-1 bg-[#E2E8D8] -z-0" />
                    <div 
                      className="absolute top-4 left-4 h-1 bg-[#C2522D] transition-all duration-500 -z-0"
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
                              ? 'bg-[#C2522D] text-white ring-4 ring-[#C2522D]/20 scale-110'
                              : isPast
                              ? 'bg-[#08482D] text-white'
                              : 'bg-[#FFFFFF] border border-[#E2E8D8] text-[#5E5E61]'
                          }`}>
                            {isPast && !isCurrent ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] sm:text-xs mt-2 text-center max-w-[70px] leading-tight font-medium ${
                            isCurrent ? 'font-bold text-[#C2522D]' : isPast ? 'text-[#101410]' : 'text-[#5E5E61]'
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
              <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-5 shadow-vintage-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#101410] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#C2522D]" />
                    Thông tin vận đơn
                  </h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#DAE7C7] text-[#101410]">
                    {selectedOrder.carrier}
                  </span>
                </div>

                {selectedOrder.tracking_code && (
                  <div className="flex items-center justify-between bg-[#F5F8EF] rounded-xl px-4 py-2.5 border border-[#E2E8D8]">
                    <div>
                      <span className="text-[10px] text-[#5E5E61] block">Mã vận đơn:</span>
                      <span className="font-mono text-sm font-bold text-[#101410]">
                        {selectedOrder.tracking_code}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(selectedOrder.tracking_code!)}
                      className="p-2 text-[#5E5E61] hover:text-[#C2522D] transition-colors rounded-lg bg-white/70"
                      title="Sao chép mã"
                    >
                      {copiedCode === selectedOrder.tracking_code ? (
                        <Check className="w-4 h-4 text-[#08482D]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Vertical Shipment Timeline */}
            <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-5 shadow-vintage-sm space-y-4">
              <h4 className="text-sm font-bold text-[#101410] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5E5E61]" />
                Nhật ký hành trình chi tiết
              </h4>

              {(!selectedOrder.shipment_events || selectedOrder.shipment_events.length === 0) ? (
                <div className="text-xs text-[#5E5E61] py-4 text-center">
                  Đang khởi tạo lộ trình từ kho tiệm...
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8D8]">
                  {selectedOrder.shipment_events.map((evt, idx) => {
                    const isLatest = idx === selectedOrder.shipment_events!.length - 1;

                    return (
                      <div key={evt.id} className="relative group">
                        {/* Dot indicator (pulsing for latest) */}
                        <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-[#FFFFFF] ${
                          isLatest ? 'bg-[#C2522D] ring-4 ring-[#C2522D]/20 animate-pulse' : 'bg-[#08482D]'
                        }`} />

                        <div className="bg-[#F5F8EF]/60 rounded-xl p-3 border border-[#E2E8D8]/60">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className={`text-xs font-bold ${isLatest ? 'text-[#C2522D]' : 'text-[#101410]'}`}>
                              {evt.status}
                            </span>
                            <span className="text-[10px] text-[#5E5E61] font-mono">
                              {evt.created_at}
                            </span>
                          </div>

                          <div className="text-xs text-[#5E5E61] flex items-center gap-1.5 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-[#5E5E61] shrink-0" />
                            <span>{evt.location}</span>
                          </div>

                          {evt.note && (
                            <p className="text-[11px] text-[#5E5E61] italic pt-1 border-t border-[#E2E8D8]/40">
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
            <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-5 shadow-vintage-sm space-y-3">
              <h4 className="text-sm font-bold text-[#101410] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#C2522D]" />
                Sản phẩm trong kiện hàng
              </h4>

              <div className="divide-y divide-[#E2E8D8]/50">
                {(selectedOrder.items || []).map((item, idx) => {
                  const isReviewed = reviewedProductIds.includes(item.product_id);

                  return (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductImage
                          src={item.image_url}
                          alt={item.product_name}
                          productName={item.product_name}
                          conditionPct={item.condition_pct}
                          className="w-12 h-12 rounded-xl object-cover bg-[#DAE7C7] border border-[#E2E8D8] shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-[#101410] truncate">
                            {item.product_name}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-[#5E5E61] mt-0.5">
                            <span>x{item.quantity}</span>
                            <span>·</span>
                            <span className="font-mono text-[#C2522D]">Độ mới {item.condition_pct}%</span>
                            {Boolean(item.is_negotiated) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                                <Tag className="w-2.5 h-2.5" />
                                Giá đã thương lượng
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-mono font-bold text-[#101410]">
                          {formatVND(item.price * item.quantity)}
                        </span>

                        {/* Nút đánh giá khi đơn đã Hoàn thành */}
                        {selectedOrder.status === 'completed' && (
                          isReviewed ? (
                            <button
                              onClick={() => {
                                const rev = (orderReviewsMap[selectedOrder.id] || []).find((r: any) => r.product_id === item.product_id);
                                setReviewModalInitial(rev || null);
                                setReviewModalProduct({
                                  id: item.product_id,
                                  name: item.product_name,
                                  image_url: item.image_url,
                                  condition_pct: item.condition_pct
                                });
                              }}
                              className="px-2.5 py-1 bg-[#DAE7C7]/50 hover:bg-[#DAE7C7] text-[#08482D] text-[11px] font-bold rounded-lg transition-colors border border-[#DAE7C7]"
                            >
                              Xem đánh giá
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setReviewModalInitial(null);
                                setReviewModalProduct({
                                  id: item.product_id,
                                  name: item.product_name,
                                  image_url: item.image_url,
                                  condition_pct: item.condition_pct
                                });
                              }}
                              className="px-2.5 py-1 bg-[#C2522D] text-white text-[11px] font-bold rounded-lg hover:bg-[#B33F33] transition-colors shadow-xs"
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
              <div className="border-t border-[#E2E8D8] pt-3 space-y-1.5 text-xs text-[#5E5E61]">
                <div className="flex justify-between">
                  <span>Tạm tính hàng:</span>
                  <span className="font-mono text-[#101410]">{formatVND(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 ? (
                  <div className="flex justify-between text-[#08482D] font-semibold">
                    <span>Giảm giá ({selectedOrder.coupon_code || 'Khuyến mãi'}):</span>
                    <span className="font-mono">-{formatVND(selectedOrder.discount_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-mono text-[#101410]">
                    {selectedOrder.shipping_fee === 0 ? '0đ (Miễn phí)' : formatVND(selectedOrder.shipping_fee)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E2E8D8]/40 font-bold text-sm text-[#101410]">
                  <span className="font-sans">Tổng thanh toán:</span>
                  <span className="font-mono text-[#C2522D]">{formatVND(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Return Request Timeline Card (if existing) */}
            {selectedOrder.return_request && (
              <div className="bg-[#FFFFFF] border border-amber-300 rounded-2xl p-5 shadow-vintage-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <h4 className="text-sm font-bold text-[#101410]">Yêu cầu trả hàng & hoàn tiền</h4>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    selectedOrder.return_request.status === 'refunded' ? 'bg-emerald-100 text-emerald-800' :
                    selectedOrder.return_request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    selectedOrder.return_request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-900'
                  }`}>
                    {selectedOrder.return_request.status === 'pending' ? 'Chờ shop duyệt' :
                     selectedOrder.return_request.status === 'approved' ? 'Shop đã đồng ý nhận lại' :
                     selectedOrder.return_request.status === 'shipping_back' ? 'Đang chuyển trả hàng' :
                     selectedOrder.return_request.status === 'received' ? 'Shop đã nhận kiện hoàn' :
                     selectedOrder.return_request.status === 'refunded' ? 'Đã hoàn tiền thành công' : 'Đã từ chối'}
                  </span>
                </div>

                <div className="p-3 bg-[#FBF1D9]/60 rounded-xl text-xs space-y-1.5 border border-amber-200/60">
                  <p className="text-[#101410]"><strong>Lý do:</strong> {selectedOrder.return_request.reason}</p>
                  <p className="text-[#5E5E61]"><strong>Mô tả:</strong> {selectedOrder.return_request.description}</p>
                  <p className="text-[#08482D] font-mono font-bold">
                    <strong>Số tiền hoàn:</strong> {formatVND(selectedOrder.return_request.refund_amount || selectedOrder.total)}
                  </p>
                  {selectedOrder.return_request.seller_note && (
                    <p className="text-blue-800 italic pt-1 border-t border-amber-200">
                      <strong>Phản hồi từ shop:</strong> {selectedOrder.return_request.seller_note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions for buyer */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {/* Delivery confirmation */}
              {selectedOrder.status === 'delivered' && (
                <button
                  onClick={() => handleCompleteOrder(selectedOrder.id)}
                  className="flex-1 py-2.5 px-4 bg-[#08482D] hover:bg-[#4D5E3B] text-white rounded-xl text-xs font-bold transition-all shadow-vintage-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Đã nhận được hàng
                </button>
              )}

              {/* Chat with shop button */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-buyer-chat', {
                    detail: {
                      shopId: selectedOrder.shop_id || 1,
                      order: selectedOrder
                    }
                  }));
                }}
                className="py-2.5 px-3.5 bg-white border border-[#DAE7C7] hover:bg-[#F5F8EF] text-[#08482D] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-[#08482D]" />
                Chat với shop
              </button>

              {/* Invoice button */}
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="py-2.5 px-3.5 bg-white border border-[#DAE7C7] hover:bg-[#F5F8EF] text-[#101410] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <FileText className="w-4 h-4 text-[#5E5E61]" />
                Xem hóa đơn
              </button>

              {/* Return button if within 3 days & delivered/completed & no existing request */}
              {(selectedOrder.status === 'delivered' || selectedOrder.status === 'completed') && !selectedOrder.return_request && (
                <button
                  type="button"
                  onClick={() => setShowReturnModal(true)}
                  className="py-2.5 px-3.5 bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  Yêu cầu trả hàng
                </button>
              )}

              {/* Cancel button if pending/confirmed */}
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
          <div className="bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-6 w-full max-w-md shadow-vintage-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8D8] pb-3">
              <h3 className="text-lg font-bold text-[#101410]">
                Xác nhận hủy đơn #{cancelModalOrder.code}
              </h3>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-[#5E5E61] hover:text-[#101410]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5E5E61]">
              Bạn có chắc chắn muốn hủy đơn hàng này? Tồn kho của các món đồ sẽ được hoàn lại cho cửa hàng.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#101410]">
                Lý do hủy đơn:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410]"
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
                  className="w-full bg-[#F5F8EF] border border-[#E2E8D8] rounded-xl px-3 py-2 text-xs text-[#101410] mt-2"
                />
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2 rounded-xl border border-[#E2E8D8] text-xs font-semibold text-[#5E5E61] hover:bg-[#DAE7C7]"
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

      {/* Post Complete Prompt Modal */}
      {postCompletePromptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#DAE7C7] text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#DAE7C7]/60 text-[#08482D] flex items-center justify-center mx-auto">
              <Star className="w-7 h-7 fill-[#08482D]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#08482D]">Cảm ơn bạn!</h3>
              <p className="text-xs text-[#5E5E61] mt-1.5 leading-relaxed">
                Đánh giá món đồ để giúp người mua sau nhé
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPostCompletePromptOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#DAE7C7] text-xs font-semibold text-[#5E5E61] hover:bg-[#F5F8EF] transition-colors"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => {
                  const ord = postCompletePromptOrder;
                  setPostCompletePromptOrder(null);
                  if (ord.items && ord.items.length > 0) {
                    setSelectedOrder(ord);
                    setReviewModalInitial(null);
                    setReviewModalProduct({
                      id: ord.items[0].product_id,
                      name: ord.items[0].product_name,
                      image_url: ord.items[0].image_url,
                      condition_pct: ord.items[0].condition_pct
                    });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#08482D] text-white text-xs font-bold hover:bg-[#08482D]/90 shadow-sm transition-colors"
              >
                Đánh giá ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Review Modal */}
      {reviewModalProduct && selectedOrder && (
        <ReviewModal
          isOpen={!!reviewModalProduct}
          onClose={() => {
            setReviewModalProduct(null);
            setReviewModalInitial(null);
          }}
          orderId={selectedOrder.id}
          orderCode={selectedOrder.code}
          product={reviewModalProduct}
          initialReview={reviewModalInitial}
          onSuccess={() => {
            fetchReviewedItems(selectedOrder.id);
            fetchOrders(true);
          }}
        />
      )}

      {/* Return Request Modal */}
      {showReturnModal && selectedOrder && (
        <ReturnRequestModal
          order={selectedOrder}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => {
            showToast('Đã gửi yêu cầu trả hàng thành công!', 'success');
            fetchOrders(true);
          }}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedOrder && (
        <InvoiceModal
          order={selectedOrder}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Chat Drawer */}
      {showChatDrawer && selectedOrder && (
        <ChatDrawer
          isOpen={showChatDrawer}
          onClose={() => setShowChatDrawer(false)}
          order={selectedOrder}
          currentRole="buyer"
        />
      )}
    </div>
  );
};
