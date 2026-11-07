import { query } from '../db/pool.js';

/** '' → null, y recorta strings. */
export function clean(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

export function num(v) {
  const c = clean(v);
  if (c === null) return null;
  const n = Number(String(c).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Fecha de hoy en la zona horaria configurada del estudio ('YYYY-MM-DD'). */
export async function hoyEstudio() {
  const { rows } = await query('SELECT timezone FROM settings WHERE id = 1');
  const tz = rows[0]?.timezone || 'America/Argentina/Buenos_Aires';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export const ETAPAS = ['evaluacion', 'reclamo_administrativo', 'demanda_iniciada', 'en_tramite', 'sentencia', 'archivado'];

export const ETAPA_LABEL = {
  evaluacion: 'Evaluación',
  reclamo_administrativo: 'Reclamo administrativo',
  demanda_iniciada: 'Demanda iniciada',
  en_tramite: 'En trámite',
  sentencia: 'Sentencia',
  archivado: 'Archivado',
};

export const JURISDICCION_LABEL = {
  NACION: 'Nación (ANSES)',
  SANTA_FE: 'Provincia de Santa Fe (Caja)',
  NACION_Y_PROVINCIA: 'Nación y Provincia',
};

// Condiciones especiales del consultante que habilitan regímenes especiales
export const CONDICIONES = {
  docente: 'Docente',
  ex_combatiente: 'Ex combatiente de Malvinas',
  policial: 'Policía / servicio penitenciario',
  magistrado: 'Magistrado / funcionario judicial',
  insalubre: 'Tareas insalubres / diferenciales',
};
