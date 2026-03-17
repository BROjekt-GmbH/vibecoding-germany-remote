import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        {
          'w-3 h-3 border-[1.5px]': size === 'sm',
          'w-5 h-5 border-2': size === 'md',
          'w-8 h-8 border-2': size === 'lg',
        },
        'border-[#1a2028] border-t-[#22d3ee]',
        className
      )}
      style={{ borderTopColor: '#22d3ee', filter: 'drop-shadow(0 0 3px rgba(34, 211, 238, 0.3))' }}
      role="status"
      aria-label="Loading"
    />
  );
}
