import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params
  await db.update(alertHistory).set({ readAt: new Date() }).where(eq(alertHistory.id, id))
  return NextResponse.json({ ok: true })
}
