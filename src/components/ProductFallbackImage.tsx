import React from 'react';
import { 
  Shirt, Camera, Tv, BookOpen, Music, Glasses, Coffee, Sparkles, Package 
} from 'lucide-react';

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
  // Category icon mapping
  const renderCategoryIcon = () => {
    const iconClass = compact ? "w-6 h-6 text-[#DAE7C7]" : "w-10 h-10 sm:w-12 sm:h-12 text-[#DAE7C7]";
    switch (category) {
      case 'Thời trang':
        return <Shirt className={iconClass} />;
      case 'Máy ảnh':
        return <Camera className={iconClass} />;
      case 'Điện tử':
        return <Tv className={iconClass} />;
      case 'Sách':
        return <BookOpen className={iconClass} />;
      case 'Nhạc cụ':
        return <Music className={iconClass} />;
      case 'Phụ kiện':
        return <Glasses className={iconClass} />;
      case 'Gia dụng':
        return <Coffee className={iconClass} />;
      default:
        return <Package className={iconClass} />;
    }
  };

  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#08482D] to-[#2E7D4F] text-white select-none ${className}`}
    >
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs mb-1.5 shadow-xs">
        {renderCategoryIcon()}
      </div>
      <span className="text-[10px] uppercase font-bold tracking-wider text-[#DAE7C7] truncate max-w-[90%]">
        {category}
      </span>
      <span className="text-xs sm:text-sm font-bold text-white line-clamp-1 max-w-[90%] mt-0.5">
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
