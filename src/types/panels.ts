export type PanelId = 'files' | 'terminal-mini' | 'projects' | 'host-status' | 'history';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface PanelState {
  id: PanelId;
  open: boolean;
  position: PanelPosition;
  size: PanelSize;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface PanelDefaults {
  position: PanelPosition;
  size: PanelSize;
  minSize: PanelSize;
}

export const PANEL_DEFAULTS: Record<PanelId, PanelDefaults> = {
  files:           { position: { x: 60, y: 80 },  size: { width: 420, height: 500 }, minSize: { width: 300, height: 300 } },

  'terminal-mini': { position: { x: 100, y: 120 }, size: { width: 560, height: 350 }, minSize: { width: 400, height: 250 } },
  projects:        { position: { x: 140, y: 90 },  size: { width: 420, height: 400 }, minSize: { width: 300, height: 250 } },
  'host-status':   { position: { x: 200, y: 100 }, size: { width: 380, height: 350 }, minSize: { width: 280, height: 250 } },
  history:         { position: { x: 160, y: 110 }, size: { width: 440, height: 450 }, minSize: { width: 300, height: 300 } },
};
