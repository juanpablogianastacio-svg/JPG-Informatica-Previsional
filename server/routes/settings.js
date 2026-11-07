import { Router } from 'express';
import { query } from '../db/pool.js';
import { ah } from '../middleware/auth.js';

const r = Router();

r.get('/', ah(async (_req, res) => {
  const { rows } = await query('SELECT nombre_estudio, moneda, timezone FROM settings WHERE id = 1');
  res.json(rows[0]);
}));

r.put('/', ah(async (req, res) => {
  const { nombre_estudio, moneda, timezone } = req.body || {};
  if (timezone) {
    try {
      new Intl.DateTimeFormat('es-AR', { timeZone: timezone });
    } catch {
      return res.status(400).json({ error: 'Zona horaria inválida' });
    }
  }
  const { rows } = await query(
    `UPDATE settings SET
       nombre_estudio = COALESCE(NULLIF($1, ''), nombre_estudio),
       moneda = COALESCE(NULLIF($2, ''), moneda),
       timezone = COALESCE(NULLIF($3, ''), timezone),
       updated_at = now()
     WHERE id = 1 RETURNING nombre_estudio, moneda, timezone`,
    [nombre_estudio?.trim(), moneda?.trim().toUpperCase(), timezone?.trim()],
  );
  res.json(rows[0]);
}));

export default r;
