import React, { useState, useEffect } from 'react';
import { 
  Store, Package, ShoppingBag, DollarSign, TrendingUp, AlertTriangle, 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Truck, Send, Clock, 
  MapPin, RefreshCw, X, ChevronRight, Eye, Printer, Download, Tag, Percent, CheckSquare, Square
} from 'lucide-react';
import { Product, Order, SellerStats, Coupon } from '../types';
import { api } from '../services/api';
import { formatVND, formatDate, getOrderStatusBadge, getPaymentStatusBadge } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { SellerShippingKanban } from './SellerShippingKanban';
import { ShippingLabelModal } from './ShippingLabelModal';
import { Button } from './Button';

interface SellerDashboardProps {
  onViewPreview?: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onViewPreview }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shipping' | 'orders' | 'products' | 'coupons'>('dashboard');

  // Dashboard Stats
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productModal, setProductModal] = useState<{ open: boolean; mode: 'add' | 'edit'; item?: Product }>({ open: false, mode: 'add' });
  const [prodForm, setProdForm] = useState({
    name: '',
    category: 'Thời trang',
    price: 350000,
    original_price: 1200000,
    condition_pct: 90,
    condition_detail: '',
    stock: 1,
    image_url: ''
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Bulk Orders State
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);

  // Waybill Print Modal
  const [labelModalOrder, setLabelModalOrder] = useState<Order | null>(null);

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed' | 'shipping',
    value: 10,
    max_discount: 100000,
    min_order_amount: 300000
  });

  // Seller Action Modals
  const [carrierModalOrder, setCarrierModalOrder] = useState<Order | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState('Giao Hàng Nhanh');

  const [shipmentEventModalOrder, setShipmentEventModalOrder] = useState<Order | null>(null);
  const [eventStatus, setEventStatus] = useState('Đã bàn giao cho đơn vị vận chuyển');
  const [eventLocation, setEventLocation] = useState('Kho Phân Loại Tân Bình, TP.HCM');
  const [eventNote, setEventNote] = useState('Kiện hàng nguyên vẹn, đang phân tuyến');

  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Sản phẩm có lỗi kỹ thuật khi kiểm tra lại trước khi gửi');

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getSellerStats();
      setStats(data.stats);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải thống kê', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts();
      setProducts(data.products);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách sản phẩm', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    try {
      const data = await api.getSellerOrders(orderStatusFilter);
      setOrders(data.orders);
      if (selectedOrder) {
        const found = data.orders.find(o => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Lỗi tải danh sách đơn hàng', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await api.getSellerCoupons();
      setCoupons(res.coupons);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách mã giảm giá', 'error');
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'coupons') fetchCoupons();
  }, [activeTab, orderStatusFilter]);

  // Polling cho đơn hàng người bán mỗi 10 giây
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'dashboard') fetchStats();
      if (activeTab === 'orders') fetchOrders(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [activeTab, orderStatusFilter, selectedOrder?.id]);

  // Bulk Orders Handlers
  const handleToggleOrderSelect = (id: number) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(i => i !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const handleBulkConfirm = async () => {
    const pendingSelected = orders.filter(o => selectedOrderIds.includes(o.id) && o.status === 'pending');
    if (pendingSelected.length === 0) {
      showToast('Vui lòng chọn các đơn ở trạng thái "Chờ duyệt" để duyệt hàng loạt', 'error');
      return;
    }

    setBulkApproveLoading(true);
    try {
      const res = await api.bulkConfirmOrders(pendingSelected.map(o => o.id));
      showToast(res.message, 'success');
      setSelectedOrderIds([]);
      await fetchOrders();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Lỗi duyệt đơn hàng loạt', 'error');
    } finally {
      setBulkApproveLoading(false);
    }
  };

  // CSV Report Download with UTF-8 BOM
  const handleExportCsv = async () => {
    try {
      showToast('Đang khởi tạo file báo cáo CSV...', 'info');
      const token = localStorage.getItem('do_cu_con_thuong_token');
      const response = await fetch('/api/seller/orders/export-csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Lỗi xuất báo cáo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Tải báo cáo CSV thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải file CSV', 'error');
    }
  };

  // Coupon Handlers
  const handleToggleCoupon = async (id: number) => {
    try {
      const res = await api.toggleSellerCoupon(id);
      showToast(res.message, 'success');
      await fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi', 'error');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      await api.deleteSellerCoupon(id);
      showToast('Đã xóa mã giảm giá', 'success');
      await fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSellerCoupon(couponForm);
      showToast('Tạo mã giảm giá mới thành công!', 'success');
      setCouponModalOpen(false);
      setCouponForm({
        code: '',
        type: 'percent',
        value: 10,
        max_discount: 100000,
        min_order_amount: 300000
      });
      await fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo mã giảm giá', 'error');
    }
  };

  // Xử lý Thêm / Sửa sản phẩm
  const handleOpenProductModal = (mode: 'add' | 'edit', item?: Product) => {
    if (mode === 'edit' && item) {
      setProdForm({
        name: item.name,
        category: item.category,
        price: item.price,
        original_price: item.original_price,
        condition_pct: item.condition_pct,
        condition_detail: item.condition_detail,
        stock: item.stock,
        image_url: item.image_url
      });
      setProductModal({ open: true, mode: 'edit', item });
    } else {
      setProdForm({
        name: '',
        category: 'Thời trang',
        price: 200000,
        original_price: 600000,
        condition_pct: 90,
        condition_detail: 'Đồ cũ còn dùng tốt, ngoại hình đẹp',
        stock: 1,
        image_url: ''
      });
      setProductModal({ open: true, mode: 'add' });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (productModal.mode === 'add') {
        await api.createProduct(prodForm);
        showToast('Đã thêm sản phẩm mới vào kho', 'success');
      } else if (productModal.item) {
        await api.updateProduct(productModal.item.id, prodForm);
        showToast('Đã cập nhật thông tin sản phẩm', 'success');
      }
      setProductModal({ open: false, mode: 'add' });
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu sản phẩm', 'error');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${name}" khỏi kho không?`)) return;
    try {
      await api.deleteProduct(id);
      showToast('Đã xóa sản phẩm', 'success');
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa sản phẩm', 'error');
    }
  };

  // Duyệt đơn: chuyển từ pending -> confirmed
  const handleApproveOrder = async (orderId: number) => {
    try {
      await api.updateOrderStatus(orderId, 'confirmed', 'Người bán đã duyệt đơn, đang chuẩn bị hàng');
      showToast('Đã duyệt đơn hàng thành công! Trạng thái chuyển sang "Chờ lấy hàng"', 'success');
      await fetchOrders();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Lỗi duyệt đơn', 'error');
    }
  };

  // Hủy đơn (người bán)
  const handleCancelOrderSubmit = async () => {
    if (!cancelModalOrder) return;
    try {
      await api.updateOrderStatus(cancelModalOrder.id, 'cancelled', undefined, cancelReason);
      showToast('Đã hủy đơn hàng và hoàn trả tồn kho sản phẩm', 'success');
      setCancelModalOrder(null);
      await fetchOrders();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Lỗi hủy đơn', 'error');
    }
  };

  // Gán đơn vị vận chuyển
  const handleAssignCarrier = async () => {
    if (!carrierModalOrder) return;
    try {
      const res = await api.assignCarrier(carrierModalOrder.id, selectedCarrier);
      showToast(`Đã chọn ${selectedCarrier}! Mã vận đơn được sinh tự động: ${res.tracking_code}`, 'success');
      setCarrierModalOrder(null);
      await fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Lỗi gán vận chuyển', 'error');
    }
  };

  // Thêm sự kiện vận chuyển
  const handleAddShipmentEvent = async () => {
    if (!shipmentEventModalOrder) return;
    try {
      await api.addShipmentEvent(shipmentEventModalOrder.id, {
        status: eventStatus,
        location: eventLocation,
        note: eventNote
      });
      showToast('Đã gửi báo cáo vận chuyển thành công!', 'success');
      setShipmentEventModalOrder(null);
      await fetchOrders();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Lỗi gửi sự kiện', 'error');
    }
  };

  const eventSuggestions = [
    { status: 'Đã bàn giao cho đơn vị vận chuyển', note: 'Kiện hàng đã được bọc bóng khí và bàn giao cho bưu tá' },
    { status: 'Đã đến kho phân loại', note: 'Kiện hàng đang được scan mã vạch và phân luồng tuyến giao' },
    { status: 'Đang giao hàng', note: 'Bưu tá đang trên đường giao hàng đến địa chỉ người nhận' },
    { status: 'Giao hàng thành công', note: 'Khách hàng đã nhận hàng và ký nhận đầy đủ' },
    { status: 'Giao hàng thất bại - hẹn giao lại', note: 'Khách hàng bận, hẹn giao lại vào ngày làm việc tiếp theo' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Seller Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8D8]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#08482D] uppercase tracking-wider">
            <Store className="w-4 h-4" />
            Kênh Quản Trị Người Bán (Admin)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101410] mt-1">
            Bảng điều khiển Tiệm Đồ Cũ Còn Thương
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewPreview && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewPreview}
              className="text-xs"
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-[#08482D]" />
              <span>Xem cửa hàng</span>
            </Button>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-wrap bg-[#DAE7C7]/50 p-1.5 rounded-full text-xs font-bold border border-[#E2E8D8] gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-full transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            Tổng quan (KPI)
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'shipping'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Vận chuyển (Kanban)</span>
            {stats && (stats.status_counts.confirmed > 0 || stats.status_counts.shipping > 0) && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'shipping' ? 'bg-[#DAE7C7] text-[#08482D]' : 'bg-[#08482D] text-white'
              }`}>
                {(stats.status_counts.confirmed || 0) + (stats.status_counts.shipping || 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-full transition-all ${
              activeTab === 'orders'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            Quản lý Đơn hàng
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-full transition-all ${
              activeTab === 'products'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            Quản lý Kho sản phẩm
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Mã giảm giá</span>
          </button>
        </div>
        </div>
      </div>

      {/* TAB: VẬN CHUYỂN (KANBAN) */}
      {activeTab === 'shipping' && (
        <SellerShippingKanban
          onRefreshStats={fetchStats}
          onViewOrderDetail={(ord) => {
            setSelectedOrder(ord);
            setActiveTab('orders');
          }}
        />
      )}

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          {loadingStats || !stats ? (
            <div className="p-12 text-center bg-[#FFFFFF] rounded-3xl border border-[#E2E8D8]">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C2522D] mx-auto mb-2" />
              <p className="text-sm text-[#786F66]">Đang tải dữ liệu kinh doanh...</p>
            </div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-[#E6DFD5] space-y-2">
                  <div className="flex items-center justify-between text-[#786F66]">
                    <span className="text-xs font-semibold uppercase">Tổng doanh thu</span>
                    <DollarSign className="w-4 h-4 text-[#556B2F]" />
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#101410]">
                    {formatVND(stats.total_revenue)}
                  </div>
                  <span className="text-[11px] text-[#556B2F] font-medium block">
                    Doanh thu từ đơn thanh toán
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E6DFD5] space-y-2">
                  <div className="flex items-center justify-between text-[#786F66]">
                    <span className="text-xs font-semibold uppercase">Tổng đơn hàng</span>
                    <Package className="w-4 h-4 text-[#3E7B88]" />
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#101410]">
                    {stats.total_orders}
                  </div>
                  <span className="text-[11px] text-[#786F66] block">
                    {stats.status_counts.pending} đơn chờ xác nhận
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E6DFD5] space-y-2">
                  <div className="flex items-center justify-between text-[#786F66]">
                    <span className="text-xs font-semibold uppercase">Đang giao hàng</span>
                    <Truck className="w-4 h-4 text-[#1967D2]" />
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#1967D2]">
                    {stats.status_counts.shipping}
                  </div>
                  <span className="text-[11px] text-[#786F66] block">
                    {stats.status_counts.delivered} đơn đã tới nơi
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E6DFD5] space-y-2">
                  <div className="flex items-center justify-between text-[#786F66]">
                    <span className="text-xs font-semibold uppercase">Tồn kho thấp (&le;1)</span>
                    <AlertTriangle className="w-4 h-4 text-[#D97746]" />
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#D97746]">
                    {stats.low_stock_count}
                  </div>
                  <span className="text-[11px] text-[#786F66] block">
                    Đồ cũ số lượng độc bản
                  </span>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="p-6 rounded-3xl bg-white border border-[#E6DFD5] space-y-4">
                <h3 className="text-lg font-bold text-[#101410]">
                  Phân bố đơn hàng theo trạng thái
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#F5EEDC] border border-[#E8DEC8]">
                    <span className="text-xs font-bold text-[#8A6D3B] block">Chờ xác nhận</span>
                    <span className="font-mono text-xl font-bold text-[#8A6D3B]">
                      {stats.status_counts.pending}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#EBF3F5] border border-[#D5E5EA]">
                    <span className="text-xs font-bold text-[#3E7B88] block">Chờ lấy hàng</span>
                    <span className="font-mono text-xl font-bold text-[#3E7B88]">
                      {stats.status_counts.confirmed}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#E8F0FE] border border-[#D0E1FD]">
                    <span className="text-xs font-bold text-[#1967D2] block">Đang giao</span>
                    <span className="font-mono text-xl font-bold text-[#1967D2]">
                      {stats.status_counts.shipping}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#EBF5EE] border border-[#D4EADA]">
                    <span className="text-xs font-bold text-[#337A47] block">Đã giao</span>
                    <span className="font-mono text-xl font-bold text-[#337A47]">
                      {stats.status_counts.delivered}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#EAF4EB] border border-[#D2E7D4]">
                    <span className="text-xs font-bold text-[#2E7D32] block">Hoàn thành</span>
                    <span className="font-mono text-xl font-bold text-[#2E7D32]">
                      {stats.status_counts.completed}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBEAEB] border border-[#F5D0D2]">
                    <span className="text-xs font-bold text-[#C53929] block">Đã hủy</span>
                    <span className="font-mono text-xl font-bold text-[#C53929]">
                      {stats.status_counts.cancelled}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="p-6 rounded-3xl bg-white border border-[#E6DFD5] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#101410]">
                    Các đơn hàng vừa đặt gần đây
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#47533E] hover:underline flex items-center gap-1"
                  >
                    Xem tất cả đơn <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E6DFD5] text-[#786F66]">
                        <th className="pb-3 font-semibold">Mã đơn</th>
                        <th className="pb-3 font-semibold">Khách hàng</th>
                        <th className="pb-3 font-semibold">Món hàng</th>
                        <th className="pb-3 font-semibold">Tổng tiền</th>
                        <th className="pb-3 font-semibold">Trạng thái</th>
                        <th className="pb-3 font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE3]">
                      {stats.recent_orders.map(ord => (
                        <tr key={ord.id} className="hover:bg-[#FAF7F2]">
                          <td className="py-3 font-mono font-bold text-[#101410]">{ord.code}</td>
                          <td className="py-3 text-[#101410]">
                            <div className="font-semibold">{ord.buyer_name}</div>
                            <div className="text-[10px] text-stone-500">{ord.phone}</div>
                          </td>
                          <td className="py-3 text-[#524B46]">
                            {ord.items?.map(i => i.product_name).join(', ')}
                          </td>
                          <td className="py-3 font-mono font-bold text-[#101410]">
                            {formatVND(ord.total)}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getOrderStatusBadge(ord.status).bg} ${getOrderStatusBadge(ord.status).text}`}>
                              {getOrderStatusBadge(ord.status).label}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setActiveTab('orders');
                              }}
                              className="px-2.5 py-1 bg-[#47533E] text-white rounded-lg text-[11px] font-semibold hover:bg-[#384331]"
                            >
                              Xử lý đơn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: ORDER MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Status Filter Bar & Bulk Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#E6DFD5]">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['all', 'pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'].map(st => (
                <button
                  key={st}
                  onClick={() => {
                    setOrderStatusFilter(st);
                    setSelectedOrder(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    orderStatusFilter === st
                      ? 'bg-[#47533E] text-white shadow-2xs'
                      : 'bg-white border border-[#E6DFD5] text-[#6B635A] hover:bg-[#EFE9DF]'
                  }`}
                >
                  {st === 'all' ? 'Tất cả đơn' : getOrderStatusBadge(st).label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Nút Duyệt hàng loạt */}
              {selectedOrderIds.length > 0 && (
                <button
                  onClick={handleBulkConfirm}
                  disabled={bulkApproveLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#08482D] hover:bg-[#4d5c3b] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {bulkApproveLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckSquare className="w-3.5 h-3.5" />
                  )}
                  <span>Duyệt đơn đã chọn ({selectedOrderIds.length})</span>
                </button>
              )}

              {/* Nút Xuất báo cáo CSV */}
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8D8] text-xs font-semibold text-[#101410] hover:bg-[#FAF7F2] shadow-2xs"
                title="Tải báo cáo đơn hàng định dạng CSV (UTF-8 BOM cho Excel)"
              >
                <Download className="w-3.5 h-3.5 text-[#C2522D]" />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={() => fetchOrders()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E6DFD5] text-xs font-semibold text-[#524B46] hover:bg-[#FAF7F2]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Làm mới
              </button>
            </div>
          </div>

          {/* Bulk Select All bar if orders exist */}
          {orders.length > 0 && (
            <div className="flex items-center justify-between text-xs text-[#5E5E61] px-2">
              <button
                onClick={handleSelectAllOrders}
                className="flex items-center gap-1.5 hover:text-[#101410] font-medium"
              >
                {selectedOrderIds.length === orders.length ? (
                  <CheckSquare className="w-4 h-4 text-[#08482D]" />
                ) : (
                  <Square className="w-4 h-4 text-[#E2E8D8]" />
                )}
                <span>Chọn tất cả ({orders.length} đơn)</span>
              </button>
              {selectedOrderIds.length > 0 && (
                <span className="text-xs font-semibold text-[#C2522D]">
                  Đã chọn {selectedOrderIds.length} đơn
                </span>
              )}
            </div>
          )}

          {/* Orders Master-Detail Layout */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Orders list on left */}
            <div className={`space-y-4 ${selectedOrder ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              {loadingOrders ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#E6DFD5]">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#47533E] mx-auto mb-2" />
                  <p className="text-sm text-[#786F66]">Đang tải danh sách đơn...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#E6DFD5]">
                  <p className="text-sm text-[#786F66]">Không có đơn hàng nào theo bộ lọc này.</p>
                </div>
              ) : (
                orders.map(ord => {
                  const isSelected = selectedOrder?.id === ord.id;
                  const isChecked = selectedOrderIds.includes(ord.id);
                  const statusBadge = getOrderStatusBadge(ord.status);
                  const payBadge = getPaymentStatusBadge(ord.payment_status);

                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md relative ${
                        isSelected
                          ? 'border-[#47533E] ring-2 ring-[#47533E]/20 bg-[#FAFBF9]'
                          : 'border-[#E6DFD5]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE3]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleOrderSelect(ord.id);
                            }}
                            className="p-1 text-[#5E5E61] hover:text-[#101410]"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#08482D]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#E2E8D8]" />
                            )}
                          </button>
                          <div>
                            <span className="font-mono text-xs font-bold text-[#101410]">{ord.code}</span>
                            <span className="text-[10px] text-stone-400 block">{formatDate(ord.created_at)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="py-2.5 text-xs text-[#524B46] space-y-1">
                        <div><strong>Khách:</strong> {ord.buyer_name} ({ord.phone})</div>
                        <div className="text-stone-500 truncate"><strong>Địa chỉ:</strong> {ord.address}</div>
                        <div>
                          <strong>Món:</strong> {ord.items?.map(i => `${i.product_name} (x${i.quantity})`).join(', ')}
                        </div>
                        {ord.coupon_code && (
                          <div className="text-[11px] text-[#08482D]">
                            Mã giảm: <span className="font-mono font-bold">{ord.coupon_code}</span> (-{formatVND(ord.discount_amount || 0)})
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#F2ECE3] flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${payBadge.bg} ${payBadge.text}`}>
                          {payBadge.label}
                        </span>
                        <span className="font-mono text-sm font-bold text-[#101410]">
                          {formatVND(ord.total)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected order detail and seller actions on right */}
            {selectedOrder && (
              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E6DFD5] p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
                <div className="flex items-start justify-between pb-4 border-b border-[#E6DFD5]">
                  <div>
                    <span className="text-xs font-bold text-[#556B2F] uppercase block mb-1">
                      Xử lý đơn hàng
                    </span>
                    <h3 className="text-2xl font-bold text-[#101410]">
                      {selectedOrder.code}
                    </h3>
                    <span className="text-xs text-stone-400">
                      Tạo lúc: {formatDate(selectedOrder.created_at)}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${getOrderStatusBadge(selectedOrder.status).bg} ${getOrderStatusBadge(selectedOrder.status).text}`}>
                      {getOrderStatusBadge(selectedOrder.status).label}
                    </span>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getPaymentStatusBadge(selectedOrder.payment_status).bg} ${getPaymentStatusBadge(selectedOrder.payment_status).text}`}>
                        {getPaymentStatusBadge(selectedOrder.payment_status).label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seller Workflow Control Bar */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E6DFD5] space-y-3">
                  <span className="text-xs font-bold text-[#101410] uppercase tracking-wider block">
                    Hành động của người bán:
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {/* 1. DUYỆT ĐƠN: pending -> confirmed */}
                    {selectedOrder.status === 'pending' && (
                      <button
                        onClick={() => handleApproveOrder(selectedOrder.id)}
                        className="px-4 py-2 bg-[#47533E] hover:bg-[#384331] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Duyệt đơn này (Chờ lấy hàng)
                      </button>
                    )}

                    {/* 2. CHỌN ĐƠN VỊ VẬN CHUYỂN */}
                    {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'shipping') && (
                      <button
                        onClick={() => setCarrierModalOrder(selectedOrder)}
                        className="px-4 py-2 bg-white border border-[#D8CEBE] hover:bg-[#FAF7F2] text-[#101410] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Truck className="w-4 h-4 text-[#47533E]" />
                        {selectedOrder.carrier ? 'Đổi đơn vị vận chuyển' : 'Chọn đơn vị vận chuyển'}
                      </button>
                    )}

                    {/* 3. IN PHIẾU GIAO HÀNG A6 */}
                    {selectedOrder.carrier && selectedOrder.status !== 'cancelled' && (
                      <button
                        onClick={() => setLabelModalOrder(selectedOrder)}
                        className="px-4 py-2 bg-[#101410] hover:bg-[#382b22] text-[#F5F8EF] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Printer className="w-4 h-4 text-[#C2522D]" />
                        In phiếu giao hàng (A6)
                      </button>
                    )}

                    {/* 4. GỬI BÁO CÁO VẬN CHUYỂN (Thêm sự kiện timeline) */}
                    {selectedOrder.status !== 'cancelled' && (
                      <button
                        onClick={() => setShipmentEventModalOrder(selectedOrder)}
                        className="px-4 py-2 bg-white border border-[#D8CEBE] hover:bg-[#FAF7F2] text-[#101410] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Send className="w-4 h-4 text-[#1967D2]" />
                        Gửi báo cáo tình trạng giao hàng
                      </button>
                    )}

                    {/* 5. HỦY ĐƠN: Cho phép khi pending hoặc confirmed */}
                    {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                      <button
                        onClick={() => setCancelModalOrder(selectedOrder)}
                        className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Hủy đơn & hoàn kho
                      </button>
                    )}
                  </div>
                </div>

                {/* Recipient & Shipping Info */}
                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-white border border-[#E6DFD5]">
                    <span className="text-[#786F66] block font-semibold mb-1">Khách hàng & Địa chỉ:</span>
                    <div className="font-bold text-[#101410]">{selectedOrder.recipient_name} ({selectedOrder.phone})</div>
                    <div className="text-stone-600 mt-1 leading-relaxed">{selectedOrder.address}</div>
                    {selectedOrder.note && (
                      <div className="mt-2 text-stone-500 italic">"Ghi chú: {selectedOrder.note}"</div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#E6DFD5]">
                    <span className="text-[#786F66] block font-semibold mb-1">Vận chuyển & Thanh toán:</span>
                    <div>Đơn vị: <strong>{selectedOrder.carrier || 'Chưa gán'}</strong></div>
                    <div>Mã vận đơn: <strong className="font-mono text-[#47533E]">{selectedOrder.tracking_code || 'Chưa có'}</strong></div>
                    <div className="mt-1">
                      Phương thức: <strong>{selectedOrder.payment_method === 'cod' ? 'Tiền mặt COD' : selectedOrder.card_type}</strong>
                    </div>
                  </div>
                </div>

                {/* Ordered Items Table */}
                <div>
                  <h4 className="text-xs font-bold text-[#101410] uppercase tracking-wider mb-2">
                    Sản phẩm trong đơn ({selectedOrder.items?.length})
                  </h4>
                  <div className="border border-[#E6DFD5] rounded-xl overflow-hidden divide-y divide-[#F2ECE3]">
                    {selectedOrder.items?.map(it => (
                      <div key={it.id} className="p-3 flex items-center justify-between text-xs bg-white">
                        <div className="flex items-center gap-3">
                          <img src={it.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-stone-100" />
                          <div>
                            <div className="font-bold text-[#101410]">{it.product_name}</div>
                            <div className="text-stone-500">Độ mới {it.condition_pct}% · Số lượng: {it.quantity}</div>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-[#101410]">
                          {formatVND(it.price * it.quantity)}
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-[#FAF7F2] flex justify-between text-xs font-bold text-[#101410]">
                      <span>Tổng tiền thu:</span>
                      <span className="font-mono text-sm">{formatVND(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Báo cáo Vận chuyển đã gửi */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#101410] uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#47533E]" />
                    Lịch sử sự kiện vận chuyển đã ghi nhận
                  </h4>

                  <div className="border-l-2 border-[#D8CEBE] ml-3 pl-4 space-y-3">
                    {selectedOrder.shipment_events?.map((ev, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-[#47533E] ring-4 ring-white" />
                        <div className="text-xs font-bold text-[#101410]">
                          {ev.status} · {ev.location}
                        </div>
                        <div className="text-[10px] text-stone-400">{formatDate(ev.created_at)}</div>
                        {ev.note && <p className="text-xs text-stone-600 mt-0.5">{ev.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT INVENTORY MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6DFD5]">
            <div>
              <h3 className="text-xl font-bold text-[#101410]">
                Danh sách đồ cũ trong kho
              </h3>
              <p className="text-xs text-[#786F66]">
                Quản lý số lượng tồn kho, cập nhật giá bán, độ mới và tình trạng thực tế của từng món.
              </p>
            </div>

            <button
              onClick={() => handleOpenProductModal('add')}
              className="px-4 py-2.5 rounded-xl bg-[#47533E] hover:bg-[#384331] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Thêm món đồ cũ mới
            </button>
          </div>

          {loadingProducts ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E6DFD5]">
              <RefreshCw className="w-8 h-8 animate-spin text-[#47533E] mx-auto mb-2" />
              <p className="text-sm text-[#786F66]">Đang tải kho hàng...</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E6DFD5] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#E6DFD5] text-[#786F66]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Ảnh</th>
                      <th className="py-3 px-4 font-semibold">Tên món đồ</th>
                      <th className="py-3 px-4 font-semibold">Danh mục</th>
                      <th className="py-3 px-4 font-semibold">Giá bán</th>
                      <th className="py-3 px-4 font-semibold">Độ mới</th>
                      <th className="py-3 px-4 font-semibold">Tồn kho</th>
                      <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2ECE3]">
                    {products.map(prod => (
                      <tr key={prod.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-3 px-4">
                          <img src={prod.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-[#F4EFEA]" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#101410]">{prod.name}</div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">{prod.condition_detail}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#524B46]">{prod.category}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#101410]">
                          {formatVND(prod.price)}
                          {prod.original_price > prod.price && (
                            <span className="block text-[10px] text-stone-400 line-through">
                              {formatVND(prod.original_price)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF5EE] text-[#337A47]">
                            {prod.condition_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={prod.stock <= 1 ? 'text-[#D97746]' : 'text-[#101410]'}>
                            {prod.stock} món
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenProductModal('edit', prod)}
                            className="p-1.5 text-stone-500 hover:text-[#47533E] rounded-lg hover:bg-stone-100"
                            title="Sửa sản phẩm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 text-stone-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COUPON MANAGEMENT */}
      {activeTab === 'coupons' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6DFD5]">
            <div>
              <h3 className="text-xl font-bold text-[#101410]">
                Quản lý Mã giảm giá (Coupons)
              </h3>
              <p className="text-xs text-[#786F66]">
                Thiết lập các mã khuyến mãi, chiết khấu theo %, giảm cố định hoặc miễn phí vận chuyển cho khách hàng.
              </p>
            </div>

            <button
              onClick={() => setCouponModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#C2522D] hover:bg-[#c24621] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tạo mã giảm giá mới
            </button>
          </div>

          {loadingCoupons ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E6DFD5]">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C2522D] mx-auto mb-2" />
              <p className="text-sm text-[#786F66]">Đang tải danh sách mã giảm giá...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E6DFD5]">
              <Tag className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-[#786F66]">Chưa có mã giảm giá nào trong hệ thống.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E6DFD5] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#E6DFD5] text-[#786F66]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Mã code</th>
                      <th className="py-3 px-4 font-semibold">Hình thức</th>
                      <th className="py-3 px-4 font-semibold">Mức giảm</th>
                      <th className="py-3 px-4 font-semibold">Đơn tối thiểu</th>
                      <th className="py-3 px-4 font-semibold">Giảm tối đa</th>
                      <th className="py-3 px-4 font-semibold text-center">Đã sử dụng</th>
                      <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                      <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2ECE3]">
                    {coupons.map(cpn => (
                      <tr key={cpn.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#C2522D]">
                          {cpn.code}
                        </td>
                        <td className="py-3.5 px-4 text-[#101410]">
                          {cpn.type === 'percent' && 'Giảm phần trăm (%)'}
                          {cpn.type === 'fixed' && 'Giảm tiền cố định'}
                          {cpn.type === 'shipping' && 'Miễn phí vận chuyển'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#101410]">
                          {cpn.type === 'percent' && `${cpn.value}%`}
                          {cpn.type === 'fixed' && formatVND(cpn.value)}
                          {cpn.type === 'shipping' && '100% Phí ship'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#524B46]">
                          {formatVND(cpn.min_order_amount)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#524B46]">
                          {cpn.max_discount ? formatVND(cpn.max_discount) : 'Không giới hạn'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-center text-[#101410]">
                          {cpn.usage_count || 0} lượt
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleCoupon(cpn.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                              cpn.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                            }`}
                          >
                            {cpn.is_active ? '● Đang bật' : '○ Đã tắt'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(cpn.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xóa mã giảm giá"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TẠO MÃ GIẢM GIÁ */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 sm:p-8 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD5]">
              <h3 className="text-xl font-bold text-[#101410] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#C2522D]" />
                Tạo mã giảm giá mới
              </h3>
              <button onClick={() => setCouponModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Mã Code (viết liền, in hoa) *</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().trim() })}
                  placeholder="VD: DOCUMOI20"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Loại giảm giá *</label>
                <select
                  value={couponForm.type}
                  onChange={e => setCouponForm({ ...couponForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                >
                  <option value="percent">Giảm theo phần trăm (%)</option>
                  <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
                  <option value="shipping">Miễn phí vận chuyển (Freeship)</option>
                </select>
              </div>

              {couponForm.type !== 'shipping' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#524B46] block mb-1">
                      {couponForm.type === 'percent' ? 'Mức giảm (%)' : 'Số tiền giảm (VNĐ)'} *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={couponForm.value}
                      onChange={e => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#524B46] block mb-1">Giảm tối đa (VNĐ)</label>
                    <input
                      type="number"
                      min={0}
                      value={couponForm.max_discount || 0}
                      onChange={e => setCouponForm({ ...couponForm, max_discount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Giá trị đơn hàng tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={couponForm.min_order_amount}
                  onChange={e => setCouponForm({ ...couponForm, min_order_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E6DFD5]">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-[#D8CEBE] text-stone-600 text-xs font-semibold hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#C2522D] text-white text-xs font-bold hover:bg-[#c24621] shadow-xs"
                >
                  Tạo mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {productModal.open && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD5]">
              <h3 className="text-xl font-bold text-[#101410]">
                {productModal.mode === 'add' ? 'Thêm món đồ cũ mới' : 'Chỉnh sửa sản phẩm'}
              </h3>
              <button onClick={() => setProductModal({ open: false, mode: 'add' })} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Tên món đồ *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="Áo khoác vintage..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Danh mục *</label>
                  <select
                    value={prodForm.category}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                  >
                    <option>Thời trang</option>
                    <option>Điện tử</option>
                    <option>Máy ảnh</option>
                    <option>Sách</option>
                    <option>Nhạc cụ</option>
                    <option>Phụ kiện</option>
                    <option>Gia dụng</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Độ mới (%) *</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    required
                    value={prodForm.condition_pct}
                    onChange={e => setProdForm({ ...prodForm, condition_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.price}
                    onChange={e => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Giá gốc (VNĐ)</label>
                  <input
                    type="number"
                    value={prodForm.original_price}
                    onChange={e => setProdForm({ ...prodForm, original_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Số lượng tồn kho</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodForm.stock}
                    onChange={e => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Mô tả tình trạng chi tiết *</label>
                <textarea
                  required
                  rows={3}
                  value={prodForm.condition_detail}
                  onChange={e => setProdForm({ ...prodForm, condition_detail: e.target.value })}
                  placeholder="Mô tả vết trầy, tình trạng hoạt động..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">URL ảnh minh họa</label>
                <input
                  type="text"
                  value={prodForm.image_url}
                  onChange={e => setProdForm({ ...prodForm, image_url: e.target.value })}
                  placeholder="Để trống sẽ tự sinh ảnh SVG đẹp"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>

              <div className="pt-3 border-t border-[#E6DFD5] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductModal({ open: false, mode: 'add' })}
                  className="px-4 py-2 border border-[#D8CEBE] rounded-xl text-stone-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#47533E] text-white rounded-xl font-bold hover:bg-[#384331]"
                >
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GÁN ĐƠN VỊ VẬN CHUYỂN */}
      {carrierModalOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD5]">
              <h3 className="text-lg font-bold text-[#101410] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#47533E]" />
                Chọn đối tác vận chuyển
              </h3>
              <button onClick={() => setCarrierModalOrder(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#524B46] leading-relaxed">
              Hệ thống sẽ tự động sinh mã vận đơn theo đúng chuẩn của đơn vị vận chuyển đã chọn và thông báo đến khách hàng.
            </p>

            <div className="space-y-2">
              {[
                { name: 'Giao Hàng Nhanh', prefix: 'GHN' },
                { name: 'Giao Hàng Tiết Kiệm', prefix: 'GHTK' },
                { name: 'Viettel Post', prefix: 'VTP' },
                { name: 'J&T Express', prefix: 'JNT' },
                { name: 'SPX Express', prefix: 'SPX' }
              ].map(c => (
                <label
                  key={c.name}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                    selectedCarrier === c.name
                      ? 'border-[#47533E] bg-[#F2F5EF] font-bold text-[#101410]'
                      : 'border-[#E6DFD5] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="carrier"
                      checked={selectedCarrier === c.name}
                      onChange={() => setSelectedCarrier(c.name)}
                      className="accent-[#47533E]"
                    />
                    <span>{c.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-stone-500">Mã: {c.prefix}******VN</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setCarrierModalOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-[#D8CEBE] text-stone-600 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={handleAssignCarrier}
                className="py-2.5 px-4 rounded-xl bg-[#47533E] text-white text-xs font-bold hover:bg-[#384331]"
              >
                Xác nhận gán đối tác
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GỬI BÁO CÁO VẬN CHUYỂN */}
      {shipmentEventModalOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD5]">
              <h3 className="text-lg font-bold text-[#101410] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#1967D2]" />
                Báo cáo tình trạng giao hàng ({shipmentEventModalOrder.code})
              </h3>
              <button onClick={() => setShipmentEventModalOrder(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#524B46] leading-relaxed">
              Mỗi báo cáo được lưu vào cơ sở dữ liệu và hiển thị ngay trên timeline của khách hàng. Với đơn COD, khi báo cáo "Giao hàng thành công", trạng thái thanh toán sẽ tự chuyển thành "Đã thanh toán".
            </p>

            {/* Event Suggestions */}
            <div>
              <span className="text-[11px] font-bold text-[#786F66] uppercase block mb-1.5">
                Gợi ý sự kiện nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {eventSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEventStatus(sug.status);
                      setEventNote(sug.note);
                    }}
                    className="text-[11px] px-2.5 py-1 bg-[#FAF7F2] border border-[#E6DFD5] rounded-lg text-[#47533E] hover:bg-[#EFE9DF] font-medium"
                  >
                    {sug.status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Trạng thái sự kiện *</label>
                <input
                  type="text"
                  required
                  value={eventStatus}
                  onChange={e => setEventStatus(e.target.value)}
                  placeholder="Đang giao hàng / Giao hàng thành công..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Vị trí hiện tại của kiện hàng *</label>
                <input
                  type="text"
                  required
                  value={eventLocation}
                  onChange={e => setEventLocation(e.target.value)}
                  placeholder="Kho phân loại Củ Chi, TP.HCM"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">Ghi chú chi tiết cho khách</label>
                <textarea
                  rows={2}
                  value={eventNote}
                  onChange={e => setEventNote(e.target.value)}
                  placeholder="Bưu tá đang liên hệ khách hàng..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E6DFD5]">
              <button
                onClick={() => setShipmentEventModalOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-[#D8CEBE] text-stone-600 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleAddShipmentEvent}
                className="py-2.5 px-4 rounded-xl bg-[#1967D2] text-white text-xs font-bold hover:bg-[#1656B3]"
              >
                Cập nhật timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HỦY ĐƠN (NGƯỜI BÁN) */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#D8CEBE] shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD5]">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Người bán hủy đơn {cancelModalOrder.code}
              </h3>
              <button onClick={() => setCancelModalOrder(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#524B46] leading-relaxed">
              Tồn kho của các sản phẩm trong đơn sẽ được tự động hoàn lại. Nếu đơn đã thanh toán qua thẻ, trạng thái thanh toán sẽ tự động chuyển thành <strong>"Đã hoàn tiền (mô phỏng)"</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#101410] block">Lý do hủy đơn:</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Nhập lý do gửi đến khách hàng..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-[#D8CEBE] text-stone-600 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={handleCancelOrderSubmit}
                className="py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Xác nhận hủy & hoàn kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PHIẾU GIAO HÀNG A6 */}
      <ShippingLabelModal
        order={labelModalOrder}
        isOpen={!!labelModalOrder}
        onClose={() => setLabelModalOrder(null)}
      />
    </div>
  );
};
