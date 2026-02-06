-- 0001_init.sql
-- Full initial schema for Neon

create extension if not exists "uuid-ossp";

create type tarea_estado as enum ('pendiente', 'en_progreso', 'completada');
create type pago_estado as enum ('pendiente', 'confirmado');
create type user_role as enum ('admin', 'constructor', 'cliente');

create table if not exists public.usuarios (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  nombre text not null,
  rol user_role default 'cliente',
  created_at timestamp with time zone default now()
);

create table if not exists public.proyectos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  descripcion text,
  sistema_constructivo text,
  presupuesto_total_usd numeric(12,2) not null default 0,
  monto_total_activo numeric(12,2) not null default 0,
  moneda text not null default 'USD',
  cliente_id uuid references public.usuarios(id),
  constructor_id uuid references public.usuarios(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.presupuesto_versiones (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id) on delete cascade not null,
  monto numeric(12,2) not null,
  notas_cambio text not null,
  es_activa boolean default false,
  fecha_creacion timestamp with time zone default now()
);

create table if not exists public.etapas (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id) on delete cascade not null,
  orden int not null,
  nombre text not null,
  porcentaje_total numeric(5,2) not null,
  monto_usd numeric(12,2) not null,
  duracion_estimada_jornales int,
  hito_verificacion text,
  created_at timestamp with time zone default now()
);

create table if not exists public.tareas (
  id uuid primary key default uuid_generate_v4(),
  etapa_id uuid references public.etapas(id) on delete cascade not null,
  descripcion text not null,
  estado tarea_estado default 'pendiente',
  fecha_finalizacion timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.pagos (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id) on delete cascade not null,
  etapa_id uuid references public.etapas(id) on delete set null,
  monto_pagado numeric(12,2) not null,
  moneda text not null default 'USD',
  fecha_pago date not null default current_date,
  comentario text,
  comprobante_url text,
  registrado_por uuid references public.usuarios(id),
  estado pago_estado default 'pendiente',
  created_at timestamp with time zone default now()
);

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

create table if not exists public.anotaciones_planos (
  id uuid primary key default uuid_generate_v4(),
  plano_id uuid references public.planos(id) on delete cascade not null,
  coord_x float not null,
  coord_y float not null,
  comentario text not null,
  creado_por uuid references public.usuarios(id),
  created_at timestamp with time zone default now()
);
