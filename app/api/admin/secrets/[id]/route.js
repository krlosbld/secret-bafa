// app/api/admin/secrets/[id]/route.js
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'  // 👈 AJOUT

// export const runtime = 'nodejs'

export async function DELETE(_req, { params }) {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('secrets')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
