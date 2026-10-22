import React, { useState, useEffect } from 'react';
import { User, MapPin, KeyRound, Heart, Bell, Plus, Trash2, Edit2, CheckCircle2, ShieldCheck, ShoppingCart, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Product, Address, AppNotification } from '../types';
import { formatVND } from '../utils/format';

interface AccountViewProps {
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

type TabType = 'profile' | 'addresses' | 'password' | 'wishlist' | 'notifications';

export function AccountView({ onBackToHome, onSelectProduct, onAddToCart }: AccountViewProps) {
  const { user, refreshCartCount } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Address Book State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrDefault, setAddrDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Wishlist State
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Fetch initial data
  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || '');
    }
  }, [user]);

  // Load addresses when switching to addresses tab
  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const res = await api.getAddresses();
      setAddresses(res.addresses);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải sổ địa chỉ', 'error');
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Load wishlist
  const loadWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const res = await api.getWishlist();
      setWishlistProducts(res.products);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách yêu thích', 'error');
    } finally {
      setLoadingWishlist(false);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải thông báo', 'error');
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'addresses') loadAddresses();
    if (activeTab === 'wishlist') loadWishlist();
    if (activeTab === 'notifications') loadNotifications();
  }, [activeTab]);

  // Update profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Họ và tên không được để trống', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      showToast('Cập nhật thông tin thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật hồ sơ', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu mới và xác nhận mật khẩu không khớp', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      showToast('Đổi mật khẩu thành công!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Lỗi đổi mật khẩu', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Open address modal
  const openNewAddressModal = () => {
    setEditingAddressId(null);
    setAddrRecipient(user?.full_name || '');
    setAddrPhone(user?.phone || '');
    setAddrLine('');
    setAddrDefault(addresses.length === 0);
    setAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: Address) => {
    setEditingAddressId(addr.id);
    setAddrRecipient(addr.recipient_name);
    setAddrPhone(addr.phone);
    setAddrLine(addr.address_line);
    setAddrDefault(addr.is_default === 1);
    setAddressModalOpen(true);
  };

  // Save address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrRecipient.trim() || !addrPhone.trim() || !addrLine.trim()) {
      showToast('Vui lòng điền đủ họ tên, SĐT và địa chỉ chi tiết', 'error');
      return;
    }

    setSavingAddress(true);
    try {
      if (editingAddressId) {
        const res = await api.updateAddress(editingAddressId, {
          recipient_name: addrRecipient.trim(),
          phone: addrPhone.trim(),
          address_line: addrLine.trim(),
          is_default: addrDefault
        });
        setAddresses(res.addresses);
        showToast('Cập nhật địa chỉ thành công', 'success');
      } else {
        const res = await api.addAddress({
          recipient_name: addrRecipient.trim(),
          phone: addrPhone.trim(),
          address_line: addrLine.trim(),
          is_default: addrDefault
        });
        setAddresses(res.addresses);
        showToast('Thêm địa chỉ mới thành công', 'success');
      }
      setAddressModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu địa chỉ', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này khỏi sổ địa chỉ?')) return;
    try {
      const res = await api.deleteAddress(id);
      setAddresses(res.addresses);
      showToast('Đã xóa địa chỉ', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa địa chỉ', 'error');
    }
  };

  // Set default address
  const handleSetDefaultAddress = async (id: number) => {
    try {
      const res = await api.setDefaultAddress(id);
      setAddresses(res.addresses);
      showToast('Đã đặt làm địa chỉ mặc định', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi đặt địa chỉ mặc định', 'error');
    }
  };

  // Remove from wishlist
  const handleToggleWishlist = async (productId: number) => {
    try {
      await api.toggleWishlist(productId);
      setWishlistProducts(wishlistProducts.filter(p => p.id !== productId));
      showToast('Đã bỏ sản phẩm khỏi danh sách yêu thích', 'info');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật yêu thích', 'error');
    }
  };

  // Notifications read
  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      showToast('Đã đánh dấu đọc tất cả thông báo', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-[#74665B] hover:text-[#D9542B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </button>
        <span className="text-[#DCCDB6]">/</span>
        <span className="text-xs font-serif font-bold text-[#241A14]">Tài khoản của tôi</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Sidebar Nav */}
        <div className="bg-[#FFFBF4] rounded-3xl border-2 border-[#DCCDB6] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-[#EADFCC]">
            <div className="w-12 h-12 rounded-2xl bg-[#D9542B] text-white flex items-center justify-center font-serif text-lg font-bold shadow-md">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-sm text-[#241A14] truncate">
                {user?.full_name || 'Khách hàng'}
              </h3>
              <p className="font-mono text-[11px] text-[#74665B] truncate">
                {user?.phone || user?.username}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'profile'
                  ? 'bg-[#D9542B] text-white shadow-sm'
                  : 'text-[#74665B] hover:bg-[#F4ECDF] hover:text-[#241A14]'
              }`}
            >
              <User className="w-4 h-4" /> Hồ sơ cá nhân
            </button>

            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'addresses'
                  ? 'bg-[#D9542B] text-white shadow-sm'
                  : 'text-[#74665B] hover:bg-[#F4ECDF] hover:text-[#241A14]'
              }`}
            >
              <MapPin className="w-4 h-4" /> Sổ địa chỉ nhận hàng
            </button>

            <button
              onClick={() => setActiveTab('password')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'password'
                  ? 'bg-[#D9542B] text-white shadow-sm'
                  : 'text-[#74665B] hover:bg-[#F4ECDF] hover:text-[#241A14]'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Đổi mật khẩu
            </button>

            <button
              onClick={() => setActiveTab('wishlist')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'wishlist'
                  ? 'bg-[#D9542B] text-white shadow-sm'
                  : 'text-[#74665B] hover:bg-[#F4ECDF] hover:text-[#241A14]'
              }`}
            >
              <Heart className="w-4 h-4" /> Sản phẩm yêu thích
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                activeTab === 'notifications'
                  ? 'bg-[#D9542B] text-white shadow-sm'
                  : 'text-[#74665B] hover:bg-[#F4ECDF] hover:text-[#241A14]'
              }`}
            >
              <Bell className="w-4 h-4" /> Tất cả thông báo
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="md:col-span-3 bg-[#FFFBF4] rounded-3xl border-2 border-[#DCCDB6] p-6 sm:p-8 shadow-sm">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#241A14]">
                  Hồ Sơ Của Tôi
                </h3>
                <p className="text-xs text-[#74665B] mt-1">
                  Quản lý thông tin hồ sơ để bảo mật tài khoản và giao hàng chính xác
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="max-w-lg space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#241A14] uppercase tracking-wider mb-1.5 font-serif">
                    Số điện thoại / Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.username || ''}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#DCCDB6] bg-[#F4ECDF]/60 text-xs font-mono text-[#74665B] cursor-not-allowed"
                  />
                  <span className="text-[10px] text-[#74665B] mt-1 block">
                    Số điện thoại định danh không thể thay đổi
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#241A14] uppercase tracking-wider mb-1.5 font-serif">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#DCCDB6] bg-white text-xs text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#241A14] uppercase tracking-wider mb-1.5 font-serif">
                    Số điện thoại liên hệ nhận hàng
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="VD: 0987654321"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#DCCDB6] bg-white text-xs text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 rounded-2xl bg-[#D9542B] text-white text-xs font-bold hover:bg-[#B33F33] transition-all shadow-md disabled:opacity-50"
                  >
                    {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ADDRESS BOOK */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EADFCC]">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#241A14]">
                    Sổ Địa Chỉ Nhận Hàng
                  </h3>
                  <p className="text-xs text-[#74665B] mt-1">
                    Địa chỉ mặc định sẽ tự động chọn khi bạn tiến hành thanh toán
                  </p>
                </div>
                <button
                  onClick={openNewAddressModal}
                  className="px-4 py-2 rounded-2xl bg-[#5E7048] text-white text-xs font-bold hover:bg-[#4d5c3b] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Thêm địa chỉ mới
                </button>
              </div>

              {loadingAddresses ? (
                <div className="py-8 text-center text-xs text-[#74665B]">Đang tải sổ địa chỉ...</div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-10 bg-[#F4ECDF]/40 rounded-2xl border border-dashed border-[#DCCDB6]">
                  <MapPin className="w-8 h-8 text-[#74665B] mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-[#74665B]">Bạn chưa lưu địa chỉ giao hàng nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        addr.is_default === 1
                          ? 'bg-[#F4ECDF]/70 border-[#D9542B]/60 shadow-sm'
                          : 'bg-white border-[#DCCDB6]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-[#241A14]">
                              {addr.recipient_name}
                            </span>
                            <span className="font-mono text-xs text-[#74665B]">
                              ({addr.phone})
                            </span>
                            {addr.is_default === 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D9542B] text-white">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#74665B] leading-relaxed">
                            {addr.address_line}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditAddressModal(addr)}
                            className="p-1.5 rounded-xl border border-[#DCCDB6] text-[#74665B] hover:bg-[#F4ECDF] transition-colors"
                            title="Sửa địa chỉ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {addresses.length > 1 && (
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 rounded-xl border border-[#DCCDB6] text-[#B33F33] hover:bg-red-50 transition-colors"
                              title="Xóa địa chỉ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {addr.is_default !== 1 && (
                        <div className="mt-3 pt-2 border-t border-[#DCCDB6]/50 flex justify-end">
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[11px] font-bold text-[#5E7048] hover:underline"
                          >
                            Thiết lập làm mặc định
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#241A14]">
                  Đổi Mật Khẩu
                </h3>
                <p className="text-xs text-[#74665B] mt-1">
                  Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="max-w-lg space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#241A14] uppercase tracking-wider mb-1.5 font-serif">
                    Mật khẩu hiện tại *
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#DCCDB6] bg-white text-xs text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#241A14] uppercase tracking-wider mb-1.5 font-serif">
                    Mật khẩu mới * (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#DCCDB6] bg-white text-xs text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#241A14] uppercase tracking-wider mb-1.5 font-serif">
                    Xác nhận mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#DCCDB6] bg-white text-xs text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-6 py-2.5 rounded-2xl bg-[#D9542B] text-white text-xs font-bold hover:bg-[#B33F33] transition-all shadow-md disabled:opacity-50"
                  >
                    {savingPassword ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#241A14]">
                  Sản Phẩm Yêu Thích
                </h3>
                <p className="text-xs text-[#74665B] mt-1">
                  Những món đồ vintage bạn đã lưu để theo dõi hoặc mua sau
                </p>
              </div>

              {loadingWishlist ? (
                <div className="py-8 text-center text-xs text-[#74665B]">Đang tải danh sách yêu thích...</div>
              ) : wishlistProducts.length === 0 ? (
                <div className="text-center py-12 bg-[#F4ECDF]/40 rounded-2xl border border-dashed border-[#DCCDB6]">
                  <Heart className="w-10 h-10 text-[#74665B] mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-[#74665B]">Bạn chưa lưu món đồ nào vào mục yêu thích</p>
                  <button
                    onClick={onBackToHome}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#D9542B] text-white text-xs font-bold hover:bg-[#B33F33] transition-colors"
                  >
                    Khám phá sản phẩm ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlistProducts.map(prod => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-[#DCCDB6] p-3 shadow-sm hover:shadow-md transition-shadow space-y-3"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F4ECDF]">
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                          onClick={() => onSelectProduct(prod)}
                        />
                        <button
                          onClick={() => handleToggleWishlist(prod.id)}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-[#B33F33] hover:scale-110 transition-transform shadow"
                          title="Bỏ yêu thích"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-mono bg-[#241A14]/80 text-[#FFFBF4] rounded-md backdrop-blur-sm">
                          {prod.condition_pct}% MỚI
                        </span>
                      </div>

                      <div>
                        <h4
                          onClick={() => onSelectProduct(prod)}
                          className="font-serif font-bold text-xs text-[#241A14] truncate cursor-pointer hover:text-[#D9542B]"
                        >
                          {prod.name}
                        </h4>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-mono font-bold text-xs text-[#D9542B]">
                            {formatVND(prod.price)}
                          </span>
                          <span className="text-[10px] text-[#74665B] line-through">
                            {formatVND(prod.original_price)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onAddToCart(prod)}
                        disabled={prod.stock <= 0}
                        className="w-full py-2 bg-[#F4ECDF] hover:bg-[#D9542B] hover:text-white text-[#241A14] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {prod.stock > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EADFCC]">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#241A14]">
                    Tất Cả Thông Báo
                  </h3>
                  <p className="text-xs text-[#74665B] mt-1">
                    Cập nhật tiến độ đơn hàng và các hoạt động vận chuyển
                  </p>
                </div>
                {notifications.some(n => n.is_read === 0) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-bold text-[#5E7048] hover:underline"
                  >
                    Đánh dấu đã đọc tất cả
                  </button>
                )}
              </div>

              {loadingNotifications ? (
                <div className="py-8 text-center text-xs text-[#74665B]">Đang tải thông báo...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 bg-[#F4ECDF]/40 rounded-2xl border border-dashed border-[#DCCDB6]">
                  <Bell className="w-8 h-8 text-[#74665B] mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-[#74665B]">Chưa có thông báo nào</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.is_read === 0
                          ? 'bg-[#F4ECDF]/70 border-[#D9542B]/50'
                          : 'bg-white border-[#DCCDB6]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-serif font-bold text-xs text-[#241A14] flex items-center gap-2">
                            {item.is_read === 0 && (
                              <span className="w-2 h-2 rounded-full bg-[#D9542B]" />
                            )}
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#74665B] leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-[#74665B] flex-shrink-0">
                          {new Date(item.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address Form Modal */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#FFFBF4] rounded-3xl border-2 border-[#DCCDB6] shadow-2xl p-6">
            <h3 className="font-serif text-lg font-bold text-[#241A14] mb-4">
              {editingAddressId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ giao hàng mới'}
            </h3>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#241A14] uppercase tracking-wider mb-1 font-serif">
                  Họ tên người nhận *
                </label>
                <input
                  type="text"
                  required
                  value={addrRecipient}
                  onChange={e => setAddrRecipient(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCCDB6] bg-white focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241A14] uppercase tracking-wider mb-1 font-serif">
                  Số điện thoại người nhận *
                </label>
                <input
                  type="tel"
                  required
                  value={addrPhone}
                  onChange={e => setAddrPhone(e.target.value)}
                  placeholder="VD: 0987654321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCCDB6] bg-white focus:outline-none focus:ring-2 focus:ring-[#D9542B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241A14] uppercase tracking-wider mb-1 font-serif">
                  Địa chỉ chi tiết (Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={addrLine}
                  onChange={e => setAddrLine(e.target.value)}
                  placeholder="VD: 128 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCCDB6] bg-white focus:outline-none focus:ring-2 focus:ring-[#D9542B] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addr_default"
                  checked={addrDefault}
                  onChange={e => setAddrDefault(e.target.checked)}
                  className="w-4 h-4 text-[#D9542B] rounded border-[#DCCDB6] focus:ring-[#D9542B]"
                />
                <label htmlFor="addr_default" className="text-xs text-[#241A14] font-medium cursor-pointer">
                  Đặt làm địa chỉ nhận hàng mặc định
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EADFCC]">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  disabled={savingAddress}
                  className="px-4 py-2 rounded-xl border border-[#DCCDB6] text-xs font-bold text-[#74665B] hover:bg-[#EADFCC]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-5 py-2 rounded-xl bg-[#D9542B] text-white text-xs font-bold hover:bg-[#B33F33] transition-colors"
                >
                  {savingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
