import { AlertTriangle } from 'lucide-react';

/** Aviso permanente: los requisitos precargados deben validarse antes de uso profesional. */
export default function ValidacionAviso({ compact }) {
  return (
    <div className="alert warning" role="note">
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div>
        {compact ? (
          <>Requisitos precargados como punto de partida: validar contra la normativa vigente antes de uso profesional.</>
        ) : (
          <>
            <strong>Datos normativos a validar.</strong> Los regímenes y requisitos precargados son un punto de partida editable,
            no una fuente definitiva. El equipo debe validarlos contra la normativa vigente antes de uso profesional (la normativa
            cambia; regímenes especiales como el policial tuvieron reformas recientes).
          </>
        )}
      </div>
    </div>
  );
}
