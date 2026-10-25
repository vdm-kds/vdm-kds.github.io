import React, { useState } from 'react';
import { ProductFallbackImage } from './ProductFallbackImage';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string;
  productName?: string;
  conditionPct?: number;
  className?: string;
  imgClassName?: string;
  compact?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category = 'Đồ cũ',
  productName,
  conditionPct,
  className = '',
  imgClassName = '',
  compact = false
}) => {
  const [hasError, setHasError] = useState(false);

  // If no source or invalid or error triggered -> render clean mint gradient fallback
  if (!src || hasError || src.trim() === '') {
    return (
      <div className={`overflow-hidden bg-[#F5F8EF] ${className}`}>
        <ProductFallbackImage
          name={productName || alt}
          category={category}
          conditionPct={conditionPct}
          compact={compact}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-[#F5F8EF] relative ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imgClassName}`}
      />
    </div>
  );
};
