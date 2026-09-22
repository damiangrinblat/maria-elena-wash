import { useEffect, useRef, useState } from 'react'
import { adminBookings, adminLogin, adminLogout, adminUpdate, getAdminPinCached, resetToSeed, setBookingPaid, setBookingStatus, uid, useDB } from '../store'
import type { Booking, BookingStatus, Catalog, PaymentMethod, Settings, Site } from '../types'
import { DAY_NAMES, PAY_LABEL, STATUS_LABEL, money, prettyDate, toISO, waLink, fillTemplate } from '../lib'

type Tab = 'today' | 'bookings' | 'services' | 'sites' | 'settings' | 'reports'
const TABS: [Tab, string][] = [
  ['today', 'Hoy'], ['bookings', 'Turnos'], ['services', 'Servicios y precios'],
  ['sites', 'Barrios'], ['settings', 'Ajustes'], ['reports', 'Reportes'],
]

export default function Admin() {
  const db = useDB()
  const [in_, setIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => {
    const cached = getAdminPinCached()
    if (!cached) return setChecking(false)
    adminLogin(cached).then((ok) => { setIn(ok); setChecking(false) })
  }, [])

  if (checking) return <div className="page" />

  if (!in_) {
    return (
      <div className="page">
        <section className="card">
          <h2>Acceso del equipo</h2>
          <PinLogin onOk={() => setIn(true)} />
          <a href="#/" className="muted small">Volver</a>
        </section>
      </div>
    )
  }

  return (
    <div className="page wide">
      <header className="row">
        <h1>Panel · {db.settings.businessName}</h1>
        <span className="row">
          <a href="#/">Ver app cliente</a>
          <button onClick={() => { adminLogout(); setIn(false) }}>Salir</button>
        </span>
      </header>
      <nav className="tabs scroll">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </nav>
      {tab === 'today' && <Bookings today />}
      {tab === 'bookings' && <Bookings />}
      {tab === 'services' && <Services db={db} />}
      {tab === 'sites' && <Sites db={db} />}
      {tab === 'settings' && <SettingsTab db={db} />}
      {tab === 'reports' && <Reports db={db} />}
    </div>
  )
}

function PinLogin({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    const ok = await adminLogin(pin)
    setBusy(false)
    if (ok) onOk()
    else alert('PIN incorrecto')
  }
  return (
    <>
      <label>PIN<input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} /></label>
      <button className="primary" disabled={busy} onClick={go}>Ingresar</button>
    </>
  )
}

/**
 * Campo de texto/número que solo guarda al salir del campo (blur), no en cada letra.
 * Evita que varios guardados en paralelo mientras se escribe se pisen entre sí
 * y termine grabado un valor incompleto (pasó con el PIN del panel: quedó vacío).
 */
function Field({ value, onCommit, label, type = 'text', placeholder }: { value: string | number; onCommit: (v: string) => void; label?: string; type?: string; placeholder?: string }) {
  const [v, setV] = useState(String(value))
  const committed = useRef(String(value))
  useEffect(() => {
    if (String(value) !== committed.current) { setV(String(value)); committed.current = String(value) }
  }, [value])
  const commit = () => { if (v !== committed.current) { committed.current = v; onCommit(v) } }
  const input = type === 'textarea'
    ? <textarea rows={2} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />
    : <input type={type} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />
  return label ? <label>{label}{input}</label> : input
}

const NEXT: Partial<Record<BookingStatus, [BookingStatus, string]>> = {
  pending: ['confirmed', 'Confirmar'],
  confirmed: ['in_progress', 'Iniciar'],
  in_progress: ['done', 'Finalizar'],
}

function useAdminBookings() {
  const [all, setAll] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = () => { setLoading(true); adminBookings().then((b) => { setAll(b); setLoading(false) }) }
  useEffect(refresh, [])
  return { all, loading, refresh }
}

