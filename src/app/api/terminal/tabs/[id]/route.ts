import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { terminalTabs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// DELETE: Tab entfernen
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    await db
      .delete(terminalTabs)
      .where(and(eq(terminalTabs.id, id), eq(terminalTabs.userLogin, user.login)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Tab aktualisieren (isActive, position)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    // Wenn dieser Tab aktiv wird, alle anderen deaktivieren
    if (body.isActive) {
      await db
        .update(terminalTabs)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(terminalTabs.userLogin, user.login));
    }

    // Nur erlaubte Felder aktualisieren
    const allowed: Record<string, unknown> = { updatedAt: new Date() };
    if (body.isActive !== undefined) allowed.isActive = body.isActive;
    if (body.position !== undefined) allowed.position = body.position;

    const [updated] = await db
      .update(terminalTabs)
      .set(allowed)
      .where(and(eq(terminalTabs.id, id), eq(terminalTabs.userLogin, user.login)))
      .returning();

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
