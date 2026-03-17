import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path, query, type } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query erforderlich' }, { status: 400 });
  }

  const safeQuery = query.replace(/['"\\$`!]/g, '');

  try {
    if (type === 'content') {
      const output = await execOnHost(
        id,
        `bash -lc 'grep -rnl --include="*" -m 5 ${JSON.stringify(safeQuery)} ${JSON.stringify(path)} 2>/dev/null | head -50'`
      );
      const results = output.trim().split('\n').filter(Boolean).map(line => {
        const parts = line.split(':');
        const filePath = parts[0];
        const name = filePath.split('/').pop() ?? filePath;
        return { path: filePath, name, isDir: false };
      });
      return NextResponse.json({ results });
    }

    // Plattform-agnostisch: find ohne -printf (macOS hat kein -printf)
    // Stattdessen: find + exec test -d fuer Typ-Erkennung
    const output = await execOnHost(
      id,
      `bash -lc 'find ${JSON.stringify(path)} -maxdepth 5 -iname ${JSON.stringify('*' + safeQuery + '*')} 2>/dev/null | head -50 | while read f; do [ -d "$f" ] && echo "d $f" || echo "f $f"; done'`
    );
    const results = output.trim().split('\n').filter(Boolean).map(line => {
      const typeChar = line.charAt(0);
      const filePath = line.substring(2);
      const name = filePath.split('/').pop() ?? filePath;
      return { path: filePath, name, isDir: typeChar === 'd' };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Suche fehlgeschlagen' }, { status: 500 });
  }
}
