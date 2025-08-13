'use client'

import { useState } from 'react'

export default function BuzzerPage() {
  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSending(true); setOk(false); setErr(null)
    try {
      const res = await fetch('/api/buzzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, message }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erreur')
      setOk(true); setAuthor(''); setMessage('')
    } catch (e) {
      setErr(e.message || 'Erreur')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card">
      <h1>Buzzer</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="ex: Léa"
          value={author}
          onChange={e => setAuthor(e.target.value)}
        />
        <textarea
          placeholder="Ex. Je buzz Michel pour le secret du saucisson"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
        />
        <button className="btn" type="submit" disabled={sending}>
          {sending ? 'Envoi…' : 'Envoyer le buzz'}
        </button>
      </form>
      {ok && <p style={{ color: 'seagreen' }}>Buzz envoyé ✅</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
    </section>
  )
}