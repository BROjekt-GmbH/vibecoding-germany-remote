import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    await execOnHost(id, `mkdir -p ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Ordner erstellen fehlgeschlagen' }, { status: 500 });
  }
}
