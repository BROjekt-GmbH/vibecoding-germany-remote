import { NextRequest, NextResponse } from 'next/server';
import { Client as SSHClient } from 'ssh2';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';

const TestSchema = z.object({
  hostname: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  privateKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = TestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { hostname, port, username, privateKey } = parsed.data;

    await new Promise<void>((resolve, reject) => {
      const client = new SSHClient();
      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('Connection timeout'));
      }, 10_000);

      client
        .on('ready', () => {
          clearTimeout(timeout);
          client.end();
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        })
        .connect({
          host: hostname,
          port,
          username,
          privateKey,
          readyTimeout: 10_000,
        });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
