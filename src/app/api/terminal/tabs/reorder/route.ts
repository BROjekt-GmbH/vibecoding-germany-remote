import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { terminalTabs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';

// PUT: Batch-Reorder aller Tabs
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body: { ids: string[] } = await req.json();

    if (!Array.isArray(body.ids)) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    await Promise.all(
      body.ids.map((id, index) =>
        db
          .update(terminalTabs)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(terminalTabs.id, id), eq(terminalTabs.userLogin, user.login)))
      )
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
