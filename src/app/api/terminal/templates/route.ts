import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sessionTemplates } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest) {
  const user = await requireUser()
  const templates = await db.select().from(sessionTemplates).where(eq(sessionTemplates.userLogin, user.login)).orderBy(desc(sessionTemplates.createdAt))
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  const { name, description, layout } = await req.json()
  if (!name || !layout) return NextResponse.json({ error: 'name+layout required' }, { status: 400 })
  const [template] = await db.insert(sessionTemplates).values({ userLogin: user.login, name, description, layout }).returning()
  return NextResponse.json({ template })
}
