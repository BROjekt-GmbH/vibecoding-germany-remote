import type { TmuxSession } from '../tmux/types';

/** Prueft ob ein Pane-Pfad zum Projektpfad gehoert (Prefix-Match mit Verzeichnisgrenze). */
function pathBelongsToProject(projectPath: string, panePath: string): boolean {
  if (panePath === projectPath) return true;
  return panePath.startsWith(projectPath + '/');
}

/** Gibt alle Sessions zurueck, die mindestens einen Pane im Projektverzeichnis haben. */
export function matchSessionsToProject(
  projectPath: string,
  sessions: TmuxSession[],
): TmuxSession[] {
  return sessions.filter(s =>
    s.panePaths.some(p => pathBelongsToProject(projectPath, p))
  );
}
