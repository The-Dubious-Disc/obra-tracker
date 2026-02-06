-- 0002_upgrade_from_supabase.sql
-- Upgrade from legacy Supabase schema.sql to current Neon schema

create extension if not exists "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'constructor', 'cliente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios (new)
create table if not exists public.usuarios (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  nombre text not null,
  rol user_role default 'cliente',
  created_at timestamp with time zone default now()
);

-- Proyectos: add new columns
alter table public.proyectos
  add column if not exists descripcion text,
  add column if not exists sistema_constructivo text,
  add column if not exists presupuesto_total_usd numeric(12,2) not null default 0,
  add column if not exists monto_total_activo numeric(12,2) not null default 0,
  add column if not exists cliente_id uuid,
  add column if not exists constructor_id uuid;

-- Ensure monto_total_activo exists (legacy already had it, but keep safe)
-- Foreign keys
DO $$ BEGIN
  ALTER TABLE public.proyectos
    ADD CONSTRAINT proyectos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.usuarios(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.proyectos
    ADD CONSTRAINT proyectos_constructor_id_fkey FOREIGN KEY (constructor_id) REFERENCES public.usuarios(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Etapas: rename porcentaje_peso -> porcentaje_total, monto_etapa -> monto_usd
alter table public.etapas
  add column if not exists porcentaje_total numeric(5,2),
  add column if not exists monto_usd numeric(12,2);

update public.etapas
  set porcentaje_total = coalesce(porcentaje_total, porcentaje_peso),
      monto_usd = coalesce(monto_usd, monto_etapa);

alter table public.etapas
  alter column porcentaje_total set not null,
  alter column monto_usd set not null;

-- Pagos: add proyecto_id, moneda, comentario, registrado_por
alter table public.pagos
  add column if not exists proyecto_id uuid,
  add column if not exists moneda text not null default 'USD',
  add column if not exists comentario text,
  add column if not exists registrado_por uuid;

-- Backfill proyecto_id from etapa
update public.pagos p
  set proyecto_id = e.proyecto_id
  from public.etapas e
  where p.etapa_id = e.id and p.proyecto_id is null;

DO $$ BEGIN
  ALTER TABLE public.pagos
    ADD CONSTRAINT pagos_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pagos
    ADD CONSTRAINT pagos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Planos: new table
create table if not exists public.planos (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id) on delete cascade not null,
  nombre text not null,
  descripcion text,
  url text not null,
  tipo text not null,
  orden int default 0,
  uploaded_by uuid references public.usuarios(id),
  created_at timestamp with time zone default now()
);

-- Anotaciones: migrate from proyecto_id/plano_url to plano_id
alter table public.anotaciones_planos
  add column if not exists plano_id uuid,
  add column if not exists creado_por uuid;

-- No automatic backfill for plano_id (needs manual mapping)
-- Optional: keep legacy columns for now
