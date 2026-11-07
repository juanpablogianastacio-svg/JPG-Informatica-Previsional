import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarRegimen, mesesEntre, sumarMeses, datosDesdeConsultante } from './calc.js';

const general = {
  id: 1, nombre: 'General', edad_min_hombre: 65, edad_min_mujer: 60, anios_servicio: 30,
  compensacion: 'edad_por_servicio', compensacion_ratio: 2,
};
const santaFe = { ...general, id: 2, compensacion: 'bidireccional' };
const sinComp = { ...general, id: 3, compensacion: 'ninguna' };
const p = (edadA, servA, extra = {}) => ({
  edadMeses: edadA * 12, servicioMeses: servA * 12, sexo: 'M', sigueAportando: true, fechaCalculo: '2026-11-06', ...extra,
});

test('mesesEntre y sumarMeses', () => {
  assert.equal(mesesEntre('1960-05-10', '2026-05-09'), 791);
  assert.equal(mesesEntre('1960-05-10', '2026-05-10'), 792);
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2026-11-06', 14), '2028-01-06');
});

test('cumple directo', () => {
  const r = evaluarRegimen(general, p(65, 30));
  assert.equal(r.estado, 'cumple');
  assert.equal(r.via, 'directo');
});

test('mujer usa edad mínima de mujer', () => {
  assert.equal(evaluarRegimen(general, p(60, 30, { sexo: 'F' })).estado, 'cumple');
  assert.equal(evaluarRegimen(general, p(60, 30, { sexo: 'M' })).estado, 'no_cumple');
});

test('compensación: 2 años de edad excedente = 1 de servicio faltante', () => {
  assert.equal(evaluarRegimen(general, p(69, 28)).estado, 'cumple'); // 4 de exceso cubren 2 faltantes
  assert.equal(evaluarRegimen(general, p(68, 28)).estado, 'no_cumple');
  assert.equal(evaluarRegimen(sinComp, p(69, 28)).estado, 'no_cumple');
});

test('bidireccional: exceso de servicios compensa falta de edad', () => {
  assert.equal(evaluarRegimen(santaFe, p(63, 34)).estado, 'cumple');
  assert.equal(evaluarRegimen(general, p(63, 34)).estado, 'no_cumple');
});

test('proyección con y sin aportes', () => {
  // 60 años, 25 de servicios, sigue aportando: a los 65 tiene 30 → 60 meses
  const r1 = evaluarRegimen(sinComp, p(60, 25));
  assert.equal(r1.meses_hasta, 60);
  assert.equal(r1.fecha_estimada, '2031-11-06');
  // Sin aportes y sin compensación: nunca
  const r2 = evaluarRegimen(sinComp, p(60, 25, { sigueAportando: false }));
  assert.equal(r2.meses_hasta, null);
  // Sin aportes con compensación: 5 años faltan → necesita 10 de exceso → 75 años
  const r3 = evaluarRegimen(general, p(60, 25, { sigueAportando: false }));
  assert.equal(r3.meses_hasta, 15 * 12);
});

test('régimen sin datos → manual', () => {
  const r = evaluarRegimen({ id: 9, nombre: 'Policial', edad_min_hombre: null, anios_servicio: null }, p(50, 20));
  assert.equal(r.estado, 'manual');
});

test('servicios se actualizan desde la fecha de referencia si sigue aportando', () => {
  const c = { fecha_nacimiento: '1965-01-01', sexo: 'F', servicios_anios: 20, servicios_meses: 0, servicios_fecha_ref: '2025-11-06', sigue_aportando: true };
  const d = datosDesdeConsultante(c, '2026-11-06');
  assert.equal(d.servicioMeses, 252);
  assert.equal(datosDesdeConsultante({ ...c, sigue_aportando: false }, '2026-11-06').servicioMeses, 240);
});

test('regímenes especiales solo aplican con la condición', async () => {
  const { evaluarTodos } = await import('./calc.js');
  const regs = [general, { ...general, id: 7, nombre: 'Ex combatientes', requiere_condicion: 'ex_combatiente' }];
  assert.equal(evaluarTodos(regs, { ...p(50, 20), condiciones: [] }).length, 1);
  assert.equal(evaluarTodos(regs, { ...p(50, 20), condiciones: ['ex_combatiente'] }).length, 2);
});
