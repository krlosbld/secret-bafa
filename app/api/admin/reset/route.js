import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Service Role: serveur uniquement
  { auth: { persistSession: false } }
)

export async function POST(req) {
  try {
    const { code } = await req.json().catch(() => ({}))
    // Protection simple par code admin
    if (!code || code !== process.env.NEXT_PUBLIC_ADMIN_CODE) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // ⚠️ IMPORTANT : pour vider complètement une table via PostgREST,
    // on met une condition "NOT NULL" générique, sinon certains environnements
    // refusent .delete() sans filtre.
    const deletions = [
      supabase.from('secrets').delete().not('id', 'is', null),
      supabase.from('scores').delete().not('name', 'is', null),
      supabase.from('buzzes').delete().not('id', 'is', null),
      supabase.from('buzzes_archive').delete().not('id', 'is', null),
    ]

    const results = await Promise.all(deletions)
    const err = results.find(r => r.error)?.error
    if (err) throw err

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin reset]', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}