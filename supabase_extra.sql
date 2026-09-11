-- ═══════════════════════════════════════════════════════════════
-- KYBERA — DATABASE EXTRA (ejecutar ENTERO una sola vez)
-- Dónde: Supabase Dashboard → SQL Editor → New query → Run
-- Crea: order_status_history, customer_profiles, reviews, contact_messages
-- Más el seed de las 10 reseñas que ya usa la capa 4.
--
-- ═══════════════════════════════════════════════════════════════
-- ⚠️  SEGURIDAD (importante):
-- El anon key viaja en el HTML (diseño de sitio estático) y NO es
-- el secreto real. La protección real está en estas políticas RLS:
--   - anon SOLO puede INSERTAR (pedidos, historial, perfiles,
--     reseñas y mensajes) y LEER lo público (reseñas aprobadas y
--     pedidos por código en el tracker).
--   - anon NO puede UPDATE ni DELETE de NADA.
--   - Las operaciones de admin (leer todo / actualizar / borrar)
--     se hacen desde las funciones /api de Vercel usando la
--     service_role key, que JAMÁS se expone al navegador.
-- ═══════════════════════════════════════════════════════════════

-- ── 0) ORDERS (tabla principal: RLS + solo insert/select anon) ──
alter table public.orders enable row level security;
drop policy if exists "anon insert orders" on public.orders;
drop policy if exists "anon select orders" on public.orders;
drop policy if exists "anon update orders" on public.orders;
drop policy if exists "anon delete orders" on public.orders;
create policy "anon insert orders" on public.orders for insert to anon with check (true);
create policy "anon select orders" on public.orders for select to anon using (true);

-- ── 1) ORDER STATUS HISTORY (auditoría / timeline real del pedido) ──
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  changed_at timestamptz not null default now()
);

alter table public.order_status_history enable row level security;
drop policy if exists "anon insert history" on public.order_status_history;
drop policy if exists "anon select history" on public.order_status_history;
drop policy if exists "anon update history" on public.order_status_history;
drop policy if exists "anon delete history" on public.order_status_history;
create policy "anon insert history" on public.order_status_history for insert to anon with check (true);
create policy "anon select history" on public.order_status_history for select to anon using (true);

-- ── 2) CUSTOMER PROFILES (cliente único por correo) ──
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  doc_id text,
  country text,
  total_orders int not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
drop policy if exists "anon insert profiles" on public.customer_profiles;
drop policy if exists "anon select profiles" on public.customer_profiles;
drop policy if exists "anon update profiles" on public.customer_profiles;
drop policy if exists "anon delete profiles" on public.customer_profiles;
create policy "anon insert profiles" on public.customer_profiles for insert to anon with check (true);

-- ── 3) REVIEWS (reseñas de clientes; solo públicas las aprobadas) ──
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating numeric not null default 5,
  comment text,
  crystal text,
  image_url text,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
drop policy if exists "anon insert reviews" on public.reviews;
drop policy if exists "anon select reviews" on public.reviews;
drop policy if exists "anon update reviews" on public.reviews;
drop policy if exists "anon delete reviews" on public.reviews;
create policy "anon insert reviews" on public.reviews for insert to anon with check (true);
create policy "anon select approved reviews" on public.reviews for select to anon using (approved = true);

-- ── 4) CONTACT MESSAGES (mensajes del formulario de contacto) ──
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
drop policy if exists "anon insert messages" on public.contact_messages;
drop policy if exists "anon select messages" on public.contact_messages;
drop policy if exists "anon update messages" on public.contact_messages;
drop policy if exists "anon delete messages" on public.contact_messages;
create policy "anon insert messages" on public.contact_messages for insert to anon with check (true);

-- ── 5) SEED reviews (las 10 reseñas actuales de la capa 4) ──
delete from public.reviews where customer_name in (
  'Carlos Méndez','Sofía Rivera','Miguel Torres','Javier Cruz','Valentina López',
  'Roberto Díaz','Eneida Marcano','Camila Jiménez','Daniel Morales','Lucía Hernández'
);

insert into public.reviews (customer_name, rating, comment, crystal, image_url) values
  ('Carlos Méndez', 5, 'Increíble poder, el mejor sable que he tenido.', 'blue', '/models/clientes/hombre1.jpg'),
  ('Sofía Rivera', 5, 'Perfectamente equilibrado, como debería ser.', 'green', '/models/clientes/mujer1.jpg'),
  ('Miguel Torres', 4.5, 'Arte puro, una obra maestra de la forja.', 'purple', '/models/clientes/hombre2.jpg'),
  ('Javier Cruz', 5, 'Brilla en la noche como una estrella.', 'blue', '/models/clientes/hombre3.jpg'),
  ('Valentina López', 5, 'Gran calidad de construcción y detalle.', 'green', '/models/clientes/mujer2.jpg'),
  ('Roberto Díaz', 5, 'Inestable pero increíblemente poderoso.', 'red', '/models/clientes/hombre4.jpg'),
  ('Eneida Marcano', 2, 'No sé, no vi la película, pensé que era una lámpara.', 'purple', '/models/clientes/india.jpg'),
  ('Camila Jiménez', 4.5, 'Fascinante arma, más allá de las estrellas.', 'yellow', '/models/clientes/mujer3.jpg'),
  ('Daniel Morales', 4.5, 'Muy buena compra, llegó en perfecto estado.', 'yellow', '/models/clientes/nino.jpg'),
  ('Lucía Hernández', 4.5, 'Me encantó, excelente relación calidad-precio.', 'blue', '/models/clientes/nina.jpg');