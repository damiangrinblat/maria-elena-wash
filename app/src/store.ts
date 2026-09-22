import { useSyncExternalStore } from 'react'
import { seed } from './seed'
import { supabase } from './supabase'
import type { Booking, Catalog, Profile, SlotRow } from './types'

/**
 * Capa de datos. Si hay un proyecto de Supabase configurado (app/.env), la app comparte
 * datos entre todos los dispositivos. Si no, sigue funcionando en modo demo local
 * (localStorage, un solo dispositivo) como antes — útil para probar sin conexión.
 *
 * Reglas de privacidad (ver supabase/schema.sql): el catálogo público nunca trae los PIN;
 * los turnos no se pueden leer en forma directa, solo a través de funciones que piden
 * el PIN correspondiente o el teléfono del cliente.
 */
const CATALOG_KEY = 'mew-db-v1'
const PROFILE_KEY = 'mew-profile-v1'
const PIN_KEY = 'mew-admin-pin'

const siteDefaults = { commissionType: 'none', commissionValue: 0, sitePin: '', clientNotice: '', siteNotice: '' } as const

// ---------- Modo local (sin Supabase) --------------------------------------

function localLoad(): Catalog & { bookings: Booking[] } {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      const sites = (saved.sites ?? seed.sites).map((x: object) => ({ ...siteDefaults, ...x }))
      return { ...seed, ...saved, sites, settings: { ...seed.settings, ...saved.settings } }
    }
  } catch {
    /* almacenamiento no disponible: se usan los datos iniciales */
  }
  return structuredClone({ ...seed, bookings: [] })
}

let local = localLoad()
function localPersist() {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(local))
  } catch {
    /* ignorar */
  }
}
function digits(s: string) {
  return s.replace(/\D/g, '')
}

// ---------- Store reactivo del catálogo (lo que ve la pantalla) -----------

let catalog: Catalog = structuredClone(seed)
const listeners = new Set<() => void>()
function setCatalog(c: Catalog) {
  catalog = c
  listeners.forEach((l) => l())
}

export function useCatalog(): Catalog {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => catalog,
  )
}
/** Alias por compatibilidad: el catálogo tiene la misma forma que la app usaba como "DB". */
export const useDB = useCatalog

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

/** Carga inicial del catálogo público. Llamar una vez al arrancar la app. */
export async function loadCatalog() {
  if (!supabase) {
    setCatalog(local)
    return
  }
  const { data, error } = await supabase.rpc('get_catalog')
  if (!error && data) setCatalog(data as Catalog)
}

