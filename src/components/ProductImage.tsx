import React, { useState } from 'react';
import { isLegacyOrEmptyImage, createVintageProductSvg } from '../services/db';
import { ProductFallbackImage } from './ProductFallbackImage';

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string;
  productName?: string;
  conditionPct?: number;
  variantIndex?: number;
  className?: string;
  imgClassName?: string;
  compact?: boolean;
  onClick?: () => void;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category = 'Đồ cũ',
  productName,
  conditionPct,
  variantIndex = 0,
  className = '',
  imgClassName = '',
  compact = false,
  onClick
}) => {
  const [hasError, setHasError] = useState(false);

  // If no source or error triggered or is legacy dark/Fraunces SVG -> use clean mint SVG generator
  const isFallbackNeeded = !src || hasError || isLegacyOrEmptyImage(src);

  if (isFallbackNeeded) {
    const generatedSvg = createVintageProductSvg(productName || alt, category, variantIndex);
    return (
      <div 
        onClick={onClick}
        className={`overflow-hidden bg-[#F5F8EF] relative select-none ${className} ${onClick ? 'cursor-pointer' : ''}`}
      >
        <img
          src={generatedSvg}
          alt={alt}
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`overflow-hidden bg-[#F5F8EF] relative ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
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
