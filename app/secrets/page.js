'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SecretsPublicPage() {
  const [secrets, setSecrets] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('secrets')
        .select('id, author, content, revealed, created_at')
        .order('created_at', { ascending: false })

      if (ignore) return
      if (error) setErr(error.message)
      else setSecrets(data || [])
      setLoading(false)
    }
    load()

    // Realtime (INSERT / UPDATE / DELETE)
    const ch = supabase
      .channel('public:secrets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'secrets' }, (payload) => {
        setSecrets((prev) => {
          if (payload.eventType === 'INSERT') return [payload.new, ...prev]
          if (payload.eventType === 'UPDATE') return prev.map(s => s.id === payload.new.id ? payload.new : s)
          if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== payload.old.id)
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
      <h1>Voir les Secrets</h1>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {loading ? <p>Chargement…</p> : (
        secrets.length === 0 ? <p>Aucun secret.</p> : (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {secrets.map(s => (
              <div key={s.id} className="secret-card">
                <p><b>Nom:</b> {s.revealed ? (s.author || 'Anonyme') : 'Anonyme'}</p>
                <p><b>Secret:</b> {s.content}</p>
                <p style={{ fontSize: 12, color: '#777' }}>
                  {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  )
}
