import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Package, Truck, CheckCircle2, AlertCircle, ShoppingBag, X } from 'lucide-react';
import { AppNotification } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface NotificationBellProps {
  onSelectOrder?: (orderId: number) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onSelectOrder }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasShaked, setHasShaked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const { showToast } = useToast();

  const fetchNotifications = async (silent = true) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await api.getNotifications();
      const newItems = res.notifications || [];
      const newUnread = res.unread_count || 0;

      // Detect newly arrived notifications to show toast and animate bell
      if (newUnread > prevCountRef.current && prevCountRef.current !== 0) {
        const latest = newItems[0];
        if (latest) {
          showToast(`🔔 ${latest.title}: ${latest.message}`, 'info');
        }
        setHasShaked(true);
        setTimeout(() => setHasShaked(false), 1200);
      }
      prevCountRef.current = newUnread;

      setNotifications(newItems);
      setUnreadCount(newUnread);
    } catch {
      // Ignore background poll errors silently
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);
    // Poll every 10 seconds for real-time notifications
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật thông báo', 'error');
    }
  };

  const handleItemClick = (notif: AppNotification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.order_id && onSelectOrder) {
      onSelectOrder(notif.order_id);
      setIsOpen(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr.replace(' ', 'T') + 'Z');
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    } catch {
      return dateStr;
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'new_order':
        return <ShoppingBag className="w-4 h-4 text-[#C2522D]" />;
      case 'order_confirmed':
        return <Package className="w-4 h-4 text-[#08482D]" />;
      case 'order_shipping':
      case 'shipment_update':
        return <Truck className="w-4 h-4 text-[#C2522D]" />;
      case 'order_delivered':
      case 'order_completed':
        return <CheckCircle2 className="w-4 h-4 text-[#08482D]" />;
      case 'order_cancelled':
        return <AlertCircle className="w-4 h-4 text-[#B33F33]" />;
      default:
        return <Bell className="w-4 h-4 text-[#5E5E61]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(true);
        }}
        className={`relative p-2.5 rounded-xl text-[#101410] hover:bg-[#DAE7C7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2522D] ${
          hasShaked ? 'animate-bounce' : ''
        }`}
        aria-label="Thông báo"
        title="Thông báo đơn hàng & vận chuyển"
      >
        <Bell className="w-5 h-5 text-[#101410]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#C2522D] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl shadow-vintage-lg z-50 overflow-hidden text-[#101410]">
          {/* Header */}
          <div className="px-4 py-3 bg-[#DAE7C7]/60 border-b border-[#E2E8D8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#101410]">Thông báo</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-[#C2522D] text-white rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#5E5E61] hover:text-[#C2522D] flex items-center gap-1 transition-colors font-medium"
                  title="Đánh dấu đã đọc tất cả"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Đọc hết
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#5E5E61] hover:text-[#101410] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E2E8D8]/40">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5E5E61]">
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#DAE7C7] flex items-center justify-center mb-3 text-[#5E5E61]">
                  <Bell className="w-6 h-6 stroke-1" />
                </div>
                <p className="text-sm font-semibold text-[#101410] mb-1">Chưa có thông báo nào</p>
                <p className="text-xs text-[#5E5E61]">
                  Cập nhật đơn hàng và lộ trình giao nhận sẽ xuất hiện tại đây
                </p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 hover:bg-[#F5F8EF]/70 cursor-pointer transition-colors flex items-start gap-3 relative ${
                    !notif.is_read ? 'bg-[#F5F8EF]/40' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-[#DAE7C7] shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-xs font-semibold truncate ${
                        !notif.is_read ? 'text-[#101410] font-bold' : 'text-[#5A4F46]'
                      }`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-[#5E5E61] whitespace-nowrap font-mono">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#5E5E61] leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#C2522D] shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-[#DAE7C7]/30 border-t border-[#E2E8D8] text-center">
            <span className="text-[11px] text-[#5E5E61]">
              Tự động cập nhật mỗi 10 giây · Tiệm Đồ Cũ Còn Thương
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
