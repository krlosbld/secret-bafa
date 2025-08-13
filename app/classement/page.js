'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// normalisation: trim + sans accents + minuscule
const normalize = (s) =>
  (s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function sortScores(arr) {
  return [...arr].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
}

// fusionne les doublons (Léa / lea / LEA)
function mergeByName(rows) {
  const map = new Map()
  for (const r of rows || []) {
    const key = normalize(r.name)
    if (!key) continue
    const cur = map.get(key)
    if (cur) map.set(key, { name: cur.name, points: (cur.points ?? 0) + (r.points ?? 0) })
    else map.set(key, { name: r.name, points: r.points ?? 0 })
  }
  return Array.from(map.values())
}

export default function Page() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // recharge depuis la base
  async function refresh() {
    setErr(null)
    const { data, error } = await supabase
      .from('scores')
      .select('name, points')
      .order('points', { ascending: false })
    if (error) setErr(error.message)
    setRows(sortScores(mergeByName(data || [])))
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    })()

    // Realtime: à chaque changement on re-fetch (simple & sûr)
    const ch = supabase
      .channel('classement:scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, async (_payload) => {
        await refresh()
      })
      .subscribe((status) => {
        // utile pour debug
        // console.log('Realtime status:', status)
      })

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [])

  return (
    <section className="card">
      <h1>Classement</h1>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {loading ? (
        <p>Chargement…</p>
      ) : rows.length === 0 ? (
        <>
          <p>Pas encore de points.</p>
          <button className="btn" onClick={refresh} style={{ marginTop: 10 }}>Rafraîchir</button>
          <p style={{ fontSize: 12, opacity: .6, marginTop: 8 }}>
            Les points sont ajoutés/retirés par l’admin.
          </p>
        </>
      ) : (
        <>
          <ol style={{ marginTop: 12, paddingLeft: 18 }}>
            {rows.map((r, i) => (
              <li key={normalize(r.name)} style={{ marginBottom: 6 }}>
                <strong>{i + 1}.</strong> {r.name} — <strong>{r.points}</strong> point{r.points > 1 ? 's' : ''}
              </li>
            ))}
          </ol>
          <button className="btn" onClick={refresh} style={{ marginTop: 10 }}>Rafraîchir</button>
        </>
      )}
    </section>
  )
}
