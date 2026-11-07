// Motor de cálculo de requisitos jubilatorios.
// Todo se trabaja en MESES enteros para evitar problemas de redondeo.
// Las reglas salen de la tabla `regimenes` (nada hardcodeado acá).

const MAX_MESES_PROYECCION = 12 * 60; // proyectamos como máximo 60 años hacia adelante

/** Meses completos entre dos fechas 'YYYY-MM-DD' (b >= a). */
export function mesesEntre(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  let meses = (yb - ya) * 12 + (mb - ma);
  if (db < da) meses -= 1;
  return Math.max(0, meses);
}

/** Suma meses a una fecha 'YYYY-MM-DD' (ajusta fin de mes: 31/01 + 1 mes = 28/02 o 29/02). */
export function sumarMeses(fecha, meses) {
  const [y, m, d] = fecha.split('-').map(Number);
  const total = y * 12 + (m - 1) + meses;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimoDia = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, ultimoDia);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

export function aniosMeses(totalMeses) {
  const t = Math.max(0, Math.round(totalMeses));
  return { anios: Math.floor(t / 12), meses: t % 12 };
}

function edadRequerida(regimen, sexo) {
  const h = regimen.edad_min_hombre;
  const m = regimen.edad_min_mujer;
  if (sexo === 'F') return m;
  if (sexo === 'M') return h;
  // Sexo no informado / X: tomamos el requisito más exigente y lo advertimos
  if (h == null || m == null) return h ?? m;
  return Math.max(h, m);
}

/**
 * ¿Cumple con edad `e` y servicios `s` (meses), contra requisitos E y S (meses)?
 * Devuelve null si no cumple, o 'directo' | 'compensacion_edad' | 'compensacion_servicios'.
 */
function cumpleCon(e, s, E, S, compensacion, ratio) {
  if (e >= E && s >= S) return 'directo';
  if (compensacion === 'edad_por_servicio' || compensacion === 'bidireccional') {
    // Exceso de edad compensa falta de servicios: `ratio` años de edad por cada año de servicio
    if (e > E && s < S && e - E >= ratio * (S - s)) return 'compensacion_edad';
  }
  if (compensacion === 'bidireccional') {
    // Exceso de servicios compensa falta de edad, en la misma proporción
    if (s > S && e < E && s - S >= ratio * (E - e)) return 'compensacion_servicios';
  }
  return null;
}

/**
 * Evalúa un régimen para una persona.
 * @param {object} regimen fila de la tabla regimenes
 * @param {object} p { edadMeses, servicioMeses, sexo, sigueAportando, fechaCalculo: 'YYYY-MM-DD' }
 */
