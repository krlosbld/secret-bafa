'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SubmitSecret() {
  const router = useRouter()
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setOk(false)

    if (!content.trim()) {
      setError('Le secret est vide.')
      return
    }

    setLoading(true)
    const payload = {
      author: author.trim() || 'Anonyme',
      content: content.trim(),
      revealed: false // toujours caché au départ
    }

    const { error } = await supabase.from('secrets').insert([payload])

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setOk(true)
    setAuthor('')
    setContent('')

    setTimeout(() => router.push('/'), 800)
  }

  return (
    <section className="card">
      <h1>Soumettre un Secret</h1>

      <form onSubmit={handleSubmit} style={{marginTop: 16, display:'grid', gap:12}}>
        <label className="secret-field">
          <b>Nom (facultatif)</b>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Ton nom ou pseudo"
          />
        </label>

        <label className="secret-field">
          <b>Secret</b>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Écris ton secret ici…"
            required
          />
        </label>

        <button type="submit" disabled={loading} className="btn">
          {loading ? 'Envoi…' : 'Envoyer'}
        </button>

        {error && <p style={{color:'crimson'}}>{error}</p>}
        {ok && <p style={{color:'green'}}>Secret envoyé ✅</p>}
      </form>
    </section>
  )
}
