import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, user })
}
