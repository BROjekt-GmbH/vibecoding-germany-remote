const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  json: 'json',
  css: 'css',
  html: 'html', htm: 'html',
  md: 'markdown', mdx: 'markdown',
  py: 'python',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  yaml: 'yaml', yml: 'yaml',
  sql: 'sql',
};

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return LANG_MAP[ext] ?? 'plaintext';
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']);

export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

const BINARY_EXTENSIONS = new Set([
  'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'exe', 'bin', 'dll', 'so', 'dylib',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'mp4', 'avi', 'mkv', 'wav', 'flac',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'o', 'a', 'class', 'pyc', 'pyo',
]);

export function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return BINARY_EXTENSIONS.has(ext);
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tagen`;
  return new Date(isoDate).toLocaleDateString('de-DE');
}

export function joinPath(base: string, name: string): string {
  return base === '/' ? `/${name}` : `${base}/${name}`;
}

export function parentPath(path: string): string | null {
  if (path === '/') return null;
  return path.replace(/\/[^/]+\/?$/, '') || '/';
}

export function fileName(path: string): string {
  return path.split('/').pop() ?? path;
}
