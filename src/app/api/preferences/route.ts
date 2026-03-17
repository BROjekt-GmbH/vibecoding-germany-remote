import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { preferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { UpdatePreferencesSchema } from '@/lib/validation';

export async function GET() {
  try {
    const user = await requireUser();
    const result = await db.select().from(preferences).where(eq(preferences.userLogin, user.login)).limit(1);

    if (!result[0]) {
      // Return defaults if no preferences row yet
      return NextResponse.json({
        userLogin: user.login,
        theme: 'dark',
        terminalFontSize: 14,
        terminalFontFamily: 'MesloLGS NF',
        pollIntervalMs: 2000,
        settings: {},
      });
    }
    return NextResponse.json(result[0]);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = UpdatePreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Upsert preferences for this user
    const [upserted] = await db
      .insert(preferences)
      .values({ userLogin: user.login, ...parsed.data })
      .onConflictDoUpdate({
        target: preferences.userLogin,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning();

    return NextResponse.json(upserted);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
