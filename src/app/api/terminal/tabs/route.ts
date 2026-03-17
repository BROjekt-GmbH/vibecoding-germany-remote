import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { terminalTabs, hosts } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';

// GET: Alle Tabs des Users laden (mit Host-Name)
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({
        id: terminalTabs.id,
        hostId: terminalTabs.hostId,
        hostName: hosts.name,
        sessionName: terminalTabs.sessionName,
        pane: terminalTabs.pane,
        position: terminalTabs.position,
        isActive: terminalTabs.isActive,
      })
      .from(terminalTabs)
      .leftJoin(hosts, eq(terminalTabs.hostId, hosts.id))
      .where(eq(terminalTabs.userLogin, user.login))
      .orderBy(asc(terminalTabs.position));

    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Neuen Tab erstellen
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { hostId, sessionName, pane = '0' } = body;

    if (!hostId || !sessionName) {
      return NextResponse.json({ error: 'hostId and sessionName required' }, { status: 400 });
    }

    // Position = nächste freie
    const existing = await db
      .select({ position: terminalTabs.position })
      .from(terminalTabs)
      .where(eq(terminalTabs.userLogin, user.login))
      .orderBy(asc(terminalTabs.position));

    const nextPos = existing.length > 0
      ? existing[existing.length - 1].position + 1
      : 0;

    // Alle anderen Tabs deaktivieren
    await db
      .update(terminalTabs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(terminalTabs.userLogin, user.login));

    // Neuen Tab erstellen (aktiv)
    const [tab] = await db
      .insert(terminalTabs)
      .values({
        userLogin: user.login,
        hostId,
        sessionName,
        pane,
        position: nextPos,
        isActive: true,
      })
      .returning();

    // Host-Name nachladen
    const [host] = await db
      .select({ name: hosts.name })
      .from(hosts)
      .where(eq(hosts.id, hostId))
      .limit(1);

    return NextResponse.json({
      ...tab,
      hostName: host?.name ?? 'Unknown',
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
