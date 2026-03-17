import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn('input', error && 'border-[#f87171] focus:border-[#f87171]', className)}
          {...props}
        />
        {error && (
          <span className="text-[11px] text-[#f87171]">{error}</span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
