import crypto from 'node:crypto';
import { query } from '../db/pool.js';

export const SESSION_DAYS = 14;

export function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const { rows } = await query(
      `SELECT u.id, u.email, u.nombre FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token = $1 AND s.expires_at > now() AND u.activo`,
      [token],
    );
    if (!rows[0]) return res.status(401).json({ error: 'Sesión vencida' });
    req.user = rows[0];
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

/** Envuelve handlers async para que los errores lleguen al error handler. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
