# Mobile-Optimierung — Design

**Datum:** 2026-03-02
**Status:** Genehmigt

## Ziel

Die gesamte Remote Team Dashboard App soll vollständig auf Smartphones nutzbar sein — alle Features inklusive Terminal.

## Anforderungen (vom User bestätigt)

- **Use Case:** Voll funktional — alle Features müssen am Smartphone genauso nutzbar sein wie am Desktop
- **Navigation:** Bottom Tab Bar (5 Icons: Dashboard, Hosts, Terminal, Teams, Settings)
- **Terminal:** Fullscreen-Modus mit nativer Tastatur + Spezial-Toolbar (Ctrl/Alt/Tab/Pfeiltasten)
- **Team-Detail:** Tab-basiert (Agents | Tasks | Messages) statt 3-Spalten-Grid

## Ansatz

Responsive Breakpoint-System mit einem einzigen Mobile-Breakpoint bei `md` (768px). Unter 768px greift das Mobile-Layout, darüber bleibt alles unverändert. Rein Tailwind-basiert, kein separater Mobile-Build.

## Design-Entscheidungen

### 1. Navigation

| Desktop (>= 768px) | Mobile (< 768px) |
|---|---|
| Sidebar links (220px/52px) | Sidebar versteckt |
| Header oben (52px) | Header kompakt (44px) |
| — | Bottom Tab Bar (56px) mit 5 Icons |

- Bottom Tabs: Dashboard, Hosts, Terminal, Teams, Settings
- Projects wird unter Settings als Unterseite verschoben (6 Tabs wären zu viel)
- Active Tab bekommt Highlight (accent color)
- `<main>` bekommt `padding-bottom: 56px` auf Mobile
- Sidebar wird auf Mobile via CSS `display: none` komplett ausgeblendet

### 2. Terminal (Fullscreen Mobile)

- Beim Öffnen einer Session auf Mobile: Header + Bottom Tabs verschwinden
- Terminal füllt gesamten Viewport (`100dvh`)
- Oben: schmale Toolbar (Tab-Wechsel + Close-Button, ~36px)
- Über der nativen Tastatur: Spezial-Toolbar mit Ctrl, Alt, Tab, Esc, Pfeiltasten (~40px)
- `touch-action: manipulation` auf dem Terminal-Container
- xterm.js `fontSize` wird auf Mobile auf 12px gesetzt (statt 13px)
- Close-Button navigiert zurück zur Session-Liste

### 3. Team-Detail (Tabs auf Mobile)

- Desktop: 3-Spalten Grid bleibt (`lg:grid-cols-3`)
- Mobile: Tab-Bar oben mit Agents | Tasks | Messages
- Nur aktiver Tab-Content sichtbar
- Messages-Tab nutzt volle verfügbare Höhe (Chat-Stil)
- State wird in URL-Parameter gespeichert (`?tab=agents`)

### 4. Formulare & Dialoge

- `HostForm` 2-Spalten Grid → 1 Spalte auf Mobile (`grid-cols-1 md:grid-cols-2`)
- Dialoge: volle Breite mit kleinem Margin (`mx-3`) auf Mobile
- Touch-Targets: mindestens 44px Höhe für alle interaktiven Elemente
- Inputs: `font-size: 16px` auf Mobile (verhindert iOS-Auto-Zoom)

### 5. Dashboard & Listen

- Host-Grid: bereits `grid-cols-1 md:grid-cols-2` (passt)
- Quick-Nav: `grid-cols-2` auf Mobile (passt)
- Status-Overview: Single Column auf Mobile
- Cards: etwas mehr Padding auf Mobile für Touch-Freundlichkeit

### 6. Technische Basis

- `useIsMobile()` Hook basierend auf `window.matchMedia('(max-width: 767px)')`
- CSS Custom Properties: `--bottom-bar-height: 56px` (Mobile) / `0px` (Desktop)
- Viewport Meta: `width=device-width, initial-scale=1, maximum-scale=1`
- `BottomTabBar` Komponente in `src/components/layout/`
- `TerminalToolbarMobile` Komponente für Spezial-Tasten

## Betroffene Dateien

### Neue Dateien
- `src/hooks/use-mobile.ts` — `useIsMobile()` Hook
- `src/components/layout/bottom-tab-bar.tsx` — Mobile Bottom Navigation
- `src/components/terminal/terminal-keys-toolbar.tsx` — Spezial-Tasten-Toolbar
- `src/components/team/team-tabs.tsx` — Mobile Tab-Navigation für Team-Detail

### Zu ändernde Dateien
- `src/app/layout.tsx` — Viewport Meta, Bottom Tab Bar einbinden, Mobile-Klassen
- `src/app/globals.css` — CSS Custom Properties, Mobile-Anpassungen
- `src/components/layout/sidebar.tsx` — Mobile: `hidden md:block`
- `src/components/layout/header.tsx` — Kompaktere Höhe auf Mobile
- `src/app/terminal/[sessionId]/page.tsx` — Fullscreen-Modus auf Mobile
- `src/components/terminal/terminal-view.tsx` — Touch-Handling, Font-Size
- `src/components/terminal/terminal-tabs.tsx` — Mobile-Anpassungen
- `src/components/terminal/terminal-toolbar.tsx` — Mobile-Anpassungen
- `src/app/teams/[teamId]/page.tsx` — Tab-basiertes Layout auf Mobile
- `src/components/host/host-form.tsx` — Responsive Grid
- `src/components/ui/dialog.tsx` — Mobile-Breite
- `src/components/ui/button.tsx` — Touch-Target-Größe
