# Definiciones – Maria Elena Wash

> Borrador de trabajo. Todo es propuesta a validar. Los precios son referenciales: hay que relevar el mercado local antes de fijarlos.

## 1. Nombre y marca
El nombre de trabajo es "Maria Elena Wash". Puntos a decidir:
- ¿Se mantiene o se busca un nombre más comercial? Ideas: "Wash a Domicilio", "LavaClub", "Country Wash", "Wash&Go".
- Verificar disponibilidad: nombre en INPI (marca), dominio (.com.ar / .com), usuario en Instagram/WhatsApp, y nombre en Google Maps.
- Identidad: logo, paleta de colores, tono (premium y confiable vs. cercano), uniforme del equipo, cartelería y conos para el punto de trabajo.
- Slogan posible: "Tu auto limpio mientras vos disfrutás tu día".

## 2. Servicios (propuesta)
| Servicio | Incluye | Tiempo est. |
|---|---|---|
| Lavado exterior | Carrocería, llantas, vidrios exteriores | 20-30 min |
| Lavado completo | Exterior + aspirado + tablero + vidrios interiores | 45-60 min |
| Premium | Completo + cera/sellador + siliconado de gomas y plásticos | 75-90 min |
| Detailing (opcional) | Pulido, limpieza de tapizados, motor, tratamiento de cuero | Por turno aparte |

Extras: perfume, limpieza de baúl, pelos de mascota, limpieza de motor, encerado.
Modalidades: lavado suelto y **abono mensual** (ej. 2, 4 u 8 lavados por mes).
Tipos de vehículo: se cotiza por categoría (auto chico, sedán, SUV/pick-up, moto).

**Sobre el modelo de "lavado en seco / bajo consumo de agua":** hay que definirlo primero. Muchos barrios restringen el uso de agua y el desagüe. Un producto ecológico de bajo consumo suele ser una ventaja de venta y facilita el permiso.

## 3. Precios (a validar)
Método: costo por servicio (insumos, mano de obra, transporte, comisión de cobro) + margen + comparación con la competencia (lavaderos fijos de la zona y otros servicios móviles).

Estructura sugerida (se completa con números al relevar):
- Precio por categoría de vehículo × tipo de servicio.
- Descuento por abono mensual (10-20%).
- Precio de lanzamiento o primer lavado con descuento.
- Recargos o extras: suciedad extrema, pelos de mascota.
- Ajuste periódico por inflación (definir cláusula: mensual/trimestral).

Pendiente: calcular el punto de equilibrio. Ejemplo de cuenta: autos por día × precio promedio × días por mes − costos fijos y variables.

## 4. Modelo operativo
- **Rotación:** un barrio o club por día. Con 5-6 barrios se cubre la semana.
- **Convenio con el barrio/club:** autorización de ingreso, lugar asignado (cochera, playa), acuerdo de agua y electricidad, posible comisión o beneficio para la administración.
- **Equipo:** cantidad de lavadores por día, roles, capacitación, uniforme, ART/seguro, vehículo de traslado.
- **Equipamiento:** hidrolavadora, aspiradora, generador o batería, tanque de agua, insumos, paños de microfibra, cartelería.
- **Cupos por día:** máximo de autos según equipo y horario; la app debe respetarlo.
- **Logística de llaves y acceso al auto:** ¿el cliente lo deja en el lugar o se lava donde estacionó? Definir el protocolo.
- **Clima:** política de lluvia y reprogramación.
- **Calidad:** checklist por servicio y fotos antes y después.

## 5. La app

### Usuarios y funciones (MVP)
**Cliente:**
- Registro y login (email, teléfono o Google).
- Alta de vehículos (patente, marca, modelo, categoría).
- Elegir barrio/club, día disponible y horario.
- Reservar el servicio y extras, con cupos en tiempo real.
- Pago online (Mercado Pago) o efectivo/transferencia.
- Notificaciones y recordatorios (push y WhatsApp).
- Historial de servicios y comprobantes.
- Calificar el servicio.

**Operador/lavador:**
- Lista de turnos del día, por barrio y horario.
- Marcar estados: en camino, en proceso, finalizado.
- Subir fotos antes y después.
- Cobro en el lugar (efectivo o QR).

**Administrador (panel web):**
- Gestión de barrios/clubes y calendario de rotación.
- Servicios, precios y cupos.
- Turnos, clientes, pagos y reportes (ingresos, ocupación por barrio, clientes activos).

### Funciones a futuro
- Abonos con débito automático.
- Programa de puntos y referidos.
- Cupones y promociones.
- Lista de espera y turnos recurrentes.
- Chat con soporte.
- Alta de nuevos barrios por demanda ("votá tu barrio").

