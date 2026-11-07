import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';
import { clean, num, ETAPAS, hoyEstudio } from '../lib/util.js';
import { borrarAdjuntosDe } from './adjuntos.js';

const r = Router();

const BASE_SQL = `
  SELECT cr.*, c.nombre AS consultante_nombre, c.dni AS consultante_dni,
    rg.nombre AS regimen_nombre,
    COALESCE((SELECT json_agg(json_build_object('id', m.id, 'nombre', m.nombre) ORDER BY m.orden)
              FROM caso_motivos cm JOIN motivos_reajuste m ON m.id = cm.motivo_id WHERE cm.caso_id = cr.id), '[]') AS motivos
  FROM casos_reajuste cr
  JOIN consultantes c ON c.id = cr.consultante_id
  LEFT JOIN regimenes rg ON rg.id = cr.regimen_id`;

function payload(b) {
  const consultante_id = num(b.consultante_id);
  if (!consultante_id) throw new HttpError(400, 'Elegí un consultante');
  const haber = num(b.haber_actual);
  if (haber !== null && haber < 0) throw new HttpError(400, 'El haber no puede ser negativo');
  return {
    fields: [
      consultante_id, num(b.regimen_id), clean(b.fecha_jubilacion), haber, clean(b.expediente),
      clean(b.motivo_otro), clean(b.notas), num(b.abogado_id),
    ],
    motivos: Array.isArray(b.motivo_ids) ? [...new Set(b.motivo_ids.map(Number).filter(Boolean))] : [],
  };
}

async function setMotivos(client, casoId, motivos) {
  await client.query('DELETE FROM caso_motivos WHERE caso_id = $1', [casoId]);
  if (motivos.length) {
    await client.query(
      'INSERT INTO caso_motivos (caso_id, motivo_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING',
      [casoId, motivos],
    );
  }
}

async function abogadoNombre(client, id) {
  if (!id) return null;
  const { rows } = await client.query('SELECT nombre FROM usuarios WHERE id = $1', [id]);
  return rows[0]?.nombre ?? null;
}

r.get('/motivos', ah(async (_req, res) => {
  const { rows } = await query('SELECT * FROM motivos_reajuste WHERE activo ORDER BY orden, nombre');
  res.json(rows);
}));

