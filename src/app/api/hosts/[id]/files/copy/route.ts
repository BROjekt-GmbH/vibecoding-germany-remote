import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { source, destination } = await req.json();

  for (const p of [source, destination]) {
    const err = validatePath(p);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    await execOnHost(id, `cp -r ${JSON.stringify(source)} ${JSON.stringify(destination)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Kopieren fehlgeschlagen' }, { status: 500 });
  }
}
