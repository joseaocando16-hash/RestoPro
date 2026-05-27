-- ============================================================
-- RestoPro v2 — Multi-restaurante + Roles
-- Ejecuta esto en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de restaurantes
create table if not exists restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  address     text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- 2. Perfiles de usuario (ligados a auth.users y a un restaurante)
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  restaurant_id  uuid references restaurants(id) on delete cascade,
  full_name      text,
  role           text not null default 'camarero'
                   check (role in ('owner','cajero','cocina','camarero')),
  created_at     timestamptz not null default now()
);

-- 3. Pedidos (ahora con restaurant_id)
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid references restaurants(id) on delete cascade,
  table_name     text not null,
  items          text[] not null default '{}',
  note           text,
  total          numeric not null default 0,
  status         text not null default 'pendiente'
                   check (status in ('pendiente','cocina','listo','entregado')),
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

-- 4. Inventario (ahora con restaurant_id)
create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid references restaurants(id) on delete cascade,
  name           text not null,
  category       text not null default 'Otro',
  stock          numeric not null default 0,
  min_stock      numeric not null default 0,
  updated_at     timestamptz not null default now()
);

-- 5. Row Level Security
alter table restaurants enable row level security;
alter table profiles    enable row level security;
alter table orders      enable row level security;
alter table inventory   enable row level security;

-- Restaurants: solo ves tu restaurante
create policy "Users see their restaurant"
  on restaurants for select
  using (id = (select restaurant_id from profiles where id = auth.uid()));

-- Profiles: solo ves tu perfil
create policy "Users see own profile"
  on profiles for select using (id = auth.uid());

create policy "Users update own profile"
  on profiles for update using (id = auth.uid());

-- Orders: solo ves pedidos de tu restaurante
create policy "Restaurant orders select"
  on orders for select
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant orders insert"
  on orders for insert
  with check (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant orders update"
  on orders for update
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

-- Inventory: solo ves inventario de tu restaurante
create policy "Restaurant inventory select"
  on inventory for select
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant inventory insert"
  on inventory for insert
  with check (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant inventory update"
  on inventory for update
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

-- ============================================================
-- DATOS DE EJEMPLO — 2 restaurantes distintos
-- ============================================================

-- Restaurante 1
insert into restaurants (id, name, slug, address) values
  ('11111111-0000-0000-0000-000000000001', 'La Parrilla del Norte', 'parrilla-norte', 'Av. Principal 123'),
  ('22222222-0000-0000-0000-000000000002', 'Mariscos El Puerto', 'mariscos-puerto', 'Blvd. Costero 456');

-- Inventario restaurante 1
insert into inventory (restaurant_id, name, category, stock, min_stock) values
  ('11111111-0000-0000-0000-000000000001', 'Carne de res',     'Carne',   8,  15),
  ('11111111-0000-0000-0000-000000000001', 'Pollo',            'Carne',   22, 10),
  ('11111111-0000-0000-0000-000000000001', 'Tomate',           'Verdura', 3,  10),
  ('11111111-0000-0000-0000-000000000001', 'Lechuga',          'Verdura', 12, 8),
  ('11111111-0000-0000-0000-000000000001', 'Cerveza',          'Bebida',  48, 24),
  ('11111111-0000-0000-0000-000000000001', 'Refresco',         'Bebida',  2,  12);

-- Inventario restaurante 2
insert into inventory (restaurant_id, name, category, stock, min_stock) values
  ('22222222-0000-0000-0000-000000000002', 'Camarón',          'Mariscos', 5,  10),
  ('22222222-0000-0000-0000-000000000002', 'Filete de pescado','Mariscos', 12, 8),
  ('22222222-0000-0000-0000-000000000002', 'Limón',            'Verdura',  30, 20),
  ('22222222-0000-0000-0000-000000000002', 'Cerveza',          'Bebida',   60, 24);

-- NOTA: Los usuarios se crean en Supabase > Authentication > Users
-- Luego se insertan sus perfiles así:
-- insert into profiles (id, restaurant_id, full_name, role) values
--   ('UUID-DEL-USUARIO', '11111111-0000-0000-0000-000000000001', 'Juan Pérez', 'owner');
