import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Remote Team — Meridian',
    short_name: 'Remote Team',
    description: 'Claude Code team session dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#060809',
    theme_color: '#060809',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
