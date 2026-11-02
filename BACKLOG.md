# Backlog – Brillo Móvil

## Estado (2026-11-02)
- La base de Supabase está **pausada** desde ~2026-10-03 (el keepalive anduvo hasta el 02/10 y desde el 03/10 falla porque el dominio del proyecto ya no existe: "Could not resolve host").
- Mientras esté pausada, la app de GitHub Pages abre pero no carga ni guarda datos (reservas, panel, barrio).
- **Fecha límite para restaurar: ~2027-01-01** (90 días desde la pausa). Después Supabase solo deja descargar los datos.
- Keepalive **deshabilitado a mano** el 2026-11-02 (estaba fallando todos los días).

## Cómo revivirla
1. supabase.com → Dashboard → proyecto → "Restore project" (tarda unos minutos).
2. GitHub → Actions → "Mantener Supabase activo" → "Enable workflow" → "Run workflow" y verificar que salga verde.
3. Abrir la app y probar reserva y panel.

## Necesitan datos o decisiones del usuario
1. PIN distinto para cada barrio.
2. Seguro de responsabilidad civil / accidentes personales antes de reunirse con barrios.
3. Precios con la competencia local, método de lavado (agua / sin agua), costos y punto de equilibrio.
4. Cuenta de Mercado Pago y datos de transferencia.

## Para cuando haya movimiento
5. Restaurar Supabase (antes del ~2027-01-01).
6. Migrar a Netlify/Vercel o dominio propio (sacar el usuario de la URL); renombrar repo a brillo-movil.
7. Cuentas reales (Supabase Auth) en vez de PIN.
8. Abonos mensuales.
