import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../store/AppStore.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PageHeader from '../components/PageHeader.jsx';

const TZS = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Argentina/Salta',
  'America/Argentina/Ushuaia',
];

export default function Configuracion() {
  const { settings, setSettings, toast } = useApp();
  const [f, setF] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ actual: '', nueva: '', repetir: '' });
  const [pwError, setPwError] = useState('');
  useEffect(() => setF(settings), [settings]);

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const s = await api.put('/settings', f);
      setSettings(s);
      toast('Configuración guardada');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const cambiarPw = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.nueva !== pw.repetir) return setPwError('Las contraseñas nuevas no coinciden');
    try {
      await api.post('/auth/password', { actual: pw.actual, nueva: pw.nueva });
      setPw({ actual: '', nueva: '', repetir: '' });
      toast('Contraseña actualizada');
    } catch (err) {
      setPwError(err.message);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Configuración' }]} />
      <PageHeader title="Configuración" />
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <form className="panel" onSubmit={guardar}>
          <div className="panel-title">Datos del estudio</div>
          <div className="p-4 flex flex-col gap-4">
            <div className="field">
              <label htmlFor="s-nombre">Nombre del estudio</label>
              <input id="s-nombre" value={f.nombre_estudio} onChange={(e) => setF({ ...f, nombre_estudio: e.target.value })} />
              <span className="hint">Aparece en el encabezado y en los informes PDF.</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="field">
                <label htmlFor="s-moneda">Moneda</label>
                <select id="s-moneda" value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}>
                  <option value="ARS">ARS — Peso argentino</option>
                  <option value="USD">USD — Dólar</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="s-tz">Zona horaria</label>
                <select id="s-tz" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
                  {TZS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <button className="pill-btn primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>

        <form className="panel" onSubmit={cambiarPw}>
          <div className="panel-title">Cambiar contraseña</div>
          <div className="p-4 flex flex-col gap-4">
            {pwError && <div className="alert danger">{pwError}</div>}
            <div className="field">
              <label htmlFor="p-act">Contraseña actual</label>
              <input id="p-act" type="password" autoComplete="current-password" required value={pw.actual} onChange={(e) => setPw({ ...pw, actual: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="p-new">Nueva contraseña</label>
              <input id="p-new" type="password" autoComplete="new-password" minLength={8} required value={pw.nueva} onChange={(e) => setPw({ ...pw, nueva: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="p-rep">Repetir nueva contraseña</label>
              <input id="p-rep" type="password" autoComplete="new-password" minLength={8} required value={pw.repetir} onChange={(e) => setPw({ ...pw, repetir: e.target.value })} />
            </div>
            <div>
              <button className="pill-btn">Actualizar contraseña</button>
            </div>
            <p className="muted text-xs m-0">La cuenta es compartida por el equipo; al cambiarla se cierran las demás sesiones abiertas.</p>
          </div>
        </form>
      </div>
    </>
  );
}
