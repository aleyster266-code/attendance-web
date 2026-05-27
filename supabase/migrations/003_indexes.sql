-- ════════════════════════════════════════════════════════════════
-- 003_indexes.sql — Índices de rendimiento
-- Ejecutar DESPUÉS de 001 y 002
-- ════════════════════════════════════════════════════════════════

-- El más usado: "asistencia de hoy por institución"
CREATE INDEX idx_att_tenant_date
  ON attendance_records (institution_id, recorded_at DESC);

-- Escaneo QR: ocurre en CADA entrada de alumno (crítico para rendimiento)
CREATE INDEX idx_students_qr
  ON students (qr_token)
  WHERE active = true;

-- Vista del docente: lista por grado y sección
CREATE INDEX idx_students_grade
  ON students (institution_id, grade, section)
  WHERE active = true;

-- Historial de un alumno específico
CREATE INDEX idx_att_student
  ON attendance_records (student_id, recorded_at DESC);

-- Monitor de dispositivos
CREATE INDEX idx_devices_institution
  ON devices (institution_id)
  WHERE active = true;