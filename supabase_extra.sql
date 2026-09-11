-- ═══════════════════════════════════════════════════════════════
-- KYBERA — DATABASE EXTRA (ejecutar ENTERO una sola vez)
-- Dónde: Supabase Dashboard → SQL Editor → New query → Run
-- Crea: order_status_history, customer_profiles, reviews, contact_messages
-- Más el seed de las 10 reseñas que ya usa la capa 4.
-- ═══════════════════════════════════════════════════════════════

-- ── 1) ORDER STATUS HISTORY (auditoría / timeline real del pedido) ──
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  changed_at timestamptz not null default now()
);

alter table public.order_status_history enable row level security;
create policy "anon insert history" on public.order_status_history for insert to anon with check (true);
create policy "anon select history" on public.order_status_history for select to anon using (true);
create policy "anon update history" on public.order_status_history for update to anon using (true) with check (true);
create policy "anon delete history" on public.order_status_history for delete to anon using (true);

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
create policy "anon insert profiles" on public.customer_profiles for insert to anon with check (true);
create policy "anon select profiles" on public.customer_profiles for select to anon using (true);
create policy "anon update profiles" on public.customer_profiles for update to anon using (true) with check (true);
create policy "anon delete profiles" on public.customer_profiles for delete to anon using (true);

-- ── 3) REVIEWS (reseñas de clientes, mostra/oculta desde admin) ──
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
create policy "anon insert reviews" on public.reviews for insert to anon with check (true);
create policy "anon select reviews" on public.reviews for select to anon using (true);
create policy "anon update reviews" on public.reviews for update to anon using (true) with check (true);
create policy "anon delete reviews" on public.reviews for delete to anon using (true);

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
create policy "anon insert messages" on public.contact_messages for insert to anon with check (true);
create policy "anon select messages" on public.contact_messages for select to anon using (true);
create policy "anon update messages" on public.contact_messages for update to anon using (true) with check (true);
create policy "anon delete messages" on public.contact_messages for delete to anon using (true);

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