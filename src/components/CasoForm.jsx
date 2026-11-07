import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { FormModal } from './Modal.jsx';

export default function CasoForm({ caso, onClose, onSaved }) {
  const { user } = useAuth();
  const [f, setF] = useState(() => ({
    consultante_id: '', regimen_id: '', fecha_jubilacion: '', haber_actual: '', expediente: '',
    motivo_otro: '', notas: '', abogado_id: user?.id ?? '',
    ...caso,
    motivo_ids: caso?.motivos?.map((m) => m.id) ?? [],
  }));
  const [opts, setOpts] = useState({ consultantes: [], regimenes: [], motivos: [], usuarios: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/consultantes'), api.get('/regimenes'), api.get('/casos/motivos'), api.get('/usuarios')])
      .then(([consultantes, regimenes, motivos, usuarios]) => setOpts({ consultantes, regimenes, motivos, usuarios }))
      .catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (id) => setF((x) => ({ ...x, motivo_ids: x.motivo_ids.includes(id) ? x.motivo_ids.filter((m) => m !== id) : [...x.motivo_ids, id] }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = caso?.id ? await api.put(`/casos/${caso.id}`, f) : await api.post('/casos', f);
      onSaved(saved?.id ? saved : caso);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <FormModal title={caso?.id ? `Editar caso #${caso.id}` : 'Nuevo caso de reajuste'} onClose={onClose} onSubmit={submit} saving={saving} error={error} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="field sm:col-span-2">
          <label htmlFor="k-cons">Consultante *</label>
          <select id="k-cons" required value={f.consultante_id} onChange={set('consultante_id')}>
            <option value="">— Seleccionar —</option>
            {opts.consultantes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.dni ? ` — DNI ${c.dni}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-reg">Régimen de la jubilación otorgada</label>
          <select id="k-reg" value={f.regimen_id || ''} onChange={set('regimen_id')}>
            <option value="">— Seleccionar —</option>
            {opts.regimenes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-fj">Fecha de jubilación</label>
          <input id="k-fj" type="date" value={f.fecha_jubilacion || ''} onChange={set('fecha_jubilacion')} />
        </div>
        <div className="field">
          <label htmlFor="k-haber">Haber actual (ARS)</label>
          <input id="k-haber" inputMode="decimal" value={f.haber_actual ?? ''} onChange={set('haber_actual')} placeholder="Ej.: 450000,50" />
        </div>
        <div className="field">
          <label htmlFor="k-exp">N° de expediente</label>
          <input id="k-exp" value={f.expediente || ''} onChange={set('expediente')} />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="k-abog">Abogado a cargo</label>
          <select id="k-abog" value={f.abogado_id || ''} onChange={set('abogado_id')}>
            <option value="">— Sin asignar —</option>
            {opts.usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="text-sm font-semibold mt-6 mb-3">Motivos del reclamo</h3>
      <div className="flex flex-col gap-3">
        {opts.motivos.map((m) => (
          <label key={m.id} className="check items-start">
            <input type="checkbox" className="mt-0.5" checked={f.motivo_ids.includes(m.id)} onChange={() => toggle(m.id)} />
            <span>
              <span className="font-medium">{m.nombre}</span>
              <span className="block muted text-xs">{m.descripcion}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="field mt-4">
        <label htmlFor="k-otro">Otro motivo</label>
        <input id="k-otro" value={f.motivo_otro || ''} onChange={set('motivo_otro')} />
      </div>
      <div className="field mt-4">
        <label htmlFor="k-notas">Notas del abogado</label>
        <textarea id="k-notas" value={f.notas || ''} onChange={set('notas')} />
      </div>
    </FormModal>
  );
}
