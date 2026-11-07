// Formatos es-AR. Las fechas 'YYYY-MM-DD' se tratan como fechas calendario (sin zona horaria).

const TZ = 'America/Argentina/Buenos_Aires';

export function fmtFecha(v) {
  if (!v) return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function fmtFechaHora(v) {
  if (!v) return '—';
  const d = new Date(v);
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function fmtMoneda(v, moneda = 'ARS') {
  if (v === null || v === undefined || v === '') return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(Number(v));
}

export function fmtNumero(v, dec = 0) {
  if (v === null || v === undefined || v === '') return '—';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Number(v));
}

export function fmtDni(v) {
  if (!v) return '—';
  const digits = String(v).replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('es-AR').format(Number(digits)) : v;
}

export function fmtAniosMeses(totalMeses) {
  if (totalMeses === null || totalMeses === undefined) return '—';
  const t = Math.max(0, Math.round(totalMeses));
  const a = Math.floor(t / 12);
  const m = t % 12;
  const partes = [];
  if (a) partes.push(`${a} ${a === 1 ? 'año' : 'años'}`);
  if (m) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
  return partes.length ? partes.join(' y ') : '0 meses';
}

/** Edad (años cumplidos) a hoy. */
export function edadHoy(fechaNac) {
  if (!fechaNac) return null;
  const hoy = hoyISO();
  const [y1, m1, d1] = fechaNac.split('-').map(Number);
  const [y2, m2, d2] = hoy.split('-').map(Number);
  let e = y2 - y1;
  if (m2 < m1 || (m2 === m1 && d2 < d1)) e -= 1;
  return e;
}

export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export const ETAPAS = [
  { id: 'evaluacion', label: 'Evaluación', badge: 'blue' },
  { id: 'reclamo_administrativo', label: 'Reclamo administrativo', badge: 'warning' },
  { id: 'demanda_iniciada', label: 'Demanda iniciada', badge: 'warning' },
  { id: 'en_tramite', label: 'En trámite', badge: 'blue' },
  { id: 'sentencia', label: 'Sentencia', badge: 'success' },
  { id: 'archivado', label: 'Archivado', badge: '' },
];
export const ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e]));

export const JURISDICCIONES = [
  { id: 'NACION', label: 'Nación (ANSES)' },
  { id: 'SANTA_FE', label: 'Provincia de Santa Fe (Caja)' },
  { id: 'NACION_Y_PROVINCIA', label: 'Nación y Provincia' },
];
export const JURISDICCION = Object.fromEntries(JURISDICCIONES.map((j) => [j.id, j.label]));

export const CONDICIONES = [
  { id: 'docente', label: 'Docente' },
  { id: 'ex_combatiente', label: 'Ex combatiente de Malvinas' },
  { id: 'policial', label: 'Policía / servicio penitenciario' },
  { id: 'magistrado', label: 'Magistrado / funcionario judicial' },
  { id: 'insalubre', label: 'Tareas insalubres / diferenciales' },
];
export const CONDICION = Object.fromEntries(CONDICIONES.map((c) => [c.id, c.label]));

export const COMPENSACIONES = [
  { id: 'ninguna', label: 'Sin compensación' },
  { id: 'edad_por_servicio', label: 'Edad excedente compensa servicios faltantes' },
  { id: 'bidireccional', label: 'Bidireccional (edad ↔ servicios)' },
];

export const TIPOS_NORMA = [
  { id: 'ley', label: 'Ley' },
  { id: 'fallo', label: 'Fallo' },
  { id: 'resolucion', label: 'Resolución' },
  { id: 'decreto', label: 'Decreto' },
  { id: 'otro', label: 'Otro' },
];
export const TIPO_NORMA = Object.fromEntries(TIPOS_NORMA.map((t) => [t.id, t.label]));

export const SEXOS = [
  { id: 'F', label: 'Femenino' },
  { id: 'M', label: 'Masculino' },
  { id: 'X', label: 'No informado / X' },
];
export const SEXO = Object.fromEntries(SEXOS.map((s) => [s.id, s.label]));

export const ESTADO_CALCULO = {
  cumple: { label: 'Cumple', badge: 'success' },
  no_cumple: { label: 'No cumple aún', badge: 'danger' },
  manual: { label: 'Evaluación manual', badge: 'warning' },
};

export function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${fmtNumero(n / 1024, 0)} KB`;
  return `${fmtNumero(n / 1024 / 1024, 1)} MB`;
}
