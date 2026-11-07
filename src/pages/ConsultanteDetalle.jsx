import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Calculator, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useFetch } from '../lib/useFetch.js';
import { CONDICION, ETAPA, JURISDICCIONES, SEXO, edadHoy, fmtDni, fmtFecha, fmtFechaHora, hoyISO } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ConsultanteForm from '../components/ConsultanteForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ValidacionAviso from '../components/ValidacionAviso.jsx';
import CasoForm from '../components/CasoForm.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

function Dato({ label, children }) {
  return (
    <div>
      <div className="muted text-xs font-medium">{label}</div>
      <div className="mt-0.5">{children || '—'}</div>
    </div>
  );
}

function Calculadora({ consultante, onDone }) {
  const { toast } = useApp();
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(hoyISO());
  const [juris, setJuris] = useState(['NACION', 'SANTA_FE', 'NACION_Y_PROVINCIA']);
  const [sigue, setSigue] = useState(consultante.sigue_aportando);
  const [override, setOverride] = useState(false);
  const [sa, setSa] = useState(consultante.servicios_anios);
  const [sm, setSm] = useState(consultante.servicios_meses);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const calcular = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { consultante_id: consultante.id, fecha_calculo: fecha, jurisdicciones: juris, sigue_aportando: sigue };
      if (override) Object.assign(body, { servicio_anios: sa, servicio_meses: sm });
      const k = await api.post('/calculos', body);
      toast('Cálculo guardado en el historial');
      onDone?.();
      navigate(`/calculos/${k.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const toggle = (id) => setJuris((j) => (j.includes(id) ? j.filter((x) => x !== id) : [...j, id]));

  return (
    <form onSubmit={calcular} className="p-4 flex flex-col gap-4">
      {!consultante.fecha_nacimiento && <div className="alert warning">Cargá la fecha de nacimiento para poder calcular.</div>}
      {error && <div className="alert danger">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="field">
          <label htmlFor="k-fecha">Calcular al</label>
          <input id="k-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <div className="field">
          <span className="label">Jurisdicciones</span>
          <div className="flex flex-col gap-1.5 pt-1">
            {JURISDICCIONES.map((j) => (
              <label key={j.id} className="check text-sm">
                <input type="checkbox" checked={juris.includes(j.id)} onChange={() => toggle(j.id)} />
                {j.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <label className="check text-sm">
        <input type="checkbox" checked={sigue} onChange={(e) => setSigue(e.target.checked)} />
        Sigue aportando (proyecta servicios hacia adelante)
      </label>
      <label className="check text-sm">
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        Usar otros servicios para este cálculo (no modifica la ficha)
      </label>
      {override && (
        <div className="grid grid-cols-2 gap-4">
          <div className="field">
            <label htmlFor="k-sa">Años de servicio a la fecha</label>
            <input id="k-sa" type="number" min="0" value={sa} onChange={(e) => setSa(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="k-sm">Meses</label>
            <input id="k-sm" type="number" min="0" max="11" value={sm} onChange={(e) => setSm(e.target.value)} />
          </div>
        </div>
      )}
      <div>
        <button type="submit" className="pill-btn primary" disabled={busy || !consultante.fecha_nacimiento || juris.length === 0}>
          <Calculator size={18} /> {busy ? 'Calculando…' : 'Calcular y guardar'}
        </button>
      </div>
      <ValidacionAviso compact />
    </form>
  );
}

export default function ConsultanteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useApp();
  const { data: c, error, loading, reload } = useFetch(`/consultantes/${id}`);
  const calculos = useFetch(`/calculos?consultante_id=${id}`);
  const casos = useFetch(`/casos?consultante_id=${id}`);
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [nuevoCaso, setNuevoCaso] = useState(false);

  if (loading && !c) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Consultantes', to: '/consultantes' }, { label: c.nombre }]} />
      <PageHeader
        title={c.nombre}
        subtitle={c.dni ? `DNI ${fmtDni(c.dni)}` : undefined}
        actions={
          <>
            <button className="pill-btn" onClick={() => setEditar(true)}>
              <Pencil size={16} /> Editar
            </button>
            <button className="pill-btn" onClick={() => setBorrar(true)} style={{ color: 'var(--gcal-danger)' }}>
              <Trash2 size={16} /> Eliminar
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
        <section className="panel">
          <div className="panel-title">Datos del consultante</div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <Dato label="Fecha de nacimiento">
              {c.fecha_nacimiento && `${fmtFecha(c.fecha_nacimiento)} (${edadHoy(c.fecha_nacimiento)} años)`}
            </Dato>
            <Dato label="Sexo">{SEXO[c.sexo]}</Dato>
            <Dato label="Servicios con aportes">
              {c.servicios_anios} años y {c.servicios_meses} meses
              <div className="muted text-xs">al {fmtFecha(c.servicios_fecha_ref)}</div>
            </Dato>
            <Dato label="Sigue aportando">{c.sigue_aportando ? 'Sí' : 'No'}</Dato>
            <Dato label="Teléfono">{c.telefono}</Dato>
            <Dato label="Email">{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</Dato>
            <div className="col-span-2">
              <Dato label="Condiciones especiales">
                {c.condiciones?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.condiciones.map((x) => (
                      <span key={x} className="badge blue">{CONDICION[x]}</span>
                    ))}
                  </div>
                ) : (
                  <span className="muted">Ninguna (solo regímenes generales)</span>
                )}
              </Dato>
            </div>
            {c.notas && (
              <div className="col-span-2">
                <Dato label="Notas">
                  <div className="whitespace-pre-wrap">{c.notas}</div>
                </Dato>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Calcular requisitos jubilatorios</div>
          <Calculadora consultante={c} onDone={calculos.reload} />
        </section>
      </div>

      <section className="panel mt-4">
        <div className="panel-title">Historial de cálculos</div>
        {calculos.data?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha del cálculo</th>
                  <th>Calculado al</th>
                  <th>Resultado</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                {calculos.data.map((k) => (
                  <tr key={k.id} className="clickable" onClick={() => navigate(`/calculos/${k.id}`)}>
                    <td>{fmtFechaHora(k.created_at)}</td>
                    <td>{fmtFecha(k.fecha_calculo)}</td>
                    <td>
                      <span className={`badge ${k.algun_cumple ? 'success' : ''}`}>
                        {k.algun_cumple
                          ? `Cumple: ${k.resultados.filter((r) => r.estado === 'cumple').map((r) => r.regimen_nombre).join(', ')}`
                          : 'No cumple aún'}
                      </span>
                    </td>
                    <td className="muted">{k.usuario_nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Calculator} title="Sin cálculos todavía" />
        )}
      </section>

      <section className="panel mt-4">
        <div className="panel-title">
          <span>Casos de reajuste</span>
          <button className="pill-btn sm" onClick={() => setNuevoCaso(true)}>
            <Plus size={16} /> Nuevo caso
          </button>
        </div>
        {casos.data?.length ? (
          <table className="data-table">
            <tbody>
              {casos.data.map((x) => (
                <tr key={x.id} className="clickable" onClick={() => navigate(`/casos/${x.id}`)}>
                  <td>
                    <div className="font-medium">Caso #{x.id}{x.expediente ? ` · Expte. ${x.expediente}` : ''}</div>
                    <div className="muted text-xs">{x.motivos.map((m) => m.nombre).join(' · ') || 'Sin motivos marcados'}</div>
                  </td>
                  <td className="num">
                    <span className={`badge ${ETAPA[x.etapa].badge}`}>{ETAPA[x.etapa].label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty icon={Scale} title="Sin casos de reajuste" />
        )}
      </section>

      {editar && (
        <ConsultanteForm
          consultante={c}
          onClose={() => setEditar(false)}
          onSaved={() => {
            setEditar(false);
            reload();
            toast('Consultante actualizado');
          }}
        />
      )}
      {nuevoCaso && (
        <CasoForm
          caso={{ consultante_id: c.id }}
          onClose={() => setNuevoCaso(false)}
          onSaved={(x) => navigate(`/casos/${x.id}`)}
        />
      )}
      {borrar && (
        <ConfirmDialog
          title="Eliminar consultante"
          message={
            <>
              ¿Eliminar a <strong>{c.nombre}</strong>? Se borra también su historial de cálculos. Esta acción no se puede deshacer.
            </>
          }
          onClose={() => setBorrar(false)}
          onConfirm={async () => {
            await api.del(`/consultantes/${c.id}`);
            toast('Consultante eliminado');
            navigate('/consultantes');
          }}
        />
      )}
    </>
  );
}
