import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { oldPath, newPath } = await req.json();

  for (const p of [oldPath, newPath]) {
    const err = validatePath(p);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    await execOnHost(id, `mv ${JSON.stringify(oldPath)} ${JSON.stringify(newPath)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Umbenennen fehlgeschlagen' }, { status: 500 });
  }
}
