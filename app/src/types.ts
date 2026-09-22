export type Service = {
  id: string
  name: string
  description: string
  minutes: number
  active: boolean
}

export type Category = { id: string; name: string; active: boolean }

export type Extra = { id: string; name: string; price: number; active: boolean }

/** Modo de trabajo en un barrio: lugar fijo provisto por el barrio, o en el domicilio/cochera del cliente. */
export type SiteMode = 'fixed' | 'home'

export type Site = {
  id: string
  name: string
  zone: string
  mode: SiteMode
  spotNote: string
  /** Días de la semana que se trabaja aquí (0 = domingo … 6 = sábado). */
  days: number[]
  start: string
  end: string
  slotMinutes: number
  /** Autos que se pueden atender en simultáneo en cada franja. */
  perSlot: number
  active: boolean
  /** Comisión para la administración del barrio, sobre lo facturado. */
  commissionType: 'none' | 'percent' | 'fixed'
  commissionValue: number
  /** PIN de acceso (solo lectura) de la administración del barrio. Nunca viaja al catálogo público. */
  sitePin: string
  /** Aviso que ven los clientes al elegir este barrio (ej. "Esta semana el servicio es el miércoles"). */
  clientNotice: string
  /** Aviso que ve la administración del barrio en su panel. */
  siteNotice: string
}

export type PaymentMethod = 'mp' | 'transfer' | 'cash'

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'

export type Booking = {
  id: string
  createdAt: string
  date: string
  time: string
  siteId: string
  serviceId: string
  categoryId: string
  extraIds: string[]
  total: number
  payMethod: PaymentMethod
  paid: boolean
  status: BookingStatus
  customerName: string
  customerPhone: string
  plate: string
  vehicle: string
  address: string
  notes: string
  rating?: number
}

/** Solo lo necesario para calcular cupos disponibles: sin ningún dato personal. */
export type SlotRow = { siteId: string; date: string; time: string; status: BookingStatus }

export type Settings = {
  businessName: string
  tagline: string
  primaryColor: string
  whatsapp: string
  /** Nunca viaja al catálogo público; solo se usa para validar el acceso del equipo. */
  adminPin: string
  cancelHours: number
  bookingHorizonDays: number
  minAdvanceHours: number
  payMethods: Record<PaymentMethod, boolean>
  mpLink: string
  transferAlias: string
  transferCbu: string
  transferHolder: string
  cashNote: string
  promoText: string
  terms: string
  /** Plantilla del mensaje de WhatsApp al cliente. Variables: {nombre} {fecha} {hora} {barrio} {servicio}. */
  waTemplate: string
}

/** Configuración del negocio, sin los turnos (que se consultan aparte y con permiso). */
export type Catalog = {
  settings: Settings
  services: Service[]
  categories: Category[]
  extras: Extra[]
  /** Precio por servicio y categoría de vehículo, clave `${serviceId}:${categoryId}`. */
  prices: Record<string, number>
  sites: Site[]
  /** Fechas (YYYY-MM-DD) sin servicio, por ejemplo lluvia o feriados. Aplica a todos los barrios. */
  closedDates: string[]
}

export type DB = Catalog & { bookings: Booking[] }

export type Profile = {
  name: string
  phone: string
  plate: string
  vehicle: string
  categoryId: string
}
