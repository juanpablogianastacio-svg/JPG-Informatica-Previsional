import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

/** Confirmación de acciones destructivas. `onConfirm` puede ser async; si tira error se muestra. */
export default function ConfirmDialog({ title = 'Confirmar', message, confirmLabel = 'Eliminar', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="pill-btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="pill-btn danger" onClick={go} disabled={busy}>
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        <div className="shrink-0 rounded-full p-2" style={{ background: 'var(--gcal-danger-bg)', color: 'var(--gcal-danger)' }}>
          <AlertTriangle size={20} />
        </div>
        <div className="pt-1 leading-relaxed">{message}</div>
      </div>
      {error && <div className="alert danger mt-4">{error}</div>}
    </Modal>
  );
}
