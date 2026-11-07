-- JPG Informática Previsional — schema idempotente.
-- Se ejecuta completo en cada arranque (server/db/migrate.js); todo debe poder correr N veces.

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sesiones (
  token       TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_usuario_idx ON sesiones(usuario_id);

-- Configuración del estudio (una sola fila, id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_estudio TEXT NOT NULL DEFAULT 'Estudio Jurídico',
  moneda        TEXT NOT NULL DEFAULT 'ARS',
  timezone      TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS consultantes (
  id                SERIAL PRIMARY KEY,
  nombre            TEXT NOT NULL,
  dni               TEXT,
  fecha_nacimiento  DATE,
  sexo              TEXT CHECK (sexo IN ('M', 'F', 'X')),
  telefono          TEXT,
  email             TEXT,
  -- Servicios/aportes acreditados a la fecha de referencia (se usan como default al calcular)
  servicios_anios   INTEGER NOT NULL DEFAULT 0,
  servicios_meses   INTEGER NOT NULL DEFAULT 0,
  servicios_fecha_ref DATE,
  sigue_aportando   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Condiciones especiales (docente, ex_combatiente, policial, ...) que habilitan regímenes especiales
  condiciones       TEXT[] NOT NULL DEFAULT '{}',
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS consultantes_dni_uq ON consultantes(dni) WHERE dni IS NOT NULL AND dni <> '';

-- Regímenes previsionales: configurables desde la UI, nunca hardcodeados.
CREATE TABLE IF NOT EXISTS regimenes (
  id                   SERIAL PRIMARY KEY,
  codigo               TEXT UNIQUE,              -- clave estable para el seed
  nombre               TEXT NOT NULL,
  jurisdiccion         TEXT NOT NULL CHECK (jurisdiccion IN ('NACION', 'SANTA_FE', 'NACION_Y_PROVINCIA')),
  tipo                 TEXT NOT NULL DEFAULT 'general',
  -- Si no es NULL, el régimen solo se evalúa para consultantes con esa condición especial
  requiere_condicion   TEXT,
  edad_min_hombre      NUMERIC(5,2),             -- años; NULL = no definido (requiere evaluación manual)
  edad_min_mujer       NUMERIC(5,2),
  anios_servicio       NUMERIC(5,2),             -- años de servicio/aportes; 0 = no requiere
  requisito_servicio_detalle TEXT,               -- condiciones adicionales en texto (ej. "5 dentro de los últimos 8")
  compensacion         TEXT NOT NULL DEFAULT 'ninguna'
                       CHECK (compensacion IN ('ninguna', 'edad_por_servicio', 'bidireccional')),
  compensacion_ratio   NUMERIC(5,2) NOT NULL DEFAULT 2, -- años de edad excedente por cada año de servicio faltante
  fuente_normativa     TEXT,
  vigente_desde        DATE,
  vigente_hasta        DATE,
  notas                TEXT,
  requiere_validacion  BOOLEAN NOT NULL DEFAULT TRUE,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Snapshot histórico de cada cálculo de requisitos
CREATE TABLE IF NOT EXISTS calculos (
  id               SERIAL PRIMARY KEY,
  consultante_id   INTEGER NOT NULL REFERENCES consultantes(id) ON DELETE CASCADE,
  fecha_calculo    DATE NOT NULL,
  edad_meses       INTEGER NOT NULL,
  servicio_meses   INTEGER NOT NULL,
  sexo             TEXT,
  sigue_aportando  BOOLEAN NOT NULL,
  resultados       JSONB NOT NULL,       -- [{regimen_id, regimen_nombre, estado, ...}]
  algun_cumple     BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_id       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calculos_consultante_idx ON calculos(consultante_id, created_at DESC);

-- Motivos de reajuste (checklist configurable)
CREATE TABLE IF NOT EXISTS motivos_reajuste (
  id          SERIAL PRIMARY KEY,
  codigo      TEXT UNIQUE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS casos_reajuste (
  id                 SERIAL PRIMARY KEY,
  consultante_id     INTEGER NOT NULL REFERENCES consultantes(id) ON DELETE RESTRICT,
  regimen_id         INTEGER REFERENCES regimenes(id) ON DELETE SET NULL,
  fecha_jubilacion   DATE,
  haber_actual       NUMERIC(14,2),
  expediente         TEXT,
  etapa              TEXT NOT NULL DEFAULT 'evaluacion'
                     CHECK (etapa IN ('evaluacion', 'reclamo_administrativo', 'demanda_iniciada', 'en_tramite', 'sentencia', 'archivado')),
  etapa_desde        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_cierre       DATE,
  motivo_otro        TEXT,
  notas              TEXT,
  abogado_id         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  abogado_nombre     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS casos_etapa_idx ON casos_reajuste(etapa);

CREATE TABLE IF NOT EXISTS caso_motivos (
  caso_id   INTEGER NOT NULL REFERENCES casos_reajuste(id) ON DELETE CASCADE,
  motivo_id INTEGER NOT NULL REFERENCES motivos_reajuste(id) ON DELETE CASCADE,
  PRIMARY KEY (caso_id, motivo_id)
);

-- Historial de etapas (y notas de seguimiento) de cada caso
CREATE TABLE IF NOT EXISTS caso_eventos (
  id             SERIAL PRIMARY KEY,
  caso_id        INTEGER NOT NULL REFERENCES casos_reajuste(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('etapa', 'nota')),
  etapa_anterior TEXT,
  etapa_nueva    TEXT,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  nota           TEXT,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caso_eventos_caso_idx ON caso_eventos(caso_id, created_at);

-- Biblioteca normativa
CREATE TABLE IF NOT EXISTS normas (
  id           SERIAL PRIMARY KEY,
  titulo       TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('ley', 'fallo', 'resolucion', 'decreto', 'otro')),
  jurisdiccion TEXT NOT NULL CHECK (jurisdiccion IN ('NACION', 'SANTA_FE', 'NACION_Y_PROVINCIA')),
  numero       TEXT,
  anio         INTEGER,
  resumen      TEXT,
  link         TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS norma_regimenes (
  norma_id   INTEGER NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  regimen_id INTEGER NOT NULL REFERENCES regimenes(id) ON DELETE CASCADE,
  PRIMARY KEY (norma_id, regimen_id)
);

-- Adjuntos genéricos (normativa y casos)
CREATE TABLE IF NOT EXISTS adjuntos (
  id             SERIAL PRIMARY KEY,
  entidad        TEXT NOT NULL CHECK (entidad IN ('norma', 'caso')),
  entidad_id     INTEGER NOT NULL,
  archivo        TEXT NOT NULL,     -- nombre en disco
  nombre_original TEXT NOT NULL,
  mime           TEXT,
  tamanio        INTEGER,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS adjuntos_entidad_idx ON adjuntos(entidad, entidad_id);

-- Búsqueda sin acentos ni mayúsculas (sin depender de la extensión unaccent)
CREATE OR REPLACE FUNCTION unaccent_lower(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(translate(t, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))
$$;
