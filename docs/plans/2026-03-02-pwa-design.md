# PWA — Add to Home Screen

**Datum:** 2026-03-02
**Status:** Genehmigt

## Ziel

Die App soll als PWA auf dem Smartphone-Homescreen installierbar sein (Standalone-Modus, kein Browser-Chrome).

## Scope

Nur installierbar — kein Service Worker, kein Offline-Caching. Die App ist komplett auf Live-Daten (WebSocket, SSH) angewiesen.

## Umsetzung

- `src/app/manifest.ts` — Web App Manifest via Next.js 15 Metadata API
- `src/app/layout.tsx` — Apple Meta-Tags (apple-mobile-web-app-capable, apple-touch-icon, theme-color)
- `public/icon-192.png` — PWA-Icon 192x192
- `public/icon-512.png` — PWA-Icon 512x512
- `public/apple-touch-icon.png` — iOS Icon 180x180
- Theme-Color: #060809 (bg-base)
- Display: standalone
