import { Pool, QueryResultRow } from 'pg'

// Substitui sslmode=require por verify-full para evitar aviso de deprecação do pg v9.
// Comportamento atual é idêntico — apenas elimina o warning nos logs.
const connectionString = (process.env.DATABASE_URL ?? '').replace('sslmode=require', 'sslmode=verify-full')

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

export const db = {
  query: <T extends QueryResultRow = Record<string, unknown>>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params),
}

export default pool
