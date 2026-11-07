import { Router } from 'express';
import { query } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';
import { clean, num, bool, hoyEstudio } from '../lib/util.js';
import { datosDesdeConsultante, evaluarTodos } from '../lib/calc.js';

const r = Router();

async function regimenesAplicables(jurisdicciones) {
  const params = [];
  let where = 'WHERE activo AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)';
  if (Array.isArray(jurisdicciones) && jurisdicciones.length) {
    params.push(jurisdicciones);
    where += ` AND jurisdiccion = ANY($1)`;
  }
  const { rows } = await query(`SELECT * FROM regimenes ${where} ORDER BY nombre`, params);
  return rows;
}

async function preparar(body) {
  const { rows } = await query('SELECT * FROM consultantes WHERE id = $1', [body.consultante_id]);
  const c = rows[0];
  if (!c) throw new HttpError(404, 'Consultante no encontrado');
  if (!c.fecha_nacimiento) throw new HttpError(400, 'Cargá la fecha de nacimiento del consultante antes de calcular.');
  const fecha = clean(body.fecha_calculo) || (await hoyEstudio());
  if (fecha < c.fecha_nacimiento) throw new HttpError(400, 'La fecha de cálculo es anterior al nacimiento.');

  const overrides = {};
  if (body.sigue_aportando !== undefined) overrides.sigueAportando = bool(body.sigue_aportando, c.sigue_aportando);
  const sa = num(body.servicio_anios);
  const sm = num(body.servicio_meses);
  if (sa !== null || sm !== null) overrides.servicioMeses = Math.max(0, Math.trunc(sa ?? 0) * 12 + Math.trunc(sm ?? 0));

  const datos = datosDesdeConsultante(c, fecha, overrides);
  const regimenes = Array.isArray(body.regimen_ids) && body.regimen_ids.length
    ? (await regimenesAplicables(null)).filter((x) => body.regimen_ids.map(Number).includes(x.id))
    : await regimenesAplicables(body.jurisdicciones);
  const resultados = evaluarTodos(regimenes, datos);
  return { consultante: c, datos, resultados };
}

// Previsualizar sin guardar
r.post('/preview', ah(async (req, res) => {
  const { datos, resultados } = await preparar(req.body || {});
  res.json({ datos, resultados });
}));

// Calcular y guardar snapshot
r.post('/', ah(async (req, res) => {
  const { consultante, datos, resultados } = await preparar(req.body || {});
  const { rows } = await query(
    `INSERT INTO calculos (consultante_id, fecha_calculo, edad_meses, servicio_meses, sexo, sigue_aportando,
       resultados, algun_cumple, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      consultante.id, datos.fechaCalculo, datos.edadMeses, datos.servicioMeses, datos.sexo, datos.sigueAportando,
      JSON.stringify(resultados), resultados.some((x) => x.estado === 'cumple'), req.user.id, req.user.nombre,
    ],
  );
  res.status(201).json(rows[0]);
}));

r.get('/', ah(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.consultante_id) {
    params.push(req.query.consultante_id);
    where = 'WHERE k.consultante_id = $1';
  }
  const { rows } = await query(
    `SELECT k.*, c.nombre AS consultante_nombre, c.dni AS consultante_dni
     FROM calculos k JOIN consultantes c ON c.id = k.consultante_id
     ${where} ORDER BY k.created_at DESC LIMIT 200`,
    params,
  );
  res.json(rows);
}));

r.get('/:id', ah(async (req, res) => {
  const { rows } = await query(
    `SELECT k.*, c.nombre AS consultante_nombre, c.dni AS consultante_dni, c.fecha_nacimiento AS consultante_nacimiento
     FROM calculos k JOIN consultantes c ON c.id = k.consultante_id WHERE k.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, 'Cálculo no encontrado');
  res.json(rows[0]);
}));

r.delete('/:id', ah(async (req, res) => {
  await query('DELETE FROM calculos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

export default r;
