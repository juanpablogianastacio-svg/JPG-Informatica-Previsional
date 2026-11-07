import { Router } from 'express';
import { query } from '../db/pool.js';
import { ah } from '../middleware/auth.js';
import { ETAPAS } from '../lib/util.js';

const r = Router();

r.get('/', ah(async (_req, res) => {
  const tz = (await query('SELECT timezone FROM settings WHERE id = 1')).rows[0].timezone;
  const mes = `date_trunc('month', now() AT TIME ZONE $1)`;

  const [kpis, etapas, enCondiciones, recientes, proximos] = await Promise.all([
    query(
      `SELECT
         (SELECT count(*)::int FROM calculos WHERE created_at AT TIME ZONE $1 >= ${mes}) AS calculos_mes,
         (SELECT count(*)::int FROM consultantes WHERE created_at AT TIME ZONE $1 >= ${mes}) AS consultantes_mes,
         (SELECT count(*)::int FROM consultantes) AS consultantes_total,
         (SELECT count(*)::int FROM casos_reajuste WHERE etapa <> 'archivado') AS casos_activos,
         (SELECT count(*)::int FROM casos_reajuste WHERE created_at AT TIME ZONE $1 >= ${mes}) AS casos_mes,
         (SELECT count(*)::int FROM regimenes WHERE activo AND requiere_validacion) AS regimenes_sin_validar`,
      [tz],
    ),
    query('SELECT etapa, count(*)::int AS n FROM casos_reajuste GROUP BY etapa'),
    // Consultantes cuyo ÚLTIMO cálculo indica que cumplen al menos un régimen
    query(
      `SELECT c.id, c.nombre, c.dni, k.id AS calculo_id, k.fecha_calculo, k.resultados
       FROM consultantes c
       JOIN LATERAL (SELECT * FROM calculos WHERE consultante_id = c.id ORDER BY created_at DESC LIMIT 1) k ON TRUE
       WHERE k.algun_cumple
       ORDER BY k.created_at DESC`,
    ),
    query(
      `SELECT k.id, k.fecha_calculo, k.algun_cumple, k.usuario_nombre, k.created_at, c.id AS consultante_id, c.nombre AS consultante_nombre
       FROM calculos k JOIN consultantes c ON c.id = k.consultante_id
       ORDER BY k.created_at DESC LIMIT 8`,
    ),
    // Consultantes que, según su último cálculo, cumplirán dentro de los próximos 12 meses
    query(
      `SELECT c.id, c.nombre, k.id AS calculo_id, min((x->>'fecha_estimada')::date) AS fecha_estimada
       FROM consultantes c
       JOIN LATERAL (SELECT * FROM calculos WHERE consultante_id = c.id ORDER BY created_at DESC LIMIT 1) k ON TRUE
       CROSS JOIN LATERAL jsonb_array_elements(k.resultados) x
       WHERE NOT k.algun_cumple AND x->>'estado' = 'no_cumple' AND (x->>'meses_hasta')::int <= 12
       GROUP BY c.id, c.nombre, k.id
       ORDER BY fecha_estimada LIMIT 10`,
    ),
  ]);

  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, 0]));
  for (const row of etapas.rows) porEtapa[row.etapa] = row.n;

  res.json({
    ...kpis.rows[0],
    en_condiciones_count: enCondiciones.rows.length,
    en_condiciones: enCondiciones.rows.slice(0, 10).map((x) => ({
      ...x,
      regimenes: x.resultados.filter((y) => y.estado === 'cumple').map((y) => y.regimen_nombre),
      resultados: undefined,
    })),
    casos_por_etapa: porEtapa,
    calculos_recientes: recientes.rows,
    proximos_a_cumplir: proximos.rows,
  });
}));

export default r;
