ALTER TABLE pendientes
  ADD COLUMN IF NOT EXISTS responsable_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsable_constructor BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pendientes_responsable_excluyente'
  ) THEN
    ALTER TABLE pendientes
      ADD CONSTRAINT pendientes_responsable_excluyente
      CHECK (NOT (responsable_constructor AND responsable_usuario_id IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pendientes_responsable_usuario_id_idx
  ON pendientes (responsable_usuario_id);
