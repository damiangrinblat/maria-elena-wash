import { useEffect, useMemo, useState } from 'react'
import { addBooking, bookingsByPhone, cancelBooking, fetchSlots, loadProfile, rateBooking, saveProfile, useDB } from '../store'
import type { Booking, PaymentMethod, SlotRow } from '../types'
import {
  PAY_LABEL,
  STATUS_LABEL,
  availableDates,
  canCancel,
  money,
  prettyDate,
  priceOf,
  slotsFor,
  totalOf,
  waLink,
} from '../lib'

export default function Client() {
  const db = useDB()
  const [tab, setTab] = useState<'book' | 'mine'>('book')
  const [done, setDone] = useState<Booking | null>(null)

  return (
    <div className="page">
      <header className="hero">
        <h1>{db.settings.businessName}</h1>
        <p>{db.settings.tagline}</p>
        {db.settings.promoText && <div className="promo">{db.settings.promoText}</div>}
      </header>

      <nav className="tabs">
        <button className={tab === 'book' ? 'on' : ''} onClick={() => { setTab('book'); setDone(null) }}>Reservar</button>
        <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>Mis turnos</button>
      </nav>

      {tab === 'book' && (done ? <Confirmation b={done} onNew={() => setDone(null)} /> : <BookForm onDone={setDone} />)}
      {tab === 'mine' && <MyBookings />}

      <footer className="foot">
        {db.settings.terms && <p className="muted small">{db.settings.terms}</p>}
        <span className="row"><a href="#/admin" className="muted small">Acceso del equipo</a><a href="#/barrio" className="muted small">Acceso de barrios</a></span>
      </footer>
    </div>
  )
}

