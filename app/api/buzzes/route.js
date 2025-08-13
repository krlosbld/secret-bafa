import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseServer'


export async function POST(req) {
  try {
    const { author, message } = await req.json().catch(() => ({}))
    const name = typeof author === 'string' ? author.trim() : ''
    const msg  = typeof message === 'string' ? message.trim() : ''

    if (!msg) {
      return NextResponse.json({ error: 'message requis' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('buzzes')
      .insert([{ author: name || null, text: msg }]) // <-- ICI: on remplit "text"
      .select('id, author, text, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, buzz: data })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
