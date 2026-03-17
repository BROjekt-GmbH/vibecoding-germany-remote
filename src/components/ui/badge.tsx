import { cn } from '@/lib/utils';

type BadgeVariant = 'pending' | 'in_progress' | 'completed' | 'active' | 'idle' | 'offline' | 'online' | 'error' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  pending: 'bg-[#1a2028] text-[#8a9bb0] border-[#2d3f52]',
  in_progress: 'bg-[#0e3a5e] text-[#22d3ee] border-[#0e7490]',
  completed: 'bg-[#064030] text-[#34d399] border-[#065f46]',
  active: 'bg-[#064030] text-[#34d399] border-[#065f46]',
  idle: 'bg-[#3a2800] text-[#fbbf24] border-[#92400e]',
  offline: 'bg-[#1a2028] text-[#4a5a6e] border-[#2d3f52]',
  online: 'bg-[#064030] text-[#34d399] border-[#065f46]',
  error: 'bg-[#3a0f0f] text-[#f87171] border-[#7f1d1d]',
  default: 'bg-[#0b0e11] text-[#8a9bb0] border-[#1a2028]',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border font-medium tracking-wide uppercase',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
