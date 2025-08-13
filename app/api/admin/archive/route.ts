import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // ⚠️ Service role uniquement côté serveur
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from('buzzes_archive')
      .select('id, author, text, content, created_at, archived_at, archived_on', { count: 'exact' })
      .order('archived_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({ page, limit, total: count ?? 0, items: data ?? [] })
  } catch (e: any) {
    console.error('[archive API] ', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
