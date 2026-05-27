import { NextResponse } from 'next/server'
import { listInboxes } from '@/lib/inboxes'

const MOCK_INBOXES = [
  { key: 'num1', nome: 'Número 1', provider: 'evolution', cor: 'violet', ordem: 1 },
  { key: 'num2', nome: 'Número 2', provider: 'evolution', cor: 'emerald', ordem: 2 },
]

export async function GET() {
  try {
    const rows = await listInboxes()
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json(MOCK_INBOXES)
  }
}
