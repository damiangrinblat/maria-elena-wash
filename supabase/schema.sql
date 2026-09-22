-- Maria Elena Wash — esquema para Supabase (plan gratuito).
-- Pegar completo en: Supabase → SQL Editor → New query → Run.
--
-- Diseño para esta etapa (sin cuentas de usuario todavía):
--   - "catalog": una fila con toda la configuración (marca, servicios, precios, barrios, etc.)
--     en una columna jsonb. Los PIN (del equipo y de cada barrio) viven ahí adentro pero
--     nunca se devuelven tal cual: las funciones de lectura los quitan antes de responder.
--   - "bookings": una fila por turno. Nadie puede leerla ni editarla directamente por HTTP;
--     todo pasa por funciones (RPC) que primero validan el PIN o el teléfono del cliente.
--     Así, aunque la clave pública de la app quede visible en el navegador (es normal y
--     esperado), no se puede listar turnos ni datos de clientes sin ese PIN o teléfono.
--   - Es un nivel de seguridad razonable para el piloto. Antes de manejar más volumen o
--     datos más sensibles, lo ideal es sumar cuentas reales (Supabase Auth) por barrio y
--     por integrante del equipo.

create extension if not exists pgcrypto;

-- 1) Catálogo -----------------------------------------------------------

create table catalog (
  id int primary key default 1 check (id = 1),
  data jsonb not null
);

alter table catalog enable row level security;
-- Nadie lee ni escribe la tabla directamente: todo pasa por las funciones de abajo.

-- 2) Turnos ---------------------------------------------------------------

create table bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  time text not null,
  site_id text not null,
  service_id text not null,
  category_id text not null,
  extra_ids text[] not null default '{}',
  total numeric not null,
  pay_method text not null check (pay_method in ('mp','transfer','cash')),
  paid boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_progress','done','cancelled')),
  customer_name text not null,
  customer_phone text not null,
  plate text not null,
  vehicle text default '',
  address text default '',
  notes text default '',
  rating int check (rating between 1 and 5)
);
create index bookings_site_date_idx on bookings (site_id, date, time);
create index bookings_phone_idx on bookings (customer_phone);

alter table bookings enable row level security;

-- Un cliente puede crear su propio turno directamente (no expone datos de otros).
create policy "crear turno" on bookings for insert with check (true);

-- 3) Vista pública de ocupación (sin datos personales) ---------------------
-- Necesaria para que la app muestre cupos disponibles sin exponer la tabla completa.

create view public_slots as
  select site_id, date, time, status
  from bookings
  where status <> 'cancelled';

grant select on public_slots to anon, authenticated;

-- 4) Funciones ---------------------------------------------------------------

-- Catálogo sin datos sensibles (PIN del equipo y de cada barrio), para la app cliente.
create or replace function get_catalog()
returns jsonb language sql security definer as $$
  select jsonb_set(
    data,
    '{settings,adminPin}',
    '""'::jsonb
  ) || jsonb_build_object(
    'sites', coalesce((
      select jsonb_agg(site - 'sitePin') from jsonb_array_elements(data->'sites') site
    ), '[]'::jsonb)
  )
  from catalog where id = 1;
$$;
grant execute on function get_catalog() to anon, authenticated;

-- Catálogo completo (con PIN) para el panel del equipo, si el PIN coincide.
create or replace function get_full_catalog(p_pin text)
returns jsonb language plpgsql security definer as $$
declare v_data jsonb;
begin
  select data into v_data from catalog where id = 1;
  if v_data->'settings'->>'adminPin' = p_pin then return v_data; end if;
  return null;
end; $$;
grant execute on function get_full_catalog(text) to anon, authenticated;

-- Guarda el catálogo completo (el panel siempre manda el PIN vigente en los datos).
create or replace function save_catalog(p_pin text, p_data jsonb)
returns boolean language plpgsql security definer as $$
declare v_current jsonb;
begin
  select data into v_current from catalog where id = 1;
  if v_current->'settings'->>'adminPin' <> p_pin then return false; end if;
  update catalog set data = p_data where id = 1;
  return true;
end; $$;
grant execute on function save_catalog(text, jsonb) to anon, authenticated;

-- Turnos para el panel del equipo.
create or replace function get_admin_bookings(p_pin text)
returns setof bookings language plpgsql security definer as $$
begin
  if (select data->'settings'->>'adminPin' from catalog where id = 1) <> p_pin then return; end if;
  return query select * from bookings order by date, time;
end; $$;
grant execute on function get_admin_bookings(text) to anon, authenticated;

create or replace function set_booking_status(p_pin text, p_id uuid, p_status text)
returns boolean language plpgsql security definer as $$
begin
  if (select data->'settings'->>'adminPin' from catalog where id = 1) <> p_pin then return false; end if;
  update bookings set status = p_status where id = p_id;
  return true;
end; $$;
grant execute on function set_booking_status(text, uuid, text) to anon, authenticated;

create or replace function set_booking_paid(p_pin text, p_id uuid, p_paid boolean)
returns boolean language plpgsql security definer as $$
begin
  if (select data->'settings'->>'adminPin' from catalog where id = 1) <> p_pin then return false; end if;
  update bookings set paid = p_paid where id = p_id;
  return true;
end; $$;
grant execute on function set_booking_paid(text, uuid, boolean) to anon, authenticated;

