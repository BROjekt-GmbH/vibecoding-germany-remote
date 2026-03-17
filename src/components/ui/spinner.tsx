import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'border-2 border-[#1a2028] border-t-[#22d3ee] rounded-full animate-spin',
        {
          'w-3 h-3': size === 'sm',
          'w-5 h-5': size === 'md',
          'w-8 h-8': size === 'lg',
        },
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
