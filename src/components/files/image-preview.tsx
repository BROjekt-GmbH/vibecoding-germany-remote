'use client';

interface ImagePreviewProps {
  content: string;
  filename: string;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
  };
  return mimeMap[ext] ?? 'image/png';
}

export function ImagePreview({ content, filename }: ImagePreviewProps) {
  const mime = getMimeType(filename);
  const src = `data:${mime};base64,${content}`;

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={filename}
        className="max-w-full max-h-full object-contain rounded"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}
