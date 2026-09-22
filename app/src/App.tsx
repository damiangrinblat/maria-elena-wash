import { useEffect, useState } from 'react'
import Admin from './pages/Admin'
import Client from './pages/Client'
import SiteView from './pages/SiteView'
import { loadCatalog, useDB } from './store'

export default function App() {
  const db = useDB()
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    void loadCatalog()
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', db.settings.primaryColor)
    document.title = db.settings.businessName
  }, [db.settings.primaryColor, db.settings.businessName])

  if (hash.startsWith('#/barrio')) return <SiteView />
  return hash.startsWith('#/admin') ? <Admin /> : <Client />
}
