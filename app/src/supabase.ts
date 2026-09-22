import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Si no hay variables de entorno cargadas, la app sigue funcionando en modo demo (localStorage). */
export const supabase = url && key ? createClient(url, key) : null
