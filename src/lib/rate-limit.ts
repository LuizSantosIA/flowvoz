import { NextRequest } from 'next/server'
import { db } from './db'

/**
 * Rate limiter simples baseado em DB (sliding window por contagem).
 *
 * - Chave: combinação de "rota" + "identidade" (user_id ou IP).
 * - Janela: últimos N segundos.
 * - Se ultrapassar `max`, retorna false. Caso contrário, registra a tentativa e retorna true.
 *
 * Limpeza opportunística: a cada chamada com `cleanup=true`, prune rows com mais de 1h.
 */
export interface RateLimitOptions {
  max: number
  windowSec: number
  cleanup?: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
       ?? req.headers.get('x-real-ip')
       ?? 'unknown')
}

export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const { max, windowSec, cleanup } = opts
  try {
    const r = await db.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM rate_limit
        WHERE key = $1 AND ts > NOW() - ($2::int * INTERVAL '1 second')`,
      [key, windowSec]
    )
    const count = parseInt(r.rows[0]?.c ?? '0', 10)
    if (count >= max) {
      return { allowed: false, remaining: 0 }
    }
    await db.query(`INSERT INTO rate_limit (key) VALUES ($1)`, [key])
    if (cleanup && Math.random() < 0.02) {
      // 2% das requisições limpam linhas antigas
      db.query(`DELETE FROM rate_limit WHERE ts < NOW() - INTERVAL '1 hour'`).catch(() => {})
    }
    return { allowed: true, remaining: Math.max(0, max - count - 1) }
  } catch {
    // Se o DB falhar, deixa passar — não vamos derrubar a aplicação por causa do limiter
    return { allowed: true, remaining: max }
  }
}
