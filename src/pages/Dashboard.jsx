import { Link, useNavigate } from 'react-router';
import { Calculator, CalendarClock, CheckCircle2, Scale, UserPlus } from 'lucide-react';
import { useFetch } from '../lib/useFetch.js';
import { ETAPAS, fmtFecha, fmtFechaHora } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import ValidacionAviso from '../components/ValidacionAviso.jsx';
import { Empty, ErrorBox, Loading } from '../components/States.jsx';

function Kpi({ label, value, icon: Icon, to }) {
  const body = (
    <div className="panel kpi h-full hover:bg-[var(--gcal-bg-soft)] transition-colors">
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <Icon size={18} style={{ color: 'var(--gcal-blue)' }} />
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
    </div>
  );
  return to ? (
    <Link to={to} className="block no-underline hover:no-underline" style={{ color: 'inherit' }}>
      {body}
    </Link>
  ) : (
    body
  );
}

export default function Dashboard() {
  const { data, error, loading } = useFetch('/dashboard');
  const navigate = useNavigate();
  const mes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const totalCasos = Object.values(data.casos_por_etapa).reduce((a, b) => a + b, 0);
  const maxEtapa = Math.max(1, ...Object.values(data.casos_por_etapa));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Resumen de ${mes}`} />
      {data.regimenes_sin_validar > 0 && (
        <div className="mb-4">
          <ValidacionAviso compact />
          <div className="text-xs mt-1 ml-1 muted">
            {data.regimenes_sin_validar} régimen(es) activos marcados como "a validar" · <Link to="/regimenes">Revisar regímenes</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Cálculos del mes" value={data.calculos_mes} icon={Calculator} />
        <Kpi label="En condiciones de jubilarse" value={data.en_condiciones_count} icon={CheckCircle2} to="/consultantes?filtro=cumple" />
        <Kpi label="Casos de reajuste activos" value={data.casos_activos} icon={Scale} to="/casos" />
        <Kpi label="Consultantes nuevos del mes" value={data.consultantes_mes} icon={UserPlus} to="/consultantes" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="panel">
          <div className="panel-title">
            <span>Casos de reajuste por etapa</span>
            <span className="muted text-xs font-normal">{totalCasos} en total</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {ETAPAS.map((e) => {
              const n = data.casos_por_etapa[e.id] || 0;
              return (
                <Link key={e.id} to={`/casos?etapa=${e.id}`} className="block hover:no-underline" style={{ color: 'inherit' }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{e.label}</span>
                    <span className="font-medium tabular-nums">{n}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--gcal-hover)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${(n / maxEtapa) * 100}%`, background: e.id === 'archivado' ? 'var(--gcal-muted)' : 'var(--gcal-blue)', minWidth: n ? 8 : 0 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>En condiciones de jubilarse</span>
            <span className="muted text-xs font-normal">según su último cálculo</span>
          </div>
          {data.en_condiciones.length === 0 ? (
            <Empty icon={CheckCircle2} title="Nadie en condiciones todavía">
              Aparecen acá los consultantes cuyo último cálculo cumple al menos un régimen.
            </Empty>
          ) : (
            <table className="data-table">
              <tbody>
                {data.en_condiciones.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/consultantes/${c.id}`)}>
                    <td>
                      <div className="font-medium">{c.nombre}</div>
                      <div className="muted text-xs">{c.regimenes.join(' · ')}</div>
                    </td>
                    <td className="num muted text-xs">{fmtFecha(c.fecha_calculo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Próximos a cumplir (12 meses)</span>
            <CalendarClock size={16} className="muted" />
          </div>
          {data.proximos_a_cumplir.length === 0 ? (
            <Empty title="Sin consultantes próximos a cumplir" />
          ) : (
            <table className="data-table">
              <tbody>
                {data.proximos_a_cumplir.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/consultantes/${c.id}`)}>
                    <td className="font-medium">{c.nombre}</td>
                    <td className="num">
                      <span className="badge blue">{fmtFecha(c.fecha_estimada)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">Últimos cálculos</div>
          {data.calculos_recientes.length === 0 ? (
            <Empty icon={Calculator} title="Todavía no hay cálculos">
              Cargá un consultante y calculá sus requisitos.
            </Empty>
          ) : (
            <table className="data-table">
              <tbody>
                {data.calculos_recientes.map((k) => (
                  <tr key={k.id} className="clickable" onClick={() => navigate(`/calculos/${k.id}`)}>
                    <td>
                      <div className="font-medium">{k.consultante_nombre}</div>
                      <div className="muted text-xs">
                        {fmtFechaHora(k.created_at)} · {k.usuario_nombre}
                      </div>
                    </td>
                    <td className="num">
                      <span className={`badge ${k.algun_cumple ? 'success' : ''}`}>{k.algun_cumple ? 'Cumple' : 'No cumple aún'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
