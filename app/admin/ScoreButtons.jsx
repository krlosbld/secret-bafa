'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function ScoreButtons({ name, initialPoints = 0 }) {
  const router = useRouter()
  const [points, setPoints] = useState(initialPoints)
  const [isPending, startTransition] = useTransition()

  async function bump(delta) {
    try {
      const res = await fetch('/api/admin/scores/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, delta: Number(delta) }),
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')

      // MAJ immédiate locale + revalidation serveur
      setPoints(json.points)
      startTransition(() => router.refresh())
    } catch (e) {
      alert(e.message)
      console.error(e)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => bump(1)} disabled={isPending}>+1</button>
      <button onClick={() => bump(-1)} disabled={isPending}>-1</button>
      <span className="ml-2">Points: {points}</span>
    </div>
  )
}
