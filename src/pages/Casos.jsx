import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, Scale } from 'lucide-react';
import { useDebounced, useFetch } from '../lib/useFetch.js';
import { ETAPA, ETAPAS, fmtFecha, fmtMoneda } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import CasoForm from '../components/CasoForm.jsx';
import { ExportMenu } from './Consultantes.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

export default function Casos() {
  const navigate = useNavigate();
  const { settings } = useApp();
  const [params, setParams] = useSearchParams();
  const etapa = params.get('etapa') || '';
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, error, loading } = useFetch(`/casos?etapa=${etapa}&q=${encodeURIComponent(dq)}`);
  const [nuevo, setNuevo] = useState(false);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Casos de reajuste' }]} />
      <PageHeader
        title="Casos de reajuste jubilatorio"
        subtitle="Seguimiento de reclamos por haber inicial, movilidad, tope y otros"
        actions={
          <>
            <ExportMenu tipo="casos" />
            <button className="pill-btn primary" onClick={() => setNuevo(true)}>
              <Plus size={18} /> Nuevo caso
            </button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <button className={`pill-btn sm ${!etapa ? 'primary' : ''}`} onClick={() => setParams({})}>
          Todas
        </button>
        {ETAPAS.map((e) => (
          <button key={e.id} className={`pill-btn sm ${etapa === e.id ? 'primary' : ''}`} onClick={() => setParams({ etapa: e.id })}>
            {e.label}
          </button>
        ))}
      </div>
      <SearchInput value={q} onChange={setQ} placeholder="Buscar por consultante, DNI o expediente" className="mb-4 max-w-md" />
      <ErrorBox error={error} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <div className="table-wrap">
          <Empty icon={Scale} title="No hay casos">
            {!etapa && !q && 'Abrí uno con "Nuevo caso".'}
          </Empty>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Consultante</th>
                <th>Motivos</th>
                <th className="num">Haber actual</th>
                <th>Etapa</th>
                <th>Abogado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/casos/${c.id}`)}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium">#{c.id}</div>
                    {c.expediente && <div className="muted text-xs">Expte. {c.expediente}</div>}
                  </td>
                  <td>
                    <div className="font-medium">{c.consultante_nombre}</div>
                    <div className="muted text-xs">{c.regimen_nombre || '—'}</div>
                  </td>
                  <td className="text-xs" style={{ maxWidth: 260 }}>
                    {[...c.motivos.map((m) => m.nombre), c.motivo_otro].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="num">{fmtMoneda(c.haber_actual, settings.moneda)}</td>
                  <td>
                    <span className={`badge ${ETAPA[c.etapa].badge}`}>{ETAPA[c.etapa].label}</span>
                    <div className="muted text-xs mt-0.5">desde {fmtFecha(c.etapa_desde)}</div>
                  </td>
                  <td className="muted">{c.abogado_nombre || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nuevo && <CasoForm onClose={() => setNuevo(false)} onSaved={(c) => navigate(`/casos/${c.id}`)} />}
    </>
  );
}
