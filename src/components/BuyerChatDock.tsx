import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Search, ArrowLeft, Store, Package, 
  ExternalLink, Sparkles, CheckCircle2, Clock, ShieldCheck
} from 'lucide-react';
import { ChatConversation, ChatMessage, ChatMessageContext } from '../types';
import { api } from '../services/api';
import { formatVND } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface BuyerChatDockProps {
  onNavigateToShop?: (slug: string) => void;
}

const QUICK_QUESTIONS = [
  'Sản phẩm còn không ạ?',
  'Có ảnh thật thêm không shop?',
  'Có bảo hành không ạ?',
  'Shop giao trong bao lâu?'
];

export const BuyerChatDock: React.FC<BuyerChatDockProps> = ({ onNavigateToShop }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Total unread count for floating badge
  const totalUnread = conversations.reduce((acc, c) => acc + (c.buyer_unread || 0), 0);

  // Load conversations
  const loadConversations = async () => {
    if (!user || user.role !== 'buyer') return;
    try {
      const res = await api.getChatConversations();
      setConversations(res.conversations || []);
    } catch {
      // quiet catch
    }
  };

  // Poll conversations every 6s when dock is open or in background
  useEffect(() => {
    if (!user || user.role !== 'buyer') return;
    loadConversations();
    const interval = setInterval(loadConversations, 6000);
    return () => clearInterval(interval);
  }, [user]);

  // Load active conversation messages when selected
  useEffect(() => {
    if (!selectedConvId) return;

    let active = true;
    const loadDetail = async () => {
      try {
        setLoading(true);
        const res = await api.getChatDetail(selectedConvId);
        if (active) {
          setActiveMessages(res.messages || []);
          // update unread in list
          setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, buyer_unread: 0 } : c));
          setTimeout(scrollToBottom, 100);
        }
      } catch {
        // quiet catch
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDetail();
    const interval = setInterval(loadDetail, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedConvId]);

  // Listen to global open chat event
  useEffect(() => {
    const handleOpenChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{
        shopId?: number;
        product?: any;
        order?: any;
        context?: any;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (!user) {
        showToast('Vui lòng đăng nhập để chat với shop', 'info');
        return;
      }
      if (user.role !== 'buyer') {
        showToast('Chỉ tài khoản người mua mới có thể nhắn tin cho shop', 'info');
        return;
      }

      setIsOpen(true);

      const targetShopId = detail.shopId || detail.product?.shop_id || detail.order?.shop_id || 1;
      const contextPayload = detail.product ? {
        type: 'product' as const,
        product_id: detail.product.id
      } : (detail.order ? {
        type: 'order' as const,
        order_code: detail.order.code || String(detail.order.id)
      } : detail.context);

      try {
        setLoading(true);
        const res = await api.startShopChat(targetShopId, contextPayload);
        await loadConversations();
        setSelectedConvId(res.conversation.id);
        setActiveMessages(res.conversation.messages || []);
        setMobileView('chat');
        setTimeout(scrollToBottom, 150);
      } catch (err: any) {
        showToast(err.message || 'Không thể mở khung chat', 'error');
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('open-buyer-chat', handleOpenChat);
    return () => window.removeEventListener('open-buyer-chat', handleOpenChat);
  }, [user]);

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConvId) return;

    try {
      setSending(true);
      const res = await api.sendChatMessage(selectedConvId, text);
      setActiveMessages(prev => [...prev, res.message]);
      setInputText('');
      setTimeout(scrollToBottom, 100);
      loadConversations();
    } catch (err: any) {
      showToast(err.message || 'Chưa gửi được tin nhắn', 'error');
    } finally {
      setSending(false);
    }
  };

  // Only render for buyers or guests
  if (user && user.role !== 'buyer') return null;

  const currentConv = conversations.find(c => c.id === selectedConvId);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.shop_name && c.shop_name.toLowerCase().includes(q)) ||
      (c.last_message && c.last_message.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Floating Chat Button Dock */}
      {!isOpen && (
        <button
          onClick={() => {
            if (!user) {
              showToast('Vui lòng đăng nhập tài khoản người mua để chat', 'info');
              return;
            }
            setIsOpen(true);
            if (conversations.length > 0 && !selectedConvId) {
              setSelectedConvId(conversations[0].id);
            }
          }}
          className="fixed bottom-6 right-6 z-40 bg-[#08482D] hover:bg-[#08482D]/90 text-white rounded-full p-3.5 shadow-xl flex items-center gap-2.5 transition-all hover:scale-105 group border-2 border-white"
          title="Mở hộp tin nhắn với các shop"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-[#DAE7C7]" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#C2522D] text-white text-[11px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white animate-pulse">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <span className="font-bold text-xs pr-1 hidden sm:inline text-white">
            Chat ({conversations.length} shop)
          </span>
        </button>
      )}

      {/* Shopee-style 2-Column Chat Dock Drawer */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[680px] sm:h-[520px] h-full bg-white rounded-none sm:rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Main 2-Column Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* COLUMN 1: SHOP CONVERSATIONS LIST */}
            <div 
              className={`w-full sm:w-[260px] border-r border-stone-200 bg-stone-50 flex flex-col ${
                mobileView === 'chat' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              {/* Header List */}
              <div className="p-3.5 bg-white border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#08482D] font-serif">Tin nhắn</span>
                  {totalUnread > 0 && (
                    <span className="bg-[#C2522D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 sm:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search inside shops */}
              <div className="p-2.5 bg-white border-b border-stone-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên shop..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-stone-100 rounded-lg focus:outline-none focus:bg-white focus:border-[#08482D] border border-transparent"
                  />
                </div>
              </div>

              {/* Conversations scroll area */}
              <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <Store className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="text-xs">Chưa có cuộc trò chuyện nào với shop.</p>
                  </div>
                ) : (
                  filteredConversations.map(c => {
                    const isSelected = c.id === selectedConvId;
                    const hasUnread = (c.buyer_unread || 0) > 0;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedConvId(c.id);
                          setMobileView('chat');
                        }}
                        className={`w-full p-3 text-left flex items-start gap-2.5 transition-colors ${
                          isSelected ? 'bg-white shadow-xs' : 'hover:bg-white/80'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={c.shop_avatar || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=100'}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-stone-200"
                          />
                          {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C2522D] rounded-full border-2 border-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${hasUnread ? 'font-black text-stone-900' : 'font-bold text-stone-800'}`}>
                              {c.shop_name || 'Shop'}
                            </p>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${hasUnread ? 'font-bold text-stone-900' : 'text-stone-500'}`}>
                            {c.last_message || 'Bắt đầu trò chuyện...'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: ACTIVE CONVERSATION THREAD */}
            <div 
              className={`flex-1 flex flex-col bg-white ${
                mobileView === 'list' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              {currentConv ? (
                <>
                  {/* Thread Header */}
                  <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-white shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setMobileView('list')}
                        className="p-1 text-stone-600 hover:text-stone-900 sm:hidden"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>

                      <img
                        src={currentConv.shop_avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-stone-200"
                      />

                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs sm:text-sm text-stone-900">
                            {currentConv.shop_name}
                          </p>
                          {currentConv.shop_slug && onNavigateToShop && (
                            <button
                              onClick={() => {
                                onNavigateToShop(currentConv.shop_slug!);
                                setIsOpen(false);
                              }}
                              className="text-[10px] text-[#08482D] hover:underline inline-flex items-center gap-0.5 font-semibold"
                            >
                              Ghé shop <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Thường trả lời trong vài phút</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                      title="Thu nhỏ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F5F8EF]/40">
                    {/* Safety notice */}
                    <div className="bg-[#DAE7C7]/40 border border-[#08482D]/15 rounded-xl p-2.5 text-[11px] text-stone-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#08482D] flex-shrink-0" />
                      <span>Giao dịch an toàn qua Đồ Cũ Còn Thương. Tránh chia sẻ số tài khoản cá nhân ra ngoài.</span>
                    </div>

                    {loading ? (
                      <div className="py-8 text-center">
                        <div className="w-6 h-6 border-2 border-[#08482D] border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : (
                      activeMessages.map(msg => {
                        const isBuyer = msg.sender_role === 'buyer';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}
                          >
                            {/* Context Card Attachment if present */}
                            {msg.context_card && (
                              <div className={`mb-1.5 p-2.5 rounded-xl border max-w-xs shadow-xs text-xs ${
                                isBuyer ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  {msg.context_card.image_url || msg.context_card.image ? (
                                    <img
                                      src={msg.context_card.image_url || msg.context_card.image}
                                      alt=""
                                      className="w-12 h-12 rounded-lg object-cover border border-stone-200"
                                    />
                                  ) : (
                                    <Package className="w-8 h-8 text-stone-400" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                                      {msg.context_card.type === 'product' ? 'Hỏi về sản phẩm' : 'Đơn hàng'}
                                    </span>
                                    <p className="font-bold text-stone-900 truncate">
                                      {msg.context_card.title}
                                    </p>
                                    {msg.context_card.price && (
                                      <p className="font-bold text-[#C2522D] text-xs">
                                        {formatVND(msg.context_card.price)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                                isBuyer
                                  ? 'bg-[#08482D] text-white rounded-tr-none'
                                  : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className="text-[9px] text-stone-400 mt-0.5 px-1">
                              {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick questions chips */}
                  <div className="px-3 py-1.5 bg-white border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                    {QUICK_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => handleSendMessage(q)}
                        disabled={sending}
                        className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-[#DAE7C7] text-stone-700 whitespace-nowrap transition-colors flex-shrink-0"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Input area */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Nhắn tin cho ${currentConv.shop_name}...`}
                      className="flex-1 px-3.5 py-2 text-xs bg-stone-100 rounded-xl focus:bg-white focus:outline-none focus:border-[#08482D] border border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={sending || !inputText.trim()}
                      className="p-2 bg-[#08482D] text-white rounded-xl hover:bg-[#08482D]/90 disabled:opacity-40 transition-all flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
                  <Store className="w-12 h-12 text-stone-300 mb-2" />
                  <p className="text-sm font-bold text-stone-600">Chọn một shop để bắt đầu chat</p>
                  <p className="text-xs text-stone-400 mt-1">Hoặc bấm "Chat ngay" tại trang sản phẩm hoặc đơn hàng của bạn.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
