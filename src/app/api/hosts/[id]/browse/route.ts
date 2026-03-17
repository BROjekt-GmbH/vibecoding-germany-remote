import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  await requireUser();
  const { id } = await params;
  const requestedPath = req.nextUrl.searchParams.get('path');

  try {
    let targetPath = requestedPath;

    if (!targetPath) {
      const home = await execOnHost(id, `bash -lc 'echo $HOME'`);
      targetPath = home.trim();
    }

    const pathErr = validatePath(targetPath);
    if (pathErr) {
      return NextResponse.json({ error: pathErr }, { status: 400 });
    }

    // Plattform-agnostisch: ls -lA mit Fallback fuer macOS (kein --time-style)
    const output = await execOnHost(
      id,
      `bash -lc 'ls -lA --time-style=long-iso ${JSON.stringify(targetPath)} 2>/dev/null || ls -lA ${JSON.stringify(targetPath)} 2>/dev/null' | tail -n +2 | head -500`
    );

    const entries = output
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => parseLsLine(line))
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const parent = targetPath === '/'
      ? null
      : targetPath.replace(/\/[^/]+\/?$/, '') || '/';

    return NextResponse.json({ path: targetPath, parent, entries });
  } catch {
    return NextResponse.json(
      { error: 'Verzeichnis konnte nicht gelesen werden' },
      { status: 500 }
    );
  }
}

function parseLsLine(line: string): {
  name: string;
  isDir: boolean;
  size: number | null;
  modified: string;
  permissions: string;
} | null {
  // GNU ls: "-rw-r--r-- 1 user group 1234 2026-03-04 10:30 file"
  const gnuMatch = line.match(
    /^([drwxlsStT\-@+]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/
  );
  if (gnuMatch) {
    const [, permissions, sizeStr, date, time, name] = gnuMatch;
    if (name === '.' || name === '..') return null;
    const cleanName = name.replace(/\s->.*$/, '');
    const isDir = permissions.startsWith('d');
    return {
      name: cleanName, isDir,
      size: isDir ? null : parseInt(sizeStr, 10),
      modified: `${date}T${time}:00`,
      permissions,
    };
  }

  // macOS/BSD ls: "-rw-r--r--  1 user  group  1234 Mar  4 10:30 file"
  const bsdMatch = line.match(
    /^([drwxlsStT\-@+]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\w{3})\s+(\d{1,2})\s+([\d:]+)\s+(.+)$/
  );
  if (bsdMatch) {
    const [, permissions, sizeStr, month, day, time, name] = bsdMatch;
    if (name === '.' || name === '..') return null;
    const cleanName = name.replace(/\s->.*$/, '');
    const isDir = permissions.startsWith('d');
    const months: Record<string, string> = {
      Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
      Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'
    };
    const m = months[month] ?? '01';
    const d = day.padStart(2, '0');
    const year = new Date().getFullYear();
    return {
      name: cleanName, isDir,
      size: isDir ? null : parseInt(sizeStr, 10),
      modified: `${year}-${m}-${d}T${time.length === 5 ? time : time.substring(0,5)}:00`,
      permissions,
    };
  }

  return null;
}
