import React, { useState, useEffect } from 'react';
import { 
  Store, Package, ShoppingBag, DollarSign, TrendingUp, AlertTriangle, 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Truck, Send, Clock, 
  MapPin, RefreshCw, X, ChevronRight, Eye, Printer, Download, Tag, Percent, CheckSquare, Square,
  MessageSquare, RotateCcw, Sparkles, ShieldAlert
} from 'lucide-react';
import { Product, Order, SellerStats, Coupon, Offer, ChatConversation, ChatMessage, ReturnRequest, ProductFlaw } from '../types';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shipping' | 'orders' | 'products' | 'coupons' | 'offers' | 'chat' | 'returns'>('dashboard');

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
    image_url: '',
    imagesText: '',
    flawsText: '',
    inspector_name: 'Nguyễn Văn Minh (KTV-04)',
    inspection_date: new Date().toISOString().split('T')[0]
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

  // MARKETPLACE OFFERS (TRẢ GIÁ)
  const [sellerOffers, setSellerOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [counterModalOffer, setCounterModalOffer] = useState<Offer | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<number>(0);
  const [counterNoteInput, setCounterNoteInput] = useState<string>('');
  const [rejectModalOffer, setRejectModalOffer] = useState<Offer | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  // MARKETPLACE CHAT (TIN NHẮN)
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [sendingChatMsg, setSendingChatMsg] = useState(false);
  const [chatWarning, setChatWarning] = useState<string | null>(null);

  // MARKETPLACE RETURNS (TRẢ HÀNG / HOÀN TIỀN)
  const [sellerReturns, setSellerReturns] = useState<ReturnRequest[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [returnActionModal, setReturnActionModal] = useState<{ open: boolean; item?: ReturnRequest; targetStatus: string }>({ open: false, targetStatus: '' });
  const [returnSellerNote, setReturnSellerNote] = useState('');

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

  const fetchOffers = async () => {
    setLoadingOffers(true);
    try {
      const res = await api.getSellerOffers();
      setSellerOffers(res.offers || []);
    } catch (err: any) {
      console.error('Fetch offers error:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchChat = async () => {
    setLoadingChat(true);
    try {
      const res = await api.getChatConversations();
      setChatConversations(res.conversations || []);
      if (activeConversation) {
        const refreshed = (res.conversations || []).find((c: any) => c.id === activeConversation.id);
        if (refreshed) {
          const detail = await api.getChatDetail(refreshed.id);
          setActiveConversation(detail.conversation);
        }
      }
    } catch (err: any) {
      console.error('Fetch chat error:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const fetchReturns = async () => {
    setLoadingReturns(true);
    try {
      const res = await api.getSellerReturns();
      setSellerReturns(res.return_requests || []);
    } catch (err: any) {
      console.error('Fetch returns error:', err);
    } finally {
      setLoadingReturns(false);
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
    fetchStats();
    fetchOffers();
    fetchChat();
    fetchReturns();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'coupons') fetchCoupons();
    if (activeTab === 'offers') fetchOffers();
    if (activeTab === 'chat') fetchChat();
    if (activeTab === 'returns') fetchReturns();
  }, [activeTab, orderStatusFilter]);

  // Polling cho đơn hàng, tin nhắn và trả giá mỗi 5-10 giây
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'dashboard') fetchStats();
      if (activeTab === 'orders') fetchOrders(true);
      if (activeTab === 'chat') fetchChat();
      if (activeTab === 'offers') fetchOffers();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeTab, orderStatusFilter, selectedOrder?.id, activeConversation?.id]);

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
      let imgs: string[] = [];
      if (Array.isArray(item.images)) imgs = item.images;
      else if (typeof item.images === 'string') {
        try { imgs = JSON.parse(item.images); } catch(e) { imgs = [item.images]; }
      }
      let flawsArr: any[] = [];
      if (Array.isArray(item.flaws)) flawsArr = item.flaws;
      else if (typeof item.flaws === 'string') {
        try { flawsArr = JSON.parse(item.flaws); } catch(e) { flawsArr = []; }
      }

      setProdForm({
        name: item.name,
        category: item.category,
        price: item.price,
        original_price: item.original_price,
        condition_pct: item.condition_pct,
        condition_detail: item.condition_detail,
        stock: item.stock,
        image_url: item.image_url,
        imagesText: imgs.join('\n'),
        flawsText: flawsArr.map(f => `${f.location || ''} | ${f.description} | ${f.photo_url || ''}`).join('\n'),
        inspector_name: item.inspector_name || 'Nguyễn Văn Minh (KTV-04)',
        inspection_date: item.inspection_date ? item.inspection_date.split('T')[0] : new Date().toISOString().split('T')[0]
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
        image_url: '',
        imagesText: '',
        flawsText: '',
        inspector_name: 'Nguyễn Văn Minh (KTV-04)',
        inspection_date: new Date().toISOString().split('T')[0]
      });
      setProductModal({ open: true, mode: 'add' });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedImages = prodForm.imagesText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      
      const parsedFlaws = prodForm.flawsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length >= 3) {
            return { location: parts[0], description: parts[1], photo_url: parts[2] };
          } else if (parts.length === 2) {
            return { location: parts[0], description: parts[1] };
          }
          return { description: parts[0] };
        });

      const payload = {
        name: prodForm.name,
        category: prodForm.category,
        price: prodForm.price,
        original_price: prodForm.original_price,
        condition_pct: prodForm.condition_pct,
        condition_detail: prodForm.condition_detail,
        stock: prodForm.stock,
        image_url: prodForm.image_url || (parsedImages[0] || ''),
        images: parsedImages.length > 0 ? parsedImages : undefined,
        flaws: parsedFlaws.length > 0 ? parsedFlaws : undefined,
        inspector_name: prodForm.inspector_name,
        inspection_date: prodForm.inspection_date
      };

      if (productModal.mode === 'add') {
        await api.createProduct(payload);
        showToast('Đã thêm sản phẩm mới vào kho', 'success');
      } else if (productModal.item) {
        await api.updateProduct(productModal.item.id, payload);
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

  // MARKETPLACE HANDLERS: OFFERS / TRẢ GIÁ
  const handleAcceptOffer = async (id: number) => {
    try {
      await api.acceptOffer(id);
      showToast('Đã chấp nhận lời trả giá của khách hàng!', 'success');
      await fetchOffers();
    } catch (err: any) {
      showToast(err.message || 'Lỗi chấp nhận lời trả giá', 'error');
    }
  };

  const handleCounterOffer = async () => {
    if (!counterModalOffer) return;
    if (counterPriceInput <= counterModalOffer.offered_price || counterPriceInput >= counterModalOffer.original_price) {
      showToast('Mức giá đề nghị lại phải cao hơn giá khách trả và thấp hơn giá niêm yết', 'error');
      return;
    }
    try {
      await api.counterOffer(counterModalOffer.id, counterPriceInput, counterNoteInput.trim() || undefined);
      showToast('Đã gửi giá thương lượng lại cho khách hàng!', 'success');
      setCounterModalOffer(null);
      await fetchOffers();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi trả giá lại', 'error');
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectModalOffer) return;
    try {
      await api.rejectOffer(rejectModalOffer.id, rejectReasonInput.trim() || undefined);
      showToast('Đã từ chối lời trả giá', 'info');
      setRejectModalOffer(null);
      await fetchOffers();
    } catch (err: any) {
      showToast(err.message || 'Lỗi từ chối lời trả giá', 'error');
    }
  };

  // MARKETPLACE HANDLERS: CHAT
  const handleSendChatMessage = async (presetText?: string) => {
    const text = (presetText || chatInputText).trim();
    if (!text || !activeConversation || sendingChatMsg) return;

    const phoneRegex = /(?:\+?84|0)(?:\s*[\.\-]?\s*\d){9,10}\b/;
    const urlRegex = /(?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.(?:com|vn|net|org|io|me|info|biz)\b/i;

    if (phoneRegex.test(text) || urlRegex.test(text)) {
      setChatWarning('Vì an toàn, vui lòng giao dịch trên Đồ Cũ Còn Thương. Hệ thống không cho phép chia sẻ số điện thoại hoặc liên kết ngoài.');
      return;
    }
    setChatWarning(null);

    try {
      setSendingChatMsg(true);
      await api.sendChatMessage(activeConversation.id, text);
      setChatInputText('');
      const detail = await api.getChatDetail(activeConversation.id);
      setActiveConversation(detail.conversation);
      await fetchChat();
    } catch (err: any) {
      setChatWarning(err.message || 'Lỗi gửi tin nhắn');
    } finally {
      setSendingChatMsg(false);
    }
  };

  // MARKETPLACE HANDLERS: RETURNS
  const handleUpdateReturnStatus = async (id: number, status: string, note?: string) => {
    try {
      const res = await api.updateReturnStatus(id, { status, seller_note: note });
      showToast(res.message || 'Đã cập nhật yêu cầu trả hàng!', 'success');
      setReturnActionModal({ open: false, targetStatus: '' });
      await fetchReturns();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật yêu cầu trả hàng', 'error');
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
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'offers'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Trả giá</span>
            {sellerOffers.filter(o => o.status === 'pending').length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                {sellerOffers.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tin nhắn</span>
            {chatConversations.reduce((acc, c) => acc + (c.seller_unread || 0), 0) > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold animate-pulse">
                {chatConversations.reduce((acc, c) => acc + (c.seller_unread || 0), 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'returns'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Trả hàng</span>
            {sellerReturns.filter(r => r.status === 'pending').length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500 text-white font-bold">
                {sellerReturns.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'bg-[#08482D] text-white shadow-xs'
                : 'text-[#5E5E61] hover:text-[#101410]'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
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

      {/* TAB: TRẢ GIÁ (OFFERS) */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8D8]">
            <div>
              <h2 className="text-xl font-bold text-[#101410] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#08482D]" />
                Quản lý Lời Trả Giá Từ Khách Hàng
              </h2>
              <p className="text-xs text-[#5E5E61] mt-0.5">
                Xem xét và thương lượng mức giá trực tiếp với người mua (hiệu lực 24 giờ)
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchOffers}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Làm mới
            </Button>
          </div>

          {loadingOffers ? (
            <div className="py-12 text-center text-xs text-[#5E5E61]">Đang tải danh sách lời trả giá...</div>
          ) : sellerOffers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E2E8D8] p-12 text-center">
              <Tag className="w-12 h-12 mx-auto text-[#DAE7C7] mb-2" />
              <h3 className="text-base font-bold text-[#101410] mb-1">Chưa có lời trả giá nào</h3>
              <p className="text-xs text-[#5E5E61]">Khi khách hàng bấm "Trả giá", yêu cầu sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sellerOffers.map(offer => {
                const discountPct = offer.original_price > 0
                  ? Math.round(((offer.original_price - offer.offered_price) / offer.original_price) * 100)
                  : 0;

                const isPending = offer.status === 'pending';
                const isAccepted = offer.status === 'accepted';
                const isCountered = offer.status === 'countered';
                const isRejected = offer.status === 'rejected';
                const isExpired = offer.status === 'expired';

                return (
                  <div key={offer.id} className="bg-white rounded-3xl border border-[#E2E8D8] p-5 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={offer.product_image}
                          alt={offer.product_name}
                          className="w-16 h-16 rounded-2xl object-cover bg-[#F5F8EF] border border-[#DAE7C7] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#101410] truncate">{offer.product_name}</h4>
                          <p className="text-xs text-[#5E5E61] mt-0.5">Khách: <strong>{offer.buyer_name || 'Khách hàng'}</strong> ({offer.buyer_phone})</p>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-[#5E5E61]">Giá gốc:</span>
                            <span className="line-through font-mono text-[#5E5E61]">{formatVND(offer.original_price)}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                        isAccepted ? 'bg-emerald-100 text-emerald-800' :
                        isCountered ? 'bg-blue-100 text-blue-800' :
                        isPending ? 'bg-amber-100 text-amber-900 font-bold' :
                        isExpired ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-800'
                      }`}>
                        {isAccepted ? 'Đã chấp nhận' :
                         isCountered ? 'Shop đã trả giá lại' :
                         isPending ? 'Chờ bạn phản hồi' :
                         isExpired ? 'Đã hết hạn' : 'Đã từ chối'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F5F8EF] border border-[#DAE7C7]/60 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5E5E61]">Khách đề xuất mua với:</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono font-bold text-base text-[#08482D]">{formatVND(offer.offered_price)}</span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Giảm {discountPct}%
                          </span>
                        </div>
                      </div>

                      {isCountered && offer.counter_price && (
                        <div className="flex justify-between items-center text-blue-900 pt-1.5 border-t border-[#DAE7C7]/60">
                          <span className="font-medium">Mức giá bạn đã đề nghị lại:</span>
                          <span className="font-mono font-bold text-sm text-blue-700">{formatVND(offer.counter_price)}</span>
                        </div>
                      )}

                      {offer.message && (
                        <p className="text-[11px] text-[#5E5E61] italic pt-1 border-t border-[#DAE7C7]/40">
                          <strong>Lời nhắn từ khách:</strong> "{offer.message}"
                        </p>
                      )}

                      {offer.seller_note && (
                        <p className="text-[11px] text-blue-800 pt-1 border-t border-blue-200">
                          <strong>Ghi chú của shop:</strong> {offer.seller_note}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-[#5E5E61] pt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Hết hạn lúc: {new Date(offer.expires_at).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>

                    {/* Action Buttons for Pending Offers */}
                    {isPending && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAcceptOffer(offer.id)}
                        >
                          Chấp nhận
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setCounterModalOffer(offer);
                            setCounterPriceInput(Math.round((offer.offered_price + offer.original_price) / 2));
                            setCounterNoteInput('');
                          }}
                        >
                          Trả giá lại
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRejectModalOffer(offer);
                            setRejectReasonInput('');
                          }}
                        >
                          Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: TIN NHẮN (CHAT) */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-[#E2E8D8] shadow-xs overflow-hidden h-[680px] flex flex-col md:flex-row">
          {/* Left: Conversation List */}
          <div className="md:w-5/12 border-b md:border-b-0 md:border-r border-[#E2E8D8] flex flex-col h-full bg-[#FBFDF8]">
            <div className="p-4 border-b border-[#E2E8D8] bg-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#101410] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#08482D]" />
                  Hộp thư tư vấn khách hàng
                </h3>
                <p className="text-[11px] text-[#5E5E61]">Tự động cập nhật mỗi 5 giây</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchChat}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8D8]">
              {loadingChat && chatConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#5E5E61]">Đang tải cuộc trò chuyện...</div>
              ) : chatConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5E5E61]">Chưa có khách hàng nhắn tin</div>
              ) : (
                chatConversations.map(conv => {
                  const isSelected = activeConversation?.id === conv.id;
                  const hasUnread = (conv.seller_unread || 0) > 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={async () => {
                        const detail = await api.getChatDetail(conv.id);
                        setActiveConversation(detail.conversation);
                        fetchChat();
                      }}
                      className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${
                        isSelected ? 'bg-[#DAE7C7]/40' : hasUnread ? 'bg-[#F5F8EF]' : 'hover:bg-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#08482D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {(conv.buyer_name || 'KH')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-[#101410] truncate">
                            {conv.buyer_name || 'Khách hàng'}
                          </h4>
                          <span className="text-[10px] text-[#5E5E61] shrink-0 font-mono">
                            {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#08482D] font-medium truncate mt-0.5">
                          {conv.product_name ? `SP: ${conv.product_name}` : conv.order_code ? `Đơn #${conv.order_code}` : ''}
                        </p>
                        <p className="text-xs text-[#5E5E61] truncate mt-0.5">
                          {conv.last_message || 'Bắt đầu cuộc trò chuyện'}
                        </p>
                      </div>
                      {hasUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Active Chat Window */}
          <div className="md:w-7/12 flex flex-col h-full bg-white">
            {activeConversation ? (
              <>
                {/* Active Header */}
                <div className="p-4 border-b border-[#E2E8D8] bg-[#F5F8EF] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#101410]">
                      {activeConversation.buyer_name || 'Khách hàng'} ({activeConversation.buyer_phone || ''})
                    </h3>
                    <p className="text-[11px] text-[#5E5E61]">
                      {activeConversation.product_name ? `Hỏi về: ${activeConversation.product_name} (${formatVND(activeConversation.product_price || 0)})` :
                       activeConversation.order_code ? `Hỗ trợ đơn hàng: #${activeConversation.order_code}` : 'Tư vấn trực tiếp'}
                    </p>
                  </div>
                </div>

                {/* Messages pane */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBFDF8]">
                  {(activeConversation.messages || []).map(msg => {
                    const isSeller = msg.sender_role === 'seller';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 text-xs rounded-2xl shadow-xs break-words ${
                          isSeller
                            ? 'bg-[#08482D] text-white rounded-tr-xs'
                            : 'bg-white text-[#101410] border border-[#DAE7C7] rounded-tl-xs'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-[#5E5E61] mt-0.5 px-1 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Reply Templates */}
                <div className="p-2.5 bg-[#F5F8EF] border-t border-[#E2E8D8] flex gap-2 overflow-x-auto no-scrollbar">
                  {[
                    'Dạ sản phẩm vẫn còn ạ',
                    'Shop gửi thêm ảnh thật ngay ạ',
                    'Dạ shop giao trong 2–4 ngày ạ'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(preset)}
                      className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#DAE7C7] text-[#08482D] hover:bg-[#DAE7C7]/30 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Warning Alert */}
                {chatWarning && (
                  <div className="p-2.5 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{chatWarning}</span>
                  </div>
                )}

                {/* Input box */}
                <div className="p-3 bg-white border-t border-[#E2E8D8] flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => {
                      setChatInputText(e.target.value);
                      if (chatWarning) setChatWarning(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    placeholder="Nhập câu trả lời gửi khách..."
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl focus:outline-none focus:border-[#08482D]"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSendChatMessage()}
                    disabled={!chatInputText.trim() || sendingChatMsg}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5E5E61]">
                <MessageSquare className="w-12 h-12 text-[#DAE7C7] mb-2" />
                <p className="text-sm font-bold text-[#101410]">Chọn một cuộc hội thoại bên trái để bắt đầu chat</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: TRẢ HÀNG / HOÀN TIỀN (RETURNS) */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8D8]">
            <div>
              <h2 className="text-xl font-bold text-[#101410] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-700" />
                Quản lý Yêu Cầu Đổi Trả & Hoàn Tiền (Bảo chứng 3 ngày)
              </h2>
              <p className="text-xs text-[#5E5E61] mt-0.5">
                Quy trình: Duyệt yêu cầu → Nhận hàng hoàn → Hoàn tiền & khôi phục tồn kho tự động
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchReturns}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Làm mới
            </Button>
          </div>

          {loadingReturns ? (
            <div className="py-12 text-center text-xs text-[#5E5E61]">Đang tải danh sách yêu cầu...</div>
          ) : sellerReturns.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E2E8D8] p-12 text-center">
              <RotateCcw className="w-12 h-12 mx-auto text-[#DAE7C7] mb-2" />
              <h3 className="text-base font-bold text-[#101410] mb-1">Chưa có yêu cầu trả hàng nào</h3>
              <p className="text-xs text-[#5E5E61]">Mọi đơn hàng đều đang trong trạng thái hoàn tất suôn sẻ.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellerReturns.map(item => {
                const proofImages: string[] = Array.isArray(item.images)
                  ? item.images
                  : typeof item.images === 'string'
                  ? JSON.parse(item.images || '[]')
                  : [];

                return (
                  <div key={item.id} className="bg-white rounded-3xl border border-[#E2E8D8] p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8D8] pb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-[#08482D]">
                          Đơn hàng #{item.order_code}
                        </span>
                        <span className="text-xs text-[#5E5E61] ml-2">
                          Khách: <strong>{item.buyer_name}</strong> ({item.buyer_phone})
                        </span>
                      </div>

                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        item.status === 'refunded' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        item.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'shipping_back' ? 'bg-purple-100 text-purple-800' :
                        item.status === 'received' ? 'bg-amber-100 text-amber-900' :
                        'bg-amber-100 text-amber-900 font-bold'
                      }`}>
                        {item.status === 'pending' ? 'Chờ shop xét duyệt' :
                         item.status === 'approved' ? 'Đã duyệt - chờ gửi lại' :
                         item.status === 'shipping_back' ? 'Đang chuyển trả hàng' :
                         item.status === 'received' ? 'Đã nhận kiện hàng về kho' :
                         item.status === 'refunded' ? 'Đã hoàn tiền thành công' : 'Đã từ chối'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#DAE7C7]/60 space-y-1.5">
                        <p className="text-[#101410]"><strong>Lý do yêu cầu:</strong> {item.reason}</p>
                        <p className="text-[#5E5E61]"><strong>Mô tả chi tiết:</strong> {item.description}</p>
                        <p className="font-mono text-[#08482D] font-bold">
                          <strong>Số tiền hoàn trả:</strong> {formatVND(item.refund_amount)}
                        </p>
                        <p className="text-[#5E5E61]">
                          <strong>Phương thức hoàn:</strong> {item.refund_method === 'card' ? 'Hoàn về thẻ thanh toán (mô phỏng)' : 'Chuyển khoản ngân hàng (mô phỏng)'}
                        </p>
                      </div>

                      {/* Proof photos */}
                      <div>
                        <span className="font-semibold text-[#101410] block mb-2">Ảnh chụp bằng chứng của khách:</span>
                        {proofImages.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {proofImages.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`proof-${i}`}
                                className="w-16 h-16 rounded-xl object-cover border border-[#DAE7C7] shrink-0"
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#5E5E61] italic">Không đính kèm ảnh</p>
                        )}
                      </div>
                    </div>

                    {item.seller_note && (
                      <p className="text-xs text-blue-900 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                        <strong>Ghi chú từ shop:</strong> {item.seller_note}
                      </p>
                    )}

                    {/* Step Actions for Seller */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E2E8D8]">
                      {item.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateReturnStatus(item.id, 'approved', 'Shop đồng ý nhận lại kiện hàng. Vui lòng đóng gói và bàn giao cho bưu tá.')}
                          >
                            Duyệt chấp nhận trả hàng
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              const reason = prompt('Nhập lý do từ chối yêu cầu trả hàng:');
                              if (reason) {
                                handleUpdateReturnStatus(item.id, 'rejected', reason);
                              }
                            }}
                          >
                            Từ chối yêu cầu
                          </Button>
                        </>
                      )}

                      {item.status === 'approved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateReturnStatus(item.id, 'shipping_back', 'Đơn vị vận chuyển đang trên đường lấy kiện hoàn.')}
                        >
                          Xác nhận bắt đầu gửi trả hàng
                        </Button>
                      )}

                      {item.status === 'shipping_back' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateReturnStatus(item.id, 'received', 'Kho đã nhận lại kiện hàng và kiểm tra hoàn tất.')}
                        >
                          Xác nhận đã nhận hàng về kho
                        </Button>
                      )}

                      {item.status === 'received' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateReturnStatus(item.id, 'refunded', 'Đã xử lý hoàn tiền 100% cho người mua.')}
                        >
                          Xác nhận hoàn tiền & khôi phục tồn kho
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TRẢ GIÁ LẠI (COUNTER OFFER) */}
      {counterModalOffer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8D8]">
              <h3 className="font-bold text-base text-[#101410] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#08482D]" />
                Đề nghị mức giá mới cho khách
              </h3>
              <button onClick={() => setCounterModalOffer(null)} className="text-[#5E5E61] hover:text-[#101410]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F5F8EF] rounded-xl text-xs space-y-1">
              <p>Sản phẩm: <strong>{counterModalOffer.product_name}</strong></p>
              <p>Giá niêm yết: <strong className="font-mono">{formatVND(counterModalOffer.original_price)}</strong></p>
              <p>Khách đang trả: <strong className="font-mono text-[#08482D]">{formatVND(counterModalOffer.offered_price)}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101410] mb-1">
                Mức giá bạn muốn thương lượng lại (VNĐ) *
              </label>
              <input
                type="number"
                value={counterPriceInput}
                onChange={e => setCounterPriceInput(Number(e.target.value))}
                min={counterModalOffer.offered_price + 1000}
                max={counterModalOffer.original_price - 1000}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DAE7C7] bg-[#F5F8EF] font-mono font-bold text-[#08482D] text-sm focus:outline-none"
              />
              <span className="text-[10px] text-[#5E5E61] mt-1 block">
                Phải nằm giữa {formatVND(counterModalOffer.offered_price)} và {formatVND(counterModalOffer.original_price)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101410] mb-1">
                Lời nhắn gửi khách hàng (không bắt buộc)
              </label>
              <textarea
                value={counterNoteInput}
                onChange={e => setCounterNoteInput(e.target.value)}
                rows={2}
                placeholder="VD: Món này độ mới rất cao shop bớt tối đa mức này cho bạn nhé..."
                className="w-full px-3 py-2 text-xs border border-[#DAE7C7] rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setCounterModalOffer(null)}>
                Hủy
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleCounterOffer}>
                Gửi giá mới
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TỪ CHỐI TRẢ GIÁ (REJECT OFFER) */}
      {rejectModalOffer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#DAE7C7] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8D8]">
              <h3 className="font-bold text-base text-[#101410] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Từ chối lời trả giá
              </h3>
              <button onClick={() => setRejectModalOffer(null)} className="text-[#5E5E61] hover:text-[#101410]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5E5E61]">
              Bạn có chắc chắn muốn từ chối mức giá <strong>{formatVND(rejectModalOffer.offered_price)}</strong> của khách hàng <strong>{rejectModalOffer.buyer_name}</strong>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#101410] mb-1">
                Lý do từ chối (không bắt buộc)
              </label>
              <textarea
                value={rejectReasonInput}
                onChange={e => setRejectReasonInput(e.target.value)}
                rows={2}
                placeholder="VD: Món đồ này đã bán đúng giá vốn rồi ạ..."
                className="w-full px-3 py-2 text-xs border border-[#DAE7C7] rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setRejectModalOffer(null)}>
                Quay lại
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleRejectOffer}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
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
                <label className="font-semibold text-[#524B46] block mb-1">URL ảnh chính (Đại diện)</label>
                <input
                  type="text"
                  value={prodForm.image_url}
                  onChange={e => setProdForm({ ...prodForm, image_url: e.target.value })}
                  placeholder="Để trống sẽ tự dùng ảnh đầu tiên trong bộ sưu tập hoặc sinh ảnh SVG"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">
                  Bộ sưu tập ảnh chụp thực tế (Mỗi URL ảnh trên một dòng, tối đa 5 ảnh)
                </label>
                <textarea
                  rows={2}
                  value={prodForm.imagesText}
                  onChange={e => setProdForm({ ...prodForm, imagesText: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#524B46] block mb-1">
                  Khuyết điểm thật minh bạch (Mỗi dòng một khuyết điểm: Vị trí | Mô tả | URL ảnh)
                </label>
                <textarea
                  rows={2}
                  value={prodForm.flawsText}
                  onChange={e => setProdForm({ ...prodForm, flawsText: e.target.value })}
                  placeholder="Góc phải | Trầy xước nhẹ viền cạnh | https://images.unsplash.com/...&#10;Mặt đáy | Xước dăm không ảnh hưởng hoạt động |"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2] text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Chuyên viên kiểm định</label>
                  <input
                    type="text"
                    value={prodForm.inspector_name}
                    onChange={e => setProdForm({ ...prodForm, inspector_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#524B46] block mb-1">Ngày kiểm định</label>
                  <input
                    type="date"
                    value={prodForm.inspection_date}
                    onChange={e => setProdForm({ ...prodForm, inspection_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CEBE] bg-[#FAF7F2]"
                  />
                </div>
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
