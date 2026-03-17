// Host
export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  authMethod: 'key' | 'agent';  // 'key' = SSH key, 'agent' = SSH agent forwarding
  hasKey: boolean;
  groupId: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}

// tmux — aligned with src/lib/tmux/types.ts
export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
  activity?: string;
  panePaths?: string[];  // optional fuer Abwaertskompatibilitaet
}

export interface TmuxWindow {
  index: number;
  name: string;
  active: boolean;
  panes: number;
}

export interface TmuxPane {
  index: number;
  width: number;
  height: number;
  active: boolean;
  pid?: number;
  currentCommand?: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  path: string;
  hostId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// User
export interface AuthUser {
  login: string;
  name: string;
  profilePic: string | null;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  terminalFontSize: number;
  terminalFontFamily: string;
  pollIntervalMs: number;
}

// WebSocket events
export interface TerminalConnectPayload {
  hostId: string;
  sessionName: string;
  pane?: string;
}

export interface TerminalDataPayload {
  data: string;
}

export interface TerminalResizePayload {
  cols: number;
  rows: number;
}

export interface SessionsStatePayload {
  hostId: string;
  sessions: TmuxSession[];
}

export interface HostStatusPayload {
  hostId: string;
  online: boolean;
}

// Alert-Event — wird an den Client emittiert
export interface AlertEvent {
  id: string;
  type: 'host_offline' | 'info';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: number;
  link?: string;
  read: boolean;
}

// Alert-History — persistente Benachrichtigungen
export interface AlertHistoryItem {
  id: string;
  hostId: string | null;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

// Session-Template — gespeicherte tmux-Layouts
export interface SessionTemplate {
  id: string;
  userLogin: string;
  name: string;
  description: string | null;
  layout: {
    panes: Array<{ index: number; width: number; height: number; command?: string }>;
    splits: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Host-Gruppe — Kategorisierung
export interface HostGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
}

// ─── File Browser ───────────────────────────────────────

export interface FileEntry {
  name: string;
  isDir: boolean;
  size: number | null;
  modified: string;
  permissions: string;
}

export interface BrowseResponse {
  path: string;
  parent: string | null;
  entries: FileEntry[];
}

export interface SearchResult {
  path: string;
  name: string;
  isDir: boolean;
  line?: string;
  lineNumber?: number;
}
