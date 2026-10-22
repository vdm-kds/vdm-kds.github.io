import React, { useState, useEffect } from 'react';
import { 
  Truck, Package, CheckCircle2, Clock, MapPin, Copy, Check, 
  Send, RefreshCw, AlertCircle, ChevronRight, User, Phone, Filter, Printer, CheckSquare, Square
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatVND } from '../utils/format';
import { ShippingLabelModal } from './ShippingLabelModal';

interface SellerShippingKanbanProps {
  onRefreshStats?: () => void;
  onViewOrderDetail?: (order: Order) => void;
}

const CARRIERS = [
  'Giao Hàng Nhanh',
  'Giao Hàng Tiết Kiệm',
  'Viettel Post',
  'J&T Express',
  'SPX Express'
];

export const SellerShippingKanban: React.FC<SellerShippingKanbanProps> = ({
  onRefreshStats,
  onViewOrderDetail
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Bulk Handover State
  const [selectedPendingIds, setSelectedPendingIds] = useState<number[]>([]);
  const [bulkCarrier, setBulkCarrier] = useState('Giao Hàng Nhanh');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Waybill print modal
  const [labelModalOrder, setLabelModalOrder] = useState<Order | null>(null);

  // Handover form state per order
  const [handoverState, setHandoverState] = useState<Record<number, { carrier: string; location: string; note: string }>>({});
  const [handoverSubmitting, setHandoverSubmitting] = useState<number | null>(null);

  // Update journey modal state
  const [journeyModal, setJourneyModal] = useState<{
    open: boolean;
    order: Order | null;
    status: string;
    location: string;
    note: string;
    submitting: boolean;
  }>({
    open: false,
    order: null,
    status: 'Đang trung chuyển qua kho trung tâm',
    location: 'Kho phân loại Tân Bình, TP.HCM',
    note: 'Kiện hàng đã rời kho và đang trên đường đến bưu cục phát',
    submitting: false
  });

  const { showToast } = useToast();

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getSellerOrders();
      setOrders(res.orders || []);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Lỗi tải danh sách vận chuyển', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);
    const interval = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã vận đơn: ${code}`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 1. Chờ bàn giao -> Đã giao ĐVVC (Bàn giao đơn lẻ)
  const handleHandover = async (order: Order) => {
    const config = handoverState[order.id] || {
      carrier: order.carrier || 'Giao Hàng Nhanh',
      location: 'Bưu cục Quận 1, TP. Hồ Chí Minh',
      note: 'Đã đóng gói cẩn thận, bưu tá đã lấy hàng'
    };

    setHandoverSubmitting(order.id);
    try {
      await api.handoverOrder(order.id, {
        carrier: config.carrier,
        location: config.location,
        note: config.note
      });
      showToast(`Đã bàn giao đơn #${order.code} cho ${config.carrier}`, 'success');
      await fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Lỗi thực hiện bàn giao đơn hàng', 'error');
    } finally {
      setHandoverSubmitting(null);
    }
  };

  // Bàn giao hàng loạt
  const handleBulkHandover = async () => {
    if (selectedPendingIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 đơn hàng để bàn giao', 'error');
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await api.bulkHandoverOrders(selectedPendingIds, bulkCarrier);
      showToast(res.message, 'success');
      setSelectedPendingIds([]);
      await fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Lỗi bàn giao hàng loạt', 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const togglePendingOrderSelection = (id: number) => {
    if (selectedPendingIds.includes(id)) {
      setSelectedPendingIds(selectedPendingIds.filter(i => i !== id));
    } else {
      setSelectedPendingIds([...selectedPendingIds, id]);
    }
  };

  const selectAllPending = (ordersToSelect: Order[]) => {
    if (selectedPendingIds.length === ordersToSelect.length) {
      setSelectedPendingIds([]);
    } else {
      setSelectedPendingIds(ordersToSelect.map(o => o.id));
    }
  };

  // 2. Đã giao ĐVVC -> Giao thành công (Quick Complete)
  const handleQuickDeliver = async (order: Order) => {
    try {
      await api.addShipmentEvent(order.id, {
        status: 'Giao hàng thành công',
        location: order.address,
        note: 'Người nhận đã nhận kiện hàng nguyên vẹn và ký nhận'
      });
      showToast(`Đã ghi nhận giao hàng thành công đơn #${order.code}`, 'success');
      await fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật giao hàng thành công', 'error');
    }
  };

  // 3. Cập nhật hành trình
  const handleUpdateJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journeyModal.order) return;

    setJourneyModal(prev => ({ ...prev, submitting: true }));
    try {
      await api.addShipmentEvent(journeyModal.order.id, {
        status: journeyModal.status,
        location: journeyModal.location,
        note: journeyModal.note
      });
      showToast(`Đã cập nhật lộ trình cho đơn #${journeyModal.order.code}`, 'success');
      setJourneyModal({
        open: false,
        order: null,
        status: '',
        location: '',
        note: '',
        submitting: false
      });
      await fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Lỗi thêm sự kiện vận chuyển', 'error');
      setJourneyModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Filter orders by column
  // Col 1: Chờ bàn giao (confirmed, or pending)
  const pendingHandoverOrders = orders.filter(o => 
    (o.status === 'confirmed' || o.status === 'pending') &&
    (selectedCarrierFilter === 'all' || o.carrier === selectedCarrierFilter || !o.carrier)
  );

  // Col 2: Đang giao cho ĐVVC (shipping)
  const shippingOrders = orders.filter(o => 
    o.status === 'shipping' &&
    (selectedCarrierFilter === 'all' || o.carrier === selectedCarrierFilter)
  );

  // Col 3: Giao thành công (delivered, completed)
  const deliveredOrders = orders.filter(o => 
    (o.status === 'delivered' || o.status === 'completed') &&
    (selectedCarrierFilter === 'all' || o.carrier === selectedCarrierFilter)
  );

  return (
    <div className="space-y-6">
      {/* Top Bar Filter */}
      <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl p-4 shadow-vintage-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9542B]/10 text-[#D9542B] flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#241A14]">
              Kanban Điều Phối Vận Chuyển
            </h2>
            <p className="text-xs text-[#74665B]">
              Theo dõi và cập nhật 3 chặng giao nhận · Tự động gửi thông báo đến khách hàng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#74665B]">
            <Filter className="w-3.5 h-3.5" />
            <span>ĐVVC:</span>
            <select
              value={selectedCarrierFilter}
              onChange={(e) => setSelectedCarrierFilter(e.target.value)}
              className="bg-[#F4ECDF] border border-[#DCCDB6] rounded-xl px-3 py-1.5 text-xs text-[#241A14] focus:outline-none focus:border-[#D9542B]"
            >
              <option value="all">Tất cả đơn vị ({orders.length})</option>
              {CARRIERS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchOrders(false)}
            disabled={loading}
            className="p-2 rounded-xl border border-[#DCCDB6] bg-[#F4ECDF] hover:bg-[#EADFCC] text-[#241A14] transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3 Columns Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= COLUMN 1: Chờ Bàn Giao ================= */}
        <div className="flex flex-col bg-[#EADFCC]/50 border border-[#DCCDB6] rounded-2xl p-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCCDB6]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E3B23C]" />
              <h3 className="font-serif font-bold text-sm text-[#241A14]">1. Chờ bàn giao</h3>
            </div>
            <div className="flex items-center gap-2">
              {pendingHandoverOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectAllPending(pendingHandoverOrders)}
                  className="text-[11px] font-bold text-[#5E7048] hover:underline"
                >
                  {selectedPendingIds.length === pendingHandoverOrders.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              )}
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FFFBF4] border border-[#DCCDB6] text-[#241A14] font-bold">
                {pendingHandoverOrders.length}
              </span>
            </div>
          </div>

          {/* Bulk Handover Action Bar */}
          {selectedPendingIds.length > 0 && (
            <div className="mb-3 p-3 bg-[#FFFBF4] border-2 border-[#D9542B] rounded-xl space-y-2 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#241A14]">
                <span>Đã chọn: {selectedPendingIds.length} đơn</span>
                <button
                  onClick={() => setSelectedPendingIds([])}
                  className="text-[11px] text-[#B33F33] hover:underline"
                >
                  Hủy chọn
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={bulkCarrier}
                  onChange={(e) => setBulkCarrier(e.target.value)}
                  className="flex-1 bg-[#F4ECDF] border border-[#DCCDB6] rounded-lg px-2.5 py-1.5 text-xs text-[#241A14] font-medium"
                >
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={handleBulkHandover}
                  disabled={bulkSubmitting}
                  className="px-3.5 py-1.5 bg-[#D9542B] text-white rounded-lg text-xs font-bold hover:bg-[#B33F33] transition-colors shadow-xs"
                >
                  {bulkSubmitting ? 'Đang gửi...' : 'Bàn giao'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[720px] pr-1">
            {pendingHandoverOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#74665B] bg-[#FFFBF4]/40 border border-dashed border-[#DCCDB6] rounded-xl">
                Không có đơn chờ bàn giao
              </div>
            ) : (
              pendingHandoverOrders.map(order => {
                const currentHandover = handoverState[order.id] || {
                  carrier: order.carrier || 'Giao Hàng Nhanh',
                  location: 'Bưu cục Quận 1, TP. Hồ Chí Minh',
                  note: 'Đóng kiện 2 lớp xốp, dán nhãn hàng dễ vỡ'
                };
                const isSelected = selectedPendingIds.includes(order.id);

                return (
                  <div
                    key={order.id}
                    className={`bg-[#FFFBF4] border rounded-xl p-4 shadow-vintage-sm hover:shadow-vintage transition-all ${
                      isSelected ? 'border-[#D9542B] ring-2 ring-[#D9542B]/30' : 'border-[#DCCDB6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePendingOrderSelection(order.id)}
                          className="w-4 h-4 mt-0.5 rounded border-[#DCCDB6] text-[#D9542B] focus:ring-[#D9542B]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#D9542B]">
                              #{order.code}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-[#EADFCC] text-[#241A14] font-medium">
                              {order.status === 'confirmed' ? 'Đã duyệt đơn' : 'Chờ duyệt'}
                            </span>
                          </div>
                          <p className="text-xs text-[#74665B] mt-0.5">
                            {order.created_at}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#241A14]">
                        {formatVND(order.total)}
                      </span>
                    </div>

                    {/* Customer info */}
                    <div className="bg-[#F4ECDF]/50 rounded-lg p-2.5 mb-3 text-xs space-y-1">
                      <div className="font-medium text-[#241A14] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#74665B]" />
                        {order.recipient_name} · {order.phone}
                      </div>
                      <div className="text-[#74665B] flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#74665B] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{order.address}</span>
                      </div>
                    </div>

                    {/* Handover Form */}
                    <div className="space-y-2 border-t border-[#DCCDB6]/60 pt-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#74665B] mb-1">
                          Đơn vị vận chuyển:
                        </label>
                        <select
                          value={currentHandover.carrier}
                          onChange={(e) => setHandoverState(prev => ({
                            ...prev,
                            [order.id]: { ...currentHandover, carrier: e.target.value }
                          }))}
                          className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-lg px-2.5 py-1.5 text-xs text-[#241A14] focus:outline-none focus:border-[#D9542B]"
                        >
                          {CARRIERS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#74665B] mb-1">
                          Điểm lấy / bưu cục:
                        </label>
                        <input
                          type="text"
                          value={currentHandover.location}
                          onChange={(e) => setHandoverState(prev => ({
                            ...prev,
                            [order.id]: { ...currentHandover, location: e.target.value }
                          }))}
                          placeholder="Bưu cục Quận 1, TP.HCM"
                          className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-lg px-2.5 py-1.5 text-xs text-[#241A14] focus:outline-none focus:border-[#D9542B]"
                        />
                      </div>

                      <button
                        onClick={() => handleHandover(order)}
                        disabled={handoverSubmitting === order.id}
                        className="w-full mt-2 py-2 px-3 bg-[#D9542B] hover:bg-[#B33F33] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {handoverSubmitting === order.id ? 'Đang bàn giao...' : 'Bàn giao cho ĐVVC'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMN 2: Đã Giao Cho ĐVVC ================= */}
        <div className="flex flex-col bg-[#EADFCC]/50 border border-[#DCCDB6] rounded-2xl p-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCCDB6]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D9542B] animate-pulse" />
              <h3 className="font-serif font-bold text-sm text-[#241A14]">2. Đã giao cho ĐVVC</h3>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FFFBF4] border border-[#DCCDB6] text-[#241A14] font-bold">
              {shippingOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[720px] pr-1">
            {shippingOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#74665B] bg-[#FFFBF4]/40 border border-dashed border-[#DCCDB6] rounded-xl">
                Không có đơn hàng nào đang vận chuyển
              </div>
            ) : (
              shippingOrders.map(order => {
                const latestEvent = order.shipment_events && order.shipment_events.length > 0 
                  ? order.shipment_events[order.shipment_events.length - 1] 
                  : null;

                return (
                  <div
                    key={order.id}
                    className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-xl p-4 shadow-vintage-sm hover:shadow-vintage transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-[#D9542B]">
                          #{order.code}
                        </span>
                        <p className="text-xs text-[#74665B] mt-0.5">
                          {order.recipient_name} · {order.phone}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#241A14]">
                        {formatVND(order.total)}
                      </span>
                    </div>

                    {/* Carrier & Tracking Code Badge */}
                    <div className="bg-[#EADFCC]/70 rounded-xl p-2.5 mb-3 space-y-1.5 border border-[#DCCDB6]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#241A14]">
                          {order.carrier || 'ĐVVC Liên kết'}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#D9542B] text-white">
                          Đang giao
                        </span>
                      </div>

                      {order.tracking_code && (
                        <div className="flex items-center justify-between bg-white/70 rounded-lg px-2 py-1 text-xs font-mono">
                          <span className="text-[#241A14] truncate font-bold">
                            {order.tracking_code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(order.tracking_code!)}
                            className="p-1 hover:text-[#D9542B] transition-colors"
                            title="Sao chép mã vận đơn"
                          >
                            {copiedCode === order.tracking_code ? (
                              <Check className="w-3.5 h-3.5 text-[#5E7048]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#74665B]" />
                            )}
                          </button>
                        </div>
                      )}

                      {latestEvent && (
                        <div className="text-[11px] text-[#74665B] pt-1 border-t border-[#DCCDB6]/50">
                          <div className="font-medium text-[#241A14]">
                            {latestEvent.status}
                          </div>
                          <div className="truncate">
                            📍 {latestEvent.location}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setJourneyModal({
                          open: true,
                          order,
                          status: 'Đang trung chuyển qua bưu cục phát',
                          location: 'Bưu cục phát gần địa chỉ người nhận',
                          note: 'Shipper đang sắp xếp tuyến giao',
                          submitting: false
                        })}
                        className="py-1.5 px-2 bg-[#F4ECDF] hover:bg-[#EADFCC] border border-[#DCCDB6] text-[#241A14] rounded-lg text-xs font-medium transition-colors"
                      >
                        + Cập nhật lộ trình
                      </button>

                      <button
                        onClick={() => handleQuickDeliver(order)}
                        className="py-1.5 px-2 bg-[#5E7048] hover:bg-[#4D5E3B] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Giao thành công
                      </button>
                    </div>

                    {/* Nút In phiếu giao hàng */}
                    <button
                      onClick={() => setLabelModalOrder(order)}
                      className="w-full mt-2 py-1.5 px-3 bg-white border border-[#DCCDB6] hover:bg-[#F4ECDF] text-[#241A14] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#D9542B]" />
                      In phiếu giao hàng (A6)
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: Giao Thành Công ================= */}
        <div className="flex flex-col bg-[#EADFCC]/50 border border-[#DCCDB6] rounded-2xl p-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCCDB6]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#5E7048]" />
              <h3 className="font-serif font-bold text-sm text-[#241A14]">3. Giao thành công</h3>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FFFBF4] border border-[#DCCDB6] text-[#241A14] font-bold">
              {deliveredOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[720px] pr-1">
            {deliveredOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#74665B] bg-[#FFFBF4]/40 border border-dashed border-[#DCCDB6] rounded-xl">
                Chưa có đơn hàng nào hoàn tất giao
              </div>
            ) : (
              deliveredOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-xl p-4 shadow-vintage-sm hover:shadow-vintage transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#241A14]">
                        #{order.code}
                      </span>
                      <p className="text-xs text-[#74665B] mt-0.5">
                        {order.recipient_name} · {order.carrier || 'ĐVVC'}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#5E7048]">
                      {formatVND(order.total)}
                    </span>
                  </div>

                  <div className="bg-[#5E7048]/10 rounded-lg p-2.5 mb-2 border border-[#5E7048]/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#5E7048] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {order.status === 'completed' ? 'Khách đã xác nhận nhận hàng' : 'Đã giao thành công'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#74665B] mt-1">
                      Thanh toán: <span className="font-medium text-[#241A14]">{order.payment_method === 'cod' ? 'COD (Đã thu tiền)' : 'Thẻ (Đã thanh toán)'}</span>
                    </div>
                  </div>

                  {order.tracking_code && (
                    <div className="flex items-center justify-between text-xs font-mono text-[#74665B] px-1">
                      <span>Mã vận đơn: {order.tracking_code}</span>
                      <button
                        onClick={() => handleCopyCode(order.tracking_code!)}
                        className="hover:text-[#D9542B]"
                        title="Sao chép"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setLabelModalOrder(order)}
                    className="w-full mt-2 py-1.5 px-3 bg-white border border-[#DCCDB6] hover:bg-[#F4ECDF] text-[#241A14] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#D9542B]" />
                    In phiếu giao hàng (A6)
                  </button>

                  {onViewOrderDetail && (
                    <button
                      onClick={() => onViewOrderDetail(order)}
                      className="w-full mt-2 py-1.5 text-xs text-[#74665B] hover:text-[#241A14] border-t border-[#DCCDB6]/50 flex items-center justify-center gap-1 transition-colors"
                    >
                      Xem chi tiết đơn hàng
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Journey Update Modal */}
      {journeyModal.open && journeyModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFFBF4] border border-[#DCCDB6] rounded-2xl w-full max-w-md p-6 shadow-vintage-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCCDB6] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#241A14]">
                  Cập nhật hành trình vận chuyển
                </h3>
                <p className="text-xs text-[#74665B] font-mono">
                  Đơn #{journeyModal.order.code} · {journeyModal.order.carrier}
                </p>
              </div>
              <button
                onClick={() => setJourneyModal(prev => ({ ...prev, open: false }))}
                className="text-[#74665B] hover:text-[#241A14] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateJourney} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">
                  Trạng thái chặng:
                </label>
                <input
                  type="text"
                  required
                  value={journeyModal.status}
                  onChange={(e) => setJourneyModal(prev => ({ ...prev, status: e.target.value }))}
                  placeholder="Ví dụ: Đang giao hàng / Đến kho phân loại"
                  className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-xl px-3 py-2 text-xs text-[#241A14] focus:outline-none focus:border-[#D9542B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">
                  Vị trí hiện tại:
                </label>
                <input
                  type="text"
                  required
                  value={journeyModal.location}
                  onChange={(e) => setJourneyModal(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ví dụ: Kho trung chuyển Sóng Thần, Bình Dương"
                  className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-xl px-3 py-2 text-xs text-[#241A14] focus:outline-none focus:border-[#D9542B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">
                  Ghi chú chi tiết (nếu có):
                </label>
                <textarea
                  rows={2}
                  value={journeyModal.note}
                  onChange={(e) => setJourneyModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Ghi chú thêm về kiện hàng hoặc tình hình thời tiết / giao nhận"
                  className="w-full bg-[#F4ECDF] border border-[#DCCDB6] rounded-xl px-3 py-2 text-xs text-[#241A14] focus:outline-none focus:border-[#D9542B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setJourneyModal(prev => ({ ...prev, open: false }))}
                  className="px-4 py-2 border border-[#DCCDB6] rounded-xl text-xs font-medium text-[#74665B] hover:bg-[#EADFCC] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={journeyModal.submitting}
                  className="px-5 py-2 bg-[#D9542B] hover:bg-[#B33F33] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {journeyModal.submitting ? 'Đang lưu...' : 'Gửi cập nhật & Báo khách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipping Waybill Print Modal */}
      <ShippingLabelModal
        order={labelModalOrder}
        isOpen={!!labelModalOrder}
        onClose={() => setLabelModalOrder(null)}
      />
    </div>
  );
};
