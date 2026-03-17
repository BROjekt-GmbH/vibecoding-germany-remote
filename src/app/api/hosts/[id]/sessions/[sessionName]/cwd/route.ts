import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { tmuxCommands } from '@/lib/tmux/commands';

type Params = { params: Promise<{ id: string; sessionName: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id, sessionName } = await params;
    const pane = req.nextUrl.searchParams.get('pane') ?? '0';

    const output = await execOnHost(id, tmuxCommands.paneCwd(sessionName, pane));
    const cwd = output.trim() || '';

    if (!cwd) {
      // Fallback: Home-Verzeichnis des SSH-Users ermitteln
      const homeOutput = await execOnHost(id, 'echo $HOME');
      const homeCwd = homeOutput.trim() || '/';
      return NextResponse.json({ cwd: homeCwd, fallback: true });
    }

    return NextResponse.json({ cwd, fallback: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get cwd';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Fallback statt Fehler — IDE soll trotzdem laden
    return NextResponse.json({ cwd: '/', fallback: true });
  }
}
