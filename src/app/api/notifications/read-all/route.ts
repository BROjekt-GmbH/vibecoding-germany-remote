import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { isNull } from 'drizzle-orm'

export async function POST(_req: NextRequest) {
  await requireUser()
  await db.update(alertHistory).set({ readAt: new Date() }).where(isNull(alertHistory.readAt))
  return NextResponse.json({ ok: true })
}
