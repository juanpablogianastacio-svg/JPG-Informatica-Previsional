import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { pool, query } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { requireAuth, ah } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import consultantesRoutes from './routes/consultantes.js';
import regimenesRoutes from './routes/regimenes.js';
import calculosRoutes from './routes/calculos.js';
import casosRoutes from './routes/casos.js';
import normativaRoutes from './routes/normativa.js';
import adjuntosRoutes from './routes/adjuntos.js';
import dashboardRoutes from './routes/dashboard.js';
import exportarRoutes from './routes/exportar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth);
app.get('/api/usuarios', ah(async (_req, res) => {
  const { rows } = await query('SELECT id, nombre, email FROM usuarios WHERE activo ORDER BY nombre');
  res.json(rows);
}));
app.use('/api/settings', settingsRoutes);
app.use('/api/consultantes', consultantesRoutes);
app.use('/api/regimenes', regimenesRoutes);
app.use('/api/calculos', calculosRoutes);
app.use('/api/casos', casosRoutes);
app.use('/api/normativa', normativaRoutes);
app.use('/api/adjuntos', adjuntosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exportar', exportarRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// SPA estática en producción
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(path.join(publicDir, 'index.html'))) {
  app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera los 25 MB' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos (ej. DNI duplicado).' });
  if (err.code === '23503') return res.status(409).json({ error: 'El registro está referenciado por otros datos.' });
  if (err.code === '22007' || err.code === '22008') return res.status(400).json({ error: 'Fecha inválida.' });
  if (err.code === '22P02') return res.status(400).json({ error: 'Dato inválido.' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 3001;

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] JPG Informática Previsional en http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] No se pudo migrar la base:', err.message);
    pool.end();
    process.exit(1);
  });
