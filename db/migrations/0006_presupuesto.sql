-- 1. Crear la tabla para los ítems adicionales/extras
CREATE TABLE IF NOT EXISTS "adicionales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proyecto_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"completado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

-- 2. Vincular la tabla de adicionales con proyectos mediante FK
ALTER TABLE "adicionales" 
ADD CONSTRAINT "adicionales_proyecto_id_proyectos_id_fk" 
FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") 
ON DELETE cascade ON UPDATE no action;

-- 3. Agregar la columna adicional_id a la tabla de pagos
ALTER TABLE "pagos" ADD COLUMN IF NOT EXISTS "adicional_id" uuid;

-- 4. Vincular la columna adicional_id de pagos con adicionales mediante FK
ALTER TABLE "pagos" 
ADD CONSTRAINT "pagos_adicional_id_adicionales_id_fk" 
FOREIGN KEY ("adicional_id") REFERENCES "public"."adicionales"("id") 
ON DELETE set null ON UPDATE no action;