-- Turnos del cliente, por teléfono (mismo criterio que ya usaba la app).
create or replace function bookings_by_phone(p_phone text)
returns setof bookings language sql security definer as $$
  select * from bookings
  where regexp_replace(customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  order by date desc, time desc;
$$;
grant execute on function bookings_by_phone(text) to anon, authenticated;

create or replace function cancel_booking(p_id uuid, p_phone text)
returns boolean language plpgsql security definer as $$
begin
  update bookings set status = 'cancelled'
    where id = p_id
      and regexp_replace(customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
  return found;
end; $$;
grant execute on function cancel_booking(uuid, text) to anon, authenticated;

create or replace function rate_booking(p_id uuid, p_phone text, p_rating int)
returns boolean language plpgsql security definer as $$
begin
  update bookings set rating = p_rating
    where id = p_id
      and regexp_replace(customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
  return found;
end; $$;
grant execute on function rate_booking(uuid, text, int) to anon, authenticated;

-- Reporte para la administración de UN barrio, según su propio PIN. Sin datos personales.
create or replace function get_site_report(p_pin text, p_from date, p_to date)
returns jsonb language plpgsql security definer as $$
declare v_site jsonb; v_rows jsonb;
begin
  select site into v_site from catalog c, jsonb_array_elements(c.data->'sites') site
    where c.id = 1 and site->>'sitePin' = p_pin and p_pin <> '';
  if v_site is null then return null; end if;

  select jsonb_agg(jsonb_build_object(
      'date', b.date, 'time', b.time, 'serviceId', b.service_id, 'total', b.total, 'paid', b.paid
    ) order by b.date, b.time)
    into v_rows
    from bookings b
    where b.site_id = v_site->>'id' and b.status = 'done' and b.date between p_from and p_to;

  return jsonb_build_object(
    'site', v_site - 'sitePin',
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end; $$;
grant execute on function get_site_report(text, date, date) to anon, authenticated;

-- 5) Datos iniciales -----------------------------------------------------
-- Mismo contenido que app/src/seed.ts. Si ya cargaste datos desde el panel, no vuelvas a correr esto.

insert into catalog (id, data) values (1, '{
  "settings": {
    "businessName": "Maria Elena Wash",
    "tagline": "Tu auto limpio mientras disfrutás tu día",
    "primaryColor": "#0e7490",
    "whatsapp": "",
    "adminPin": "1234",
    "cancelHours": 12,
    "bookingHorizonDays": 28,
    "minAdvanceHours": 12,
    "payMethods": {"mp": true, "transfer": true, "cash": true},
    "mpLink": "",
    "transferAlias": "",
    "transferCbu": "",
    "transferHolder": "",
    "cashNote": "Podés pagar en efectivo en el momento del servicio.",
    "promoText": "Primer lavado con 10% de descuento consultando por WhatsApp.",
    "waTemplate": "Hola {nombre}, te escribimos de Maria Elena Wash por tu turno de {servicio} el {fecha} a las {hora} en {barrio}.",
    "terms": "Si llueve reprogramamos sin cargo. Cancelaciones sin costo hasta el plazo indicado; pasado ese plazo puede cobrarse el turno."
  },
  "services": [
    {"id": "ext", "name": "Lavado exterior", "description": "Carrocería, llantas, vidrios y secado.", "minutes": 30, "active": true},
    {"id": "int", "name": "Lavado interior", "description": "Aspirado, tablero, paneles y vidrios interiores.", "minutes": 40, "active": true},
    {"id": "full", "name": "Lavado completo", "description": "Exterior + interior. El más elegido.", "minutes": 60, "active": true},
    {"id": "prem", "name": "Premium", "description": "Completo + cera protectora y tratamiento de gomas y plásticos.", "minutes": 90, "active": true}
  ],
  "categories": [
    {"id": "small", "name": "Auto chico / mediano", "active": true},
    {"id": "suv", "name": "SUV / Pick-up", "active": true}
  ],
  "extras": [
    {"id": "perfume", "name": "Perfume", "price": 2000, "active": true},
    {"id": "pets", "name": "Pelos de mascota", "price": 6000, "active": true},
    {"id": "trunk", "name": "Limpieza de baúl", "price": 4000, "active": true},
    {"id": "engine", "name": "Lavado de motor", "price": 12000, "active": true}
  ],
  "prices": {
    "ext:small": 13000, "ext:suv": 19500,
    "int:small": 16500, "int:suv": 24500,
    "full:small": 24500, "full:suv": 37000,
    "prem:small": 35000, "prem:suv": 50000
  },
  "sites": [
    {"id": "site-circulo", "name": "Club Círculo (Canning)", "zone": "Sur", "mode": "fixed",
     "spotNote": "Playa de estacionamiento del club, sector a confirmar con la administración.",
     "days": [2], "start": "09:00", "end": "17:00", "slotMinutes": 60, "perSlot": 2, "active": true,
     "commissionType": "none", "commissionValue": 0, "sitePin": "", "clientNotice": "", "siteNotice": ""},
    {"id": "site-escobar", "name": "Barrio cerrado en Escobar", "zone": "Norte", "mode": "home",
     "spotNote": "Se lava en la cochera o frente de la casa del cliente.",
     "days": [4], "start": "09:00", "end": "17:00", "slotMinutes": 60, "perSlot": 2, "active": true,
     "commissionType": "none", "commissionValue": 0, "sitePin": "", "clientNotice": "", "siteNotice": ""},
    {"id": "site-sanvicente", "name": "Barrio cerrado en San Vicente", "zone": "Sur", "mode": "fixed",
     "spotNote": "Lugar fijo dentro del barrio, a confirmar con la administración.",
     "days": [5], "start": "09:00", "end": "17:00", "slotMinutes": 60, "perSlot": 2, "active": true,
     "commissionType": "none", "commissionValue": 0, "sitePin": "", "clientNotice": "", "siteNotice": ""}
  ],
  "closedDates": []
}'::jsonb);
