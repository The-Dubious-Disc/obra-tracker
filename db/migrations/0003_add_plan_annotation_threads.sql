DO $$ BEGIN
  CREATE TYPE "anotacion_estado" AS ENUM ('abierta', 'resuelta');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "anotaciones_planos"
  ADD COLUMN IF NOT EXISTS "estado" "anotacion_estado" DEFAULT 'abierta';

CREATE TABLE IF NOT EXISTS "comentarios_anotaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "anotacion_id" uuid NOT NULL REFERENCES "anotaciones_planos"("id") ON DELETE CASCADE,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "texto" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);
