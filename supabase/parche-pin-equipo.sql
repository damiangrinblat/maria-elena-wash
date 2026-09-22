-- Parche: el PIN del equipo estaba quedando expuesto en el catálogo público
-- porque las funciones lo buscaban en el lugar equivocado del dato.
-- Pegar y correr esto una sola vez en el SQL Editor (no hace falta tocar las tablas).

create or replace function get_catalog()
returns jsonb language sql security definer as $$
  select jsonb_set(data, '{settings,adminPin}', '""'::jsonb) || jsonb_build_object(
    'sites', coalesce((
      select jsonb_agg(site - 'sitePin') from jsonb_array_elements(data->'sites') site
    ), '[]'::jsonb)
  )
  from catalog where id = 1;
$$;

create or replace function get_full_catalog(p_pin text)
returns jsonb language plpgsql security definer as $$
declare v_data jsonb;
begin
  select data into v_data from catalog where id = 1;
  if v_data->'settings'->>'adminPin' = p_pin then return v_data; end if;
  return null;
end; $$;

create or replace function save_catalog(p_pin text, p_data jsonb)
returns boolean language plpgsql security definer as $$
declare v_current jsonb;
begin
  select data into v_current from catalog where id = 1;
  if v_current->'settings'->>'adminPin' <> p_pin then return false; end if;
  update catalog set data = p_data where id = 1;
  return true;
end; $$;

create or replace function get_admin_bookings(p_pin text)
returns setof bookings language plpgsql security definer as $$
begin
  if (select data->'settings'->>'adminPin' from catalog where id = 1) <> p_pin then return; end if;
  return query select * from bookings order by date, time;
end; $$;

create or replace function set_booking_status(p_pin text, p_id uuid, p_status text)
returns boolean language plpgsql security definer as $$
begin
  if (select data->'settings'->>'adminPin' from catalog where id = 1) <> p_pin then return false; end if;
  update bookings set status = p_status where id = p_id;
  return true;
end; $$;

create or replace function set_booking_paid(p_pin text, p_id uuid, p_paid boolean)
returns boolean language plpgsql security definer as $$
begin
  if (select data->'settings'->>'adminPin' from catalog where id = 1) <> p_pin then return false; end if;
  update bookings set paid = p_paid where id = p_id;
  return true;
end; $$;
