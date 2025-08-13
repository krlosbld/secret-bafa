// app/api/admin/secrets/[id]/reveal/route.js
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'  // 👈 AJOUT

// ⚠️ cette route doit tourner en runtime Node (pas Edge)
// export const runtime = 'nodejs'

export async function POST(_req, { params }) {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('secrets')
    .update({ revealed: true, revealed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
