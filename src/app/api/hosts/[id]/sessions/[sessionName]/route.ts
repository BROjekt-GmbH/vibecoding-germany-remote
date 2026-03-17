import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { tmuxCommands } from '@/lib/tmux/commands';
import { SSHExecError } from '@/lib/ssh/types';

type Params = { params: Promise<{ id: string; sessionName: string }> };

const SESSION_NAME_RE = /^[a-zA-Z0-9_-]+$/;

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id, sessionName } = await params;

    if (!SESSION_NAME_RE.test(sessionName)) {
      return NextResponse.json(
        { error: 'Ungueltiger Session-Name', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    await execOnHost(id, tmuxCommands.killSession(sessionName));
    return NextResponse.json({ success: true, name: sessionName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler beim Beenden der Session';
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
