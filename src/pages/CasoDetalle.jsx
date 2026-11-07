import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, Check, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useFetch } from '../lib/useFetch.js';
import { ETAPA, ETAPAS, fmtFecha, fmtFechaHora, fmtMoneda, hoyISO } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';
import CasoForm from '../components/CasoForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Attachments from '../components/Attachments.jsx';
import { FormModal } from '../components/Modal.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';

const EFECTOS = {
  archivado: 'El caso se cierra (se registra la fecha de cierre) y deja de contar como activo.',
  sentencia: 'Registrá en la nota el resultado de la sentencia.',
  demanda_iniciada: 'Registrá en la nota juzgado y número de expediente.',
};

function Stepper({ etapa }) {
  const idx = ETAPAS.findIndex((e) => e.id === etapa);
  return (
    <ol className="flex flex-wrap gap-y-2 m-0 p-0 list-none">
      {ETAPAS.map((e, i) => {
        const done = i < idx;
        const cur = i === idx;
        return (
          <li key={e.id} className="flex items-center">
            <span
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium"
              style={{
                background: cur ? 'var(--gcal-blue)' : done ? 'var(--gcal-blue-bg)' : 'var(--gcal-bg-soft)',
                color: cur ? '#fff' : done ? 'var(--gcal-blue-hover)' : 'var(--gcal-muted)',
                border: cur || done ? '1px solid transparent' : '1px solid var(--gcal-border)',
              }}
            >
              {done && <Check size={14} />}
              {e.label}
            </span>
            {i < ETAPAS.length - 1 && <span className="w-3 h-px mx-0.5" style={{ background: 'var(--gcal-border)' }} />}
          </li>
        );
      })}
    </ol>
  );
}

