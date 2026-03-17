import { tmuxCommands } from '../lib/tmux/commands';

describe('tmuxCommands', () => {
  describe('listSessions', () => {
    it('returns a valid tmux command string', () => {
      const cmd = tmuxCommands.listSessions();
      expect(cmd).toContain('tmux list-sessions');
      expect(cmd).toContain('#{session_name}');
    });
  });

  describe('listWindows', () => {
    it('escapes session name', () => {
      const cmd = tmuxCommands.listWindows('my-session');
      expect(cmd).toContain('"my-session"');
    });

    it('escapes session name with special characters', () => {
      const cmd = tmuxCommands.listWindows('session"with"quotes');
      // JSON.stringify escapes the inner quotes
      expect(cmd).not.toContain('t "session"with"quotes"');
    });
  });

  describe('sendKeys', () => {
    it('escapes both target and keys', () => {
      const cmd = tmuxCommands.sendKeys('my-session:0', 'echo hello');
      expect(cmd).toContain('"my-session:0"');
      expect(cmd).toContain('"echo hello"');
    });
  });

  describe('newSession', () => {
    it('escapes session name', () => {
      const cmd = tmuxCommands.newSession('my-session');
      expect(cmd).toContain('tmux new-session');
      expect(cmd).toContain('"my-session"');
    });
  });

  describe('killSession', () => {
    it('wraps session name in quotes so shell does not interpret semicolons', () => {
      const cmd = tmuxCommands.killSession('dangerous; rm -rf /');
      // JSON.stringify wraps the value in quotes — the semicolon is inside quotes
      // so the shell treats it as a literal argument, not a command separator
      expect(cmd).toContain('"dangerous; rm -rf /"');
      // The dangerous string appears only as part of a quoted argument — NOT unquoted
      expect(cmd).not.toMatch(/kill-session -t dangerous;/);
    });
  });
});

describe('listPanePaths', () => {
  it('returns a valid tmux command string', () => {
    const cmd = tmuxCommands.listPanePaths();
    expect(cmd).toContain('tmux list-panes -a');
    expect(cmd).toContain('#{session_name}');
    expect(cmd).toContain('#{pane_current_path}');
  });
});

describe('newSession with startDir', () => {
  it('includes -c flag when startDir is provided', () => {
    const cmd = tmuxCommands.newSession('my-session', '/home/user/project');
    expect(cmd).toContain('-c');
    expect(cmd).toContain('/home/user/project');
  });

  it('does not include -c flag when startDir is omitted', () => {
    const cmd = tmuxCommands.newSession('my-session');
    expect(cmd).not.toContain('-c');
  });
});
