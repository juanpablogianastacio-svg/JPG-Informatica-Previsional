import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Printer, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useFetch } from '../lib/useFetch.js';
import { SEXO, fmtAniosMeses, fmtDni, fmtFecha, fmtFechaHora } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ResultadosTabla from '../components/ResultadosTabla.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AppLogo from '../components/AppLogo.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';

/** Detalle de un cálculo. "Exportar PDF" usa la impresión del navegador (Guardar como PDF) con estilos @media print. */
export default function CalculoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings, toast } = useApp();
  const { data: k, error, loading } = useFetch(`/calculos/${id}`);
  const [borrar, setBorrar] = useState(false);

  if (loading && !k) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const cumplen = k.resultados.filter((r) => r.estado === 'cumple');

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Inicio', to: '/' },
          { label: 'Consultantes', to: '/consultantes' },
          { label: k.consultante_nombre, to: `/consultantes/${k.consultante_id}` },
          { label: `Cálculo del ${fmtFecha(k.fecha_calculo)}` },
        ]}
      />

      {/* Encabezado solo para impresión */}
      <div className="print-only mb-6">
        <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '2px solid var(--gcal-blue)' }}>
          <AppLogo size={36} />
          <div>
            <div className="font-semibold text-base">{settings.nombre_estudio || 'Estudio Jurídico'}</div>
            <div className="muted text-xs">JPG Informática Previsional · Informe de requisitos jubilatorios</div>
          </div>
        </div>
      </div>

      <div className="no-print">
        <PageHeader
          title="Resultado del cálculo"
          subtitle={`${k.consultante_nombre} · calculado al ${fmtFecha(k.fecha_calculo)}`}
          actions={
            <>
              <button className="pill-btn primary" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / PDF
              </button>
              <button className="icon-btn danger" onClick={() => setBorrar(true)} title="Eliminar cálculo" aria-label="Eliminar cálculo">
                <Trash2 size={18} />
              </button>
            </>
          }
        />
      </div>
      <h2 className="print-only text-lg font-medium mb-3">Informe de requisitos jubilatorios</h2>

      <section className="panel mb-4">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="muted text-xs font-medium">Consultante</div>
            <div className="font-medium">{k.consultante_nombre}</div>
            {k.consultante_dni && <div className="muted text-xs">DNI {fmtDni(k.consultante_dni)}</div>}
          </div>
          <div>
            <div className="muted text-xs font-medium">Edad al {fmtFecha(k.fecha_calculo)}</div>
            <div>{fmtAniosMeses(k.edad_meses)}</div>
            <div className="muted text-xs">Nac. {fmtFecha(k.consultante_nacimiento)} · {SEXO[k.sexo] || 'Sexo no informado'}</div>
          </div>
          <div>
            <div className="muted text-xs font-medium">Servicios computados</div>
            <div>{fmtAniosMeses(k.servicio_meses)}</div>
            <div className="muted text-xs">{k.sigue_aportando ? 'Sigue aportando' : 'Sin aportes futuros'}</div>
          </div>
          <div>
            <div className="muted text-xs font-medium">Conclusión</div>
            <div className="mt-0.5">
              {cumplen.length ? (
                <span className="badge success">Cumple {cumplen.length} régimen(es)</span>
              ) : (
                <span className="badge">No cumple aún</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <ResultadosTabla resultados={k.resultados} />

      <div className="alert warning mt-4 text-xs">
        Informe orientativo generado a partir de los requisitos cargados en el sistema. Los requisitos deben validarse contra la normativa
        vigente y la documentación respaldatoria (historia laboral, certificaciones de servicios) antes de cualquier presentación.
      </div>
      <div className="muted text-xs mt-3">
        Calculado el {fmtFechaHora(k.created_at)} por {k.usuario_nombre || '—'} · Cálculo N° {k.id}
      </div>

      {borrar && (
        <ConfirmDialog
          title="Eliminar cálculo"
          message="¿Eliminar este cálculo del historial del consultante?"
          onClose={() => setBorrar(false)}
          onConfirm={async () => {
            await api.del(`/calculos/${k.id}`);
            toast('Cálculo eliminado');
            navigate(`/consultantes/${k.consultante_id}`);
          }}
        />
      )}
    </>
  );
}
