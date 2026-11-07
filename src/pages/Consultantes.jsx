import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Download, Plus, Users } from 'lucide-react';
import { download } from '../api/client.js';
import { useDebounced, useFetch } from '../lib/useFetch.js';
import { edadHoy, fmtDni, fmtFecha } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SearchInput from '../components/SearchInput.jsx';
import ConsultanteForm from '../components/ConsultanteForm.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

export function ExportMenu({ tipo }) {
  const { toast } = useApp();
  const go = (formato) => download(`/exportar/${tipo}?formato=${formato}`).catch((e) => toast(e.message, 'error'));
  return (
    <>
      <button className="pill-btn" onClick={() => go('xlsx')} title="Exportar a Excel">
        <Download size={16} /> Excel
      </button>
      <button className="pill-btn" onClick={() => go('csv')} title="Exportar a CSV">
        CSV
      </button>
    </>
  );
}

export default function Consultantes() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const filtro = params.get('filtro') || '';
  const { data, error, loading, reload } = useFetch(`/consultantes?q=${encodeURIComponent(dq)}`);
  const [form, setForm] = useState(null);

  const rows = useMemo(() => {
    if (!data) return [];
    if (filtro === 'cumple') return data.filter((c) => c.ultimo_algun_cumple);
    if (filtro === 'sin_calculo') return data.filter((c) => !c.ultimo_calculo_id);
    return data;
  }, [data, filtro]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Consultantes' }]} />
      <PageHeader
        title="Consultantes"
        subtitle="Personas que consultan al estudio y sus cálculos de requisitos"
        actions={
          <>
            <ExportMenu tipo="consultantes" />
            <button className="pill-btn primary" onClick={() => setForm({})}>
              <Plus size={18} /> Nuevo consultante
            </button>
          </>
        }
      />
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, DNI o email" className="flex-1 min-w-[220px] max-w-md" />
        <select className="input" style={{ width: 'auto' }} value={filtro} onChange={(e) => setParams(e.target.value ? { filtro: e.target.value } : {})} aria-label="Filtrar">
          <option value="">Todos</option>
          <option value="cumple">En condiciones (último cálculo)</option>
          <option value="sin_calculo">Sin cálculo</option>
        </select>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="table-wrap">
          <Empty icon={Users} title={q || filtro ? 'Sin resultados' : 'Todavía no hay consultantes'}>
            {!q && !filtro && 'Cargá el primero con "Nuevo consultante".'}
          </Empty>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th className="num">Edad</th>
                <th className="num">Servicios</th>
                <th>Último cálculo</th>
                <th className="num">Casos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/consultantes/${c.id}`)}>
                  <td className="font-medium">{c.nombre}</td>
                  <td>{fmtDni(c.dni)}</td>
                  <td className="num">{edadHoy(c.fecha_nacimiento) ?? '—'}</td>
                  <td className="num">
                    {c.servicios_anios}a {c.servicios_meses}m
                  </td>
                  <td>
                    {c.ultimo_calculo_id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className={`badge ${c.ultimo_algun_cumple ? 'success' : ''}`}>{c.ultimo_algun_cumple ? 'Cumple' : 'No cumple aún'}</span>
                        <span className="muted text-xs">{fmtFecha(c.ultimo_calculo_at)}</span>
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">{c.casos_count || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form && (
        <ConsultanteForm
          consultante={form}
          onClose={() => setForm(null)}
          onSaved={(c) => {
            setForm(null);
            reload();
            navigate(`/consultantes/${c.id}`);
          }}
        />
      )}
    </>
  );
}
