'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SoumettrePage() {
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [secrets, setSecrets] = useState([]) // pour montrer le résultat en bas (optionnel)

  useEffect(() => {
    // charger quelques derniers secrets (optionnel)
    supabase
      .from('secrets')
      .select('id, author, content, revealed, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setSecrets(data || []))

    const ch = supabase
      .channel('public:secrets:submit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'secrets' }, (payload) => {
        setSecrets((prev) => [payload.new, ...prev].slice(0, 10))
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return

    setSending(true)

    // Optimistic: on ajoute tout de suite (anonyme si pas de nom)
    const temp = {
      id: `tmp_${Date.now()}`,
      author: author.trim() || 'Anonyme',
      content: content.trim(),
      revealed: false,
      created_at: new Date().toISOString(),
    }
    setSecrets(prev => [temp, ...prev].slice(0, 10))

    const { error } = await supabase
      .from('secrets')
      .insert([{ author: author.trim() || null, content: content.trim(), revealed: false }])

    if (error) {
      // rollback visuel si tu veux
      setSecrets(prev => prev.filter(s => s.id !== temp.id))
      alert(error.message)
    } else {
      setAuthor('')
      setContent('')
    }
    setSending(false)
  }

  return (
    <section className="card">
      <h1>Soumettre un Secret</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input
          type="text"
          placeholder="Prénom (optionnel)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <textarea
          placeholder="Ton secret…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
        />
        <button className="btn" type="submit" disabled={sending}>
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>

      <h2 style={{ marginTop: 24 }}>Derniers secrets</h2>
      {secrets.length === 0 ? <p>—</p> : (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
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
      )}
    </section>
  )
}
