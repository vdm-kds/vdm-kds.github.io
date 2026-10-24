import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, AlertCircle, Sparkles, MessageCircle, ShoppingBag, Package } from 'lucide-react';
import { ChatConversation, ChatMessage, Product, Order } from '../types';
import { formatVND } from '../utils/format';
import { api } from '../services/api';
import { Button } from './Button';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  order?: Order | null;
  existingConversationId?: number | null;
  currentRole?: 'buyer' | 'seller';
}

const QUICK_QUESTIONS = [
  'Sản phẩm còn không ạ?',
  'Có ảnh thật thêm không shop?',
  'Có bảo hành không ạ?',
  'Shop giao trong bao lâu?'
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  product,
  order,
  existingConversationId,
  currentRole = 'buyer'
}) => {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Start or load conversation
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const initChat = async () => {
      try {
        setLoading(true);
        if (existingConversationId) {
          const res = await api.getChatDetail(existingConversationId);
          if (active) {
            setConversation(res.conversation);
            setMessages(res.conversation.messages || []);
          }
        } else if (product || order) {
          const res = await api.startChat({
            product_id: product?.id,
            order_id: order?.id
          });
          if (active) {
            setConversation(res.conversation);
            setMessages(res.conversation.messages || []);
          }
        }
      } catch (err: any) {
        console.error('Init chat error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    initChat();

    return () => {
      active = false;
    };
  }, [isOpen, product, order, existingConversationId]);

  // Polling every 5 seconds
  useEffect(() => {
    if (!isOpen || !conversation?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getChatDetail(conversation.id);
        if (res.conversation?.messages) {
          setMessages(res.conversation.messages);
        }
      } catch (err) {
        // quiet poll fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Client safety filter
  const validateContent = (text: string): boolean => {
    const phoneRegex = /(?:\+?84|0)(?:\s*[\.\-]?\s*\d){9,10}\b/;
    const urlRegex = /(?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.(?:com|vn|net|org|io|me|info|biz)\b/i;

    if (phoneRegex.test(text) || urlRegex.test(text)) {
      setWarning('Vì an toàn, vui lòng giao dịch trên Đồ Cũ Còn Thương. Hệ thống không cho phép chia sẻ số điện thoại hoặc liên kết ngoài.');
      return false;
    }
    setWarning(null);
    return true;
  };

  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend || inputText).trim();
    if (!text || !conversation?.id || sending) return;

    if (!validateContent(text)) return;

    try {
      setSending(true);
      const res = await api.sendChatMessage(conversation.id, text);
      setMessages(prev => [...prev, res.message]);
      setInputText('');
      setWarning(null);
    } catch (err: any) {
      setWarning(err.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#DAE7C7] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#F5F8EF] border-b border-[#DAE7C7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#08482D] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              CS
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#101410] flex items-center gap-1.5">
                Chăm sóc khách hàng
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </h3>
              <p className="text-xs text-[#5E5E61]">Shop thường trả lời trong vài phút</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 text-[#5E5E61] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Context (Product or Order card) */}
        {(conversation?.product_name || product) && (
          <div className="p-3 bg-white border-b border-[#E2E8D8] flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F5F8EF] border border-[#DAE7C7] shrink-0">
              <img
                src={conversation?.product_image || product?.image_url}
                alt="Product"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold tracking-wider text-[#08482D] uppercase block">
                Đang hỏi về sản phẩm
              </span>
              <p className="text-xs font-bold text-[#101410] truncate">
                {conversation?.product_name || product?.name}
              </p>
              <p className="text-xs font-mono font-semibold text-[#08482D]">
                {formatVND(conversation?.product_price || product?.price || 0)}
              </p>
            </div>
          </div>
        )}

        {(conversation?.order_code || order) && (
          <div className="p-3 bg-white border-b border-[#E2E8D8] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DAE7C7]/50 flex items-center justify-center text-[#08482D] shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold tracking-wider text-[#08482D] uppercase block">
                Hỗ trợ đơn hàng #{conversation?.order_code || order?.code}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#5E5E61]">Tổng tiền:</span>
                <span className="font-bold text-[#101410] font-mono">
                  {formatVND(conversation?.order_total || order?.total || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBFDF8]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#5E5E61]">Đang tải cuộc trò chuyện...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle className="w-10 h-10 text-[#DAE7C7] mx-auto mb-2" />
              <p className="text-xs text-[#5E5E61]">Chưa có tin nhắn nào.</p>
              <p className="text-[11px] text-[#5E5E61]/70 mt-1">Hãy gửi câu hỏi đầu tiên bên dưới!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_role === currentRole;
              const timeStr = new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 text-sm rounded-2xl shadow-xs break-words ${
                      isMine
                        ? 'bg-[#08482D] text-white rounded-tr-xs'
                        : 'bg-white text-[#101410] border border-[#DAE7C7] rounded-tl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-[#5E5E61]">
                    <span>{timeStr}</span>
                    {isMine && msg.is_read ? (
                      <span className="text-emerald-700 font-medium">· Đã xem</span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question suggestions (if buyer) */}
        {currentRole === 'buyer' && (
          <div className="p-2.5 bg-[#F5F8EF] border-t border-[#E2E8D8] overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={sending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-white border border-[#DAE7C7] text-[#08482D] hover:bg-[#DAE7C7]/30 transition-colors shrink-0"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Safety Warning */}
        {warning && (
          <div className="p-2.5 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <p className="flex-1">{warning}</p>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-[#DAE7C7] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (warning) setWarning(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nhắn tin cho shop..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-[#F5F8EF] border border-[#DAE7C7] rounded-xl focus:outline-none focus:border-[#08482D]"
            disabled={sending}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || sending}
            className="rounded-xl px-3.5 py-2.5"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
