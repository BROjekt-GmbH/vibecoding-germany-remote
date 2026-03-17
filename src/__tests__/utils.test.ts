import { formatRelativeTime, truncate, cn } from '@/lib/utils';

describe('formatRelativeTime', () => {
  it('returns "never" for null', () => {
    expect(formatRelativeTime(null)).toBe('never');
  });

  it('returns seconds ago for recent dates', () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(recent)).toMatch(/\ds ago/);
  });

  it('returns minutes ago', () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMin)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const twoHours = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(formatRelativeTime(twoHours)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const threeDays = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(formatRelativeTime(threeDays)).toBe('3d ago');
  });
});

describe('truncate', () => {
  it('returns string unchanged if short enough', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
    expect(truncate('hello world', 8).length).toBe(8);
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates Tailwind classes', () => {
    // tailwind-merge: later class wins
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('filters falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, 'baz')).toBe('foo baz');
  });
});
