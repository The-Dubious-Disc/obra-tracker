-- 🏗️ ConstructTrack Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Proyectos
create table public.proyectos (
    id uuid primary key default uuid_generate_v4(),
    nombre text not null,
    monto_total_activo decimal(12,2) not null default 0,
    moneda text not null default 'USD',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 2. Versiones de Presupuesto
create table public.presupuesto_versiones (
    id uuid primary key default uuid_generate_v4(),
    proyecto_id uuid references public.proyectos(id) on delete cascade not null,
    monto decimal(12,2) not null,
    notas_cambio text not null,
    es_activa boolean default false,
    fecha_creacion timestamp with time zone default now()
);

-- 3. Etapas (Fases del contrato)
create table public.etapas (
    id uuid primary key default uuid_generate_v4(),
    proyecto_id uuid references public.proyectos(id) on delete cascade not null,
    orden int not null,
    nombre text not null,
    porcentaje_peso decimal(5,2) not null check (porcentaje_peso <= 100),
    monto_etapa decimal(12,2) not null,
    duracion_estimada_jornales int,
    hito_verificacion text,
    created_at timestamp with time zone default now()
);

-- 4. Tareas (Diario de obra)
create type tarea_estado as enum ('pendiente', 'en_progreso', 'completada');

create table public.tareas (
    id uuid primary key default uuid_generate_v4(),
    etapa_id uuid references public.etapas(id) on delete cascade not null,
    descripcion text not null,
    estado tarea_estado default 'pendiente',
    fecha_finalizacion timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- 5. Pagos
create type pago_estado as enum ('pendiente', 'confirmado');

create table public.pagos (
    id uuid primary key default uuid_generate_v4(),
    etapa_id uuid references public.etapas(id) on delete set null,
    monto_pagado decimal(12,2) not null,
    fecha_pago date not null default current_date,
    comprobante_url text,
    estado pago_estado default 'pendiente',
    created_at timestamp with time zone default now()
);

-- 6. Anotaciones en Planos
create table public.anotaciones_planos (
    id uuid primary key default uuid_generate_v4(),
    proyecto_id uuid references public.proyectos(id) on delete cascade not null,
    plano_url text not null,
    coord_x float not null,
    coord_y float not null,
    comentario text not null,
    creado_por uuid references auth.users(id) not null,
    created_at timestamp with time zone default now()
);

-- RLS Policies (Row Level Security) - Basic Setup
alter table public.proyectos enable row level security;
alter table public.presupuesto_versiones enable row level security;
alter table public.etapas enable row level security;
alter table public.tareas enable row level security;
alter table public.pagos enable row level security;
alter table public.anotaciones_planos enable row level security;

-- Policy: Allow authenticated users to view all data (for MVP)
create policy "Allow read access for authenticated users" on public.proyectos for select to authenticated using (true);
create policy "Allow read access for authenticated users" on public.presupuesto_versiones for select to authenticated using (true);
create policy "Allow read access for authenticated users" on public.etapas for select to authenticated using (true);
create policy "Allow read access for authenticated users" on public.tareas for select to authenticated using (true);
create policy "Allow read access for authenticated users" on public.pagos for select to authenticated using (true);
create policy "Allow read access for authenticated users" on public.anotaciones_planos for select to authenticated using (true);
