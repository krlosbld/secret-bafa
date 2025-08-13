import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseServer'

export async function POST(req, { params }) {
  try {
    const { revealed } = await req.json().catch(() => ({}))
    if (!params?.id) {
      return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('secrets')
      .update({ revealed: !!revealed })
      .eq('id', params.id)

    if (error) {
      console.error('SUPABASE REVEAL ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('ROUTE REVEAL CRASH:', e)
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
