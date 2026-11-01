import React, { useState } from 'react';
import { isLegacyOrEmptyImage, createVintageProductSvg } from '../services/db';

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
  lazy?: boolean;
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
  onClick,
  lazy = true
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If no source or error triggered or is legacy empty image -> use clean mint SVG generator
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
          loading="lazy"
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`overflow-hidden bg-[#DAE7C7] relative transition-colors duration-300 ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* #DAE7C7 Placeholder shimmer while image loads */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#DAE7C7] animate-pulse flex items-center justify-center pointer-events-none">
          <div className="w-6 h-6 border-2 border-[#08482D]/20 border-t-[#08482D] rounded-full animate-spin" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : undefined}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  );
};
