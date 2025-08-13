'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function fmt(d) {
  try { return new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) }
  catch { return d }
}

const S = {
  page: { maxWidth: 860, margin: '0 auto', padding: 24 },
  headerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  h1: { fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' },
  sub: { color: '#6b7280', fontSize: 14, marginTop: 6 },
  linkBtn: {
    display: 'inline-block', padding: '8px 12px', borderRadius: 12,
    border: '1px solid #e5e7eb', textDecoration: 'none', color: '#111827',
    background: '#fff',
  },
  toolbar: { display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 20px' },
  btn: {
    padding: '8px 12px', borderRadius: 12, border: '1px solid #e5e7eb',
    background: '#fff', cursor: 'pointer'
  },
  btnPrimary: {
    padding: '8px 12px', borderRadius: 12, border: '1px solid #059669',
    background: '#059669', color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  grid: { display: 'grid', gap: 12 },
  card: {
    border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  },
  muted: { color: '#6b7280', fontSize: 13 },
  chip: {
    display: 'inline-flex', alignItems: 'center',
    border: '1px solid #e5e7eb', borderRadius: 999, padding: '2px 8px',
    fontSize: 12, color: '#6b7280'
  },
  label: { fontWeight: 600, color: '#374151', fontSize: 14 },
  msg: { marginTop: 6, whiteSpace: 'pre-wrap', color: '#111827' },
  empty: {
    border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center', color: '#6b7280'
  }
}

export default function ArchivePage() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const pages = Math.max(1, Math.ceil(total / limit))

  async function load(p = 1) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/archive?page=${p}&limit=${limit}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
      setItems(json.items || [])
      setTotal(json.total ?? 0)
      setPage(json.page ?? p)
    } catch (e) {
      console.error(e); alert(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  return (
    <div style={S.page}>
      {/* En‑tête */}
      <div style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Archives des buzz</h1>
          <div style={S.sub}>
            {total} élément{total > 1 ? 's' : ''} — page {page} / {pages}
          </div>
        </div>
        <Link href="/admin" style={S.linkBtn}>← Retour admin</Link>
      </div>

      {/* Barre d’actions */}
      <div style={S.toolbar}>
        <button
          style={{ ...S.btn, ...(loading || page <= 1 ? S.btnDisabled : {}) }}
          onClick={() => load(page - 1)}
          disabled={loading || page <= 1}
        >
          ← Précédent
        </button>
        <button
          style={{ ...S.btn, ...(loading || page >= pages ? S.btnDisabled : {}) }}
          onClick={() => load(page + 1)}
          disabled={loading || page >= pages}
        >
          Suivant →
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            style={{ ...S.btnPrimary, ...(loading ? S.btnDisabled : {}) }}
            onClick={() => load(page)}
            disabled={loading}
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={S.empty}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={S.empty}>Aucune archive pour l’instant.</div>
      ) : (
        <div style={S.grid}>
          {items.map((it) => (
            <div key={it.id} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={S.chip}>Archivé : <b style={{ marginLeft: 4, color: '#111827' }}>{fmt(it.archived_at)}</b></span>
                <span style={S.muted}>({it.archived_on})</span>
              </div>

              <div style={{ fontSize: 14 }}>
                <span style={S.label}>De :</span>{' '}
                <span style={{ color: '#111827' }}>{it.author || '—'}</span>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={S.label}>Message</div>
                <p style={S.msg}>{it.text || it.content || '—'}</p>
              </div>

              <div style={{ marginTop: 8, ...S.muted }}>
                Créé le {fmt(it.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
