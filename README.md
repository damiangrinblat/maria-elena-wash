# Maria Elena Wash

Lavadero de autos móvil.

## Idea
Servicio de lavado de autos que va a barrios cerrados y country clubes, mientras el socio o propietario realiza sus actividades.

## Modelo operativo
- Conseguir varios barrios/clubes.
- Rotar por día: un día de trabajo en cada lugar.

## Entregables
1. Presentación del proyecto.
2. App para clientes: reservas, pagos y otras funciones.

## Decisiones tomadas
- País: Argentina.
- La app la desarrolla Claude.
- Barrios/clubes candidatos (zona Gran Buenos Aires sur/norte):
  - Club Círculo, en Canning.
  - Barrio cerrado en Escobar (sin nombre definido).
  - Barrio cerrado en San Vicente (sin nombre definido).
  - Abierto a cualquier otro.

## Estructura
- `app/` — PWA (React + Vite + TypeScript). Modo demo con datos en el navegador (localStorage).
- `supabase/schema.sql` — esquema de base de datos para producción (aún no conectado).
- `presentacion/Presentacion-Maria-Elena-Wash.html` — presentación del proyecto (abrir en el navegador; Ctrl+P para PDF).
- `presentacion/Presentacion-Administracion-Barrio.html` — presentación genérica para la administración de un barrio/club (completar nombre del barrio y contacto en las zonas amarillas).
- `DEFINICIONES.md` — notas de definición.

## Correr la app
Doble clic en `Abrir-App.bat` (en la raíz del proyecto). Manual:
Requiere Node.js (instalado con winget). En PowerShell:
`cd app; npm run dev` y abrir http://localhost:5173. Panel del equipo: `#/admin` (PIN inicial 1234). Acceso de cada barrio (solo lectura, PIN propio): `#/barrio`.

## Decisiones de la app
- Pagos: Mercado Pago, transferencia y efectivo; se puede pagar en el momento.
- Lugar fijo si el barrio lo provee; si no, en el domicilio del cliente (por barrio).
- Todo configurable desde el panel: barrios, días/horarios/cupos, servicios, precios, extras, cancelación, pagos, marca.
- Facturación: monotributo. Abonos: etapa futura.

## Pendiente de definir
Ver [DEFINICIONES.md](DEFINICIONES.md): nombre, servicios, precios, stack de la app y estructura de la presentación.
