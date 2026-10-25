CREATE TABLE IF NOT EXISTS pendiente_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendiente_id UUID NOT NULL REFERENCES pendientes(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pendiente_fotos_pendiente_id_idx ON pendiente_fotos(pendiente_id);
CREATE INDEX IF NOT EXISTS pendiente_fotos_orden_idx ON pendiente_fotos(pendiente_id, orden);
