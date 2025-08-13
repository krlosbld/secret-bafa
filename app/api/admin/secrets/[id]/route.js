import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export async function DELETE(_req, { params }) {
  try {
    if (!params?.id) {
      return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('secrets')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('SUPABASE DELETE ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('ROUTE DELETE CRASH:', e)
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
