import 'dotenv/config';
import pg from 'pg';

// DATE como string 'YYYY-MM-DD' (evita corrimientos de zona horaria) y NUMERIC como number.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

const connectionString =
  process.env.DATABASE_URL || 'postgres://jpg:jpg@localhost:5432/jpg_previsional';

export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
