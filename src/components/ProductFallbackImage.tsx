import React from 'react';
import { getProductEmoji } from '../services/db';

interface ProductFallbackImageProps {
  name?: string;
  productName?: string;
  category: string;
  conditionPct?: number;
  className?: string;
  compact?: boolean;
}

export const ProductFallbackImage: React.FC<ProductFallbackImageProps> = ({
  name,
  productName,
  category,
  conditionPct,
  className = '',
  compact = false
}) => {
  const displayName = productName || name || 'Sản phẩm';
  const emoji = getProductEmoji(displayName, category);

  return (
    <div 
      className={`w-full h-full relative flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#08482D] to-[#2E7D4F] text-white select-none overflow-hidden font-sans ${className}`}
    >
      {/* Faint circles */}
      <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-[#DAE7C7] opacity-15 pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-[#DAE7C7] opacity-10 pointer-events-none" />

      {/* Large Category Emoji */}
      <div className="text-3xl sm:text-4xl mb-1.5 filter drop-shadow-sm select-none">
        {emoji}
      </div>

      <span className="text-[10px] uppercase font-bold tracking-widest text-[#DAE7C7] truncate max-w-[90%] font-sans">
        {category}
      </span>
      <span className="text-xs sm:text-sm font-bold text-white line-clamp-1 max-w-[90%] mt-0.5 font-sans">
        {displayName}
      </span>
      {conditionPct !== undefined && !compact && (
        <span className="text-[10px] text-[#DAE7C7]/90 font-mono mt-1">
          Độ mới {conditionPct}%
        </span>
      )}
    </div>
  );
};

