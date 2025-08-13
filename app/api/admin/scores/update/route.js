// app/api/admin/scores/update/route.js
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawName = body?.name
    const rawDelta = body?.delta

    const name = typeof rawName === 'string' ? rawName.trim() : ''
    const delta = Number(rawDelta)

    if (!name || !Number.isFinite(delta)) {
      return NextResponse.json(
        { error: 'name (string) et delta (number) requis' },
        { status: 400 }
      )
    }

    // 1) Lire
    const { data: row, error: selErr } = await supabaseAdmin
      .from('scores')
      .select('name, points')
      .eq('name', name)
      .maybeSingle()

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 400 })
    }

    // 2) Calculer + écrire
    const newPoints = (row?.points || 0) + delta
    const now = new Date().toISOString()

    if (row) {
      const { error: upErr } = await supabaseAdmin
        .from('scores')
        .update({ points: newPoints, updated_at: now })
        .eq('name', name)

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 })
      }
    } else {
      const { error: insErr } = await supabaseAdmin
        .from('scores')
        .insert([{ name, points: newPoints, updated_at: now }])

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true, name, points: newPoints })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
