import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { desc, isNull } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  await requireUser()
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('read') === 'false'
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const query = db
    .select()
    .from(alertHistory)
    .orderBy(desc(alertHistory.createdAt))
    .limit(Math.min(limit, 200))

  const alerts = unreadOnly
    ? await query.where(isNull(alertHistory.readAt))
    : await query

  return NextResponse.json({ alerts })
}
