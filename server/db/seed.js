// Seed inicial: regímenes y motivos de reajuste.
// Se inserta solo si el código no existe (ON CONFLICT DO NOTHING), así las ediciones
// que haga el estudio desde la UI nunca se pisan en un reinicio.
// ⚠️ Datos de partida: deben ser validados por el equipo contra la normativa vigente.

export const REGIMENES_SEED = [
  {
    codigo: 'nac_general_sipa',
    nombre: 'Régimen general (SIPA)',
    jurisdiccion: 'NACION',
    tipo: 'general',
    edad_min_hombre: 65,
    edad_min_mujer: 60,
    anios_servicio: 30,
    requisito_servicio_detalle: '30 años de servicios con aportes.',
    compensacion: 'edad_por_servicio',
    compensacion_ratio: 2,
    fuente_normativa: 'Ley 24.241',
    notas: 'Compensación: 2 años de edad excedente = 1 año de servicio faltante.',
  },
  {
    codigo: 'nac_edad_avanzada',
    nombre: 'Prestación por Edad Avanzada (PEA)',
    jurisdiccion: 'NACION',
    tipo: 'edad_avanzada',
    edad_min_hombre: 70,
    edad_min_mujer: 70,
    anios_servicio: 10,
    requisito_servicio_detalle: '10 años de servicios, al menos 5 dentro de los últimos 8 anteriores al cese.',
    compensacion: 'ninguna',
    fuente_normativa: 'Ley 24.241',
    notas: 'El sistema solo controla el total de años; verificar manualmente la distribución en los últimos 8 años.',
  },
  {
    codigo: 'nac_puam',
    nombre: 'PUAM (Pensión Universal para el Adulto Mayor)',
    jurisdiccion: 'NACION',
    tipo: 'no_contributiva',
    edad_min_hombre: 65,
    edad_min_mujer: 65,
    anios_servicio: 0,
    requisito_servicio_detalle: 'Sin aportes. 10 años de residencia en el país (20 para extranjeros).',
    compensacion: 'ninguna',
    fuente_normativa: 'Ley 27.260',
    notas: 'No contributiva. Verificar residencia e incompatibilidades (no percibir otra prestación).',
  },
  {
    codigo: 'sf_general',
    nombre: 'Régimen general — Caja de Santa Fe',
    jurisdiccion: 'SANTA_FE',
    tipo: 'general',
    edad_min_hombre: 65,
    edad_min_mujer: 60,
    anios_servicio: 30,
    requisito_servicio_detalle: '30 años de servicios con aportes.',
    compensacion: 'bidireccional',
    compensacion_ratio: 2,
    fuente_normativa: 'Ley 6.915',
    notas: '2 años de edad excedente = 1 de servicio faltante, y a la inversa: el exceso de servicios compensa falta de edad.',
  },
  {
    codigo: 'sf_docente',
    requiere_condicion: 'docente',
    nombre: 'Régimen docente — Caja de Santa Fe',
    jurisdiccion: 'SANTA_FE',
    tipo: 'docente',
    edad_min_hombre: 60,
    edad_min_mujer: 57,
    anios_servicio: 30,
    requisito_servicio_detalle: '30 años como docente; mayoría de aportes a la Caja de Santa Fe.',
    compensacion: 'ninguna',
    fuente_normativa: 'Ley 6.915',
    notas: 'Regla de compensación edad↔servicios: A CONFIRMAR por el estudio. Cargada sin compensación.',
  },
  {
    codigo: 'sf_edad_avanzada',
    nombre: 'Edad avanzada — Caja de Santa Fe',
    jurisdiccion: 'SANTA_FE',
    tipo: 'edad_avanzada',
    edad_min_hombre: 70,
    edad_min_mujer: 70,
    anios_servicio: 20,
    requisito_servicio_detalle: '20 años posteriores a los 18 años de edad; 8 de los últimos 10 antes del cese.',
    compensacion: 'ninguna',
    fuente_normativa: 'Ley 6.915',
    notas: 'El sistema solo controla el total de años; verificar manualmente la distribución de los últimos 10 años.',
  },
  {
    codigo: 'sf_ex_combatientes',
    requiere_condicion: 'ex_combatiente',
    nombre: 'Ex combatientes de Malvinas — Santa Fe',
    jurisdiccion: 'SANTA_FE',
    tipo: 'ex_combatiente',
    edad_min_hombre: 45,
    edad_min_mujer: 45,
    anios_servicio: 20,
    requisito_servicio_detalle: '20 años de servicios.',
    compensacion: 'ninguna',
    fuente_normativa: 'Ley 12.867',
  },
  {
    codigo: 'sf_policial_penitenciario',
    requiere_condicion: 'policial',
    nombre: 'Policial / penitenciario — Santa Fe',
    jurisdiccion: 'SANTA_FE',
    tipo: 'policial',
    edad_min_hombre: null,
    edad_min_mujer: null,
    anios_servicio: null,
    requisito_servicio_detalle:
      'Edad variable por jerarquía/escalafón (aprox. 28–58 años; mujeres 2 años menos en general). ' +
      'Servicios 20–30 según escalafón; reforma 2023 lleva el mínimo a 30 con progresividad hasta 2035. ' +
      'Reglas propias de bonificación por año excedente.',
    compensacion: 'ninguna',
    fuente_normativa: 'Leyes 6.830 y 11.530 (reforma 2023)',
    notas:
      'Régimen complejo y reformado recientemente. Cargar el detalle por jerarquía/escalafón (se puede duplicar este régimen por escalafón) ' +
      'y validarlo con el equipo. Mientras no tenga edad/servicios definidos, el cálculo lo marca como "evaluación manual".',
  },
  {
    codigo: 'magistrados',
    requiere_condicion: 'magistrado',
    nombre: 'Magistrados y funcionarios judiciales',
    jurisdiccion: 'NACION_Y_PROVINCIA',
    tipo: 'magistrados',
    edad_min_hombre: null,
    edad_min_mujer: null,
    anios_servicio: null,
    fuente_normativa: null,
    notas: 'A COMPLETAR por el estudio (no investigado en la carga inicial).',
  },
  {
    codigo: 'insalubres_diferenciales',
    requiere_condicion: 'insalubre',
    nombre: 'Tareas insalubres / diferenciales',
    jurisdiccion: 'NACION_Y_PROVINCIA',
    tipo: 'diferencial',
    edad_min_hombre: null,
    edad_min_mujer: null,
    anios_servicio: null,
    fuente_normativa: null,
    notas: 'A COMPLETAR por el estudio (no investigado en la carga inicial).',
  },
];

