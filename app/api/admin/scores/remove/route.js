// app/api/admin/scores/remove/route.js
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const { name } = await req.json().catch(() => ({}))
    const trimmed = (name || '').trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'name requis' }, { status: 400 })
    }

    // suppression case-insensitive sans wildcard
    const { error } = await supabaseAdmin
      .from('scores')
      .delete()
      .ilike('name', trimmed) // exact si pas de % dans le pattern

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
