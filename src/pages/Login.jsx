import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider.jsx';
import AppLogo from '../components/AppLogo.jsx';
import PoweredBy from '../components/PoweredBy.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 pt-8" style={{ paddingBottom: 'calc(var(--footer-h) + 32px)', background: 'var(--gcal-bg-soft)' }}>
      <form onSubmit={submit} className="panel w-full max-w-[400px] p-8" style={{ background: '#fff' }}>
        <div className="flex flex-col items-center text-center mb-6">
          <AppLogo size={48} />
          <h1 className="text-[22px] font-normal mt-4 mb-1" style={{ color: '#202124' }}>
            JPG Informática Previsional
          </h1>
          <p className="muted m-0">Iniciá sesión para continuar</p>
        </div>
        {error && <div className="alert danger mb-4">{error}</div>}
        <div className="flex flex-col gap-4">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="pill-btn primary w-full mt-2" disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
      </form>
      <PoweredBy />
    </div>
  );
}
