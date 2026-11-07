import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { ah, newToken, requireAuth, SESSION_DAYS } from '../middleware/auth.js';

const r = Router();

r.post(
  '/login',
  ah(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const { rows } = await query('SELECT * FROM usuarios WHERE email = $1 AND activo', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const token = newToken();
    await query(
      `INSERT INTO sesiones (token, usuario_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
      [token, user.id, String(SESSION_DAYS)],
    );
    await query('DELETE FROM sesiones WHERE expires_at < now()');
    res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre } });
  }),
);

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.post(
  '/logout',
  requireAuth,
  ah(async (req, res) => {
    await query('DELETE FROM sesiones WHERE token = $1', [req.token]);
    res.json({ ok: true });
  }),
);

r.post(
  '/password',
  requireAuth,
  ah(async (req, res) => {
    const { actual, nueva } = req.body || {};
    if (!nueva || String(nueva).length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    const { rows } = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(String(actual || ''), rows[0].password_hash))) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(String(nueva), 10), req.user.id]);
    await query('DELETE FROM sesiones WHERE usuario_id = $1 AND token <> $2', [req.user.id, req.token]);
    res.json({ ok: true });
  }),
);

export default r;
