'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Page() {
  const [secrets, setSecrets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      const { data, error } = await supabase
        .from('secrets')
        .select('id, author, content, revealed, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else if (!ignore) {
        setSecrets(data || [])
      }
      setLoading(false)
    }

    load()

    // Realtime (nouveaux secrets sans recharger la page)
    const channel = supabase
      .channel('realtime:secrets')
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
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <section className="card"><p>Chargement…</p></section>
  if (error)   return <section className="card"><p>Erreur : {error}</p></section>

  return (
    <section className="card">
      <h1>Voir les Secrets</h1>

      {secrets.length === 0 ? (
        <p style={{ marginTop: 12 }}>Aucun secret pour le moment.</p>
      ) : (
        <div className="secret-list" style={{ marginTop: 16 }}>
          {secrets.map(item => (
            <div key={item.id} className="secret-card">
              <p className="secret-field">
                <b>Nom:</b> {item.revealed ? <strong>{item.author}</strong> : 'Anonyme'}
              </p>
              <p className="secret-field">
                <b>Secret:</b> <span className="secret-text">{item.content}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
