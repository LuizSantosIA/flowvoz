import { Pool, QueryResultRow } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

export const db = {
  query: <T extends QueryResultRow = Record<string, unknown>>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params),
}

export default pool
