// app/api/admin/secrets/[id]/route.js
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function DELETE(_req, { params }) {
  try {
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    // 1) Récupérer le secret pour connaître l’auteur
    const { data: sec, error: getErr } = await supabaseAdmin
      .from('secrets')
      .select('id, author')
      .eq('id', id)
      .maybeSingle()

    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 400 })
    if (!sec) return NextResponse.json({ error: 'Secret introuvable' }, { status: 404 })

    const author = (sec.author || '').trim()

    // 2) Supprimer le secret
    const { error: delErr } = await supabaseAdmin
      .from('secrets')
      .delete()
      .eq('id', id)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    // 3) Vérifier s’il reste au moins un secret pour cet auteur (comparaison case‑insensitive)
    if (author) {
      const { count, error: cntErr } = await supabaseAdmin
        .from('secrets')
        .select('id', { count: 'exact', head: true })
        .ilike('author', author) // ILIKE sans % = égalité insensible à la casse

      if (cntErr) return NextResponse.json({ error: cntErr.message }, { status: 400 })

      if ((count ?? 0) === 0) {
        // 4) Plus de secret → supprimer sa ligne dans scores
        const { error: scoreErr } = await supabaseAdmin
          .from('scores')
          .delete()
          .ilike('name', author)

        if (scoreErr) {
          // On ne bloque pas la suppression du secret pour ça
          return NextResponse.json({ ok: true, warn: scoreErr.message })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
