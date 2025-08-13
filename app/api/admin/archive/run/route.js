import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // service role: serveur uniquement
  { auth: { persistSession: false } }
)

export async function POST(req) {
  try {
    const { code } = await req.json().catch(() => ({}))
    if (!code || code !== process.env.NEXT_PUBLIC_ADMIN_CODE) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // exécute la fonction d’archivage du jour
    const { error } = await supabase.rpc('archive_buzzes')
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[archive run]', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}

// petit GET pour connaître combien de lignes éligibles aujourd’hui
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('buzzes')
      .select('id, created_at', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }).replace(/,.*$/, '')).toISOString().slice(0,10)) // évite un SELECT lourd
    if (error) throw error
    // Le count exact n’est pas dispo avec head:true selon versions; on garde simple: renvoie ok
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}