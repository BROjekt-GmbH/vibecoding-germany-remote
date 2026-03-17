import { parseSessions, parseWindows, parsePanes, parsePanePaths } from '../lib/tmux/parser';

describe('parseSessions', () => {
  it('returns empty array for empty output', () => {
    expect(parseSessions('')).toEqual([]);
    expect(parseSessions('   ')).toEqual([]);
  });

  it('parses single session', () => {
    const output = 'main|2|1|1700000000|1700000100';
    const result = parseSessions(output);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'main',
      windows: 2,
      attached: true,
      created: '1700000000',
      activity: '1700000100',
      panePaths: [],
    });
  });

  it('parses multiple sessions', () => {
    const output = 'main|2|1|1700000000|1700000100\nwork|1|0|1700001000|1700001200';
    const result = parseSessions(output);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('work');
    expect(result[1].attached).toBe(false);
  });
});

describe('parseWindows', () => {
  it('returns empty array for empty output', () => {
    expect(parseWindows('')).toEqual([]);
  });

  it('parses window correctly', () => {
    const output = '0|bash|3|1';
    const result = parseWindows(output);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 0, name: 'bash', panes: 3, active: true });
  });
});

describe('parsePanes', () => {
  it('returns empty array for empty output', () => {
    expect(parsePanes('')).toEqual([]);
  });

  it('parses pane correctly', () => {
    const output = '0|220|50|1|12345|bash';
    const result = parsePanes(output);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      index: 0,
      width: 220,
      height: 50,
      active: true,
      pid: 12345,
      currentCommand: 'bash',
    });
  });
});

describe('parsePanePaths', () => {
  it('returns empty map for empty output', () => {
    expect(parsePanePaths('')).toEqual(new Map());
    expect(parsePanePaths('   ')).toEqual(new Map());
  });

  it('parses single session with one pane', () => {
    const output = 'main|||/home/user/project';
    const result = parsePanePaths(output);
    expect(result.get('main')).toEqual(['/home/user/project']);
  });

  it('groups multiple panes per session', () => {
    const output = 'main|||/home/user/project\nmain|||/home/user/other\nwork|||/tmp';
    const result = parsePanePaths(output);
    expect(result.get('main')).toEqual(['/home/user/project', '/home/user/other']);
    expect(result.get('work')).toEqual(['/tmp']);
  });

  it('deduplicates paths within a session', () => {
    const output = 'main|||/home/user/project\nmain|||/home/user/project';
    const result = parsePanePaths(output);
    expect(result.get('main')).toEqual(['/home/user/project']);
  });
});
