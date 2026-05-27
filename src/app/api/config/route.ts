import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Configurações ficam no .env.local — aqui apenas registra o payload
  const body = await req.json()
  console.log('[config] Configurações recebidas:', Object.keys(body))
  return NextResponse.json({ ok: true })
}
