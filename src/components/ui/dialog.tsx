'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg mx-3 md:mx-4 max-h-[90vh] overflow-y-auto panel-elevated animate-fade-in',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a2028]">
          <h2 id="dialog-title" className="text-sm font-medium text-[#c8d6e5]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-[#4a5a6e] hover:text-[#c8d6e5] hover:bg-[#1a2028] transition-colors"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
