import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  queuePendingToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const queuePendingToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    try {
      sessionStorage.setItem('pendingToast', JSON.stringify({ message, type }));
    } catch {
      // quiet catch
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check pending toast on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingToast');
      if (raw) {
        sessionStorage.removeItem('pendingToast');
        const parsed = JSON.parse(raw);
        if (parsed?.message) {
          showToast(parsed.message, parsed.type || 'info');
        }
      }
    } catch {
      // quiet catch
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, queuePendingToast }}>
      {children}
      {/* Toast container: centered on mobile (left: 16px; right: 16px; max-width: calc(100vw - 32px)), bottom right on desktop */}
      <div 
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-[#F4F7F2]/95 border-[#7D8A70] text-[#08482D]'
                : toast.type === 'error'
                ? 'bg-[#FDF2F2]/95 border-[#E28D8D] text-[#8C2E2E]'
                : 'bg-[#F8F7F4]/95 border-[#D8CEBE] text-[#423C36]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#08482D] shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#C24141] shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-[#C2522D] shrink-0 mt-0.5" />}
            <p className="text-xs sm:text-sm font-semibold leading-snug flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#5E5E61] hover:text-[#101410] shrink-0 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
