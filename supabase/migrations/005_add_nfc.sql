-- ════════════════════════════════════════════════════════════════
-- 005_add_nfc.sql
-- Agrega soporte NFC a la tabla students
-- Ejecutar en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Columna para el UID del chip NFC (formato hex: "04A3B2C1D0E5F6")
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(32) UNIQUE;

-- Indice para busqueda rapida por NFC (cada lectura hace esta query)
CREATE INDEX IF NOT EXISTS idx_students_nfc
  ON students (nfc_uid)
  WHERE nfc_uid IS NOT NULL AND active = true;

-- Vista rapida: alumnos con NFC asignado
CREATE OR REPLACE VIEW students_with_nfc AS
  SELECT id, institution_id, name, grade, section, nfc_uid
  FROM students
  WHERE nfc_uid IS NOT NULL AND active = true;
