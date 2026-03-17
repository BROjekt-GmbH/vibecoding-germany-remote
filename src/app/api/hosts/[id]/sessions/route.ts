import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { tmuxCommands } from '@/lib/tmux/commands';
import { parseSessions, parsePanePaths } from '@/lib/tmux/parser';
import { SSHExecError } from '@/lib/ssh/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const [sessOutput, paneOutput] = await Promise.all([
      execOnHost(id, tmuxCommands.listSessions()),
      execOnHost(id, tmuxCommands.listPanePaths()),
    ]);
    const sessions = parseSessions(sessOutput);
    const panePaths = parsePanePaths(paneOutput);
    const enriched = sessions.map(s => ({
      ...s,
      panePaths: panePaths.get(s.name) ?? [],
    }));
    return NextResponse.json(enriched);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list sessions';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: message, code: 'SSH_ERROR' }, { status: 502 });
  }
}

const SESSION_NAME_RE = /^[a-zA-Z0-9_-]+$/;

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    const startDir = typeof body.startDir === 'string' ? body.startDir.trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: 'Session name is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (!SESSION_NAME_RE.test(name)) {
      return NextResponse.json({ error: 'Session name may only contain a-z, A-Z, 0-9, _ and -', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (startDir && !startDir.startsWith('/')) {
      return NextResponse.json({ error: 'startDir must be an absolute path', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await execOnHost(id, tmuxCommands.newSession(name, startDir));
    return NextResponse.json({ success: true, name }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (err instanceof SSHExecError) {
      const detail = err.stderr.trim() || err.stdout.trim() || message;
      return NextResponse.json({ error: detail, code: 'COMMAND_FAILED' }, { status: 422 });
    }
    return NextResponse.json({ error: message, code: 'SSH_ERROR' }, { status: 502 });
  }
}
