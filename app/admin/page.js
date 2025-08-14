'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

// Utilitaire: retourne "YYYY-MM-DD" pour l'heure Europe/Paris
function toYYYYMMDD(date = new Date(), tz = 'Europe/Paris') {
  const s = new Date(
    new Date().toLocaleString('en-US', { timeZone: tz })
  ).toISOString().slice(0, 10)
  return s
}

export default function AdminPage() {
  const [code, setCode] = useState('')
  const [ok, setOk] = useState(false)

  const [secrets, setSecrets] = useState([])
  const [scores, setScores] = useState([])
  const [buzzes, setBuzzes] = useState([])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [pendingName, setPendingName] = useState(null)

  const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE
  const SESSION_DURATION = 10 * 60 * 1000 // 10 minutes

  // Au chargement, on vérifie si une session est encore valide
  useEffect(() => {
    const saved = localStorage.getItem('adminSession')
    if (saved) {
      try {
        const { code: savedCode, timestamp } = JSON.parse(saved)
        if (savedCode === ADMIN_CODE && Date.now() - timestamp < SESSION_DURATION) {
          setCode(savedCode)
          setOk(true)
        } else {
          localStorage.removeItem('adminSession')
        }
      } catch {
        localStorage.removeItem('adminSession')
      }
    }
  }, [])

  // Si l'admin se connecte, on sauvegarde la session
  useEffect(() => {
    if (ok) {
      localStorage.setItem('adminSession', JSON.stringify({
        code,
        timestamp: Date.now()
      }))
    }
  }, [ok])

  useEffect(() => {
    if (!ok) return
    let ignore = false

    async function loadAll() {
      setLoading(true)
      setErr(null)

      const [sec, sco, buz] = await Promise.all([
        supabase.from('secrets').select('id, author, content, revealed, created_at').order('created_at', { ascending: false }),
        supabase.from('scores').select('name, points').order('points', { ascending: false }),
        supabase.from('buzzes').select('id,author,content:text,created_at').order('created_at', { ascending: false }),
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
    setSecrets(prev => prev.map(x => x.id === s.id ? { ...x, revealed: !x.revealed } : x))
    const res = await fetch(`/api/admin/secrets/${s.id}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed: !s.revealed }),
      cache: 'no-store'
    })
    if (!res.ok) {
      setSecrets(prev => prev.map(x => x.id === s.id ? { ...x, revealed: s.revealed } : x))
      const { error } = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setErr(error || 'Erreur reveal')
    }
  }

  // Supprime le secret + enlève le joueur du classement si c’était son dernier secret
  async function removeSecret(id) {
    if (!confirm('Supprimer ce secret ?')) return

    const prevSecrets = secrets
    const prevScores = scores

    // Récupérer l'auteur du secret ciblé
    const target = prevSecrets.find(s => s.id === id)
    const author = (target?.author || '').trim()
    const authorKey = author.toLowerCase()

    // Optimistic: retirer le secret immédiatement
    setSecrets(prevSecrets.filter(x => x.id !== id))

    try {
      const res = await fetch(`/api/admin/secrets/${id}`, { method: 'DELETE', cache: 'no-store' })
      if (!res.ok) {
        setSecrets(prevSecrets)
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur delete (${res.status})`)
      }

      // S'il n'y a plus aucun autre secret pour cet auteur -> retirer du classement (local + serveur)
      if (author) {
        const stillHasSecret = prevSecrets.some(
          s => s.id !== id && (s.author || '').trim().toLowerCase() === authorKey
        )
        if (!stillHasSecret) {
          // UI locale
          setScores(prevScores.filter(r => (r.name || '').trim().toLowerCase() !== authorKey))
          // Nettoyage côté serveur (supprimer la ligne dans "scores")
          await fetch('/api/admin/scores/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: author }),
            cache: 'no-store'
          })
        }
      }
    } catch (e) {
      // rollback complet si souci
      setSecrets(prevSecrets)
      setScores(prevScores)
      alert(e.message || 'Erreur suppression')
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
    } finally {
      setPendingName(null)
    }
  }

  async function resetAll() {
    const sure = confirm('⚠️ Cette action efface TOUT. Continuer ?')
    if (!sure) return
    const check = prompt('Pour confirmer, tape exactement : RESET')
    if (check !== 'RESET') return
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ADMIN_CODE }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur reset')
      setSecrets([])
      setScores([])
      setBuzzes([])
      alert('Base réinitialisée ✅')
    } catch (e) {
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
      <p style={{ margin: '6px 0', fontSize: 12, color: '#888' }}>build: admin optimisée</p>

      {/* Actions rapides */}
      <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
        <Link href="/admin/archive" className="btn">Voir l’archive</Link>

        <button className="btn" onClick={async () => {
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
        }}>
          Archiver aujourd’hui
        </button>

        {/* NOUVEAU : Restaurer une journée */}
        <button
          className="btn"
          onClick={async () => {
            const def = toYYYYMMDD() // propose la date du jour (Europe/Paris)
            const date = prompt('Restaurer quelle date ? (YYYY-MM-DD)', def)
            if (!date) return
            try {
              const res = await fetch('/api/admin/archive/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: ADMIN_CODE, date })
              })
              const json = await res.json().catch(() => ({}))
              if (!res.ok) throw new Error(json.error || `Erreur (${res.status})`)
              alert(`Restauration OK — ${json.restored ?? 0} buzz remis ✅`)
            } catch (e) {
              alert(e.message || 'Erreur restauration')
            }
          }}
        >
          Restaurer une journée
        </button>

        <button
          className="btn"
          style={{ background: '#ef4444', color: '#fff' }}
          onClick={resetAll}
        >
          Tout réinitialiser
        </button>
      </div>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {loading ? <p>Chargement…</p> : (
        <>
          {/* Secrets */}
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

          {/* Classement */}
          <h2 style={{ marginTop: 24 }}>Classement</h2>
          {scores.length === 0 ? (
            <p>Aucun score.</p>
          ) : (
            <table style={{ marginTop: 12, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>#</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Nom</th>
                  <th style={{ width: '80px', textAlign: 'right', borderBottom: '1px solid #ddd', padding: '8px' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((row, index) => (
                  <tr key={row.name}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{index + 1}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row.name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Buzzes */}
          <h2 style={{ marginTop: 24 }}>Buzzes</h2>
          {buzzes.length === 0 ? (
            <p>Aucun buzz pour l’instant.</p>
          ) : (
            <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              {buzzes.map(b => (
                <div key={b.id} className="secret-card">
                  <p><b>Auteur :</b> {b.author || 'Anonyme'}</p>
                  <p><b>Buzz :</b> {b.content}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString('fr-FR') : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
