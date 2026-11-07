import { ESTADO_CALCULO, JURISDICCION, fmtAniosMeses, fmtFecha } from '../lib/format.js';

/** Tabla de resultados de un cálculo (usada en preview, detalle e impresión). */
export default function ResultadosTabla({ resultados }) {
  if (!resultados?.length) {
    return <div className="p-6 muted text-center">No hay regímenes aplicables para este consultante.</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Régimen</th>
            <th>Resultado</th>
            <th>Requisitos</th>
            <th>Falta</th>
            <th>Fecha estimada</th>
          </tr>
        </thead>
        <tbody>
          {resultados.map((r) => {
            const est = ESTADO_CALCULO[r.estado];
            return (
              <tr key={r.regimen_id}>
                <td style={{ minWidth: 200 }}>
                  <div className="font-medium">{r.regimen_nombre}</div>
                  <div className="muted text-xs">
                    {JURISDICCION[r.jurisdiccion]}
                    {r.fuente_normativa ? ` · ${r.fuente_normativa}` : ''}
                  </div>
                </td>
                <td style={{ minWidth: 180 }}>
                  <span className={`badge ${est.badge}`}>{est.label}</span>
                  <div className="text-xs mt-1">{r.detalle}</div>
                  {r.advertencias?.map((a) => (
                    <div key={a} className="text-xs mt-1" style={{ color: 'var(--gcal-warning)' }}>{a}</div>
                  ))}
                  {r.requisito_servicio_detalle && r.estado !== 'manual' && (
                    <div className="muted text-xs mt-1">Verificar: {r.requisito_servicio_detalle}</div>
                  )}
                </td>
                <td className="text-xs whitespace-nowrap">
                  {r.requisitos ? (
                    <>
                      Edad: {fmtAniosMeses(r.requisitos.edad_meses)}
                      <br />
                      Servicios: {r.requisitos.servicio_meses ? fmtAniosMeses(r.requisitos.servicio_meses) : 'no requiere'}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="text-xs whitespace-nowrap">
                  {r.estado === 'no_cumple' ? (
                    <>
                      {r.falta_edad_meses > 0 && <div>Edad: {fmtAniosMeses(r.falta_edad_meses)}</div>}
                      {r.falta_servicio_meses > 0 && <div>Servicios: {fmtAniosMeses(r.falta_servicio_meses)}</div>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="whitespace-nowrap">{r.estado === 'manual' ? '—' : fmtFecha(r.fecha_estimada)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
