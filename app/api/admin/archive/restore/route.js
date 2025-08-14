import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // service role: serveur uniquement
  { auth: { persistSession: false } }
)

export async function POST(req) {
  try {
    const { code, date } = await req.json().catch(() => ({}))

    if (!code || code !== process.env.NEXT_PUBLIC_ADMIN_CODE) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (!date) {
      return NextResponse.json({ error: 'Date requise (YYYY-MM-DD)' }, { status: 400 })
    }

    // 1) lire l’archive du jour
    const { data: archived, error: fetchError } = await supabase
      .from('buzzes_archive')
      .select('author, text, created_at')
      .eq('archived_on', date)

    if (fetchError) throw fetchError
    if (!archived?.length) {
      return NextResponse.json({ error: 'Aucune archive pour cette date' }, { status: 404 })
    }

    // 2) réinsérer dans buzzes
    const { error: insertError } = await supabase
      .from('buzzes')
      .insert(
        archived.map(b => ({
          author: b.author ?? null,
          text: b.text,
          created_at: b.created_at
        }))
      )

    if (insertError) throw insertError

    return NextResponse.json({ ok: true, restored: archived.length })
  } catch (e) {
    console.error('[archive restore]', e)
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}
