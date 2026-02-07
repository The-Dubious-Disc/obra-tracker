DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pendiente_estado') THEN
    CREATE TYPE pendiente_estado AS ENUM ('pendiente', 'completado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pendientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_vencimiento DATE NOT NULL,
  estado pendiente_estado NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pendientes_proyecto_id_idx ON pendientes(proyecto_id);
CREATE INDEX IF NOT EXISTS pendientes_estado_idx ON pendientes(estado);
CREATE INDEX IF NOT EXISTS pendientes_vencimiento_idx ON pendientes(fecha_vencimiento);
