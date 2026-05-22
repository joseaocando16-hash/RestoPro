-- ============================================================
-- RestoPro — SQL para ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de pedidos
create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  items       text[] not null default '{}',
  note        text,
  total       numeric not null default 0,
  status      text not null default 'pendiente'
                check (status in ('pendiente','cocina','listo','entregado')),
  created_at  timestamptz not null default now()
);

-- 2. Tabla de inventario
create table if not exists inventory (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'Otro',
  stock       numeric not null default 0,
  min_stock   numeric not null default 0,
  updated_at  timestamptz not null default now()
);

-- 3. Row Level Security — solo usuarios autenticados pueden acceder
alter table orders    enable row level security;
alter table inventory enable row level security;

create policy "Auth users can read orders"
  on orders for select using (auth.role() = 'authenticated');

create policy "Auth users can insert orders"
  on orders for insert with check (auth.role() = 'authenticated');

create policy "Auth users can update orders"
  on orders for update using (auth.role() = 'authenticated');

create policy "Auth users can read inventory"
  on inventory for select using (auth.role() = 'authenticated');

create policy "Auth users can insert inventory"
  on inventory for insert with check (auth.role() = 'authenticated');

create policy "Auth users can update inventory"
  on inventory for update using (auth.role() = 'authenticated');

-- 4. Datos de ejemplo (opcional)
insert into inventory (name, category, stock, min_stock) values
  ('Carne de res',      'Carne',   8,  15),
  ('Pollo',             'Carne',   22, 10),
  ('Tomate',            'Verdura', 3,  10),
  ('Lechuga',           'Verdura', 12, 8),
  ('Queso mozzarella',  'Lácteo',  5,  8),
  ('Cerveza Clara',     'Bebida',  48, 24),
  ('Refresco',          'Bebida',  2,  12),
  ('Harina',            'Otro',    15, 10);
