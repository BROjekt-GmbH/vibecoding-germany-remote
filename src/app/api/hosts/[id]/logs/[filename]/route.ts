import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { execOnHost } from '@/lib/ssh/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; filename: string }> }) {
  await requireUser()
  const { id, filename } = await params
  const lines = parseInt(req.nextUrl.searchParams.get('lines') ?? '500')
  if (filename.includes('/') || filename.includes('..'))
    return NextResponse.json({ error: 'Ungueltiger Dateiname' }, { status: 400 })
  try {
    const content = await execOnHost(id, `tail -n ${lines} ~/.claude/logs/${JSON.stringify(filename)}`)
    return NextResponse.json({ filename, content, lines })
  } catch { return NextResponse.json({ error: 'Log nicht lesbar' }, { status: 404 }) }
}
