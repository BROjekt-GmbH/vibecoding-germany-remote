import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { UpdateHostSchema } from '@/lib/validation';
import { sanitizeHost } from '@/lib/api/sanitize';
import { sshPool } from '@/lib/ssh/pool';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const result = await db.select().from(hosts).where(eq(hosts.id, id)).limit(1);
    if (!result[0]) {
      return NextResponse.json({ error: 'Host not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(sanitizeHost(result[0]));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateHostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const hasKeyChange = parsed.data.privateKey !== undefined || parsed.data.privateKeyEnv !== undefined;

    const [updated] = await db
      .update(hosts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(hosts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Host not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Alte Verbindung invaliden wenn Key geaendert wurde
    if (hasKeyChange) {
      await sshPool.disconnect(id);
    }

    return NextResponse.json(sanitizeHost(updated));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const [deleted] = await db.delete(hosts).where(eq(hosts.id, id)).returning();
    if (!deleted) {
      return NextResponse.json({ error: 'Host not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
