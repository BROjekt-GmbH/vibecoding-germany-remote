import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { execOnHost } from '@/lib/ssh/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  try {
    const output = await execOnHost(id, 'ls -lt ~/.claude/logs/ 2>/dev/null | tail -n +2 | head -50')
    const files = output.trim().split('\n').filter(l => l.trim()).map(line => {
      const parts = line.trim().split(/\s+/)
      return { name: parts[parts.length - 1], size: parts[4], date: `${parts[5]} ${parts[6]} ${parts[7]}` }
    }).filter(f => f.name && !f.name.startsWith('.'))
    return NextResponse.json({ files })
  } catch { return NextResponse.json({ files: [] }) }
}
