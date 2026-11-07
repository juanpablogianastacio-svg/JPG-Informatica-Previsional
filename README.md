# JPG Informática Previsional

Sistema de gestión previsional para estudio jurídico (Santa Fe Capital). Uso interno del equipo.

- **Cálculo de requisitos jubilatorios** contra todos los regímenes aplicables (ANSES y Caja de Jubilaciones de Santa Fe), con compensación edad ↔ servicios, proyección de la fecha en que cumplirá e historial por consultante. Exporta a PDF (Imprimir → Guardar como PDF).
- **Regímenes configurables** desde la UI (edad, servicios, compensación, fuente, vigencia, condición especial). Nada hardcodeado.
- **Casos de reajuste** con ciclo de vida: evaluación → reclamo administrativo → demanda iniciada → en trámite → sentencia → archivado. Historial de etapas, notas y documentación adjunta.
- **Biblioteca normativa**: leyes, fallos, resoluciones y decretos con PDF y/o link, tags y regímenes relacionados.
- **Dashboard**: cálculos del mes, consultantes en condiciones, próximos a cumplir y casos por etapa.
- Export a Excel / CSV de consultantes y casos.

> ⚠️ **Los regímenes precargados son un punto de partida, no una fuente definitiva.** El equipo debe validarlos contra la normativa vigente antes de uso profesional. Los regímenes policial/penitenciario, magistrados y tareas diferenciales vienen sin edad ni servicios definidos: el cálculo los marca como “evaluación manual” hasta que se completen.

## Stack

React 19 + React Router 7 + Vite 7 · Tailwind CSS 4 · lucide-react · Express 4 · PostgreSQL 16 (`pg`) · bcryptjs + sesiones propias (Bearer, 14 días) · multer · xlsx. JavaScript (ES modules), sin TypeScript.

```
src/        React: pages, components, lib, api, auth, store
server/     Express: routes, middleware, db (schema.sql, migrate, seed), lib (motor de cálculo)
uploads/    adjuntos (no se versiona)
```

## Desarrollo local

Requisitos: Node ≥ 20 y Docker.

1. Copiá el archivo de entorno y ajustá la contraseña inicial:

   ```bash
   cp .env.example .env
   ```

2. Levantá Postgres:

   ```bash
   npm run db:up
   ```

3. Instalá dependencias y arrancá (API en :3001 + Vite en :5173 con proxy `/api`):

   ```bash
   npm install
   npm run dev
   ```

4. Abrí http://localhost:5173 e ingresá con `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`.

El schema se aplica solo al arrancar (`server/db/schema.sql`, idempotente) y el seed de regímenes y motivos de reajuste se inserta una sola vez: las ediciones que haga el estudio no se pisan en reinicios. El usuario inicial se crea solo si no existe ningún usuario.

| Script | Qué hace |
| --- | --- |
| `npm run dev` | API + frontend en modo desarrollo |
| `npm run build` | Compila el frontend a `server/public` |
| `npm start` | Producción: un solo proceso sirve API + SPA |
| `npm run migrate` | Aplica schema + seed sin levantar el server |
| `npm test` | Tests del motor de cálculo |
| `npm run db:up` / `db:down` | Postgres en Docker |

## Deploy en Railway

1. Crear un proyecto con un servicio **PostgreSQL** y otro desde este repo (Nixpacks; `railway.json` ya define build, start y health check en `/health`).
2. Variables del servicio web: `DATABASE_URL` (referencia a la del Postgres), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`.
3. **Adjuntos**: montar un *Volume* (por ej. en `/data/uploads`) y setear `UPLOAD_DIR=/data/uploads`; si no, los archivos se pierden en cada deploy.
4. Activar backups del Postgres desde Railway.

## Motor de cálculo

`server/lib/calc.js` trabaja en meses enteros:

- Edad a la fecha de cálculo; servicios = acreditados a la fecha de referencia + meses transcurridos (si sigue aportando).
- **Compensación** (configurable por régimen, proporción por defecto 2:1): *edad → servicios* (2 años de edad excedente cubren 1 año de servicio faltante) o *bidireccional* (también el exceso de servicios compensa falta de edad, como en la Caja de Santa Fe).
- Si no cumple, proyecta mes a mes hasta 60 años hacia adelante y devuelve la fecha estimada.
- Los regímenes con condición especial (docente, ex combatiente, policial, etc.) solo se evalúan si el consultante tiene esa condición marcada.
- Condiciones textuales (ej. “5 de los últimos 8 años”) se muestran como recordatorio; no se verifican automáticamente.

## Notas

- El paquete `xlsx` se usa solo para **generar** archivos (nunca para leer archivos subidos).
- Light mode únicamente; footer “Powered by ProfesIA” obligatorio en todas las pantallas.
