import type { TmuxSession, TmuxWindow, TmuxPane } from './types';

export function parseSessions(output: string): TmuxSession[] {
  if (!output.trim()) return [];
  return output.trim().split('\n').map(line => {
    const [name, windows, attached, created, activity] = line.split('|');
    return {
      name,
      windows: parseInt(windows, 10),
      attached: attached === '1',
      created,
      activity,
      panePaths: [],
    };
  });
}

export function parseWindows(output: string): TmuxWindow[] {
  if (!output.trim()) return [];
  return output.trim().split('\n').map(line => {
    const [index, name, panes, active] = line.split('|');
    return {
      index: parseInt(index, 10),
      name,
      panes: parseInt(panes, 10),
      active: active === '1',
    };
  });
}

export function parsePanes(output: string): TmuxPane[] {
  if (!output.trim()) return [];
  return output.trim().split('\n').map(line => {
    const [index, width, height, active, pid, currentCommand] = line.split('|');
    return {
      index: parseInt(index, 10),
      width: parseInt(width, 10),
      height: parseInt(height, 10),
      active: active === '1',
      pid: parseInt(pid, 10),
      currentCommand,
    };
  });
}

/** Parsed `tmux list-panes -a -F "#{session_name}|||#{pane_current_path}"` Output.
 *  Gibt Map<sessionName, uniquePaths[]> zurueck. */
export function parsePanePaths(output: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!output.trim()) return result;

  for (const line of output.trim().split('\n')) {
    const sepIdx = line.indexOf('|||');
    if (sepIdx === -1) continue;
    const session = line.slice(0, sepIdx);
    const path = line.slice(sepIdx + 3);
    if (!session || !path) continue;

    const paths = result.get(session) ?? [];
    if (!paths.includes(path)) {
      paths.push(path);
    }
    result.set(session, paths);
  }
  return result;
}
