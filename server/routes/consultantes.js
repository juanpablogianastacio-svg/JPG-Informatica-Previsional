import { Router } from 'express';
import { query } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';
import { clean, num, bool, CONDICIONES } from '../lib/util.js';

const r = Router();

function payload(b) {
  const sexo = clean(b.sexo);
  if (sexo && !['M', 'F', 'X'].includes(sexo)) throw new HttpError(400, 'Sexo inválido');
  const nombre = clean(b.nombre);
  if (!nombre) throw new HttpError(400, 'El nombre es obligatorio');
  const anios = Math.max(0, Math.trunc(num(b.servicios_anios) ?? 0));
  const meses = Math.max(0, Math.trunc(num(b.servicios_meses) ?? 0));
  if (meses > 11) throw new HttpError(400, 'Los meses de servicio deben estar entre 0 y 11');
  return [
    nombre,
    clean(b.dni)?.replace(/\./g, '') ?? null,
    clean(b.fecha_nacimiento),
    sexo,
    clean(b.telefono),
    clean(b.email),
    anios,
    meses,
    clean(b.servicios_fecha_ref),
    bool(b.sigue_aportando, true),
    clean(b.notas),
    (Array.isArray(b.condiciones) ? b.condiciones : []).filter((x) => x in CONDICIONES),
  ];
}

const LISTADO_SQL = `
  SELECT c.*,
    lc.id AS ultimo_calculo_id, lc.created_at AS ultimo_calculo_at, lc.algun_cumple AS ultimo_algun_cumple,
    (SELECT count(*)::int FROM casos_reajuste cr WHERE cr.consultante_id = c.id) AS casos_count
  FROM consultantes c
  LEFT JOIN LATERAL (
    SELECT id, created_at, algun_cumple FROM calculos WHERE consultante_id = c.id ORDER BY created_at DESC LIMIT 1
  ) lc ON TRUE`;

r.get('/', ah(async (req, res) => {
  const q = clean(req.query.q);
  const params = [];
  let where = '';
  if (q) {
    params.push(`%${q.replace(/\./g, '')}%`);
    where = `WHERE unaccent_lower(c.nombre) LIKE unaccent_lower($1) OR c.dni LIKE $1 OR c.email ILIKE $1`;
  }
  const { rows } = await query(`${LISTADO_SQL} ${where} ORDER BY c.nombre`, params);
  res.json(rows);
}));

r.get('/:id', ah(async (req, res) => {
  const { rows } = await query(`${LISTADO_SQL} WHERE c.id = $1`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Consultante no encontrado');
  res.json(rows[0]);
}));

r.post('/', ah(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO consultantes (nombre, dni, fecha_nacimiento, sexo, telefono, email, servicios_anios, servicios_meses,
       servicios_fecha_ref, sigue_aportando, notas, condiciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, CURRENT_DATE),$10,$11,$12) RETURNING *`,
    payload(req.body || {}),
  );
  res.status(201).json(rows[0]);
}));

r.put('/:id', ah(async (req, res) => {
  const { rows } = await query(
    `UPDATE consultantes SET nombre=$1, dni=$2, fecha_nacimiento=$3, sexo=$4, telefono=$5, email=$6,
       servicios_anios=$7, servicios_meses=$8, servicios_fecha_ref=COALESCE($9, servicios_fecha_ref, CURRENT_DATE),
       sigue_aportando=$10, notas=$11, condiciones=$12, updated_at=now()
     WHERE id=$13 RETURNING *`,
    [...payload(req.body || {}), req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, 'Consultante no encontrado');
  res.json(rows[0]);
}));

r.delete('/:id', ah(async (req, res) => {
  const { rows } = await query('SELECT count(*)::int AS n FROM casos_reajuste WHERE consultante_id = $1', [req.params.id]);
  if (rows[0].n > 0) throw new HttpError(409, 'No se puede borrar: el consultante tiene casos de reajuste. Borrá primero los casos.');
  await query('DELETE FROM consultantes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

export default r;
