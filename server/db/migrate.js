import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { seed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock para que dos instancias arrancando a la vez no migren en paralelo
    await client.query('SELECT pg_advisory_xact_lock(424242)');
    await client.query(sql);
    await seed(client);

    const { rows } = await client.query('SELECT count(*)::int AS n FROM usuarios');
    if (rows[0].n === 0) {
      const email = (process.env.ADMIN_EMAIL || 'admin@estudio.local').toLowerCase();
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const nombre = process.env.ADMIN_NOMBRE || 'Equipo del estudio';
      const hash = await bcrypt.hash(password, 10);
      await client.query('INSERT INTO usuarios (email, nombre, password_hash) VALUES ($1,$2,$3)', [email, nombre, hash]);
      console.log(`[migrate] Usuario inicial creado: ${email}`);
    }
    await client.query('COMMIT');
    console.log('[migrate] Schema OK');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Permite correr `npm run migrate` de forma independiente
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
