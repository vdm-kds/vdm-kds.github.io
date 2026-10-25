import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  withDashedRing?: boolean;
  dashedRingClassName?: string;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  withDashedRing = false,
  dashedRingClassName = '',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}, ref) => {
  // Base classes for pill shape, flex alignment, smooth transitions, elevation, and keyboard focus
  const baseClasses = 'inline-flex flex-row items-center justify-center whitespace-nowrap font-sans font-semibold transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#DAE7C7] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100';

  // Variant classes
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-[#08482D] text-white hover:bg-[#063A24] hover:-translate-y-px shadow-sm hover:shadow',
    secondary: 'bg-white border border-[#E2E8D8] text-[#101410] hover:bg-[#F5F8EF] hover:border-[#DAE7C7] hover:-translate-y-px shadow-2xs',
    soft: 'bg-[#DAE7C7] text-[#08482D] hover:bg-[#c9dcb2] hover:-translate-y-px',
    ghost: 'bg-transparent text-[#101410] hover:text-[#08482D] hover:underline underline-offset-4 active:scale-100',
    danger: 'bg-[#F6DDDB] text-[#B33F33] hover:bg-[#B3362F] hover:text-white hover:-translate-y-px',
    icon: 'bg-white border border-[#E2E8D8] text-[#101410] hover:bg-[#F5F8EF] hover:text-[#08482D] hover:-translate-y-px rounded-full p-0 shadow-2xs'
  };

  // Size classes
  let sizeClasses = '';
  if (variant === 'icon') {
    if (size === 'sm') sizeClasses = 'w-8 h-8 rounded-full';
    else if (size === 'lg') sizeClasses = 'w-14 h-14 rounded-full';
    else sizeClasses = 'w-10 h-10 rounded-full'; // md default 40px
  } else {
    if (size === 'sm') sizeClasses = 'h-8 px-3.5 text-xs rounded-full gap-2';
    else if (size === 'lg') sizeClasses = 'h-14 px-8 text-base font-bold rounded-full gap-2.5';
    else sizeClasses = 'h-10 px-5 text-xs sm:text-sm rounded-full gap-2'; // md default 40px
  }

  const widthClass = fullWidth ? 'w-full' : '';

  const buttonElement = (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span className="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap shrink-0">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {children && <span className="shrink-0">{children}</span>}
        </span>
      ) : (
        <span className="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap shrink-0">
          {icon && <span className="shrink-0 inline-flex items-center justify-center">{icon}</span>}
          {children && <span className="shrink-0 inline-flex flex-row items-center gap-1.5 whitespace-nowrap">{children}</span>}
          {iconRight && <span className="shrink-0 inline-flex items-center justify-center">{iconRight}</span>}
        </span>
      )}
    </button>
  );

  // Dashed Ring Wrapper: 172x58 inside 190x74 dashed ring
  if (withDashedRing) {
    return (
      <div className={`relative inline-flex items-center justify-center w-[190px] h-[74px] p-2 rounded-full border-2 border-dashed border-[#08482D] transition-transform duration-300 hover:scale-[1.02] ${dashedRingClassName}`}>
        {buttonElement}
      </div>
    );
  }

  return buttonElement;
});

Button.displayName = 'Button';
