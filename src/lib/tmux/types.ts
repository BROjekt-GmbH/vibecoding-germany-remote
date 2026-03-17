export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
  activity: string;
  panePaths: string[];  // aktuelle Arbeitsverzeichnisse aller Panes
}

export interface TmuxWindow {
  index: number;
  name: string;
  panes: number;
  active: boolean;
}

export interface TmuxPane {
  index: number;
  width: number;
  height: number;
  active: boolean;
  pid: number;
  currentCommand: string;
}
