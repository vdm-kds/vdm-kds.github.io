import React from 'react';
import { ArrowLeft, Compass, RotateCcw } from 'lucide-react';

interface NotFoundViewProps {
  onBackToHome: () => void;
}

export function NotFoundView({ onBackToHome }: NotFoundViewProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 animate-fade-in text-center font-sans">
      <div className="max-w-md w-full bg-[#FFFBF4] rounded-3xl border-2 border-[#DCCDB6] p-8 shadow-xl space-y-6">
        {/* Vintage Illustration */}
        <div className="relative mx-auto w-28 h-28 rounded-3xl bg-[#F4ECDF] border-2 border-[#DCCDB6] flex items-center justify-center shadow-inner">
          <span className="font-serif text-5xl font-bold text-[#D9542B]">404</span>
          <Compass className="w-8 h-8 text-[#5E7048] absolute -top-3 -right-3 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-[#241A14]">
            Lạc lối giữa kho đồ cũ rồi!
          </h2>
          <p className="text-xs sm:text-sm text-[#74665B] leading-relaxed">
            Món đồ hoặc trang bạn đang tìm có thể đã được ai đó nhanh tay rước đi, hoặc đường dẫn không còn tồn tại nữa.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onBackToHome}
            className="w-full py-3 px-6 rounded-2xl bg-[#D9542B] text-white text-xs font-bold hover:bg-[#B33F33] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay về gian hàng chính
          </button>
        </div>
      </div>
    </div>
  );
}
