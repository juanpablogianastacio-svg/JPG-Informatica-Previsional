import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { query } from '../db/pool.js';
import { ah, HttpError } from '../middleware/auth.js';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const PERMITIDOS = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (PERMITIDOS.has(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Tipo de archivo no permitido (PDF, imágenes, Word, Excel o texto).'));
  },
});

const ENTIDADES = { norma: 'normas', caso: 'casos_reajuste' };

export async function borrarAdjuntosDe(entidad, entidadId) {
  const { rows } = await query('DELETE FROM adjuntos WHERE entidad = $1 AND entidad_id = $2 RETURNING archivo', [entidad, entidadId]);
  for (const a of rows) fs.promises.unlink(path.join(UPLOAD_DIR, a.archivo)).catch(() => {});
}

const r = Router();

r.get('/', ah(async (req, res) => {
  const { entidad, entidad_id } = req.query;
  if (!ENTIDADES[entidad]) throw new HttpError(400, 'Entidad inválida');
  const { rows } = await query(
    'SELECT id, entidad, entidad_id, nombre_original, mime, tamanio, created_at FROM adjuntos WHERE entidad = $1 AND entidad_id = $2 ORDER BY created_at DESC',
    [entidad, entidad_id],
  );
  res.json(rows);
}));

r.post('/', upload.single('archivo'), ah(async (req, res) => {
  const { entidad, entidad_id } = req.body || {};
  const borrar = () => req.file && fs.promises.unlink(req.file.path).catch(() => {});
  if (!req.file) throw new HttpError(400, 'No se recibió ningún archivo');
  if (!ENTIDADES[entidad]) {
    borrar();
    throw new HttpError(400, 'Entidad inválida');
  }
  const existe = await query(`SELECT 1 FROM ${ENTIDADES[entidad]} WHERE id = $1`, [entidad_id]);
  if (!existe.rows[0]) {
    borrar();
    throw new HttpError(404, 'Registro no encontrado');
  }
  // multer decodifica el nombre como latin1; lo pasamos a UTF-8 para conservar acentos
  const nombre = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const { rows } = await query(
    `INSERT INTO adjuntos (entidad, entidad_id, archivo, nombre_original, mime, tamanio, usuario_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, entidad, entidad_id, nombre_original, mime, tamanio, created_at`,
    [entidad, entidad_id, req.file.filename, nombre, req.file.mimetype, req.file.size, req.user.id],
  );
  res.status(201).json(rows[0]);
}));

r.get('/:id/descargar', ah(async (req, res) => {
  const { rows } = await query('SELECT * FROM adjuntos WHERE id = $1', [req.params.id]);
  const a = rows[0];
  if (!a) throw new HttpError(404, 'Adjunto no encontrado');
  const file = path.join(UPLOAD_DIR, path.basename(a.archivo));
  if (!fs.existsSync(file)) throw new HttpError(404, 'El archivo ya no está en el servidor');
  const inline = req.query.inline === '1' && (a.mime === 'application/pdf' || a.mime?.startsWith('image/'));
  res.setHeader('Content-Type', a.mime || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(a.nombre_original)}`,
  );
  fs.createReadStream(file).pipe(res);
}));

r.delete('/:id', ah(async (req, res) => {
  const { rows } = await query('DELETE FROM adjuntos WHERE id = $1 RETURNING archivo', [req.params.id]);
  if (rows[0]) fs.promises.unlink(path.join(UPLOAD_DIR, rows[0].archivo)).catch(() => {});
  res.json({ ok: true });
}));

export default r;