export function evaluarRegimen(regimen, p) {
  const base = {
    regimen_id: regimen.id,
    regimen_nombre: regimen.nombre,
    jurisdiccion: regimen.jurisdiccion,
    tipo: regimen.tipo,
    fuente_normativa: regimen.fuente_normativa,
    requisito_servicio_detalle: regimen.requisito_servicio_detalle,
    requiere_validacion: regimen.requiere_validacion,
    advertencias: [],
  };

  const edadReq = edadRequerida(regimen, p.sexo);
  if (edadReq == null || regimen.anios_servicio == null) {
    return {
      ...base,
      estado: 'manual',
      detalle: 'El régimen no tiene edad y/o servicios definidos. Requiere evaluación manual.',
    };
  }
  if (!p.sexo || p.sexo === 'X') {
    base.advertencias.push('Sexo no informado: se usó la edad mínima más exigente.');
  }

  const E = Math.round(Number(edadReq) * 12);
  const S = Math.round(Number(regimen.anios_servicio) * 12);
  const ratio = Number(regimen.compensacion_ratio) || 2;
  const comp = regimen.compensacion || 'ninguna';

  const requisitos = { edad_meses: E, servicio_meses: S, compensacion: comp, ratio };
  const faltaEdad = Math.max(0, E - p.edadMeses);
  const faltaServ = Math.max(0, S - p.servicioMeses);

  const via = cumpleCon(p.edadMeses, p.servicioMeses, E, S, comp, ratio);
  if (via) {
    return {
      ...base,
      estado: 'cumple',
      via,
      requisitos,
      falta_edad_meses: 0,
      falta_servicio_meses: 0,
      meses_hasta: 0,
      fecha_estimada: p.fechaCalculo,
      detalle: via === 'directo' ? 'Cumple edad y servicios.' : textoVia(via),
    };
  }

  // Proyección: la edad avanza 1 mes por mes; los servicios solo si sigue aportando.
  let mesesHasta = null;
  let viaFutura = null;
  for (let t = 1; t <= MAX_MESES_PROYECCION; t++) {
    const v = cumpleCon(p.edadMeses + t, p.servicioMeses + (p.sigueAportando ? t : 0), E, S, comp, ratio);
    if (v) {
      mesesHasta = t;
      viaFutura = v;
      break;
    }
  }

  return {
    ...base,
    estado: 'no_cumple',
    via: viaFutura,
    requisitos,
    falta_edad_meses: faltaEdad,
    falta_servicio_meses: faltaServ,
    meses_hasta: mesesHasta,
    fecha_estimada: mesesHasta == null ? null : sumarMeses(p.fechaCalculo, mesesHasta),
    detalle:
      mesesHasta == null
        ? p.sigueAportando
          ? 'No alcanzable dentro del horizonte de proyección.'
          : 'No alcanza los servicios requeridos si no continúa aportando.'
        : `Cumpliría en ${formatoAniosMeses(mesesHasta)}${viaFutura !== 'directo' ? ` (${VIA_CORTA[viaFutura]})` : ''}` +
          (p.sigueAportando ? ', si continúa aportando.' : ', sin nuevos aportes.'),
  };
}

const VIA_CORTA = {
  compensacion_edad: 'compensando servicios faltantes con edad excedente',
  compensacion_servicios: 'compensando edad faltante con servicios excedentes',
};

function textoVia(via) {
  if (via === 'compensacion_edad') return 'Cumple compensando servicios faltantes con edad excedente';
  if (via === 'compensacion_servicios') return 'Cumple compensando edad faltante con servicios excedentes';
  return 'Cumple edad y servicios';
}

export function formatoAniosMeses(totalMeses) {
  const { anios, meses } = aniosMeses(totalMeses);
  const partes = [];
  if (anios) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (meses) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  return partes.length ? partes.join(' y ') : '0 meses';
}

/**
 * Datos de entrada a partir de un consultante.
 * Servicios a la fecha de cálculo = servicios acreditados a la fecha de referencia
 * + meses transcurridos desde entonces (si sigue aportando).
 */
export function datosDesdeConsultante(c, fechaCalculo, overrides = {}) {
  if (!c.fecha_nacimiento) throw new Error('El consultante no tiene fecha de nacimiento.');
  const sigueAportando = overrides.sigueAportando ?? c.sigue_aportando;
  let servicioMeses =
    overrides.servicioMeses ?? (Number(c.servicios_anios) || 0) * 12 + (Number(c.servicios_meses) || 0);
  if (overrides.servicioMeses == null && sigueAportando && c.servicios_fecha_ref && c.servicios_fecha_ref < fechaCalculo) {
    servicioMeses += mesesEntre(c.servicios_fecha_ref, fechaCalculo);
  }
  return {
    edadMeses: mesesEntre(c.fecha_nacimiento, fechaCalculo),
    servicioMeses,
    sexo: overrides.sexo ?? c.sexo,
    sigueAportando,
    fechaCalculo,
    condiciones: c.condiciones || [],
  };
}

/** Un régimen especial solo aplica si el consultante tiene la condición que exige. */
export function regimenAplica(regimen, condiciones = []) {
  return !regimen.requiere_condicion || condiciones.includes(regimen.requiere_condicion);
}

export function evaluarTodos(regimenes, datos) {
  const orden = { cumple: 0, no_cumple: 1, manual: 2 };
  return regimenes
    .filter((r) => regimenAplica(r, datos.condiciones))
    .map((r) => evaluarRegimen(r, datos))
    .sort((a, b) => orden[a.estado] - orden[b.estado] || (a.meses_hasta ?? 1e9) - (b.meses_hasta ?? 1e9));
}
