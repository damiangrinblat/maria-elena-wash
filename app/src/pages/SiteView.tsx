import { useEffect, useState } from 'react'
import { siteReport, useDB, type SiteReport } from '../store'
import { money, prettyDate, toISO } from '../lib'

const PIN_KEY = 'mew-site-pin'

/** Comisión sobre lo facturado: turnos finalizados del período. */
function commissionFor(site: SiteReport['site'], rows: SiteReport['rows']) {
  if (site.commissionType === 'percent') return rows.reduce((a, b) => a + b.total, 0) * (site.commissionValue / 100)
  if (site.commissionType === 'fixed') return rows.length * site.commissionValue
  return 0
}

/** Acceso de solo lectura para la administración de un barrio o club. No muestra datos personales de los clientes. */
export default function SiteView() {
  const db = useDB()
  const [pin, setPin] = useState(() => sessionStorage.getItem(PIN_KEY) ?? '')
  const [report, setReport] = useState<SiteReport | null>(null)
  const [checking, setChecking] = useState(true)
  const [from, setFrom] = useState(() => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [to, setTo] = useState(() => toISO(new Date()))

  async function load(p: string) {
    const r = await siteReport(p, from, to)
    setReport(r)
    return r
  }

  useEffect(() => {
    if (!pin) return setChecking(false)
    load(pin).finally(() => setChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (pin && report) void load(pin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  if (checking) return <div className="page" />

  if (!pin || !report) {
    return (
      <div className="page">
        <section className="card">
          <h2>Acceso de administración del barrio</h2>
          <PinLogin onOk={async (p) => {
            const r = await load(p)
            if (r) { sessionStorage.setItem(PIN_KEY, p); setPin(p) } else alert('PIN incorrecto')
          }} />
          <a href="#/" className="muted small">Volver</a>
        </section>
      </div>
    )
  }

  const { site, rows } = report
  const billed = rows.reduce((a, b) => a + b.total, 0)
  const collected = rows.filter((b) => b.paid).reduce((a, b) => a + b.total, 0)
  const commission = commissionFor(site, rows)

  const byDay = new Map<string, { n: number; t: number }>()
  rows.forEach((b) => { const v = byDay.get(b.date) ?? { n: 0, t: 0 }; byDay.set(b.date, { n: v.n + 1, t: v.t + b.total }) })
  const bySvc = new Map<string, { n: number; t: number }>()
  rows.forEach((b) => {
    const name = db.services.find((s) => s.id === b.serviceId)?.name ?? b.serviceId
    const v = bySvc.get(name) ?? { n: 0, t: 0 }; bySvc.set(name, { n: v.n + 1, t: v.t + b.total })
  })

  const rule = site.commissionType === 'percent' ? `${site.commissionValue}% de lo facturado`
    : site.commissionType === 'fixed' ? `${money(site.commissionValue)} por lavado` : 'Sin comisión configurada'

  function exportCsv() {
    const table = [['Fecha', 'Hora', 'Servicio', 'Monto', 'Cobrado'],
      ...rows.map((b) => [b.date, b.time, db.services.find((s) => s.id === b.serviceId)?.name ?? b.serviceId, String(b.total), b.paid ? 'Sí' : 'No'])]
    const blob = new Blob(['﻿' + table.map((r) => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `movimientos-${site.name}-${from}-${to}.csv`
    a.click()
  }

  return (
    <div className="page wide">
      <header className="row">
        <h1>{site.name}</h1>
        <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setPin(''); setReport(null) }}>Salir</button>
      </header>
      <p className="muted">Movimientos de esta app en su barrio. Solo lectura. Acuerdo: {rule}.</p>
      <div className="stack">
        {site.siteNotice && <section className="card"><strong>Aviso</strong><p>{site.siteNotice}</p></section>}
        <section className="card">
          <div className="grid">
            <label>Desde<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>Hasta<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <button onClick={() => load(pin)}>Actualizar</button>
        </section>
        <section className="kpis">
          <div className="kpi"><span>Lavados realizados</span><strong>{rows.length}</strong></div>
          <div className="kpi"><span>Facturado</span><strong>{money(billed)}</strong></div>
          <div className="kpi"><span>Cobrado</span><strong>{money(collected)}</strong></div>
          <div className="kpi"><span>Comisión del barrio</span><strong>{money(commission)}</strong></div>
        </section>
        <section className="card">
          <h2>Por día</h2>
          {[...byDay].sort().map(([d, v]) => <div className="row" key={d}><span>{prettyDate(d)}</span><span>{v.n} · {money(v.t)}</span></div>)}
          {byDay.size === 0 && <p className="muted">Sin movimientos en el período.</p>}
        </section>
        <section className="card">
          <h2>Por servicio</h2>
          {[...bySvc].map(([k, v]) => <div className="row" key={k}><span>{k}</span><span>{v.n} · {money(v.t)}</span></div>)}
        </section>
        <button onClick={exportCsv} disabled={rows.length === 0}>Exportar a Excel (CSV)</button>
        <p className="muted small">Se cuentan los lavados finalizados. Los turnos cancelados no se incluyen.</p>
      </div>
    </div>
  )
}

function PinLogin({ onOk }: { onOk: (pin: string) => void }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <>
      <label>PIN<input type="password" value={pin} onChange={(e) => setPin(e.target.value)} /></label>
      <button className="primary" disabled={busy} onClick={async () => { setBusy(true); await onOk(pin); setBusy(false) }}>Ingresar</button>
    </>
  )
}
