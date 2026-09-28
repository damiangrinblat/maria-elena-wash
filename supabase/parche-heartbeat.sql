-- Parche: agrega una tabla mínima para que el keepalive escriba en la base
-- (no solo lea), porque una simple lectura pública parece no contar como
-- "actividad" para el chequeo automático de Supabase que pausa proyectos.
-- Pegar y correr una sola vez en el SQL Editor.

create table if not exists heartbeat (
  id int primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);
insert into heartbeat (id, pinged_at) values (1, now())
  on conflict (id) do nothing;

alter table heartbeat enable row level security;
-- Nadie lee ni escribe la tabla directamente; solo a través de esta función.

create or replace function ping_heartbeat()
returns void language sql security definer as $$
  update heartbeat set pinged_at = now() where id = 1;
$$;
grant execute on function ping_heartbeat() to anon, authenticated;
