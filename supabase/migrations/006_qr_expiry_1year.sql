-- Actualizar todos los tokens existentes a 1 año de vencimiento
-- Los tokens JWT en sí no cambian — solo la fecha de vencimiento en la DB
-- El nuevo token se generará la próxima vez que se acceda al carnet
UPDATE students
SET qr_expires_at = NOW() + INTERVAL '1 year'
WHERE active = true;
