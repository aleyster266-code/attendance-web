-- ════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- Ejecutar en: supabase.com → tu proyecto → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Tabla raíz: una fila = un colegio (tenant)
CREATE TABLE institutions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  plan         VARCHAR(20)  DEFAULT 'basic' CHECK (plan IN ('basic', 'premium')),
  wa_phone_id  VARCHAR(100),
  wa_token     TEXT,
  settings     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Alumnos registrados
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  grade           VARCHAR(20)  NOT NULL,
  section         VARCHAR(10),
  photo_url       TEXT,
  guardian_name   VARCHAR(200),
  guardian_phone  VARCHAR(20),
  qr_token        VARCHAR(500) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  qr_expires_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tablets registradas
CREATE TABLE devices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     UUID NOT NULL REFERENCES institutions(id),
  name               VARCHAR(100) NOT NULL,
  location           VARCHAR(100),
  device_token       VARCHAR(200) UNIQUE NOT NULL,
  last_seen_at       TIMESTAMPTZ,
  pending_sync_count INT DEFAULT 0,
  active             BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Registros de asistencia — tabla central del sistema
-- client_uuid: generado en el dispositivo, garantiza idempotencia offline
CREATE TABLE attendance_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid    UUID UNIQUE NOT NULL,
  student_id     UUID NOT NULL REFERENCES students(id),
  device_id      UUID NOT NULL REFERENCES devices(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  type           VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit')),
  recorded_at    TIMESTAMPTZ NOT NULL,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  sync_source    VARCHAR(10) DEFAULT 'direct' CHECK (sync_source IN ('direct', 'batch'))
);

-- Log de notificaciones enviadas a padres
CREATE TABLE notification_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id),
  student_id           UUID NOT NULL REFERENCES students(id),
  attendance_record_id UUID REFERENCES attendance_records(id),
  channel              VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'push', 'sms')),
  status               VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message        TEXT,
  sent_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios (admin/docente) — extiende auth.users de Supabase
CREATE TABLE users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  role           VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('superadmin', 'admin', 'teacher')),
  name           VARCHAR(200),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);