### Tecnología (propuesta)
- **Recomendación:** app multiplataforma con **Flutter** o **React Native** (una base de código para Android e iOS), o una **PWA** en la primera etapa para lanzar rápido y sin pasar por las tiendas.
- **Panel admin:** web con React/Next.js.
- **Backend:** Supabase o Firebase (auth, base de datos, notificaciones) para el MVP. Alternativa: Node.js (NestJS) + PostgreSQL si se quiere más control.
- **Pagos:** Mercado Pago (Argentina): links de pago, Checkout Pro, suscripciones.
- **Notificaciones:** Firebase Cloud Messaging + WhatsApp Business API.
- **Otros:** Google Maps/Places para barrios, almacenamiento de fotos (S3/Supabase Storage), analítica (Firebase Analytics).
- Punto a decidir: ¿qué lenguajes maneja el equipo? Eso puede inclinar la elección.

### Aspectos a considerar
- Datos personales: Ley 25.326 de protección de datos; políticas de privacidad y términos de uso.
- Facturación: definir la condición fiscal (monotributo o responsable inscripto) e integrar facturación electrónica ARCA (ex AFIP).
- Cancelaciones y reprogramaciones: plazos y penalidades.
- Seguridad de los pagos: no guardar datos de tarjetas; delegar en el proveedor.
- Funcionamiento con conectividad limitada (dentro de barrios suele haber mala señal).

## 6. Presentación del proyecto
Estructura sugerida:
1. Problema: falta de tiempo, autos sucios, traslado al lavadero.
2. Solución: lavado en el lugar donde ya está el cliente.
3. Servicios y precios.
4. Mercado: cantidad de barrios cerrados y clubes en la zona, socios/propietarios, autos por barrio, nivel socioeconómico.
5. Competencia: lavaderos fijos, lavado móvil informal, lavaderos de los propios clubes.
6. Modelo de negocio: lavados sueltos, abonos, comisión a barrios, extras.
7. Operación: rotación semanal, equipo, equipamiento.
8. La app: capturas o mockups del flujo de reserva y pago.
9. Marketing: convenio con administraciones, cartelería, Instagram y WhatsApp, referidos, primer lavado gratis o con descuento.
10. Plan financiero: inversión inicial, costos fijos y variables, punto de equilibrio, proyección a 12 meses, escenarios (optimista, base, pesimista).
11. Riesgos: permisos, clima, competencia, rotación de personal, daños al vehículo, estacionalidad.
12. Legales: habilitaciones, seguros (responsabilidad civil), contratos con barrios, tratamiento de residuos y agua.
13. Hoja de ruta: piloto en 1-2 barrios, medir, ajustar y escalar.
14. Equipo y necesidades (inversión o socios, si aplica).

## 7. Preguntas abiertas
Resueltas:
- País: Argentina. La app la desarrolla Claude.
- Barrios candidatos: Club Círculo (Canning), un barrio cerrado en Escobar y otro en San Vicente; abierto a otros.
  - Pendiente: nombres concretos de los barrios de Escobar y San Vicente, y cantidad de lotes/socios de cada uno.
  - Nota geográfica: Canning (Esteban Echeverría), San Vicente y Escobar están lejos entre sí (Escobar es zona norte). Con rotación diaria, hay que estimar traslados y agrupar por zona (sur: Canning + San Vicente; norte: Escobar).

Abiertas:
- ¿El proyecto busca inversión, un socio o es un emprendimiento propio?
- ¿Presupuesto inicial disponible?
- ¿Se lava con agua (con o sin conexión del barrio) o con producto sin agua?
- ¿Quién es Maria Elena? (origen del nombre; puede ser parte de la historia de marca)
- ¿Hay plazo o fecha para la presentación?

## 7b. Seguros (pendiente, probablemente obligatorio para los barrios)
Estado: todavía no hay ningún seguro contratado. Conviene tenerlos antes de la primera reunión con un barrio o club.
Coberturas a cotizar con un productor asesor de seguros:
- Responsabilidad civil (daños a vehículos, a terceros y a instalaciones del barrio). Pedir que figure el barrio o club como tercero o "asegurado adicional" si lo exigen (cláusula de no repetición o similar).
- ART para el personal en relación de dependencia (obligatoria por ley si hay empleados). Si trabaja solo el titular como monotributista, no hay ART: se cubre con accidentes personales.
- Accidentes personales, para quienes no están en relación de dependencia.
- Opcional: cobertura del equipamiento (hidrolavadora, generador) y del vehículo de traslado.
A confirmar: qué monto de cobertura y qué documentos pide cada administración (certificado de cobertura, nómina de personal, listado con DNI).

## 8. Próximos pasos
1. Definir zona y lista de barrios/clubes objetivo.
2. Relevar precios de la competencia.
3. Elegir nombre y verificar disponibilidad.
4. Cerrar catálogo de servicios y precios.
5. Armar el prototipo o mockup de la app.
6. Redactar la presentación.
7. Piloto en un barrio.
