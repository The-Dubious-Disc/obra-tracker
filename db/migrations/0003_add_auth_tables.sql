-- Add password hash to usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create invitaciones table
CREATE TABLE IF NOT EXISTS invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol user_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invitado_por UUID REFERENCES usuarios(id),
  aceptada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create proyecto_miembros table
CREATE TABLE IF NOT EXISTS proyecto_miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proyecto_id, usuario_id)
);
