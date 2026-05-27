import { createBrowserClient } from '@supabase/ssr'

// Cliente para componentes del lado del cliente (browser).
// Usarlo en Client Components con "use client".
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}