// lib/supabaseServer.js
import { createClient } from '@supabase/supabase-js'

// Client admin (clé SERVICE ROLE) → uniquement côté serveur / API
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role key
  { auth: { persistSession: false } }
)

// Client serveur classique (clé anonyme)
export const createServerClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )
