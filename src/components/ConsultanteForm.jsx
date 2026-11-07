import { useState } from 'react';
import { api } from '../api/client.js';
import { CONDICIONES, SEXOS, hoyISO } from '../lib/format.js';
import { FormModal } from './Modal.jsx';

const VACIO = {
  nombre: '', dni: '', fecha_nacimiento: '', sexo: '', telefono: '', email: '',
  servicios_anios: 0, servicios_meses: 0, servicios_fecha_ref: '', sigue_aportando: true, condiciones: [], notas: '',
};

export default function ConsultanteForm({ consultante, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    ...VACIO,
    servicios_fecha_ref: hoyISO(),
    ...(consultante || {}),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggleCond = (id) =>
    setF((x) => ({ ...x, condiciones: x.condiciones.includes(id) ? x.condiciones.filter((c) => c !== id) : [...x.condiciones, id] }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = consultante?.id ? await api.put(`/consultantes/${consultante.id}`, f) : await api.post('/consultantes', f);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <FormModal title={consultante?.id ? 'Editar consultante' : 'Nuevo consultante'} onClose={onClose} onSubmit={submit} saving={saving} error={error} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="field sm:col-span-2">
          <label htmlFor="c-nombre">Nombre y apellido *</label>
          <input id="c-nombre" required value={f.nombre} onChange={set('nombre')} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="c-dni">DNI</label>
          <input id="c-dni" inputMode="numeric" value={f.dni || ''} onChange={set('dni')} placeholder="Sin puntos" />
        </div>
        <div className="field">
          <label htmlFor="c-nac">Fecha de nacimiento</label>
          <input id="c-nac" type="date" value={f.fecha_nacimiento || ''} onChange={set('fecha_nacimiento')} max={hoyISO()} />
          <span className="hint">Necesaria para calcular requisitos.</span>
        </div>
        <div className="field">
          <label htmlFor="c-sexo">Sexo</label>
          <select id="c-sexo" value={f.sexo || ''} onChange={set('sexo')}>
            <option value="">— Seleccionar —</option>
            {SEXOS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-tel">Teléfono</label>
          <input id="c-tel" type="tel" value={f.telefono || ''} onChange={set('telefono')} />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" type="email" value={f.email || ''} onChange={set('email')} />
        </div>
      </div>

      <h3 className="text-sm font-semibold mt-6 mb-3">Servicios con aportes</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="field">
          <label htmlFor="c-sa">Años</label>
          <input id="c-sa" type="number" min="0" max="80" value={f.servicios_anios} onChange={set('servicios_anios')} />
        </div>
        <div className="field">
          <label htmlFor="c-sm">Meses</label>
          <input id="c-sm" type="number" min="0" max="11" value={f.servicios_meses} onChange={set('servicios_meses')} />
        </div>
        <div className="field col-span-2 sm:col-span-1">
          <label htmlFor="c-sref">Acreditados al</label>
          <input id="c-sref" type="date" value={f.servicios_fecha_ref || ''} onChange={set('servicios_fecha_ref')} />
        </div>
      </div>
      <label className="check mt-3">
        <input type="checkbox" checked={f.sigue_aportando} onChange={set('sigue_aportando')} />
        Sigue aportando (los servicios se actualizan automáticamente desde esa fecha)
      </label>

      <h3 className="text-sm font-semibold mt-6 mb-1">Condiciones especiales</h3>
      <p className="muted text-xs mt-0 mb-3">Habilitan la evaluación de regímenes especiales (docente, policial, etc.).</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {CONDICIONES.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={f.condiciones.includes(c.id)} onChange={() => toggleCond(c.id)} />
            {c.label}
          </label>
        ))}
      </div>

      <div className="field mt-6">
        <label htmlFor="c-notas">Notas</label>
        <textarea id="c-notas" value={f.notas || ''} onChange={set('notas')} />
      </div>
    </FormModal>
  );
}
