'use client';
import { useEffect, useState } from 'react';

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export default function Prenom() {
  const [prenom, setPrenom] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem('prenom');
      const id = localStorage.getItem('userId');
      if (!id) localStorage.setItem('userId', genId());
      if (p) setPrenom(p);
      else setEditing(true);
    } catch {}
  }, []);

  const save = () => {
    const val = prenom.trim();
    if (!val) return;
    localStorage.setItem('prenom', val);
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={(e)=>{e.preventDefault(); save();}} style={{display:'flex', gap:8, alignItems:'center'}}>
        <label htmlFor="prenom" style={{fontSize:14}}>Prénom :</label>
        <input
          id="prenom"
          value={prenom}
          onChange={(e)=>setPrenom(e.target.value)}
          placeholder="ex: Léa"
          style={{padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:8}}
        />
        <button type="submit" style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer'}}>
          OK
        </button>
      </form>
    );
  }

  return (
    <div style={{display:'flex', gap:8, alignItems:'center', fontSize:14}}>
      <span>Bonjour, <strong>{prenom}</strong></span>
      <button onClick={()=>setEditing(true)} style={{padding:'4px 8px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer'}}>
        Changer
      </button>
    </div>
  );
}