function BookForm({ onDone }: { onDone: (b: Booking) => void }) {
  const db = useDB()
  const profile = useMemo(loadProfile, [])
  const sites = db.sites.filter((s) => s.active)
  const services = db.services.filter((s) => s.active)
  const categories = db.categories.filter((c) => c.active)

  const [siteId, setSiteId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [categoryId, setCategoryId] = useState(profile.categoryId || categories[0]?.id || '')
  const [extraIds, setExtraIds] = useState<string[]>([])
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone)
  const [plate, setPlate] = useState(profile.plate)
  const [vehicle, setVehicle] = useState(profile.vehicle)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const enabled = (Object.keys(db.settings.payMethods) as PaymentMethod[]).filter((m) => db.settings.payMethods[m])
  const [payMethod, setPayMethod] = useState<PaymentMethod>(enabled[0] ?? 'cash')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState<SlotRow[]>([])

  const site = sites.find((s) => s.id === siteId)
  const dates = site ? availableDates(db, site) : []
  const slots = site && date ? slotsFor(db, site, date, taken) : []
  const total = serviceId && categoryId ? totalOf(db, serviceId, categoryId, extraIds) : 0

  useEffect(() => {
    if (!site || dates.length === 0) return setTaken([])
    fetchSlots(site.id, dates[0], dates[dates.length - 1]).then(setTaken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function submit() {
    if (!site || !date || !time || !serviceId || !categoryId) return setError('Completá barrio, fecha, horario, servicio y tipo de vehículo.')
    if (!name.trim() || phone.replace(/\D/g, '').length < 8) return setError('Ingresá tu nombre y un teléfono válido.')
    if (!plate.trim()) return setError('Ingresá la patente del vehículo.')
    if (site.mode === 'home' && !address.trim()) return setError('Indicá la dirección o lote donde lavamos el auto.')
    setBusy(true)
    setError('')
    try {
      const fresh = await fetchSlots(site.id, date, date)
      const freshSlot = slotsFor(db, site, date, fresh).find((s) => s.time === time)
      if (!freshSlot || freshSlot.left <= 0) { setError('Ese horario se acaba de ocupar. Elegí otro.'); return }
      saveProfile({ name, phone, plate, vehicle, categoryId })
      const b = await addBooking({
        date, time, siteId: site.id, serviceId, categoryId, extraIds, total, payMethod, paid: false,
        status: 'pending', customerName: name.trim(), customerPhone: phone.trim(), plate: plate.trim().toUpperCase(),
        vehicle: vehicle.trim(), address: address.trim(), notes: notes.trim(),
      })
      onDone(b)
    } catch {
      setError('No se pudo reservar. Probá de nuevo en un momento.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>1. Barrio o club</h2>
        <div className="options">
          {sites.map((s) => (
            <button key={s.id} className={`opt ${siteId === s.id ? 'on' : ''}`} onClick={() => { setSiteId(s.id); setDate(''); setTime('') }}>
              <strong>{s.name}</strong>
              <span className="muted small">{s.mode === 'fixed' ? 'Lugar fijo en el barrio' : 'En tu domicilio'}</span>
            </button>
          ))}
          {sites.length === 0 && <p className="muted">Todavía no hay barrios disponibles.</p>}
        </div>
        {site && <p className="muted small">{site.spotNote}</p>}
        {site?.clientNotice && <div className="box"><strong>Aviso:</strong> {site.clientNotice}</div>}
      </section>

      {site && (
        <section className="card">
          <h2>2. Fecha y horario</h2>
          {dates.length === 0 && <p className="muted">No hay fechas disponibles por ahora.</p>}
          <div className="chips">
            {dates.map((d) => (
              <button key={d} className={`chip ${date === d ? 'on' : ''}`} onClick={() => { setDate(d); setTime('') }}>{prettyDate(d)}</button>
            ))}
          </div>
          {date && (
            <div className="chips" style={{ marginTop: 12 }}>
              {slots.map((s) => {
                const off = s.left <= 0 || s.tooSoon
                return (
                  <button key={s.time} disabled={off} className={`chip ${time === s.time ? 'on' : ''}`} onClick={() => setTime(s.time)}>
                    {s.time}{off ? (s.left <= 0 ? ' · completo' : '') : s.left === 1 ? ' · último' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>3. Servicio</h2>
        <div className="chips">
          {categories.map((c) => (
            <button key={c.id} className={`chip ${categoryId === c.id ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>{c.name}</button>
          ))}
        </div>
        <div className="options" style={{ marginTop: 12 }}>
          {services.map((s) => (
            <button key={s.id} className={`opt ${serviceId === s.id ? 'on' : ''}`} onClick={() => setServiceId(s.id)}>
              <span className="row"><strong>{s.name}</strong><strong>{money(priceOf(db, s.id, categoryId))}</strong></span>
              <span className="muted small">{s.description} · aprox. {s.minutes} min</span>
            </button>
          ))}
        </div>
        {db.extras.some((e) => e.active) && (
          <>
            <h3>Extras</h3>
            <div className="chips">
              {db.extras.filter((e) => e.active).map((e) => (
                <button key={e.id} className={`chip ${extraIds.includes(e.id) ? 'on' : ''}`}
                  onClick={() => setExtraIds((x) => (x.includes(e.id) ? x.filter((i) => i !== e.id) : [...x, e.id]))}>
                  {e.name} +{money(e.price)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>4. Tus datos</h2>
        <div className="grid">
          <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <label>Teléfono / WhatsApp<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
          <label>Patente<input value={plate} onChange={(e) => setPlate(e.target.value)} /></label>
          <label>Marca y modelo<input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Ej: VW Amarok gris" /></label>
        </div>
        {site?.mode === 'home' && (
          <label>Dirección / lote donde lavamos<input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        )}
        <label>Comentarios (opcional)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></label>
      </section>

      <section className="card">
        <h2>5. Forma de pago</h2>
        <div className="chips">
          {enabled.map((m) => (
            <button key={m} className={`chip ${payMethod === m ? 'on' : ''}`} onClick={() => setPayMethod(m)}>{PAY_LABEL[m]}</button>
          ))}
        </div>
        <p className="muted small">Podés pagar ahora o en el momento del servicio, según lo acordado.</p>
      </section>

      <div className="sticky">
        <div className="row"><span>Total</span><strong className="big">{money(total)}</strong></div>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy} onClick={submit}>{busy ? 'Reservando…' : 'Reservar turno'}</button>
      </div>
    </div>
  )
}

function Confirmation({ b, onNew }: { b: Booking; onNew: () => void }) {
  const db = useDB()
  const s = db.settings
  const site = db.sites.find((x) => x.id === b.siteId)
  const service = db.services.find((x) => x.id === b.serviceId)
  return (
    <section className="card">
      <h2>¡Turno reservado!</h2>
      <p><strong>{service?.name}</strong> · {prettyDate(b.date)} a las {b.time}</p>
      <p>{site?.name}</p>
      <p>Total: <strong>{money(b.total)}</strong> · {PAY_LABEL[b.payMethod]}</p>
      {b.payMethod === 'mp' && (s.mpLink
        ? <a className="primary btn" href={s.mpLink} target="_blank" rel="noreferrer">Pagar con Mercado Pago</a>
        : <p className="muted">Te enviaremos el link de pago por WhatsApp.</p>)}
      {b.payMethod === 'transfer' && (
        <div className="box">
          {s.transferAlias && <p>Alias: <strong>{s.transferAlias}</strong></p>}
          {s.transferCbu && <p>CBU/CVU: <strong>{s.transferCbu}</strong></p>}
          {s.transferHolder && <p>Titular: {s.transferHolder}</p>}
          <p className="muted small">Enviá el comprobante por WhatsApp para confirmar el pago.</p>
        </div>
      )}
      {b.payMethod === 'cash' && <p className="muted">{s.cashNote}</p>}
      {s.whatsapp && (
        <a className="btn" href={waLink(s.whatsapp, `Hola! Reservé un turno: ${service?.name} el ${prettyDate(b.date)} ${b.time} en ${site?.name}. Patente ${b.plate}.`)} target="_blank" rel="noreferrer">
          Avisar por WhatsApp
        </a>
      )}
      <button onClick={onNew}>Hacer otra reserva</button>
    </section>
  )
}

function MyBookings() {
  const db = useDB()
  const profile = loadProfile()
  const [phone, setPhone] = useState(profile.phone)
  const [mine, setMine] = useState<Booking[]>([])
  const [searched, setSearched] = useState(false)

  async function search() {
    setSearched(true)
    setMine(await bookingsByPhone(phone))
  }

  return (
    <div className="stack">
      <section className="card">
        <label>Tu teléfono<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></label>
        <button className="primary" onClick={search} disabled={phone.replace(/\D/g, '').length < 8}>Buscar mis turnos</button>
      </section>
      {mine.map((b) => {
        const service = db.services.find((x) => x.id === b.serviceId)
        const site = db.sites.find((x) => x.id === b.siteId)
        return (
          <section className="card" key={b.id}>
            <div className="row"><strong>{service?.name}</strong><span className={`tag ${b.status}`}>{STATUS_LABEL[b.status]}</span></div>
            <p>{prettyDate(b.date)} · {b.time} · {site?.name}</p>
            <p className="muted small">{b.plate} · {money(b.total)} · {PAY_LABEL[b.payMethod]} · {b.paid ? 'Pagado' : 'Pago pendiente'}</p>
            {canCancel(db, b) && (
              <button onClick={async () => { if (confirm('¿Cancelar este turno?') && await cancelBooking(b.id, phone)) search() }}>Cancelar turno</button>
            )}
            {(b.status === 'pending' || b.status === 'confirmed') && !canCancel(db, b) && (
              <p className="muted small">Ya pasó el plazo de cancelación gratuita ({db.settings.cancelHours} h antes).</p>
            )}
            {b.status === 'done' && (
              <div className="chips">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={`chip ${b.rating === n ? 'on' : ''}`} onClick={async () => { if (await rateBooking(b.id, phone, n)) search() }}>{'★'.repeat(n)}</button>
                ))}
              </div>
            )}
          </section>
        )
      })}
      {searched && mine.length === 0 && <p className="muted">No encontramos turnos con ese teléfono.</p>}
    </div>
  )
}
