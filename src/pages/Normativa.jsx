import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useDebounced, useFetch } from '../lib/useFetch.js';
import { JURISDICCION, JURISDICCIONES, TIPO_NORMA, TIPOS_NORMA } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Attachments from '../components/Attachments.jsx';
import Modal, { FormModal } from '../components/Modal.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

function NormaForm({ norma, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    titulo: '', tipo: 'ley', jurisdiccion: 'NACION', numero: '', anio: '', resumen: '', link: '',
    ...norma,
    tags: (norma?.tags || []).join(', '),
    regimen_ids: norma?.regimenes?.map((r) => r.id) || [],
  }));
  const [regimenes, setRegimenes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/regimenes').then(setRegimenes).catch(() => {});
  }, []);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (id) => setF((x) => ({ ...x, regimen_ids: x.regimen_ids.includes(id) ? x.regimen_ids.filter((r) => r !== id) : [...x.regimen_ids, id] }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = norma?.id ? await api.put(`/normativa/${norma.id}`, f) : await api.post('/normativa', f);
      onSaved(saved?.id ? saved : norma);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <FormModal title={norma?.id ? 'Editar norma' : 'Nueva norma / fallo'} onClose={onClose} onSubmit={submit} saving={saving} error={error} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="field sm:col-span-2">
          <label htmlFor="n-tit">Título *</label>
          <input id="n-tit" required value={f.titulo} onChange={set('titulo')} autoFocus placeholder='Ej.: Badaro, Adolfo Valentín c/ ANSeS s/ reajustes varios' />
        </div>
        <div className="field">
          <label htmlFor="n-tipo">Tipo</label>
          <select id="n-tipo" value={f.tipo} onChange={set('tipo')}>
            {TIPOS_NORMA.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="n-juris">Jurisdicción</label>
          <select id="n-juris" value={f.jurisdiccion} onChange={set('jurisdiccion')}>
            {JURISDICCIONES.map((j) => (
              <option key={j.id} value={j.id}>{j.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="n-num">Número</label>
          <input id="n-num" value={f.numero || ''} onChange={set('numero')} placeholder="Ej.: 24.241" />
        </div>
        <div className="field">
          <label htmlFor="n-anio">Año</label>
          <input id="n-anio" type="number" min="1850" max="2100" value={f.anio || ''} onChange={set('anio')} />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="n-res">Resumen</label>
          <textarea id="n-res" value={f.resumen || ''} onChange={set('resumen')} />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="n-link">Link oficial</label>
          <input id="n-link" type="url" value={f.link || ''} onChange={set('link')} placeholder="https://www.argentina.gob.ar/normativa/…" />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="n-tags">Tags</label>
          <input id="n-tags" value={f.tags} onChange={set('tags')} placeholder="movilidad, haber inicial, csjn" />
          <span className="hint">Separados por coma.</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold mt-6 mb-3">Regímenes relacionados</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {regimenes.map((r) => (
          <label key={r.id} className="check text-sm">
            <input type="checkbox" checked={f.regimen_ids.includes(r.id)} onChange={() => toggle(r.id)} />
            {r.nombre}
          </label>
        ))}
      </div>
      {!norma?.id && <p className="muted text-xs mt-4 mb-0">Después de guardar vas a poder adjuntar el PDF.</p>}
    </FormModal>
  );
}

function NormaDetalle({ norma, onClose, onEdit, onDelete, onChange }) {
  return (
    <Modal
      title={norma.titulo}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="pill-btn" style={{ color: 'var(--gcal-danger)' }} onClick={onDelete}>
            <Trash2 size={16} /> Eliminar
          </button>
          <button className="pill-btn primary" onClick={onEdit}>
            <Pencil size={16} /> Editar
          </button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="badge blue">{TIPO_NORMA[norma.tipo]}</span>
        <span className="badge">{JURISDICCION[norma.jurisdiccion]}</span>
        {norma.numero && <span className="badge">N° {norma.numero}</span>}
        {norma.anio && <span className="badge">{norma.anio}</span>}
      </div>
      {norma.resumen && <p className="whitespace-pre-wrap leading-relaxed mt-0">{norma.resumen}</p>}
      {norma.link && (
        <p>
          <a href={norma.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
            <ExternalLink size={14} /> Ver fuente oficial
          </a>
        </p>
      )}
      {norma.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {norma.tags.map((t) => (
            <span key={t} className="badge">#{t}</span>
          ))}
        </div>
      )}
      {norma.regimenes.length > 0 && (
        <div className="mb-4">
          <div className="muted text-xs font-medium mb-1">Regímenes relacionados</div>
          <div className="text-sm">{norma.regimenes.map((r) => r.nombre).join(' · ')}</div>
        </div>
      )}
      <div className="muted text-xs font-medium mb-2">Archivos</div>
      <Attachments entidad="norma" entidadId={norma.id} onChange={onChange} />
    </Modal>
  );
}

export default function Normativa() {
  const { toast } = useApp();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [juris, setJuris] = useState('');
  const [tag, setTag] = useState('');
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useFetch(
    `/normativa?q=${encodeURIComponent(dq)}&tipo=${tipo}&jurisdiccion=${juris}&tag=${encodeURIComponent(tag)}`,
  );
  const tags = useFetch('/normativa/tags');
  const [form, setForm] = useState(null);
  const [ver, setVer] = useState(null);
  const [borrar, setBorrar] = useState(null);

  const refrescar = () => {
    reload();
    tags.reload();
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Biblioteca normativa' }]} />
      <PageHeader
        title="Biblioteca normativa"
        subtitle="Leyes, fallos, resoluciones y decretos para consulta rápida del equipo"
        actions={
          <button className="pill-btn primary" onClick={() => setForm({})}>
            <Plus size={18} /> Nueva norma / fallo
          </button>
        }
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar en título, resumen, número o tags" className="flex-1 min-w-[220px] max-w-md" />
        <select className="input" style={{ width: 'auto' }} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {TIPOS_NORMA.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <select className="input" style={{ width: 'auto' }} value={juris} onChange={(e) => setJuris(e.target.value)} aria-label="Jurisdicción">
          <option value="">Todas las jurisdicciones</option>
          {JURISDICCIONES.map((j) => (
            <option key={j.id} value={j.id}>{j.label}</option>
          ))}
        </select>
        {tags.data?.length > 0 && (
          <select className="input" style={{ width: 'auto' }} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
            <option value="">Todos los tags</option>
            {tags.data.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}
      </div>
      <ErrorBox error={error} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <div className="table-wrap">
          <Empty icon={BookOpen} title={q || tipo || juris || tag ? 'Sin resultados' : 'La biblioteca está vacía'}>
            {!q && !tipo && !juris && !tag && 'Cargá leyes y fallos (Elliff, Badaro, Ley 24.241, Ley 6.915…) con su PDF o link.'}
          </Empty>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Jurisdicción</th>
                <th>Tags</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((n) => (
                <tr key={n.id} className="clickable" onClick={() => setVer(n)}>
                  <td style={{ minWidth: 240 }}>
                    <div className="font-medium">{n.titulo}</div>
                    <div className="muted text-xs">
                      {[n.numero && `N° ${n.numero}`, n.anio].filter(Boolean).join(' · ')}
                      {n.resumen && <span className="block truncate" style={{ maxWidth: 420 }}>{n.resumen}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="badge blue">{TIPO_NORMA[n.tipo]}</span>
                  </td>
                  <td className="text-xs">{JURISDICCION[n.jurisdiccion]}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {n.tags.slice(0, 4).map((t) => (
                        <span key={t} className="badge">#{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap muted text-xs">
                    <span className="inline-flex items-center gap-2">
                      {n.adjuntos_count > 0 && (
                        <span className="inline-flex items-center gap-0.5" title="Adjuntos">
                          <Paperclip size={14} /> {n.adjuntos_count}
                        </span>
                      )}
                      {n.link && (
                        <a href={n.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Fuente oficial" aria-label="Fuente oficial">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ver && (
        <NormaDetalle
          norma={ver}
          onClose={() => setVer(null)}
          onChange={reload}
          onEdit={() => {
            setForm(ver);
            setVer(null);
          }}
          onDelete={() => {
            setBorrar(ver);
            setVer(null);
          }}
        />
      )}
      {form && (
        <NormaForm
          norma={form}
          onClose={() => setForm(null)}
          onSaved={async (n) => {
            setForm(null);
            refrescar();
            toast('Norma guardada');
            // Abrir el detalle para adjuntar el PDF
            try {
              setVer(await api.get(`/normativa/${n.id}`));
            } catch {
              /* ignore */
            }
          }}
        />
      )}
      {borrar && (
        <ConfirmDialog
          title="Eliminar norma"
          message={<>¿Eliminar <strong>{borrar.titulo}</strong> y sus archivos adjuntos?</>}
          onClose={() => setBorrar(null)}
          onConfirm={async () => {
            await api.del(`/normativa/${borrar.id}`);
            refrescar();
            toast('Norma eliminada');
          }}
        />
      )}
    </>
  );
}
