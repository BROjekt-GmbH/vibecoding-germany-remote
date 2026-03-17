import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn',
          {
            'btn-primary': variant === 'primary',
            'btn-ghost': variant === 'ghost',
            'btn-danger': variant === 'danger',
            'btn-outline border-[#2d3f52] text-[#c8d6e5] hover:border-[#22d3ee] hover:text-[#22d3ee]': variant === 'outline',
          },
          {
            'py-1 px-2 text-[11px]': size === 'sm',
            'py-1.5 px-3 text-[13px]': size === 'md',
            'py-2 px-4 text-sm': size === 'lg',
          },
          'disabled:opacity-40 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