function Bookings({ today }: { today?: boolean }) {
  const db = useDB()
  const { all, loading, refresh } = useAdminBookings()
  const [date, setDate] = useState(today ? toISO(new Date()) : '')
  const [siteId, setSiteId] = useState('')
  const list = all
    .filter((b) => (!date || b.date === date) && (!siteId || b.siteId === siteId))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const closed = date ? db.closedDates.includes(date) : false

  return (
    <div className="stack">
      <section className="card">
        <div className="grid">
          <label>Fecha<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Barrio
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Todos</option>
              {db.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <div className="chips">
          <button onClick={refresh}>Actualizar</button>
          {date && (
            <button onClick={() => adminUpdate((d) => ({ ...d, closedDates: closed ? d.closedDates.filter((x) => x !== date) : [...d.closedDates, date] }))}>
              {closed ? 'Reabrir este día' : 'Cerrar este día (lluvia / feriado)'}
            </button>
          )}
        </div>
      </section>
      {loading && <p className="muted">Cargando…</p>}
      {!loading && list.length === 0 && <p className="muted">No hay turnos.</p>}
      {list.map((b) => {
        const service = db.services.find((s) => s.id === b.serviceId)
        const cat = db.categories.find((c) => c.id === b.categoryId)
        const site = db.sites.find((s) => s.id === b.siteId)
        const extras = db.extras.filter((e) => b.extraIds.includes(e.id)).map((e) => e.name).join(', ')
        const next = NEXT[b.status]
        return (
          <section className="card" key={b.id}>
            <div className="row"><strong>{prettyDate(b.date)} {b.time} · {service?.name}</strong><span className={`tag ${b.status}`}>{STATUS_LABEL[b.status]}</span></div>
            <p>{b.customerName} · {b.plate} {b.vehicle && `· ${b.vehicle}`} · {cat?.name}</p>
            <p className="muted small">{site?.name}{b.address && ` · ${b.address}`}{extras && ` · Extras: ${extras}`}{b.notes && ` · ${b.notes}`}</p>
            <p><strong>{money(b.total)}</strong> · {PAY_LABEL[b.payMethod]} · {b.paid ? 'Pagado' : 'Sin pagar'}{b.rating ? ` · ${'★'.repeat(b.rating)}` : ''}</p>
            <div className="chips">
              {next && <button className="primary" onClick={async () => { await setBookingStatus(b.id, next[0]); refresh() }}>{next[1]}</button>}
              <button onClick={async () => { await setBookingPaid(b.id, !b.paid); refresh() }}>{b.paid ? 'Marcar sin pagar' : 'Marcar pagado'}</button>
              <a className="btn" href={waLink(b.customerPhone, fillTemplate(db.settings.waTemplate, { nombre: b.customerName, fecha: prettyDate(b.date), hora: b.time, barrio: site?.name ?? '', servicio: service?.name ?? '' }))} target="_blank" rel="noreferrer">WhatsApp</a>
              {b.status !== 'cancelled' && b.status !== 'done' && <button onClick={async () => { await setBookingStatus(b.id, 'cancelled'); refresh() }}>Cancelar</button>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Services({ db }: { db: Catalog }) {
  const cats = db.categories
  const update = (fn: (d: Catalog) => Catalog) => adminUpdate(fn)
  return (
    <div className="stack">
      <section className="card">
        <h2>Servicios y precios</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Servicio</th><th>Min.</th>{cats.map((c) => <th key={c.id}>{c.name}</th>)}<th>Activo</th><th /></tr>
            </thead>
            <tbody>
              {db.services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Field value={s.name} onCommit={(v) => update((d) => ({ ...d, services: d.services.map((x) => x.id === s.id ? { ...x, name: v } : x) }))} />
                    <Field value={s.description} onCommit={(v) => update((d) => ({ ...d, services: d.services.map((x) => x.id === s.id ? { ...x, description: v } : x) }))} />
                  </td>
                  <td><Field type="number" value={s.minutes} onCommit={(v) => update((d) => ({ ...d, services: d.services.map((x) => x.id === s.id ? { ...x, minutes: +v } : x) }))} /></td>
                  {cats.map((c) => (
                    <td key={c.id}><Field type="number" value={db.prices[`${s.id}:${c.id}`] ?? 0}
                      onCommit={(v) => update((d) => ({ ...d, prices: { ...d.prices, [`${s.id}:${c.id}`]: +v } }))} /></td>
                  ))}
                  <td><input type="checkbox" checked={s.active} onChange={(e) => update((d) => ({ ...d, services: d.services.map((x) => x.id === s.id ? { ...x, active: e.target.checked } : x) }))} /></td>
                  <td><button onClick={() => confirm('¿Eliminar servicio?') && update((d) => ({ ...d, services: d.services.filter((x) => x.id !== s.id) }))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => update((d) => ({ ...d, services: [...d.services, { id: uid('sv'), name: 'Nuevo servicio', description: '', minutes: 60, active: true }] }))}>+ Servicio</button>
      </section>

      <section className="card">
        <h2>Tipos de vehículo</h2>
        {cats.map((c) => (
          <div className="row" key={c.id}>
            <Field value={c.name} onCommit={(v) => update((d) => ({ ...d, categories: d.categories.map((x) => x.id === c.id ? { ...x, name: v } : x) }))} />
            <label className="inline"><input type="checkbox" checked={c.active} onChange={(e) => update((d) => ({ ...d, categories: d.categories.map((x) => x.id === c.id ? { ...x, active: e.target.checked } : x) }))} />Activo</label>
          </div>
        ))}
        <button onClick={() => update((d) => ({ ...d, categories: [...d.categories, { id: uid('ct'), name: 'Nuevo tipo', active: true }] }))}>+ Tipo de vehículo</button>
      </section>

      <section className="card">
        <h2>Extras</h2>
        {db.extras.map((x) => (
          <div className="row" key={x.id}>
            <Field value={x.name} onCommit={(v) => update((d) => ({ ...d, extras: d.extras.map((y) => y.id === x.id ? { ...y, name: v } : y) }))} />
            <Field type="number" value={x.price} onCommit={(v) => update((d) => ({ ...d, extras: d.extras.map((y) => y.id === x.id ? { ...y, price: +v } : y) }))} />
            <label className="inline"><input type="checkbox" checked={x.active} onChange={(e) => update((d) => ({ ...d, extras: d.extras.map((y) => y.id === x.id ? { ...y, active: e.target.checked } : y) }))} />Activo</label>
            <button onClick={() => update((d) => ({ ...d, extras: d.extras.filter((y) => y.id !== x.id) }))}>✕</button>
          </div>
        ))}
        <button onClick={() => update((d) => ({ ...d, extras: [...d.extras, { id: uid('ex'), name: 'Nuevo extra', price: 0, active: true }] }))}>+ Extra</button>
      </section>
    </div>
  )
}

function Sites({ db }: { db: Catalog }) {
  const set = (id: string, patch: Partial<Site>) => adminUpdate((d) => ({ ...d, sites: d.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  return (
    <div className="stack">
      {db.sites.map((s) => (
        <section className="card" key={s.id}>
          <div className="row">
            <Field value={s.name} onCommit={(v) => set(s.id, { name: v })} />
            <label className="inline"><input type="checkbox" checked={s.active} onChange={(e) => set(s.id, { active: e.target.checked })} />Activo</label>
            <button onClick={() => confirm('¿Eliminar barrio?') && adminUpdate((d) => ({ ...d, sites: d.sites.filter((x) => x.id !== s.id) }))}>✕</button>
          </div>
          <div className="grid">
            <Field label="Zona" value={s.zone} onCommit={(v) => set(s.id, { zone: v })} />
            <label>Modalidad
              <select value={s.mode} onChange={(e) => set(s.id, { mode: e.target.value as Site['mode'] })}>
                <option value="fixed">Lugar fijo provisto por el barrio</option>
                <option value="home">En el domicilio del cliente</option>
              </select>
            </label>
            <label>Desde<input type="time" value={s.start} onChange={(e) => set(s.id, { start: e.target.value })} /></label>
            <label>Hasta<input type="time" value={s.end} onChange={(e) => set(s.id, { end: e.target.value })} /></label>
            <Field label="Minutos por turno" type="number" value={s.slotMinutes} onCommit={(v) => set(s.id, { slotMinutes: +v })} />
            <Field label="Autos simultáneos por turno" type="number" value={s.perSlot} onCommit={(v) => set(s.id, { perSlot: +v })} />
          </div>
          <div className="grid">
            <label>Comisión para el barrio
              <select value={s.commissionType} onChange={(e) => set(s.id, { commissionType: e.target.value as Site['commissionType'] })}>
                <option value="none">Sin comisión</option>
                <option value="percent">Porcentaje de lo facturado</option>
                <option value="fixed">Monto fijo por lavado</option>
              </select>
            </label>
            {s.commissionType !== 'none' && (
              <Field label={s.commissionType === 'percent' ? 'Porcentaje (%)' : 'Monto por lavado ($)'} type="number" value={s.commissionValue} onCommit={(v) => set(s.id, { commissionValue: +v })} />
            )}
            <Field label="PIN de acceso del barrio (solo lectura)" value={s.sitePin} placeholder="Vacío = sin acceso" onCommit={(v) => set(s.id, { sitePin: v })} />
          </div>
          <Field label="Aviso para los clientes de este barrio (se muestra al reservar)" value={s.clientNotice} onCommit={(v) => set(s.id, { clientNotice: v })} />
          <Field label="Aviso para la administración del barrio (se muestra en su panel)" value={s.siteNotice} onCommit={(v) => set(s.id, { siteNotice: v })} />
          <Field label="Indicaciones del lugar" value={s.spotNote} onCommit={(v) => set(s.id, { spotNote: v })} />
          <div className="chips">
            {DAY_NAMES.map((n, i) => (
              <button key={i} className={`chip ${s.days.includes(i) ? 'on' : ''}`}
                onClick={() => set(s.id, { days: s.days.includes(i) ? s.days.filter((x) => x !== i) : [...s.days, i] })}>{n.slice(0, 3)}</button>
            ))}
          </div>
        </section>
      ))}
      <button onClick={() => adminUpdate((d) => ({ ...d, sites: [...d.sites, { id: uid('site'), name: 'Nuevo barrio', zone: '', mode: 'fixed', spotNote: '', days: [], start: '09:00', end: '17:00', slotMinutes: 60, perSlot: 2, active: true, commissionType: 'none', commissionValue: 0, sitePin: '', clientNotice: '', siteNotice: '' }] }))}>+ Barrio o club</button>
    </div>
  )
}

function SettingsTab({ db }: { db: Catalog }) {
  const s = db.settings
  const set = (patch: Partial<Settings>) => adminUpdate((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  const text = (k: keyof Settings, label: string, type = 'text') => (
    <Field label={label} type={type} value={s[k] as string | number} onCommit={(v) => set({ [k]: type === 'number' ? +v : v } as Partial<Settings>)} />
  )
  return (
    <div className="stack">
      <section className="card">
        <h2>Marca</h2>
        <div className="grid">
          {text('businessName', 'Nombre del negocio')}
          {text('tagline', 'Frase')}
          {text('primaryColor', 'Color principal', 'color')}
          {text('whatsapp', 'WhatsApp (con código de país, ej. 5491112345678)')}
        </div>
        {text('promoText', 'Mensaje promocional')}
        <label>Mensaje de WhatsApp al cliente. Variables: {'{nombre} {fecha} {hora} {barrio} {servicio}'}
          <Field type="textarea" value={s.waTemplate} onCommit={(v) => set({ waTemplate: v })} />
        </label>
        <label>Términos y condiciones
          <Field type="textarea" value={s.terms} onCommit={(v) => set({ terms: v })} />
        </label>
      </section>
      <section className="card">
        <h2>Reservas</h2>
        <div className="grid">
          {text('cancelHours', 'Horas de anticipación para cancelar sin cargo', 'number')}
          {text('minAdvanceHours', 'Anticipación mínima para reservar (horas)', 'number')}
          {text('bookingHorizonDays', 'Cuántos días hacia adelante se puede reservar', 'number')}
        </div>
      </section>
      <section className="card">
        <h2>Pagos</h2>
        <div className="chips">
          {(Object.keys(PAY_LABEL) as PaymentMethod[]).map((m) => (
            <button key={m} className={`chip ${s.payMethods[m] ? 'on' : ''}`} onClick={() => set({ payMethods: { ...s.payMethods, [m]: !s.payMethods[m] } })}>{PAY_LABEL[m]}</button>
          ))}
        </div>
        {text('mpLink', 'Link de pago de Mercado Pago')}
        <div className="grid">
          {text('transferAlias', 'Alias')}
          {text('transferCbu', 'CBU / CVU')}
          {text('transferHolder', 'Titular')}
        </div>
        {text('cashNote', 'Mensaje para pago en efectivo')}
      </section>
      <section className="card">
        <h2>Seguridad y datos</h2>
        <PinChanger current={s.adminPin} onSave={(v) => set({ adminPin: v })} />
        <button onClick={() => confirm('Esto borra todos los datos y vuelve a los valores iniciales. ¿Seguro?') && resetToSeed()}>Restablecer datos de ejemplo</button>
      </section>
    </div>
  )
}

/**
 * Cambio de PIN con confirmación explícita: muestra lo que se escribió (con opción de
 * revelarlo) y solo guarda cuando se toca "Guardar nuevo PIN", nunca solo.
 */
function PinChanger({ current, onSave }: { current: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState<'no' | 'yes' | 'done'>('no')
  const [v, setV] = useState('')
  const [show, setShow] = useState(false)

  if (editing === 'no') {
    return (
      <div className="row">
        <span>PIN del panel: <strong>{current || '(sin PIN)'}</strong></span>
        <button onClick={() => { setEditing('yes'); setV('') }}>Cambiar PIN</button>
      </div>
    )
  }
  if (editing === 'done') {
    return (
      <div className="row">
        <span>PIN actualizado: <strong>{current}</strong></span>
        <button onClick={() => setEditing('no')}>Listo</button>
      </div>
    )
  }

  return (
    <div className="stack">
      <label>Nuevo PIN
        <input type={show ? 'text' : 'password'} inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      </label>
      <label className="inline"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />Mostrar lo que escribí</label>
      {v && <p>Vas a guardar este PIN: <strong>{v}</strong> ({v.length} dígitos)</p>}
      <div className="chips">
        <button className="primary" disabled={!v} onClick={() => { onSave(v); setEditing('done') }}>Guardar nuevo PIN</button>
        <button onClick={() => setEditing('no')}>Cancelar</button>
      </div>
    </div>
  )
}

function Reports({ db }: { db: Catalog }) {
  const { all, loading, refresh } = useAdminBookings()
  const [from, setFrom] = useState(() => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [to, setTo] = useState(() => toISO(new Date()))
  const inRange = all.filter((b) => b.date >= from && b.date <= to && b.status !== 'cancelled')
  const done = inRange.filter((b) => b.status === 'done')
  const sum = (l: typeof inRange) => l.reduce((a, b) => a + b.total, 0)
  const group = (key: (b: (typeof inRange)[number]) => string, name: (k: string) => string) => {
    const m = new Map<string, { n: number; t: number }>()
    inRange.forEach((b) => { const k = key(b); const v = m.get(k) ?? { n: 0, t: 0 }; m.set(k, { n: v.n + 1, t: v.t + b.total }) })
    return [...m].map(([k, v]) => ({ name: name(k), ...v }))
  }
  const bySite = group((b) => b.siteId, (k) => db.sites.find((s) => s.id === k)?.name ?? k)
  const bySvc = group((b) => b.serviceId, (k) => db.services.find((s) => s.id === k)?.name ?? k)
  const customers = new Set(inRange.map((b) => b.customerPhone.replace(/\D/g, ''))).size
  const rated = done.filter((b) => b.rating)
  const avg = rated.length ? (rated.reduce((a, b) => a + (b.rating ?? 0), 0) / rated.length).toFixed(1) : '–'

  return (
    <div className="stack">
      <section className="card">
        <div className="grid">
          <label>Desde<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Hasta<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <button onClick={refresh}>Actualizar</button>
      </section>
      {loading && <p className="muted">Cargando…</p>}
      <section className="kpis">
        <div className="kpi"><span>Turnos</span><strong>{inRange.length}</strong></div>
        <div className="kpi"><span>Facturación prevista</span><strong>{money(sum(inRange))}</strong></div>
        <div className="kpi"><span>Cobrado</span><strong>{money(sum(inRange.filter((b) => b.paid)))}</strong></div>
        <div className="kpi"><span>Clientes distintos</span><strong>{customers}</strong></div>
        <div className="kpi"><span>Calificación</span><strong>{avg}</strong></div>
      </section>
      <section className="card"><h2>Por barrio</h2>{bySite.map((r) => <div className="row" key={r.name}><span>{r.name}</span><span>{r.n} · {money(r.t)}</span></div>)}</section>
      <section className="card"><h2>Por servicio</h2>{bySvc.map((r) => <div className="row" key={r.name}><span>{r.name}</span><span>{r.n} · {money(r.t)}</span></div>)}</section>
    </div>
  )
}
