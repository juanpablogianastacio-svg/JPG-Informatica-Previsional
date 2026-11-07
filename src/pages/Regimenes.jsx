import { useState } from 'react';
import { Calculator, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useDebounced, useFetch } from '../lib/useFetch.js';
import { COMPENSACIONES, CONDICION, CONDICIONES, JURISDICCION, JURISDICCIONES, fmtFecha, fmtNumero } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ValidacionAviso from '../components/ValidacionAviso.jsx';
import { FormModal } from '../components/Modal.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

const VACIO = {
  nombre: '', jurisdiccion: 'NACION', tipo: 'general', requiere_condicion: '',
  edad_min_hombre: '', edad_min_mujer: '', anios_servicio: '', requisito_servicio_detalle: '',
  compensacion: 'ninguna', compensacion_ratio: 2, fuente_normativa: '', vigente_desde: '', vigente_hasta: '',
  notas: '', requiere_validacion: true, activo: true,
};

const anios = (v) => (v === null || v === undefined || v === '' ? '—' : fmtNumero(v, Number(v) % 1 ? 1 : 0));

function RegimenForm({ regimen, onClose, onSaved }) {
  const [f, setF] = useState(() => {
    const base = { ...VACIO, ...regimen };
    for (const k of Object.keys(base)) if (base[k] === null) base[k] = '';
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (regimen?.id) await api.put(`/regimenes/${regimen.id}`, f);
      else await api.post('/regimenes', f);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <FormModal title={regimen?.id ? 'Editar régimen' : 'Nuevo régimen'} onClose={onClose} onSubmit={submit} saving={saving} error={error} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="field sm:col-span-2">
          <label htmlFor="r-nombre">Nombre *</label>
          <input id="r-nombre" required value={f.nombre} onChange={set('nombre')} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="r-juris">Jurisdicción</label>
          <select id="r-juris" value={f.jurisdiccion} onChange={set('jurisdiccion')}>
            {JURISDICCIONES.map((j) => (
              <option key={j.id} value={j.id}>{j.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-tipo">Tipo</label>
          <input id="r-tipo" list="tipos-regimen" value={f.tipo} onChange={set('tipo')} />
          <datalist id="tipos-regimen">
            {['general', 'especial', 'docente', 'policial', 'penitenciario', 'ex_combatiente', 'edad_avanzada', 'invalidez', 'no_contributiva', 'magistrados', 'diferencial'].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="r-cond">Aplica solo a consultantes con condición</label>
          <select id="r-cond" value={f.requiere_condicion || ''} onChange={set('requiere_condicion')}>
            <option value="">— Todos (régimen general) —</option>
            {CONDICIONES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="text-sm font-semibold mt-6 mb-1">Requisitos</h3>
      <p className="muted text-xs mt-0 mb-3">Dejá edad o servicios vacíos si el régimen todavía no está definido: el cálculo lo marcará como "evaluación manual".</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="field">
          <label htmlFor="r-eh">Edad mín. hombre</label>
          <input id="r-eh" type="number" step="0.5" min="0" max="120" value={f.edad_min_hombre} onChange={set('edad_min_hombre')} />
        </div>
        <div className="field">
          <label htmlFor="r-em">Edad mín. mujer</label>
          <input id="r-em" type="number" step="0.5" min="0" max="120" value={f.edad_min_mujer} onChange={set('edad_min_mujer')} />
        </div>
        <div className="field">
          <label htmlFor="r-as">Años de servicio</label>
          <input id="r-as" type="number" step="0.5" min="0" max="80" value={f.anios_servicio} onChange={set('anios_servicio')} />
        </div>
      </div>
      <div className="field mt-4">
        <label htmlFor="r-sdet">Condiciones adicionales de servicio (texto)</label>
        <input id="r-sdet" value={f.requisito_servicio_detalle} onChange={set('requisito_servicio_detalle')} placeholder="Ej.: 5 de los últimos 8 años antes del cese" />
        <span className="hint">Se muestra como recordatorio en el resultado; el sistema no lo verifica automáticamente.</span>
      </div>
      <div className="grid sm:grid-cols-[2fr_1fr] gap-4 mt-4">
        <div className="field">
          <label htmlFor="r-comp">Compensación edad ↔ servicios</label>
          <select id="r-comp" value={f.compensacion} onChange={set('compensacion')}>
            {COMPENSACIONES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-ratio">Proporción</label>
          <input id="r-ratio" type="number" step="0.5" min="0.5" value={f.compensacion_ratio} onChange={set('compensacion_ratio')} disabled={f.compensacion === 'ninguna'} />
          <span className="hint">{f.compensacion_ratio || 2} años de excedente = 1 año faltante</span>
        </div>
      </div>

      <h3 className="text-sm font-semibold mt-6 mb-3">Fuente y vigencia</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="field sm:col-span-3">
          <label htmlFor="r-fuente">Fuente normativa (ley / artículo)</label>
          <input id="r-fuente" value={f.fuente_normativa} onChange={set('fuente_normativa')} />
        </div>
        <div className="field">
          <label htmlFor="r-desde">Vigente desde</label>
          <input id="r-desde" type="date" value={f.vigente_desde} onChange={set('vigente_desde')} />
        </div>
        <div className="field">
          <label htmlFor="r-hasta">Vigente hasta</label>
          <input id="r-hasta" type="date" value={f.vigente_hasta} onChange={set('vigente_hasta')} />
        </div>
      </div>
      <div className="field mt-4">
        <label htmlFor="r-notas">Notas</label>
        <textarea id="r-notas" value={f.notas} onChange={set('notas')} />
      </div>
      <div className="flex flex-wrap gap-6 mt-4">
        <label className="check">
          <input type="checkbox" checked={f.activo} onChange={set('activo')} /> Activo (se usa en los cálculos)
        </label>
        <label className="check">
          <input type="checkbox" checked={f.requiere_validacion} onChange={set('requiere_validacion')} /> Pendiente de validación por el estudio
        </label>
      </div>
    </FormModal>
  );
}

export default function Regimenes() {
  const { toast } = useApp();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useFetch(`/regimenes?q=${encodeURIComponent(dq)}`);
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Regímenes' }]} />
      <PageHeader
        title="Regímenes previsionales"
        subtitle="Requisitos que usa el motor de cálculo. Se editan acá, sin tocar código."
        actions={
          <button className="pill-btn primary" onClick={() => setForm({})}>
            <Plus size={18} /> Nuevo régimen
          </button>
        }
      />
      <div className="mb-4">
        <ValidacionAviso />
      </div>
      <SearchInput value={q} onChange={setQ} placeholder="Buscar régimen, tipo o ley" className="mb-4 max-w-md" />
      <ErrorBox error={error} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <div className="table-wrap">
          <Empty icon={Calculator} title="Sin regímenes" />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Régimen</th>
                <th>Jurisdicción</th>
                <th className="num">Edad H</th>
                <th className="num">Edad M</th>
                <th className="num">Servicios</th>
                <th>Compensación</th>
                <th>Fuente</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const indef = r.edad_min_hombre == null || r.anios_servicio == null;
                return (
                  <tr key={r.id} style={{ opacity: r.activo ? 1 : 0.55 }}>
                    <td style={{ minWidth: 220 }}>
                      <div className="font-medium">{r.nombre}</div>
                      <div className="muted text-xs">
                        {r.tipo}
                        {r.requiere_condicion ? ` · solo ${CONDICION[r.requiere_condicion]?.toLowerCase()}` : ''}
                      </div>
                    </td>
                    <td className="text-xs">{JURISDICCION[r.jurisdiccion]}</td>
                    <td className="num">{anios(r.edad_min_hombre)}</td>
                    <td className="num">{anios(r.edad_min_mujer)}</td>
                    <td className="num">{anios(r.anios_servicio)}</td>
                    <td className="text-xs">
                      {r.compensacion === 'ninguna' ? '—' : `${anios(r.compensacion_ratio)}:1 ${r.compensacion === 'bidireccional' ? '(↔)' : '(edad → serv.)'}`}
                    </td>
                    <td className="text-xs">
                      {r.fuente_normativa || '—'}
                      {r.vigente_hasta && <div className="muted">hasta {fmtFecha(r.vigente_hasta)}</div>}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        {!r.activo && <span className="badge">Inactivo</span>}
                        {indef ? <span className="badge danger">A completar</span> : r.requiere_validacion ? <span className="badge warning">A validar</span> : <span className="badge success">Validado</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <button className="icon-btn" title="Editar" aria-label="Editar" onClick={() => setForm(r)}>
                        <Pencil size={18} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Duplicar (ej. un escalafón)"
                        aria-label="Duplicar"
                        onClick={() => setForm({ ...r, id: undefined, codigo: undefined, nombre: `${r.nombre} (copia)` })}
                      >
                        <Copy size={18} />
                      </button>
                      <button className="icon-btn danger" title="Eliminar" aria-label="Eliminar" onClick={() => setBorrar(r)}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {form && (
        <RegimenForm
          regimen={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
            toast('Régimen guardado');
          }}
        />
      )}
      {borrar && (
        <ConfirmDialog
          title="Eliminar régimen"
          message={
            <>
              ¿Eliminar <strong>{borrar.nombre}</strong>? Los cálculos ya hechos conservan su resultado. Si solo querés dejar de usarlo, editalo y desmarcá "Activo".
            </>
          }
          onClose={() => setBorrar(null)}
          onConfirm={async () => {
            await api.del(`/regimenes/${borrar.id}`);
            reload();
            toast('Régimen eliminado');
          }}
        />
      )}
    </>
  );
}