export const MOTIVOS_SEED = [
  {
    codigo: 'haber_inicial',
    nombre: 'Haber inicial mal liquidado',
    descripcion:
      'El cálculo del haber al otorgarse la jubilación no reflejó correctamente los aportes/remuneraciones (doctrina del fallo "Elliff").',
    orden: 1,
  },
  {
    codigo: 'movilidad',
    nombre: 'Movilidad insuficiente',
    descripcion:
      'Los aumentos posteriores no mantuvieron el poder adquisitivo del haber frente a los salarios (doctrina del fallo "Badaro").',
    orden: 2,
  },
  {
    codigo: 'tope_art9',
    nombre: 'Tope al haber máximo (art. 9 Ley 24.463)',
    descripcion: 'Aplicación del tope del art. 9 de la Ley 24.463, que puede licuar el haber pese a los aportes reales.',
    orden: 3,
  },
  {
    codigo: 'error_fecha',
    nombre: 'Error en fecha inicial o de pago',
    descripcion: 'Errores en fecha de cese, de adquisición del derecho, o en el cómputo de aportes/moratoria.',
    orden: 4,
  },
];

export async function seed(client) {
  for (const r of REGIMENES_SEED) {
    await client.query(
      `INSERT INTO regimenes (codigo, nombre, jurisdiccion, tipo, edad_min_hombre, edad_min_mujer, anios_servicio,
         requisito_servicio_detalle, compensacion, compensacion_ratio, fuente_normativa, notas, requiere_condicion, requiere_validacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE)
       ON CONFLICT (codigo) DO NOTHING`,
      [
        r.codigo, r.nombre, r.jurisdiccion, r.tipo, r.edad_min_hombre, r.edad_min_mujer, r.anios_servicio,
        r.requisito_servicio_detalle ?? null, r.compensacion ?? 'ninguna', r.compensacion_ratio ?? 2, r.fuente_normativa ?? null, r.notas ?? null,
        r.requiere_condicion ?? null,
      ],
    );
  }
  for (const m of MOTIVOS_SEED) {
    await client.query(
      `INSERT INTO motivos_reajuste (codigo, nombre, descripcion, orden) VALUES ($1,$2,$3,$4)
       ON CONFLICT (codigo) DO NOTHING`,
      [m.codigo, m.nombre, m.descripcion, m.orden],
    );
  }
}
