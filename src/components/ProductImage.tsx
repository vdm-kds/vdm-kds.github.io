import React, { useState, useEffect, useRef } from 'react';
import { isValidImageSrc, createVintageProductSvg } from '../services/db';

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
  eager?: boolean;
  priority?: boolean;
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
  lazy = true,
  eager = false,
  priority = false
}) => {
  const isEager = eager || priority || !lazy;
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Compute effective source with retry query param if retried
  const effectiveSrc = React.useMemo(() => {
    if (!src) return '';
    if (retryCount === 0) return src;
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    const delimiter = src.includes('?') ? '&' : '?';
    return `${src}${delimiter}r=${retryCount}`;
  }, [src, retryCount]);

  // Reset state when raw src changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
    setRetryCount(0);
  }, [src]);

  // Check if image is already cached/complete, and set up 8s safety timer
  useEffect(() => {
    if (!effectiveSrc || hasError) return;

    // Check if the image element is already completed by browser
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      return;
    }

    // Safety timer 8 seconds
    const timer = setTimeout(() => {
      if (!isLoaded && !hasError) {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setIsLoaded(true);
        } else if (retryCount === 0 && !effectiveSrc.startsWith('data:') && !effectiveSrc.startsWith('blob:')) {
          setRetryCount(1);
        } else {
          setHasError(true);
        }
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [effectiveSrc, isLoaded, hasError, retryCount, src]);

  // If no source or error triggered or not a valid image source -> fallback to vintage SVG
  const isFallbackNeeded = !src || hasError || !isValidImageSrc(src);

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
        ref={imgRef}
        key={effectiveSrc}
        src={effectiveSrc}
        alt={alt}
        loading={isEager ? 'eager' : 'lazy'}
        decoding="async"
        {...(isEager ? { fetchPriority: 'high' as const } : {})}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (retryCount === 0 && !effectiveSrc.startsWith('data:') && !effectiveSrc.startsWith('blob:')) {
            setRetryCount(1);
          } else {
            setHasError(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  );
};
