-- ════════════════════════════════════════════════════════════════
-- 002_rls_policies.sql — Row Level Security
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- ════════════════════════════════════════════════════════════════

-- Activar RLS en todas las tablas
ALTER TABLE institutions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;

-- Helper: devuelve institution_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_institution()
RETURNS UUID AS $$
  SELECT institution_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── Students ──────────────────────────────────────────────────
CREATE POLICY students_select ON students
  FOR SELECT USING (institution_id = get_my_institution());

CREATE POLICY students_insert ON students
  FOR INSERT WITH CHECK (institution_id = get_my_institution());

CREATE POLICY students_update ON students
  FOR UPDATE USING (institution_id = get_my_institution());

-- ── Attendance records ────────────────────────────────────────
CREATE POLICY att_select ON attendance_records
  FOR SELECT USING (institution_id = get_my_institution());

CREATE POLICY att_insert ON attendance_records
  FOR INSERT WITH CHECK (institution_id = get_my_institution());

-- ── Devices ──────────────────────────────────────────────────
CREATE POLICY dev_select ON devices
  FOR SELECT USING (institution_id = get_my_institution());

-- ── Notification log ─────────────────────────────────────────
CREATE POLICY notif_select ON notification_log
  FOR SELECT USING (institution_id = get_my_institution());

-- ── Users: cada uno ve solo su propio perfil ─────────────────
CREATE POLICY users_self ON users
  USING (id = auth.uid());