import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hosts } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';
import { CreateHostSchema } from '@/lib/validation';
import { sanitizeHost } from '@/lib/api/sanitize';
import { encrypt } from '@/lib/crypto';

export async function GET() {
  try {
    await requireUser();
    const allHosts = await db.select().from(hosts);
    return NextResponse.json(allHosts.map(sanitizeHost));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = CreateHostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = { ...parsed.data };
    if (data.privateKey) {
      data.privateKey = encrypt(data.privateKey);
    }
    if (data.password) {
      data.password = encrypt(data.password);
    }
    const [host] = await db.insert(hosts).values(data).returning();
    return NextResponse.json(sanitizeHost(host), { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
