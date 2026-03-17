import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sessionTemplates } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  await db.delete(sessionTemplates).where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.userLogin, user.login)))
  return NextResponse.json({ ok: true })
}
