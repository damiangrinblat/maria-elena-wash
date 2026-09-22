import type { Booking, BookingStatus, Catalog, PaymentMethod, Site, SlotRow } from './types'

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_progress: 'En proceso',
  done: 'Finalizado',
  cancelled: 'Cancelado',
}

export const PAY_LABEL: Record<PaymentMethod, string> = {
  mp: 'Mercado Pago',
  transfer: 'Transferencia',
  cash: 'Efectivo',
}

export const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function prettyDate(s: string) {
  const d = fromISO(s)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const fromMin = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`

export function slotTimes(site: Site): string[] {
  const out: string[] = []
  if (site.slotMinutes <= 0) return out
  for (let t = toMin(site.start); t + site.slotMinutes <= toMin(site.end); t += site.slotMinutes) out.push(fromMin(t))
  return out
}

/** Próximas fechas en las que el barrio presta servicio, respetando anticipación mínima y fechas cerradas. */
export function availableDates(db: Catalog, site: Site, now = new Date()): string[] {
  const out: string[] = []
  const earliest = now.getTime() + db.settings.minAdvanceHours * 3600_000
  for (let i = 0; i <= db.settings.bookingHorizonDays; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const iso = toISO(d)
    if (!site.days.includes(d.getDay())) continue
    if (db.closedDates.includes(iso)) continue
    const lastSlot = slotTimes(site).at(-1)
    if (!lastSlot) continue
    const [h, m] = lastSlot.split(':').map(Number)
    if (new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime() < earliest) continue
    out.push(iso)
  }
  return out
}

export const isActiveBooking = (b: { status: BookingStatus }) => b.status !== 'cancelled'

/** `taken` son los turnos ya existentes de este barrio y fecha (sin datos personales). */
export function slotsFor(db: Catalog, site: Site, date: string, taken: SlotRow[], now = new Date()) {
  const earliest = now.getTime() + db.settings.minAdvanceHours * 3600_000
  return slotTimes(site).map((time) => {
    const count = taken.filter((b) => b.date === date && b.time === time && isActiveBooking(b)).length
    const [h, m] = time.split(':').map(Number)
    const d = fromISO(date)
    const tooSoon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime() < earliest
    return { time, left: Math.max(0, site.perSlot - count), tooSoon }
  })
}

export function priceOf(db: Catalog, serviceId: string, categoryId: string) {
  return db.prices[`${serviceId}:${categoryId}`] ?? 0
}

export function totalOf(db: Catalog, serviceId: string, categoryId: string, extraIds: string[]) {
  const extras = db.extras.filter((e) => extraIds.includes(e.id)).reduce((s, e) => s + e.price, 0)
  return priceOf(db, serviceId, categoryId) + extras
}

export function canCancel(db: Catalog, b: Booking, now = new Date()) {
  if (b.status !== 'pending' && b.status !== 'confirmed') return false
  const d = fromISO(b.date)
  const [h, m] = b.time.split(':').map(Number)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime()
  return start - now.getTime() >= db.settings.cancelHours * 3600_000
}

export function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m)
}
