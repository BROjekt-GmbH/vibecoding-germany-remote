import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { shareTokens } from '@/lib/terminal/share-tokens'

// Re-export fuer Abwaertskompatibilitaet (falls andere Module importieren)
export { shareTokens }

export async function POST(req: NextRequest) {
  const user = await requireUser()
  const { hostId, sessionName, pane } = await req.json()
  const token = randomUUID()
  shareTokens.set(token, { hostId, sessionName, pane: pane ?? '0', createdBy: user.login, expiresAt: Date.now() + 3600000, viewers: new Set(), writable: new Set() })
  return NextResponse.json({ token, expiresAt: new Date(Date.now() + 3600000).toISOString() })
}

export async function GET(req: NextRequest) {
  await requireUser()
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  const data = shareTokens.get(token)
  if (!data || data.expiresAt < Date.now()) return NextResponse.json({ error: 'Token ungueltig oder abgelaufen' }, { status: 404 })
  return NextResponse.json({ hostId: data.hostId, sessionName: data.sessionName, pane: data.pane, createdBy: data.createdBy })
}
