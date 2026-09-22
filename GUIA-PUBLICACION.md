# Guía de publicación (100% gratis)

Objetivo: tener la app en internet, con base de datos central y sin costo hasta que empiece a facturar.

Servicios: **GitHub** (código y publicación con GitHub Pages) + **Supabase plan Free** (datos y cuentas).
Límites y precios cambian: verificar en github.com/pricing y supabase.com/pricing.

---

## Parte A. Supabase (base de datos)

1. Entrá a https://supabase.com y tocá **Start your project**.
2. Elegí **Continue with GitHub** y autorizá.
3. Creá una organización si te la pide (nombre libre, tipo *Personal*, plan **Free**).
4. **New project**:
   - Name: `maria-elena-wash`
   - Database password: tocá *Generate* o escribí una larga. **Guardala en un lugar seguro. No se la pases a nadie, ni a mí.**
   - Region: **South America (São Paulo)**
   - Plan: Free
5. Esperá 1-2 minutos a que se cree.
6. Menú izquierdo → **Project Settings** (engranaje) → **API** (o **Data API / API Keys**).
7. Copiá y pasame solo esto:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public key** (clave pública)
   - No copies la `service_role` / secret key.
8. Menú izquierdo → **Authentication → Providers**: dejá **Email** activado.
   (Recomendado: en **Authentication → Sign In / Providers → Email**, desactivar "Confirm email" durante el piloto para simplificar el registro, y reactivarlo después.)

Después de esto yo cargo las tablas (`supabase/schema.sql`) y conecto la app.

## Parte B. GitHub (código y publicación)

1. Entrá a https://github.com/new
2. Repository name: `maria-elena-wash`
3. Visibilidad: **Public** (GitHub Pages gratis lo requiere).
   - El código no contiene claves secretas. La *anon key* es pública por diseño; la seguridad la dan los permisos de Supabase.
4. No marques README ni .gitignore. **Create repository**.
5. Pasame tu **nombre de usuario de GitHub**. Yo dejo el código listo para subir y te doy los comandos.
6. Cuando esté subido: en el repositorio → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
7. La app queda en `https://TU-USUARIO.github.io/maria-elena-wash/`.

## Parte C. Mantener Supabase activo (importante)

El plan Free de Supabase **pausa el proyecto tras aproximadamente 7 días sin actividad**. Para evitarlo, usamos una tarea programada gratuita en GitHub que consulta la base de datos cada 3 días.

1. En el repo → **Settings → Secrets and variables → Actions → New repository secret**.
   - `SUPABASE_URL` = la Project URL
   - `SUPABASE_ANON_KEY` = la anon public key
2. El archivo `.github/workflows/keepalive.yml` ya está preparado en el proyecto.
3. Verificá en la pestaña **Actions** del repo que corre (podés lanzarlo a mano con *Run workflow*).

Advertencias:
- GitHub desactiva las tareas programadas si el repositorio pasa **60 días sin ningún cambio**. Si el repo está quieto, GitHub manda un aviso por mail: entrá y reactivá el workflow.
- Es un respaldo. Cuando haya reservas reales, la actividad propia lo mantiene activo.
- Si el proyecto llegara a pausarse: Supabase → tu proyecto → **Restore project**. Los datos no se pierden durante la pausa.

## Parte D. Pagos (Mercado Pago)

Fase 1 (gratis, sin backend): en el panel de la app → Ajustes → **Link de pago**. Creás un link en tu cuenta de Mercado Pago y lo pegás. El pago lo marcás a mano como "Pagado".
Fase 2 (cuando haya volumen): cobro automático con confirmación. Requiere una función en Supabase (Edge Functions, incluidas en el plan gratis dentro de sus límites) y credenciales de Mercado Pago. Se hace con vos, sin compartir claves por chat.

## Parte E. Cuándo pasar a pago

Señales para revisar planes:
- Supabase: base de datos cerca del límite del plan Free, o querés backups diarios y que nunca se pause.
- Dominio propio (ej. `mariaelenawash.com.ar`): NIC.ar cobra un arancel anual chico; no es obligatorio.
- WhatsApp Business API para avisos automáticos: tiene costo por mensaje; mientras tanto, los avisos son links a WhatsApp que abre el equipo.

## Lista de control

- [ ] Cuenta Supabase creada con GitHub
- [ ] Proyecto `maria-elena-wash` en São Paulo
- [ ] URL y anon key enviadas
- [ ] Repositorio público creado en GitHub
- [ ] Usuario de GitHub enviado
- [ ] Secrets cargados (Parte C)
- [ ] Pages activado con GitHub Actions
- [ ] Prueba de reserva desde el celular
