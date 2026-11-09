import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, AlertCircle, Sparkles, MessageCircle, ShoppingBag, Package, Camera, Loader2 } from 'lucide-react';
import { ChatConversation, ChatMessage, Product, Order } from '../types';
import { formatVND } from '../utils/format';
import { api } from '../services/api';
import { compressChatImage } from '../utils/image';
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
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [compressingImage, setCompressingImage] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            setMessages(res.messages || res.conversation.messages || []);
          }
        } else {
          const res = await api.startChat({
            product_id: product?.id,
            order_id: order?.id
          });
          if (active) {
            setConversation(res.conversation);
            setMessages(res.messages || res.conversation.messages || []);
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
  }, [messages, pendingImages]);

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

  const handlePickImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = 3 - pendingImages.length;
    if (remainingSlots <= 0) return;

    const files = Array.from(fileList).slice(0, remainingSlots);
    setCompressingImage(true);
    try {
      for (const file of files) {
        const res = await compressChatImage(file);
        setPendingImages((prev) => [...prev, res.dataUrl].slice(0, 3));
      }
    } catch (err: any) {
      setWarning(err.message || 'Lỗi xử lý ảnh');
    } finally {
      setCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend || inputText).trim();
    const hasImages = pendingImages.length > 0;
    if ((!text && !hasImages) || !conversation?.id || sending) return;

    if (text && !validateContent(text)) return;

    try {
      setSending(true);

      // Send attached images sequentially (max 3)
      if (hasImages) {
        for (const imgUrl of pendingImages) {
          const res = await api.sendChatMessage({
            conversation_id: conversation.id,
            type: 'image',
            text: '',
            image: imgUrl
          } as any);
          setMessages((prev) => [...prev, res.message]);
        }
        setPendingImages([]);
      }

      // Send text if present
      if (text) {
        const res = await api.sendChatMessage(conversation.id, text);
        setMessages((prev) => [...prev, res.message]);
        setInputText('');
      }

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
              const isImage = msg.type === 'image' || Boolean(msg.image);
              const timeStr = new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {isImage ? (
                    <div
                      onClick={() => setActiveLightboxImage(msg.image || '')}
                      className="max-w-[220px] rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-[#DAE7C7] bg-stone-100 hover:opacity-95 transition-opacity"
                    >
                      <img
                        src={msg.image || ''}
                        alt="Ảnh chat"
                        className="w-full h-auto object-cover max-h-[220px]"
                      />
                    </div>
                  ) : (
                    <div
                      className={`max-w-[82%] px-4 py-2.5 text-sm rounded-2xl shadow-xs break-words ${
                        isMine
                          ? 'bg-[#08482D] text-white rounded-tr-xs'
                          : 'bg-white text-[#101410] border border-[#DAE7C7] rounded-tl-xs'
                      }`}
                    >
                      {msg.content || msg.message}
                    </div>
                  )}
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

        {/* Pending Image Attachments Preview */}
        {pendingImages.length > 0 && (
          <div className="p-2.5 bg-[#F5F8EF] border-t border-[#DAE7C7] flex items-center gap-2">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#DAE7C7] bg-white flex-shrink-0">
                <img src={img} alt="Đính kèm" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-[10px]"
                >
                  ×
                </button>
              </div>
            ))}
            <span className="text-[11px] text-[#5E5E61]">{pendingImages.length}/3 ảnh đính kèm</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-[#DAE7C7] flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePickImages(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || pendingImages.length >= 3 || compressingImage}
            className="p-2 text-[#08482D] hover:bg-[#DAE7C7]/40 rounded-xl transition-colors disabled:opacity-40"
            title="Đính kèm ảnh (tối đa 3 ảnh)"
          >
            {compressingImage ? <Loader2 className="w-4 h-4 animate-spin text-[#08482D]" /> : <Camera className="w-4 h-4" />}
          </button>
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
            disabled={(!inputText.trim() && pendingImages.length === 0) || sending}
            className="rounded-xl px-3.5 py-2.5"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Full-screen Chat Image Lightbox */}
        {activeLightboxImage && (
          <div
            className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setActiveLightboxImage(null)}
          >
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeLightboxImage}
              alt=""
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};
