-- ============================================================
-- RestoPro v3 — Menú gestionable + Super-admin
-- Ejecuta esto en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de items del menú
create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name          text not null,
  price         numeric not null default 0,
  category      text not null default 'Platos',
  description   text,
  image_url     text,
  available     boolean not null default true,
  sort_order    integer default 0,
  created_at    timestamptz not null default now()
);

-- 2. Modificadores del menú
create table if not exists menu_modifiers (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  name         text not null,
  type         text not null default 'toggle' check (type in ('toggle','select')),
  options      text[],
  default_val  text,
  sort_order   integer default 0
);

-- 3. RLS para menu_items
alter table menu_items enable row level security;
alter table menu_modifiers enable row level security;

create policy "Restaurant menu select"
  on menu_items for select
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant menu insert"
  on menu_items for insert
  with check (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant menu update"
  on menu_items for update
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Restaurant menu delete"
  on menu_items for delete
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));

create policy "Menu modifiers select"
  on menu_modifiers for select
  using (menu_item_id in (
    select id from menu_items where restaurant_id = (
      select restaurant_id from profiles where id = auth.uid()
    )
  ));

create policy "Menu modifiers insert"
  on menu_modifiers for insert
  with check (menu_item_id in (
    select id from menu_items where restaurant_id = (
      select restaurant_id from profiles where id = auth.uid()
    )
  ));

create policy "Menu modifiers update"
  on menu_modifiers for update
  using (menu_item_id in (
    select id from menu_items where restaurant_id = (
      select restaurant_id from profiles where id = auth.uid()
    )
  ));

create policy "Menu modifiers delete"
  on menu_modifiers for delete
  using (menu_item_id in (
    select id from menu_items where restaurant_id = (
      select restaurant_id from profiles where id = auth.uid()
    )
  ));

-- 4. Super admin flag en profiles
alter table profiles add column if not exists is_super_admin boolean default false;

-- 5. Datos de ejemplo para restaurante 1
insert into menu_items (restaurant_id, name, price, category, description) values
  ('11111111-0000-0000-0000-000000000001', 'Tacos al pastor', 85, 'Platos', 'Deliciosos tacos con carne al pastor'),
  ('11111111-0000-0000-0000-000000000001', 'Hamburguesa clásica', 145, 'Platos', 'Hamburguesa con todos los ingredientes'),
  ('11111111-0000-0000-0000-000000000001', 'Pizza personal', 130, 'Platos', 'Pizza individual al gusto'),
  ('11111111-0000-0000-0000-000000000001', 'Ensalada César', 95, 'Platos', 'Ensalada fresca con aderezo césar'),
  ('11111111-0000-0000-0000-000000000001', 'Pasta alfredo', 165, 'Platos', 'Pasta con salsa alfredo cremosa'),
  ('11111111-0000-0000-0000-000000000001', 'Agua fresca', 35, 'Bebidas', 'Agua fresca del día'),
  ('11111111-0000-0000-0000-000000000001', 'Cerveza', 65, 'Bebidas', 'Cerveza fría'),
  ('11111111-0000-0000-0000-000000000001', 'Refresco', 30, 'Bebidas', 'Refresco en lata')
on conflict do nothing;

-- Fix inventory delete policy
create policy "Restaurant inventory delete"
  on inventory for delete
  using (restaurant_id = (select restaurant_id from profiles where id = auth.uid()));
