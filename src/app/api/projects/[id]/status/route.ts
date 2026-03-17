import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { tmuxCommands } from '@/lib/tmux/commands';
import { parseSessions, parsePanePaths } from '@/lib/tmux/parser';
import { matchSessionsToProject } from '@/lib/projects/matching';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;

    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!result[0]) {
      return NextResponse.json({ error: 'Project not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    const project = result[0];

    // Sessions vom Host holen
    let matchedSessions: ReturnType<typeof matchSessionsToProject> = [];
    try {
      const [sessOutput, paneOutput] = await Promise.all([
        execOnHost(project.hostId, tmuxCommands.listSessions()),
        execOnHost(project.hostId, tmuxCommands.listPanePaths()),
      ]);
      const sessions = parseSessions(sessOutput);
      const panePaths = parsePanePaths(paneOutput);
      const enriched = sessions.map(s => ({
        ...s,
        panePaths: panePaths.get(s.name) ?? [],
      }));
      matchedSessions = matchSessionsToProject(project.path, enriched);
    } catch {
      // Host offline — leere Sessions
    }

    return NextResponse.json({
      project,
      sessions: matchedSessions,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