r.get('/', ah(async (req, res) => {
  const params = [];
  const where = [];
  if (req.query.etapa && ETAPAS.includes(req.query.etapa)) {
    params.push(req.query.etapa);
    where.push(`cr.etapa = $${params.length}`);
  }
  if (req.query.consultante_id) {
    params.push(req.query.consultante_id);
    where.push(`cr.consultante_id = $${params.length}`);
  }
  const q = clean(req.query.q);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(unaccent_lower(c.nombre) LIKE unaccent_lower($${params.length}) OR c.dni LIKE $${params.length} OR cr.expediente ILIKE $${params.length})`);
  }
  const { rows } = await query(
    `${BASE_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY cr.updated_at DESC`,
    params,
  );
  res.json(rows);
}));

r.get('/:id', ah(async (req, res) => {
  const { rows } = await query(`${BASE_SQL} WHERE cr.id = $1`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Caso no encontrado');
  const eventos = await query('SELECT * FROM caso_eventos WHERE caso_id = $1 ORDER BY fecha DESC, created_at DESC', [req.params.id]);
  res.json({ ...rows[0], eventos: eventos.rows });
}));

r.post('/', ah(async (req, res) => {
  const { fields, motivos } = payload(req.body || {});
  const fecha = await hoyEstudio();
  const caso = await withTransaction(async (client) => {
    const abogadoId = fields[7] ?? req.user.id;
    const nombreAbogado = (await abogadoNombre(client, abogadoId)) ?? req.user.nombre;
    const { rows } = await client.query(
      `INSERT INTO casos_reajuste (consultante_id, regimen_id, fecha_jubilacion, haber_actual, expediente, motivo_otro, notas,
         abogado_id, abogado_nombre, etapa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'evaluacion') RETURNING id`,
      [...fields.slice(0, 7), abogadoId, nombreAbogado],
    );
    await setMotivos(client, rows[0].id, motivos);
    await client.query(
      `INSERT INTO caso_eventos (caso_id, tipo, etapa_nueva, fecha, nota, usuario_id, usuario_nombre)
       VALUES ($1, 'etapa', 'evaluacion', $2, 'Caso abierto', $3, $4)`,
      [rows[0].id, fecha, req.user.id, req.user.nombre],
    );
    return rows[0];
  });
  res.status(201).json(caso);
}));

r.put('/:id', ah(async (req, res) => {
  const { fields, motivos } = payload(req.body || {});
  await withTransaction(async (client) => {
    const nombreAbogado = await abogadoNombre(client, fields[7]);
    const { rowCount } = await client.query(
      `UPDATE casos_reajuste SET consultante_id=$1, regimen_id=$2, fecha_jubilacion=$3, haber_actual=$4, expediente=$5,
         motivo_otro=$6, notas=$7, abogado_id=$8, abogado_nombre=$9, updated_at=now()
       WHERE id=$10`,
      [...fields, nombreAbogado, req.params.id],
    );
    if (!rowCount) throw new HttpError(404, 'Caso no encontrado');
    await setMotivos(client, req.params.id, motivos);
  });
  res.json({ ok: true });
}));

/**
 * Cambio de etapa. Efectos:
 *  - registra el evento en el historial (con fecha y nota)
 *  - actualiza etapa + etapa_desde
 *  - pasar a "archivado" fija fecha_cierre; salir de "archivado" la limpia (reapertura)
 */
r.post('/:id/etapa', ah(async (req, res) => {
  const nueva = req.body?.etapa;
  if (!ETAPAS.includes(nueva)) throw new HttpError(400, 'Etapa inválida');
  const fecha = clean(req.body?.fecha) || (await hoyEstudio());
  const nota = clean(req.body?.nota);
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT etapa FROM casos_reajuste WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Caso no encontrado');
    const anterior = rows[0].etapa;
    if (anterior === nueva) throw new HttpError(400, 'El caso ya está en esa etapa');
    const retrocede = ETAPAS.indexOf(nueva) < ETAPAS.indexOf(anterior);
    if (retrocede && nueva !== 'archivado' && anterior !== 'archivado' && !nota) {
      throw new HttpError(400, 'Para volver a una etapa anterior indicá el motivo en la nota.');
    }
    if (anterior === 'archivado' && !nota) throw new HttpError(400, 'Para reabrir un caso archivado indicá el motivo en la nota.');
    await client.query(
      `UPDATE casos_reajuste SET etapa=$1, etapa_desde=$2::date,
         fecha_cierre = CASE WHEN $1 = 'archivado' THEN $2::date ELSE NULL END, updated_at=now()
       WHERE id=$3`,
      [nueva, fecha, req.params.id],
    );
    await client.query(
      `INSERT INTO caso_eventos (caso_id, tipo, etapa_anterior, etapa_nueva, fecha, nota, usuario_id, usuario_nombre)
       VALUES ($1,'etapa',$2,$3,$4,$5,$6,$7)`,
      [req.params.id, anterior, nueva, fecha, nota, req.user.id, req.user.nombre],
    );
    return { etapa: nueva, anterior };
  });
  res.json(result);
}));

r.post('/:id/notas', ah(async (req, res) => {
  const nota = clean(req.body?.nota);
  if (!nota) throw new HttpError(400, 'La nota está vacía');
  const fecha = clean(req.body?.fecha) || (await hoyEstudio());
  const { rows } = await query(
    `INSERT INTO caso_eventos (caso_id, tipo, fecha, nota, usuario_id, usuario_nombre)
     SELECT id, 'nota', $2, $3, $4, $5 FROM casos_reajuste WHERE id = $1 RETURNING *`,
    [req.params.id, fecha, nota, req.user.id, req.user.nombre],
  );
  if (!rows[0]) throw new HttpError(404, 'Caso no encontrado');
  await query('UPDATE casos_reajuste SET updated_at = now() WHERE id = $1', [req.params.id]);
  res.status(201).json(rows[0]);
}));

r.delete('/:id/eventos/:eventoId', ah(async (req, res) => {
  // Solo se pueden borrar notas; el historial de etapas es inmutable.
  await query(`DELETE FROM caso_eventos WHERE id = $1 AND caso_id = $2 AND tipo = 'nota'`, [req.params.eventoId, req.params.id]);
  res.json({ ok: true });
}));

r.delete('/:id', ah(async (req, res) => {
  await query('DELETE FROM casos_reajuste WHERE id = $1', [req.params.id]);
  await borrarAdjuntosDe('caso', req.params.id);
  res.json({ ok: true });
}));

export default r;
