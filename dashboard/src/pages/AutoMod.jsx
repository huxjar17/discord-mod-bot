import { useState, useEffect } from 'react';
import { api } from '../api.js';

const FEATURES = [
  { key:'antispam',    label:'Anti-Spam',          desc:'Auto-mute users who send 5+ messages in 5 seconds' },
  { key:'badwords',    label:'Bad Words Filter',    desc:'Delete messages containing words from your list' },
  { key:'antiraid',    label:'Anti-Raid',           desc:'Detect and kick new accounts during join spikes' },
  { key:'antiinvite',  label:'Block Invite Links',  desc:'Remove Discord invite links posted by members' },
  { key:'massmention', label:'Mass Mention Guard',  desc:'Delete messages mentioning 5+ users at once' },
  { key:'caps',        label:'Caps Lock Filter',    desc:'Remove messages that are over 70% uppercase' },
];

function Toggle({ on, onChange }) {
  return (
    <button onClick={()=>onChange(!on)} style={{ width:44, height:24, borderRadius:99, padding:'3px', background:on?'var(--accent)':'var(--bg-inp)', border:`1px solid ${on?'var(--accent)':'var(--border)'}`, transition:'all .2s', display:'flex', alignItems:'center' }}>
      <div style={{ width:16, height:16, borderRadius:99, background:'#fff', transform:on?'translateX(20px)':'translateX(0)', transition:'transform .2s' }} />
    </button>
  );
}

export default function AutoMod({ guild }) {
  const [s,       setS]       = useState(null);
  const [newWord, setNewWord] = useState('');
  const [saved,   setSaved]   = useState(false);

  const load = () => api.getSettings(guild.id).then(setS).catch(()=>{});
  useEffect(() => { load(); }, [guild.id]);

  async function patch(body) {
    const updated = { ...s, ...body };
    setS(updated);
    await api.patchSettings(guild.id, updated);
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  }

  function addWord(e) {
    e.preventDefault();
    const w = newWord.trim().toLowerCase();
    if (!w || s.badWordList?.includes(w)) return;
    patch({ badWordList:[...(s.badWordList||[]),w] });
    setNewWord('');
  }

  if (!s) return <p style={{ color:'var(--t3)' }}>Loading…</p>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800 }}>AutoMod</h1>
        {saved && <span style={{ color:'var(--green)', fontWeight:600, fontSize:13 }}>✓ Saved</span>}
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:22 }}>
        {FEATURES.map((f,i)=>(
          <div key={f.key} style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, borderBottom:i<FEATURES.length-1?'1px solid var(--border)':'none' }}>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:600, fontSize:14 }}>{f.label}</p>
              <p style={{ color:'var(--t3)', fontSize:12, marginTop:2 }}>{f.desc}</p>
            </div>
            <Toggle on={!!s.automod?.[f.key]} onChange={v=>patch({ automod:{...s.automod,[f.key]:v} })} />
          </div>
        ))}
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <p style={{ fontWeight:700, fontSize:14 }}>🚫 Bad Word List</p>
          <p style={{ color:'var(--t3)', fontSize:12, marginTop:2 }}>Requires "Bad Words Filter" to be ON above</p>
        </div>
        <div style={{ padding:20 }}>
          <form onSubmit={addWord} style={{ display:'flex', gap:8, marginBottom:14 }}>
            <input value={newWord} onChange={e=>setNewWord(e.target.value)} placeholder="Add a word or phrase…"
              style={{ flex:1, background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }} />
            <button type="submit" style={{ background:'var(--accent)', color:'#fff', borderRadius:8, padding:'8px 16px', fontWeight:600, fontSize:13 }}>Add</button>
          </form>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {(s.badWordList||[]).map(w=>(
              <span key={w} style={{ background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                {w}
                <button onClick={()=>patch({ badWordList:(s.badWordList||[]).filter(x=>x!==w) })} style={{ background:'none', color:'var(--t3)', fontSize:16, lineHeight:1 }}>×</button>
              </span>
            ))}
            {!(s.badWordList||[]).length && <p style={{ color:'var(--t3)', fontSize:13 }}>No words added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
