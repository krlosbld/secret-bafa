// app/api/admin/secrets/[id]/reveal/route.js
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(_req, { params }) {
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: 'id manquant' }, { status: 400 })
  }

  // Lire l'état actuel du secret
  const { data: secret, error: selErr } = await supabaseAdmin
    .from('secrets')
    .select('revealed')
    .eq('id', id)
    .single()

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 })
  }

  // Déterminer le nouvel état
  const newRevealed = !secret.revealed

  // Mettre à jour
  const { error: updErr } = await supabaseAdmin
    .from('secrets')
    .update({ revealed: newRevealed })
    .eq('id', id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id,
    revealed: newRevealed
  })
}
