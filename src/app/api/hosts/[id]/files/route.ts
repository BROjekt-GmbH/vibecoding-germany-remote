import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath, MAX_VIEW_SIZE } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const path = req.nextUrl.searchParams.get('path');
  const mode = req.nextUrl.searchParams.get('mode');

  const err = validatePath(path ?? '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    // stat: GNU (-c '%s') mit Fallback auf macOS/BSD (-f '%z')
    const sizeOutput = await execOnHost(id, `stat -c '%s' ${JSON.stringify(path)} 2>/dev/null || stat -f '%z' ${JSON.stringify(path)} 2>/dev/null`);
    const fileSize = parseInt(sizeOutput.trim(), 10) || 0;

    if (fileSize > MAX_VIEW_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu gross', size: fileSize, maxSize: MAX_VIEW_SIZE },
        { status: 413 }
      );
    }

    if (mode === 'base64') {
      const content = await execOnHost(id, `base64 -w 0 ${JSON.stringify(path)} 2>/dev/null || base64 ${JSON.stringify(path)} 2>/dev/null`);
      return NextResponse.json({ path, content: content.trim(), encoding: 'base64', size: fileSize });
    }

    const content = await execOnHost(id, `cat ${JSON.stringify(path)}`);
    return NextResponse.json({ path, content, size: fileSize });
  } catch {
    return NextResponse.json({ error: 'Datei nicht lesbar' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path, content } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (content === undefined) return NextResponse.json({ error: 'content required' }, { status: 400 });

  try {
    const b64 = Buffer.from(content).toString('base64');
    await execOnHost(id, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Schreiben fehlgeschlagen' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const path = req.nextUrl.searchParams.get('path');

  const err = validatePath(path ?? '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    await execOnHost(id, `rm -rf ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path, content } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const b64 = Buffer.from(content ?? '').toString('base64');
    await execOnHost(id, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erstellen fehlgeschlagen' }, { status: 500 });
  }
}
