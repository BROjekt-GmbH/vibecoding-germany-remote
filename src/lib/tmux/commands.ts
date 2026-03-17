/**
 * Safe tmux command builders — never interpolate raw user input.
 * All user-supplied values are JSON.stringify-escaped.
 *
 * Commands are wrapped in `bash -lc` so that the user's login profile
 * (and PATH) are sourced. SSH exec channels use a non-interactive shell
 * where tmux might not be in PATH otherwise.
 */
export const tmuxCommands = {
  listSessions: () =>
    `bash -lc 'tmux list-sessions -F "#{session_name}|#{session_windows}|#{session_attached}|#{session_created}|#{session_activity}" 2>/dev/null || echo ""'`,

  listWindows: (session: string) =>
    `bash -lc 'tmux list-windows -t ${JSON.stringify(session)} -F "#{window_index}|#{window_name}|#{window_panes}|#{window_active}" 2>/dev/null || echo ""'`,

  listPanes: (session: string, window: number) =>
    `bash -lc 'tmux list-panes -t ${JSON.stringify(`${session}:${window}`)} -F "#{pane_index}|#{pane_width}|#{pane_height}|#{pane_active}|#{pane_pid}|#{pane_current_command}" 2>/dev/null || echo ""'`,

  capturePane: (target: string, lines: number = 100) =>
    `bash -lc 'tmux capture-pane -p -t ${JSON.stringify(target)} -S -${lines} 2>/dev/null || echo ""'`,

  sendKeys: (target: string, keys: string) =>
    `bash -lc 'tmux send-keys -t ${JSON.stringify(target)} ${JSON.stringify(keys)}'`,

  listPanePaths: () =>
    `bash -lc 'tmux list-panes -a -F "#{session_name}|||#{pane_current_path}" 2>/dev/null || echo ""'`,

  newSession: (name: string, startDir?: string) =>
    startDir
      ? `bash -lc 'tmux new-session -d -s ${JSON.stringify(name)} -c ${JSON.stringify(startDir)}'`
      : `bash -lc 'tmux new-session -d -s ${JSON.stringify(name)}'`,

  killSession: (name: string) =>
    `bash -lc 'tmux kill-session -t ${JSON.stringify(name)}'`,

  paneCwd: (session: string, pane: string = '0') =>
    `bash -lc 'tmux display-message -p -t ${JSON.stringify(`${session}:${pane}`)} "#{pane_current_path}" 2>/dev/null || echo ""'`,
};
