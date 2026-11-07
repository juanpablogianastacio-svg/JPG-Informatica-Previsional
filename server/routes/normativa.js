import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';
import { clean, num } from '../lib/util.js';
import { borrarAdjuntosDe } from './adjuntos.js';

const r = Router();
const TIPOS = ['ley', 'fallo', 'resolucion', 'decreto', 'otro'];
const JURIS = ['NACION', 'SANTA_FE', 'NACION_Y_PROVINCIA'];

const BASE_SQL = `
  SELECT n.*,
    COALESCE((SELECT json_agg(json_build_object('id', rg.id, 'nombre', rg.nombre) ORDER BY rg.nombre)
              FROM norma_regimenes nr JOIN regimenes rg ON rg.id = nr.regimen_id WHERE nr.norma_id = n.id), '[]') AS regimenes,
    (SELECT count(*)::int FROM adjuntos a WHERE a.entidad = 'norma' AND a.entidad_id = n.id) AS adjuntos_count
  FROM normas n`;

function payload(b) {
  const titulo = clean(b.titulo);
  if (!titulo) throw new HttpError(400, 'El título es obligatorio');
  if (!TIPOS.includes(b.tipo)) throw new HttpError(400, 'Tipo inválido');
  if (!JURIS.includes(b.jurisdiccion)) throw new HttpError(400, 'Jurisdicción inválida');
  const link = clean(b.link);
  if (link && !/^https?:\/\//i.test(link)) throw new HttpError(400, 'El link debe empezar con http:// o https://');
  const tags = (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(','))
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean);
  return {
    fields: [titulo, b.tipo, b.jurisdiccion, clean(b.numero), num(b.anio), clean(b.resumen), link, [...new Set(tags)]],
    regimenes: Array.isArray(b.regimen_ids) ? [...new Set(b.regimen_ids.map(Number).filter(Boolean))] : [],
  };
}

async function setRegimenes(client, id, regimenes) {
  await client.query('DELETE FROM norma_regimenes WHERE norma_id = $1', [id]);
  if (regimenes.length) {
    await client.query('INSERT INTO norma_regimenes (norma_id, regimen_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING', [id, regimenes]);
  }
}

r.get('/tags', ah(async (_req, res) => {
  const { rows } = await query('SELECT DISTINCT unnest(tags) AS tag FROM normas ORDER BY 1');
  res.json(rows.map((x) => x.tag));
}));

r.get('/', ah(async (req, res) => {
  const params = [];
  const where = [];
  const q = clean(req.query.q);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(unaccent_lower(n.titulo) LIKE unaccent_lower($${params.length}) OR unaccent_lower(COALESCE(n.resumen,'')) LIKE unaccent_lower($${params.length})
      OR n.numero ILIKE $${params.length} OR EXISTS (SELECT 1 FROM unnest(n.tags) t WHERE t ILIKE $${params.length}))`);
  }
  if (TIPOS.includes(req.query.tipo)) {
    params.push(req.query.tipo);
    where.push(`n.tipo = $${params.length}`);
  }
  if (JURIS.includes(req.query.jurisdiccion)) {
    params.push(req.query.jurisdiccion);
    where.push(`n.jurisdiccion = $${params.length}`);
  }
  if (clean(req.query.tag)) {
    params.push(req.query.tag.toLowerCase());
    where.push(`$${params.length} = ANY(n.tags)`);
  }
  if (num(req.query.regimen_id)) {
    params.push(num(req.query.regimen_id));
    where.push(`EXISTS (SELECT 1 FROM norma_regimenes nr WHERE nr.norma_id = n.id AND nr.regimen_id = $${params.length})`);
  }
  const { rows } = await query(
    `${BASE_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY n.anio DESC NULLS LAST, n.titulo`,
    params,
  );
  res.json(rows);
}));

r.get('/:id', ah(async (req, res) => {
  const { rows } = await query(`${BASE_SQL} WHERE n.id = $1`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Norma no encontrada');
  res.json(rows[0]);
}));

r.post('/', ah(async (req, res) => {
  const { fields, regimenes } = payload(req.body || {});
  const row = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO normas (titulo, tipo, jurisdiccion, numero, anio, resumen, link, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      fields,
    );
    await setRegimenes(client, rows[0].id, regimenes);
    return rows[0];
  });
  res.status(201).json(row);
}));

r.put('/:id', ah(async (req, res) => {
  const { fields, regimenes } = payload(req.body || {});
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE normas SET titulo=$1, tipo=$2, jurisdiccion=$3, numero=$4, anio=$5, resumen=$6, link=$7, tags=$8, updated_at=now()
       WHERE id=$9`,
      [...fields, req.params.id],
    );
    if (!rowCount) throw new HttpError(404, 'Norma no encontrada');
    await setRegimenes(client, req.params.id, regimenes);
  });
  res.json({ ok: true });
}));

r.delete('/:id', ah(async (req, res) => {
  await query('DELETE FROM normas WHERE id = $1', [req.params.id]);
  await borrarAdjuntosDe('norma', req.params.id);
  res.json({ ok: true });
}));

export default r;
