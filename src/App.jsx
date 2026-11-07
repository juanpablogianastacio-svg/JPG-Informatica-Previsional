import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider, RequireAuth } from './auth/AuthProvider.jsx';
import { AppStore } from './store/AppStore.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Consultantes from './pages/Consultantes.jsx';
import ConsultanteDetalle from './pages/ConsultanteDetalle.jsx';
import CalculoDetalle from './pages/CalculoDetalle.jsx';
import Regimenes from './pages/Regimenes.jsx';
import Casos from './pages/Casos.jsx';
import CasoDetalle from './pages/CasoDetalle.jsx';
import Normativa from './pages/Normativa.jsx';
import Configuracion from './pages/Configuracion.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AppStore>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="consultantes" element={<Consultantes />} />
            <Route path="consultantes/:id" element={<ConsultanteDetalle />} />
            <Route path="calculos/:id" element={<CalculoDetalle />} />
            <Route path="regimenes" element={<Regimenes />} />
            <Route path="casos" element={<Casos />} />
            <Route path="casos/:id" element={<CasoDetalle />} />
            <Route path="normativa" element={<Normativa />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppStore>
    </AuthProvider>
  );
}
