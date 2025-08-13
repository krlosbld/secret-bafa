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

    const { error } = await supabaseAdmin
      .from('scores')
      .delete()
      .ilike('name', trimmed) // égalité insensible à la casse

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