export function getAdminPinCached() {
  try {
    return sessionStorage.getItem(PIN_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Intenta entrar al panel del equipo. Si el PIN es correcto, el catálogo pasa a la versión completa (con PIN incluidos). */
export async function adminLogin(pin: string): Promise<boolean> {
  if (!supabase) {
    const ok = pin === local.settings.adminPin
    if (ok) setCatalog(local)
    return ok
  }
  const { data } = await supabase.rpc('get_full_catalog', { p_pin: pin })
  if (data) {
    setCatalog(data as Catalog)
    try {
      sessionStorage.setItem(PIN_KEY, pin)
    } catch {
      /* ignorar */
    }
    return true
  }
  return false
}

export function adminLogout() {
  try {
    sessionStorage.removeItem(PIN_KEY)
  } catch {
    /* ignorar */
  }
  void loadCatalog()
}

/** Aplica un cambio al catálogo (edición del panel) y lo guarda. Devuelve false si el PIN ya no es válido. */
export async function adminUpdate(pin: string, fn: (draft: Catalog) => Catalog): Promise<boolean> {
  const next = fn(structuredClone(catalog))
  if (!supabase) {
    if (pin !== local.settings.adminPin && pin !== next.settings.adminPin) return false
    local = { ...local, ...next }
    localPersist()
    setCatalog(next)
    return true
  }
  setCatalog(next) // optimista
  const { data, error } = await supabase.rpc('save_catalog', { p_pin: pin, p_data: next })
  if (error || !data) {
    await loadCatalog()
    return false
  }
  return true
}

export async function resetToSeed(pin: string): Promise<boolean> {
  return adminUpdate(pin, () => structuredClone(seed))
}

// ---------- Cupos disponibles (sin datos personales) -----------------------

export async function fetchSlots(siteId: string, dateFrom: string, dateTo: string): Promise<SlotRow[]> {
  if (!supabase) {
    return local.bookings
      .filter((b) => b.siteId === siteId && b.date >= dateFrom && b.date <= dateTo && b.status !== 'cancelled')
      .map((b) => ({ siteId: b.siteId, date: b.date, time: b.time, status: b.status }))
  }
  const { data } = await supabase
    .from('public_slots')
    .select('site_id,date,time,status')
    .eq('site_id', siteId)
    .gte('date', dateFrom)
    .lte('date', dateTo)
  return (data ?? []).map((r) => ({ siteId: r.site_id, date: r.date, time: r.time, status: r.status }))
}

// ---------- Turnos -----------------------------------------------------

function fromRow(r: Record<string, unknown>): Booking {
  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    date: r.date as string,
    time: r.time as string,
    siteId: r.site_id as string,
    serviceId: r.service_id as string,
    categoryId: r.category_id as string,
    extraIds: (r.extra_ids as string[]) ?? [],
    total: Number(r.total),
    payMethod: r.pay_method as Booking['payMethod'],
    paid: Boolean(r.paid),
    status: r.status as Booking['status'],
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    plate: r.plate as string,
    vehicle: (r.vehicle as string) ?? '',
    address: (r.address as string) ?? '',
    notes: (r.notes as string) ?? '',
    rating: r.rating as number | undefined,
  }
}

export async function addBooking(b: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
  // En Supabase el id es uuid; en modo local no importa el formato.
  const id = supabase ? crypto.randomUUID() : uid('bk')
  const booking: Booking = { ...b, id, createdAt: new Date().toISOString() }
  if (!supabase) {
    local = { ...local, bookings: [...local.bookings, booking] }
    localPersist()
    return booking
  }
  const { error } = await supabase.from('bookings').insert({
    id: booking.id,
    date: booking.date,
    time: booking.time,
    site_id: booking.siteId,
    service_id: booking.serviceId,
    category_id: booking.categoryId,
    extra_ids: booking.extraIds,
    total: booking.total,
    pay_method: booking.payMethod,
    paid: booking.paid,
    status: booking.status,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    plate: booking.plate,
    vehicle: booking.vehicle,
    address: booking.address,
    notes: booking.notes,
  })
  if (error) throw error
  return booking
}

export async function bookingsByPhone(phone: string): Promise<Booking[]> {
  if (!supabase) {
    return local.bookings
      .filter((b) => digits(b.customerPhone) === digits(phone))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  }
  const { data } = await supabase.rpc('bookings_by_phone', { p_phone: phone })
  return (data ?? []).map(fromRow)
}

export async function cancelBooking(id: string, phone: string): Promise<boolean> {
  if (!supabase) {
    const b = local.bookings.find((x) => x.id === id && digits(x.customerPhone) === digits(phone))
    if (!b) return false
    local = { ...local, bookings: local.bookings.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) }
    localPersist()
    return true
  }
  const { data } = await supabase.rpc('cancel_booking', { p_id: id, p_phone: phone })
  return Boolean(data)
}

export async function rateBooking(id: string, phone: string, rating: number): Promise<boolean> {
  if (!supabase) {
    const b = local.bookings.find((x) => x.id === id && digits(x.customerPhone) === digits(phone))
    if (!b) return false
    local = { ...local, bookings: local.bookings.map((x) => (x.id === id ? { ...x, rating } : x)) }
    localPersist()
    return true
  }
  const { data } = await supabase.rpc('rate_booking', { p_id: id, p_phone: phone, p_rating: rating })
  return Boolean(data)
}

export async function adminBookings(pin: string): Promise<Booking[]> {
  if (!supabase) {
    if (pin !== local.settings.adminPin) return []
    return [...local.bookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  }
  const { data } = await supabase.rpc('get_admin_bookings', { p_pin: pin })
  return (data ?? []).map(fromRow)
}

export async function setBookingStatus(pin: string, id: string, status: Booking['status']): Promise<boolean> {
  if (!supabase) {
    if (pin !== local.settings.adminPin) return false
    local = { ...local, bookings: local.bookings.map((b) => (b.id === id ? { ...b, status } : b)) }
    localPersist()
    return true
  }
  const { data } = await supabase.rpc('set_booking_status', { p_pin: pin, p_id: id, p_status: status })
  return Boolean(data)
}

export async function setBookingPaid(pin: string, id: string, paid: boolean): Promise<boolean> {
  if (!supabase) {
    if (pin !== local.settings.adminPin) return false
    local = { ...local, bookings: local.bookings.map((b) => (b.id === id ? { ...b, paid } : b)) }
    localPersist()
    return true
  }
  const { data } = await supabase.rpc('set_booking_paid', { p_pin: pin, p_id: id, p_paid: paid })
  return Boolean(data)
}

export type SiteReport = { site: Catalog['sites'][number]; rows: { date: string; time: string; serviceId: string; total: number; paid: boolean }[] }

export async function siteReport(pin: string, from: string, to: string): Promise<SiteReport | null> {
  if (!supabase) {
    const site = local.sites.find((s) => s.sitePin && s.sitePin === pin)
    if (!site) return null
    const rows = local.bookings
      .filter((b) => b.siteId === site.id && b.status === 'done' && b.date >= from && b.date <= to)
      .map((b) => ({ date: b.date, time: b.time, serviceId: b.serviceId, total: b.total, paid: b.paid }))
    return { site, rows }
  }
  const { data } = await supabase.rpc('get_site_report', { p_pin: pin, p_from: from, p_to: to })
  if (!data) return null
  return data as SiteReport
}

// ---------- Perfil del cliente (solo local, es solo una conveniencia) -----

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw) as Profile
  } catch {
    /* ignorar */
  }
  return { name: '', phone: '', plate: '', vehicle: '', categoryId: '' }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  } catch {
    /* ignorar */
  }
}

export const usingSupabase = Boolean(supabase)
