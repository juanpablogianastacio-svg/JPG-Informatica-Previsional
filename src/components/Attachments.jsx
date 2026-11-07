import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, Paperclip, Trash2 } from 'lucide-react';
import { api, download, openInline } from '../api/client.js';
import { fmtBytes, fmtFecha } from '../lib/format.js';
import { useApp } from '../store/AppStore.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function Attachments({ entidad, entidadId, onChange }) {
  const { toast } = useApp();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [borrar, setBorrar] = useState(null);
  const input = useRef(null);

  const load = useCallback(() => {
    api.get(`/adjuntos?entidad=${entidad}&entidad_id=${entidadId}`).then(setItems).catch((e) => toast(e.message, 'error'));
  }, [entidad, entidadId, toast]);
  useEffect(load, [load]);

  const subir = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append('entidad', entidad);
        fd.append('entidad_id', entidadId);
        fd.append('archivo', f);
        await api.upload('/adjuntos', fd);
      }
      toast(files.length > 1 ? 'Archivos subidos' : 'Archivo subido');
      load();
      onChange?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const verible = (m) => m === 'application/pdf' || m?.startsWith('image/');

  return (
    <div>
      {items.length > 0 && (
        <ul className="m-0 p-0 list-none mb-3 divide-y" style={{ borderColor: 'var(--gcal-border)' }}>
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <FileText size={18} className="muted shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.nombre_original}</div>
                <div className="muted text-xs">
                  {fmtBytes(a.tamanio)} · {fmtFecha(a.created_at)}
                </div>
              </div>
              {verible(a.mime) && (
                <button className="icon-btn" title="Ver" aria-label="Ver" onClick={() => openInline(`/adjuntos/${a.id}/descargar?inline=1`).catch((e) => toast(e.message, 'error'))}>
                  <Eye size={18} />
                </button>
              )}
              <button className="icon-btn" title="Descargar" aria-label="Descargar" onClick={() => download(`/adjuntos/${a.id}/descargar`, a.nombre_original).catch((e) => toast(e.message, 'error'))}>
                <Download size={18} />
              </button>
              <button className="icon-btn danger" title="Eliminar" aria-label="Eliminar" onClick={() => setBorrar(a)}>
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => subir([...e.target.files])} />
      <button type="button" className="pill-btn sm" onClick={() => input.current?.click()} disabled={busy}>
        <Paperclip size={16} /> {busy ? 'Subiendo…' : 'Adjuntar archivo'}
      </button>
      <span className="muted text-xs ml-2">PDF, imágenes, Word, Excel · máx. 25 MB</span>
      {borrar && (
        <ConfirmDialog
          title="Eliminar adjunto"
          message={<>¿Eliminar <strong>{borrar.nombre_original}</strong>? El archivo se borra del servidor.</>}
          onClose={() => setBorrar(null)}
          onConfirm={async () => {
            await api.del(`/adjuntos/${borrar.id}`);
            load();
            onChange?.();
          }}
        />
      )}
    </div>
  );
}