function CambiarEtapa({ caso, onClose, onSaved }) {
  const idx = ETAPAS.findIndex((e) => e.id === caso.etapa);
  const sugerida = caso.etapa === 'archivado' ? 'evaluacion' : ETAPAS[Math.min(idx + 1, ETAPAS.length - 1)].id;
  const [etapa, setEtapa] = useState(sugerida);
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const retrocede = ETAPAS.findIndex((e) => e.id === etapa) < idx && etapa !== 'archivado';
  const reabre = caso.etapa === 'archivado';

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/casos/${caso.id}/etapa`, { etapa, fecha, nota });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <FormModal title="Cambiar etapa" onClose={onClose} onSubmit={submit} saving={saving} error={error} submitLabel="Confirmar cambio">
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className={`badge ${ETAPA[caso.etapa].badge}`}>{ETAPA[caso.etapa].label}</span>
        <ArrowRight size={16} className="muted" />
        <span className={`badge ${ETAPA[etapa].badge}`}>{ETAPA[etapa].label}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="field">
          <label htmlFor="e-etapa">Nueva etapa</label>
          <select id="e-etapa" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
            {ETAPAS.filter((e) => e.id !== caso.etapa).map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-fecha">Fecha del cambio</label>
          <input id="e-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
      </div>
      <div className="field mt-4">
        <label htmlFor="e-nota">Nota {retrocede || reabre ? '(obligatoria)' : '(opcional)'}</label>
        <textarea id="e-nota" value={nota} onChange={(e) => setNota(e.target.value)} required={retrocede || reabre} />
      </div>
      {(EFECTOS[etapa] || retrocede || reabre) && (
        <div className="alert info mt-4">
          {reabre ? 'El caso se reabre y se borra la fecha de cierre.' : retrocede ? 'Vas a volver a una etapa anterior; indicá el motivo.' : EFECTOS[etapa]}
        </div>
      )}
    </FormModal>
  );
}

export default function CasoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings, toast } = useApp();
  const { data: c, error, loading, reload } = useFetch(`/casos/${id}`);
  const [editar, setEditar] = useState(false);
  const [etapa, setEtapa] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !c) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const agregarNota = async (e) => {
    e.preventDefault();
    if (!nota.trim()) return;
    setBusy(true);
    try {
      await api.post(`/casos/${c.id}/notas`, { nota });
      setNota('');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Casos de reajuste', to: '/casos' }, { label: `Caso #${c.id}` }]} />
      <PageHeader
        title={`Caso #${c.id} — ${c.consultante_nombre}`}
        subtitle={c.expediente ? `Expediente ${c.expediente}` : 'Reajuste jubilatorio'}
        actions={
          <>
            <button className="pill-btn primary" onClick={() => setEtapa(true)}>
              <ArrowRight size={16} /> Cambiar etapa
            </button>
            <button className="pill-btn" onClick={() => setEditar(true)}>
              <Pencil size={16} /> Editar
            </button>
            <button className="icon-btn danger" onClick={() => setBorrar(true)} title="Eliminar caso" aria-label="Eliminar caso">
              <Trash2 size={18} />
            </button>
          </>
        }
      />

      <div className="panel p-4 mb-4">
        <Stepper etapa={c.etapa} />
        <div className="muted text-xs mt-3">
          En "{ETAPA[c.etapa].label}" desde el {fmtFecha(c.etapa_desde)}
          {c.fecha_cierre && ` · Cerrado el ${fmtFecha(c.fecha_cierre)}`}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <section className="panel">
            <div className="panel-title">Datos del caso</div>
            <dl className="p-4 grid grid-cols-2 gap-4 m-0">
              <div>
                <dt className="muted text-xs font-medium">Consultante</dt>
                <dd className="m-0 mt-0.5">
                  <Link to={`/consultantes/${c.consultante_id}`}>{c.consultante_nombre}</Link>
                </dd>
              </div>
              <div>
                <dt className="muted text-xs font-medium">Régimen</dt>
                <dd className="m-0 mt-0.5">{c.regimen_nombre || '—'}</dd>
              </div>
              <div>
                <dt className="muted text-xs font-medium">Fecha de jubilación</dt>
                <dd className="m-0 mt-0.5">{fmtFecha(c.fecha_jubilacion)}</dd>
              </div>
              <div>
                <dt className="muted text-xs font-medium">Haber actual</dt>
                <dd className="m-0 mt-0.5">{fmtMoneda(c.haber_actual, settings.moneda)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="muted text-xs font-medium">Abogado a cargo</dt>
                <dd className="m-0 mt-0.5">{c.abogado_nombre || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="muted text-xs font-medium mb-1">Motivos del reclamo</dt>
                <dd className="m-0 flex flex-wrap gap-1">
                  {c.motivos.map((m) => (
                    <span key={m.id} className="badge blue">{m.nombre}</span>
                  ))}
                  {c.motivo_otro && <span className="badge">Otro: {c.motivo_otro}</span>}
                  {!c.motivos.length && !c.motivo_otro && <span className="muted">—</span>}
                </dd>
              </div>
              {c.notas && (
                <div className="col-span-2">
                  <dt className="muted text-xs font-medium">Notas</dt>
                  <dd className="m-0 mt-0.5 whitespace-pre-wrap">{c.notas}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className="panel">
            <div className="panel-title">Documentación</div>
            <div className="p-4">
              <Attachments entidad="caso" entidadId={c.id} />
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-title">Seguimiento</div>
          <form onSubmit={agregarNota} className="p-4 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--gcal-border)' }}>
            <div className="field">
              <label htmlFor="nota">Agregar nota de seguimiento</label>
              <textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: Se presentó pronto despacho…" style={{ minHeight: 64 }} />
            </div>
            <div>
              <button className="pill-btn sm primary" disabled={busy || !nota.trim()}>
                <MessageSquare size={14} /> Agregar nota
              </button>
            </div>
          </form>
          <ol className="m-0 p-4 list-none flex flex-col gap-4">
            {c.eventos.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                  style={{ background: ev.tipo === 'etapa' ? 'var(--gcal-blue-bg)' : 'var(--gcal-hover)', color: ev.tipo === 'etapa' ? 'var(--gcal-blue)' : 'var(--gcal-muted)' }}
                >
                  {ev.tipo === 'etapa' ? <ArrowRight size={16} /> : <MessageSquare size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    {ev.tipo === 'etapa' ? (
                      ev.etapa_anterior ? (
                        <>
                          Pasó de <strong>{ETAPA[ev.etapa_anterior]?.label}</strong> a <strong>{ETAPA[ev.etapa_nueva]?.label}</strong>
                        </>
                      ) : (
                        <>
                          Caso abierto en <strong>{ETAPA[ev.etapa_nueva]?.label}</strong>
                        </>
                      )
                    ) : (
                      <strong>Nota</strong>
                    )}
                  </div>
                  {ev.nota && <div className="text-sm whitespace-pre-wrap mt-0.5">{ev.nota}</div>}
                  <div className="muted text-xs mt-0.5">
                    {fmtFecha(ev.fecha)} · {ev.usuario_nombre || '—'}
                    <span title={fmtFechaHora(ev.created_at)}> · registrado {fmtFechaHora(ev.created_at)}</span>
                  </div>
                </div>
                {ev.tipo === 'nota' && (
                  <button
                    className="icon-btn danger shrink-0"
                    aria-label="Borrar nota"
                    title="Borrar nota"
                    onClick={async () => {
                      await api.del(`/casos/${c.id}/eventos/${ev.id}`).catch((e) => toast(e.message, 'error'));
                      reload();
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {etapa && (
        <CambiarEtapa
          caso={c}
          onClose={() => setEtapa(false)}
          onSaved={() => {
            setEtapa(false);
            reload();
            toast('Etapa actualizada');
          }}
        />
      )}
      {editar && (
        <CasoForm
          caso={c}
          onClose={() => setEditar(false)}
          onSaved={() => {
            setEditar(false);
            reload();
            toast('Caso actualizado');
          }}
        />
      )}
      {borrar && (
        <ConfirmDialog
          title="Eliminar caso"
          message={<>¿Eliminar el caso #{c.id}? Se borran su historial y sus adjuntos. Si el caso terminó, considerá pasarlo a "Archivado".</>}
          onClose={() => setBorrar(false)}
          onConfirm={async () => {
            await api.del(`/casos/${c.id}`);
            toast('Caso eliminado');
            navigate('/casos');
          }}
        />
      )}
    </>
  );
}
