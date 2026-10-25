DROP INDEX IF EXISTS pendientes_vencimiento_idx;
ALTER TABLE pendientes DROP COLUMN IF EXISTS fecha_vencimiento;
