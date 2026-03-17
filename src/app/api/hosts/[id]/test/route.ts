import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { db } from '@/lib/db';
import { hosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;

    const output = await execOnHost(id, 'echo "ok"');

    // Mark host as online
    await db.update(hosts).set({ isOnline: true, lastSeen: new Date(), updatedAt: new Date() }).where(eq(hosts.id, id));

    return NextResponse.json({ success: true, output: output.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Mark host as offline on SSH failure
    const { id } = await params;
    await db
      .update(hosts)
      .set({ isOnline: false, updatedAt: new Date() })
      .where(eq(hosts.id, id))
      .catch(() => {}); // ignore DB errors in cleanup

    return NextResponse.json({ success: false, error: message, code: 'SSH_ERROR' }, { status: 502 });
  }
}
