'use client';

import { formatFileSize, timeAgo } from '@/lib/files/utils';

interface StatusBarProps {
  size: number;
  permissions: string;
  modified: string;
  language: string;
}

export function StatusBar({ size, permissions, modified, language }: StatusBarProps) {
  return (
    <div
      className="flex items-center gap-4 px-3 py-1 border-t border-[#1a2028] shrink-0 font-mono"
      style={{ fontSize: '10px' }}
    >
      <span className="text-[#4a5a6e]">{formatFileSize(size)}</span>
      <span className="text-[#4a5a6e]">{permissions}</span>
      <span className="text-[#4a5a6e]">{timeAgo(modified)}</span>
      <span className="text-[#22d3ee] ml-auto">{language}</span>
    </div>
  );
}
