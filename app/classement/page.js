'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ClassementPublicPage() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const sortScores = (arr) => [...arr].sort((a,b) => (b.points ?? 0) - (a.points ?? 0))

  useEffect(() => {
    let ignore = false

    async function load() {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('scores')
        .select('name, points')
        .order('points', { ascending: false })

      if (ignore) return
      if (error) setErr(error.message)
      else setScores(sortScores(data || []))
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('public:scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
        setScores(prev => {
          if (payload.eventType === 'INSERT') return sortScores([payload.new, ...prev.filter(r => r.name !== payload.new.name)])
          if (payload.eventType === 'UPDATE') return sortScores(prev.map(r => r.name === payload.new.name ? payload.new : r))
          if (payload.eventType === 'DELETE') return prev.filter(r => r.name !== payload.old.name)
          return prev
        })
      })
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(ch)
    }
  }, [])

  return (
    <section className="card">
      <h1>Classement</h1>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {loading ? <p>Chargement…</p> : (
        scores.length === 0 ? <p>Aucun score.</p> : (
          <table style={{ marginTop: 12, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>#</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Nom</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((row, i) => (
                <tr key={row.name}>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{i + 1}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.name}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </section>
  )
}
