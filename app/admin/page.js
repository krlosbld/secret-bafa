'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

export default function AdminPage() {
  const [code, setCode] = useState('')
  const [ok, setOk] = useState(false)

  const [secrets, setSecrets] = useState([])
  const [scores, setScores] = useState([]) // { name, points }
  const [buzzes, setBuzzes] = useState([]) // { id, author, content, created_at }

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [pendingName, setPendingName] = useState(null)

  const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE

  useEffect(() => {
    if (!ok) return
    let ignore = false

    async function loadAll() {
      setLoading(true)
      setErr(null)

      const [sec, sco, buz] = await Promise.all([
        supabase
          .from('secrets')
          .select('id, author, content, revealed, created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('scores')
          .select('name, points')
          .order('points', { ascending: false }),

        // ✅ alias PostgREST correct: content:text
        supabase
          .from('buzzes')
          .select('id,author,content:text,created_at')
          .order('created_at', { ascending: false }),
      ])

      if (ignore) return

      if (sec.error) setErr(sec.error.message)
      else setSecrets(sec.data || [])

      if (sco.error) setErr(e => e || sco.error.message)
      else setScores(sortScores(sco.data || []))

      if (buz.error) setErr(e => e || buz.error.message)
      else setBuzzes(buz.data || [])

      setLoading(false)
    }
    loadAll()

    // Realtime secrets
    const chSecrets = supabase
      .channel('admin:secrets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'secrets' }, (payload) => {
        setSecrets(prev => {
          if (payload.eventType === 'INSERT') return [payload.new, ...prev]
          if (payload.eventType === 'UPDATE') return prev.map(s => s.id === payload.new.id ? payload.new : s)
          if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== payload.old.id)
          return prev
        })
      })
      .subscribe()

    // Realtime scores
    const chScores = supabase
      .channel('admin:scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
        setScores(prev => {
          if (payload.eventType === 'INSERT') return sortScores([payload.new, ...prev.filter(r => r.name !== payload.new.name)])
          if (payload.eventType === 'UPDATE') return sortScores(prev.map(r => r.name === payload.new.name ? payload.new : r))
          if (payload.eventType === 'DELETE') return prev.filter(r => r.name !== payload.old.name)
          return prev
        })
      })
      .subscribe()

    // Realtime buzzes
    const chBuzzes = supabase
      .channel('admin:buzzes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzes' }, (payload) => {
        // on normalise pour avoir toujours "content"
        const normalizeBuzz = (b) => ({ ...b, content: b?.content ?? b?.text ?? b?.message })
        setBuzzes(prev => {
          if (payload.eventType === 'INSERT') return [normalizeBuzz(payload.new), ...prev]
          if (payload.eventType === 'UPDATE') return prev.map(b => b.id === payload.new.id ? normalizeBuzz(payload.new) : b)
          if (payload.eventType === 'DELETE') return prev.filter(b => b.id !== payload.old.id)
          return prev
        })
      })
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(chSecrets)
      supabase.removeChannel(chScores)
      supabase.removeChannel(chBuzzes)
    }
  }, [ok])

  function sortScores(arr) {
    return [...arr].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  }
  function getRowFor(name) {
    if (!name) return null
    const key = (name || '').trim().toLowerCase()
    return scores.find(r => (r.name || '').trim().toLowerCase() === key) || null
  }
  function pointsFor(name) {
    return getRowFor(name)?.points ?? 0
  }
  function upsertScoreLocal(name, points) {
    setScores(prev => {
      const key = (name || '').trim().toLowerCase()
      const others = prev.filter(r => (r.name || '').trim().toLowerCase() !== key)
      return sortScores([...others, { name, points }])
    })
  }

  async function toggleReveal(s) {
    setErr(null)
    const res = await fetch(`/api/admin/secrets/${s.id}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed: !s.revealed }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setErr(error || 'Erreur reveal')
    }
  }

  async function removeSecret(id) {
    if (!confirm('Supprimer ce secret ?')) return
    const res = await fetch(`/api/admin/secrets/${id}`, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(`Erreur delete (${res.status}) : ${body.error || 'inconnue'}`)
    }
  }

  async function changePoints(name, delta) {
    if (!name) {
      alert("Ce secret n'a pas de prénom — impossible d'attribuer des points.")
      return
    }

    const current = pointsFor(name)
    const optimistic = current + Number(delta || 0)
    upsertScoreLocal(name, optimistic)
    setPendingName(name)

    try {
      const res = await fetch('/api/admin/scores/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, delta: Number(delta) }),
        cache: 'no-store',
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        upsertScoreLocal(name, current)
        throw new Error(body.error || `Erreur points (${res.status})`)
      }

      if (typeof body.points === 'number') {
        upsertScoreLocal(name, body.points)
      }
    } catch (e) {
      alert(e.message)
      console.error(e)
    } finally {
      setPendingName(null)
    }
  }

  // 🔥 Handler ajouté "juste après tes autres fonctions"
  async function resetAll() {
    const sure = confirm('⚠️ Cette action efface TOUT (secrets, buzz, archives, classement). Continuer ?')
    if (!sure) return
    const check = prompt('Pour confirmer, tape exactement : RESET')
    if (check !== 'RESET') return

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ADMIN_CODE }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erreur reset')

      // Vide l’état local (le realtime ré-alimentera quand nécessaire)
      setSecrets([])
      setScores([])
      setBuzzes([])
      alert('Base réinitialisée ✅')
    } catch (e) {
      console.error(e)
      alert(e.message || 'Erreur')
    }
  }

  if (!ok) {
    return (
      <section className="card">
        <h1>Admin</h1>
        <p>Entre le code admin pour accéder à la gestion.</p>
        <form onSubmit={(e) => { e.preventDefault(); setOk(code === ADMIN_CODE) }}>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code admin"
            style={{ marginRight: 8 }}
          />
          <button className="btn" type="submit">Entrer</button>
        </form>
        {code && ok === false && code !== ADMIN_CODE &&
          <p style={{ color: 'crimson', marginTop: 8 }}>Code invalide</p>}
      </section>
    )
  }

  return (
    <section className="card">
      <h1>Gestion — v2</h1>
<p style={{ margin: '6px 0', fontSize: 12, color: '#888' }}>build: admin v2</p>

      {/* Boutons d'accès rapides */}
      <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
        <Link href="/admin/archive" className="btn">Voir l’archive</Link>

        <button
          className="btn"
          onClick={async () => {
            const okNow = confirm('Archiver maintenant les buzz du jour ?')
            if (!okNow) return
            const res = await fetch('/api/admin/archive/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: ADMIN_CODE })
            })
            const json = await res.json().catch(()=>({}))
            if (!res.ok) alert(json.error || 'Erreur')
            else alert('Archivage du jour exécuté ✅')
          }}
        >
          Archiver aujourd’hui
        </button>

        <button
          className="btn"
          style={{ background: '#ef4444', color: '#fff' }}
          onClick={resetAll}
          title="Efface secrets, buzzes, archives et classement"
        >
          Tout réinitialiser
        </button>
      </div>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {loading ? <p>Chargement…</p> : (
        <>
          {/* --- Secrets --- */}
          <h2>Secrets</h2>
          {secrets.length === 0 ? <p>Aucun secret.</p> : (
            <div className="secret-list" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
              {secrets.map(s => {
                const disabled = pendingName && pendingName === s.author
                return (
                  <div key={s.id} className="secret-card">
                    <p><b>Nom:</b> {s.author || 'Anonyme'}</p>
                    <p><b>Secret:</b> {s.content}</p>
                    <p><b>Révélé:</b> {s.revealed ? 'Oui' : 'Non'}</p>
                    <p><b>Points:</b> {pointsFor(s.author)}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={() => changePoints(s.author, +1)} disabled={disabled}>+1</button>
                      <button className="btn" onClick={() => changePoints(s.author, -1)} disabled={disabled}>-1</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn" onClick={() => toggleReveal(s)}>
                        {s.revealed ? 'Cacher le nom' : 'Révéler le nom'}
                      </button>
                      <button className="btn" onClick={() => removeSecret(s.id)}>Supprimer</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* --- Buzzes --- */}
          <h2 style={{ marginTop: 24 }}>Buzz</h2>
          {buzzes.length === 0 ? <p>Aucun buzz.</p> : (
            <div className="secret-list" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
              {buzzes.map(b => (
                <div key={b.id} className="secret-card">
                  <p><b>De:</b> {b.author || 'Anonyme'}</p>
                  <p><b>Message:</b> {b.content}</p>
                  <p><b>Date:</b> {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* --- Classement (live) --- */}
          <h2 style={{ marginTop: 24 }}>Classement</h2>
          {scores.length === 0 ? (
            <p>Aucun score.</p>
          ) : (
            <table style={{ marginTop: 12, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Nom</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((row, index) => (
                  <tr key={row.name}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{index + 1}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row.name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}