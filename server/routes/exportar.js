import { Router } from 'express';
import * as XLSX from 'xlsx';
import { query } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';
import { ETAPA_LABEL, JURISDICCION_LABEL, hoyEstudio } from '../lib/util.js';

const r = Router();

const fechaAR = (d) => {
  if (!d) return '';
  const s = typeof d === 'string'
    ? d.slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);
  const [y, m, dd] = s.split('-');
  return `${dd}/${m}/${y}`;
};
const SEXO = { M: 'Masculino', F: 'Femenino', X: 'No informado' };

async function datos(tipo) {
  if (tipo === 'consultantes') {
    const { rows } = await query(
      `SELECT c.*, lc.algun_cumple, lc.fecha_calculo
       FROM consultantes c
       LEFT JOIN LATERAL (SELECT algun_cumple, fecha_calculo FROM calculos WHERE consultante_id = c.id ORDER BY created_at DESC LIMIT 1) lc ON TRUE
       ORDER BY c.nombre`,
    );
    return rows.map((c) => ({
      Nombre: c.nombre,
      DNI: c.dni ?? '',
      'Fecha de nacimiento': fechaAR(c.fecha_nacimiento),
      Sexo: SEXO[c.sexo] ?? '',
      Teléfono: c.telefono ?? '',
      Email: c.email ?? '',
      'Servicios (años)': c.servicios_anios,
      'Servicios (meses)': c.servicios_meses,
      'Servicios a fecha': fechaAR(c.servicios_fecha_ref),
      'Sigue aportando': c.sigue_aportando ? 'Sí' : 'No',
      'Último cálculo': fechaAR(c.fecha_calculo),
      'En condiciones (último cálculo)': c.fecha_calculo ? (c.algun_cumple ? 'Sí' : 'No') : '',
      Notas: c.notas ?? '',
    }));
  }
  if (tipo === 'casos') {
    const { rows } = await query(
      `SELECT cr.*, c.nombre AS consultante, c.dni, rg.nombre AS regimen, rg.jurisdiccion,
         (SELECT string_agg(m.nombre, '; ' ORDER BY m.orden) FROM caso_motivos cm JOIN motivos_reajuste m ON m.id = cm.motivo_id WHERE cm.caso_id = cr.id) AS motivos
       FROM casos_reajuste cr JOIN consultantes c ON c.id = cr.consultante_id LEFT JOIN regimenes rg ON rg.id = cr.regimen_id
       ORDER BY cr.created_at DESC`,
    );
    return rows.map((x) => ({
      'N° caso': x.id,
      Consultante: x.consultante,
      DNI: x.dni ?? '',
      Expediente: x.expediente ?? '',
      Régimen: x.regimen ?? '',
      Jurisdicción: JURISDICCION_LABEL[x.jurisdiccion] ?? '',
      'Fecha de jubilación': fechaAR(x.fecha_jubilacion),
      'Haber actual (ARS)': x.haber_actual ?? '',
      Motivos: [x.motivos, x.motivo_otro && `Otro: ${x.motivo_otro}`].filter(Boolean).join('; '),
      Etapa: ETAPA_LABEL[x.etapa],
      'En etapa desde': fechaAR(x.etapa_desde),
      'Abogado a cargo': x.abogado_nombre ?? '',
      'Fecha de apertura': fechaAR(x.created_at),
      'Fecha de cierre': fechaAR(x.fecha_cierre),
    }));
  }
  throw new HttpError(404, 'Exportación no disponible');
}

r.get('/:tipo', ah(async (req, res) => {
  const rows = await datos(req.params.tipo);
  const formato = req.query.formato === 'csv' ? 'csv' : 'xlsx';
  const ws = XLSX.utils.json_to_sheet(rows);
  const nombre = `${req.params.tipo}-${await hoyEstudio()}.${formato}`;
  if (formato === 'csv') {
    // BOM + separador ';' para que Excel en es-AR lo abra bien
    const csv = '﻿' + XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    return res.send(csv);
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, req.params.tipo === 'casos' ? 'Casos de reajuste' : 'Consultantes');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(buf);
}));

export default r;
