import { Router } from 'express';
import { query } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';
import { clean, num, bool, CONDICIONES } from '../lib/util.js';

const r = Router();
const JURIS = ['NACION', 'SANTA_FE', 'NACION_Y_PROVINCIA'];
const COMP = ['ninguna', 'edad_por_servicio', 'bidireccional'];

function payload(b) {
  const nombre = clean(b.nombre);
  if (!nombre) throw new HttpError(400, 'El nombre es obligatorio');
  if (!JURIS.includes(b.jurisdiccion)) throw new HttpError(400, 'Jurisdicción inválida');
  const compensacion = clean(b.compensacion) || 'ninguna';
  if (!COMP.includes(compensacion)) throw new HttpError(400, 'Compensación inválida');
  const ratio = num(b.compensacion_ratio) ?? 2;
  if (ratio <= 0) throw new HttpError(400, 'La proporción de compensación debe ser mayor a 0');
  for (const k of ['edad_min_hombre', 'edad_min_mujer', 'anios_servicio']) {
    const v = num(b[k]);
    if (v !== null && (v < 0 || v > 120)) throw new HttpError(400, `Valor fuera de rango: ${k}`);
  }
  return [
    nombre, b.jurisdiccion, clean(b.tipo) || 'general',
    num(b.edad_min_hombre), num(b.edad_min_mujer), num(b.anios_servicio),
    clean(b.requisito_servicio_detalle), compensacion, ratio,
    clean(b.fuente_normativa), clean(b.vigente_desde), clean(b.vigente_hasta), clean(b.notas),
    bool(b.requiere_validacion, true), bool(b.activo, true),
    clean(b.requiere_condicion) in CONDICIONES ? clean(b.requiere_condicion) : null,
  ];
}

r.get('/condiciones', (_req, res) => res.json(CONDICIONES));

r.get('/', ah(async (req, res) => {
  const params = [];
  const where = [];
  if (req.query.activos === 'true') where.push('activo');
  const q = clean(req.query.q);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(unaccent_lower(nombre) LIKE unaccent_lower($${params.length}) OR fuente_normativa ILIKE $${params.length} OR tipo ILIKE $${params.length})`);
  }
  const { rows } = await query(
    `SELECT * FROM regimenes ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY activo DESC, CASE jurisdiccion WHEN 'NACION' THEN 0 WHEN 'SANTA_FE' THEN 1 ELSE 2 END, nombre`,
    params,
  );
  res.json(rows);
}));

r.post('/', ah(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO regimenes (nombre, jurisdiccion, tipo, edad_min_hombre, edad_min_mujer, anios_servicio,
       requisito_servicio_detalle, compensacion, compensacion_ratio, fuente_normativa, vigente_desde, vigente_hasta,
       notas, requiere_validacion, activo, requiere_condicion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    payload(req.body || {}),
  );
  res.status(201).json(rows[0]);
}));

r.put('/:id', ah(async (req, res) => {
  const { rows } = await query(
    `UPDATE regimenes SET nombre=$1, jurisdiccion=$2, tipo=$3, edad_min_hombre=$4, edad_min_mujer=$5, anios_servicio=$6,
       requisito_servicio_detalle=$7, compensacion=$8, compensacion_ratio=$9, fuente_normativa=$10, vigente_desde=$11,
       vigente_hasta=$12, notas=$13, requiere_validacion=$14, activo=$15, requiere_condicion=$16, updated_at=now()
     WHERE id=$17 RETURNING *`,
    [...payload(req.body || {}), req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, 'Régimen no encontrado');
  res.json(rows[0]);
}));

r.delete('/:id', ah(async (req, res) => {
  // Los cálculos guardan un snapshot JSON, así que borrar el régimen no rompe el historial.
  await query('DELETE FROM regimenes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

export default r;
