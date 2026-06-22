import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Blacklist({ guild }) {
  const [list,   setList]   = useState({});
  const [search, setSearch] = useState('');
  const [form,   setForm]   = useState({ userId:'', userTag:'', reason:'' });
  const [adding, setAdding] = useState(false);
  const [err,    setErr]    = useState('');

  const load = () => api.getBlacklist(guild.id).then(setList).catch(()=>{});
  useEffect(() => { load(); }, [guild.id]);

  async function add(e) {
    e.preventDefault(); setErr(''); setAdding(true);
    try {
      await api.addBlacklist(guild.id, { ...form, addedByTag:'Dashboard' });
      setForm({ userId:'', userTag:'', reason:'' });
      load();
    } catch { setErr('Failed to add. Check the User ID is valid.'); }
    setAdding(false);
  }

  async function remove(userId) {
    await api.removeBlacklist(guild.id, userId);
    load();
  }

  const entries = Object.values(list).filter(e =>
    !search || e.userId.includes(search) || e.userTag?.toLowerCase().includes(search.toLowerCase()) || e.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const inp = { background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', color:'var(--t1)' };

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Blacklist</h1>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>{entries.length} blacklisted users — they are banned on sight if they try to join</p>

      {/* Add form */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:22, marginBottom:24 }}>
        <h2 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🚫 Add to Blacklist</h2>
        <form onSubmit={add} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr auto', gap:10, alignItems:'end' }}>
          <div>
            <label style={{ display:'block', fontSize:12, color:'var(--t3)', marginBottom:4 }}>User ID *</label>
            <input value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))} placeholder="123456789…" required style={{ ...inp, width:'100%' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:'var(--t3)', marginBottom:4 }}>Username (optional)</label>
            <input value={form.userTag} onChange={e=>setForm(f=>({...f,userTag:e.target.value}))} placeholder="user#0000" style={{ ...inp, width:'100%' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:'var(--t3)', marginBottom:4 }}>Reason *</label>
            <input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Reason for blacklist" required style={{ ...inp, width:'100%' }} />
          </div>
          <button type="submit" disabled={adding} style={{ background:'var(--red)', color:'#fff', borderRadius:8, padding:'9px 18px', fontWeight:700, fontSize:13, opacity:adding?.6:1, whiteSpace:'nowrap' }}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </form>
        {err && <p style={{ color:'var(--red)', fontSize:12, marginTop:8 }}>{err}</p>}
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, username, or reason…"
        style={{ width:'100%', maxWidth:380, background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', marginBottom:14 }} />

      {/* List */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['User','User ID','Reason','Added By','Date',''].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'var(--t3)', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length===0 && <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--t3)' }}>No blacklisted users.</td></tr>}
            {entries.map(e=>(
              <tr key={e.userId} style={{ borderBottom:'1px solid var(--border)' }}
                onMouseEnter={x=>x.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={x=>x.currentTarget.style.background=''}>
                <td style={{ padding:'10px 14px', fontSize:13 }}>{e.userTag||'—'}</td>
                <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t3)', fontFamily:'monospace' }}>{e.userId}</td>
                <td style={{ padding:'10px 14px', fontSize:13, color:'var(--t2)' }}>{e.reason}</td>
                <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t3)' }}>{e.addedByTag||'—'}</td>
                <td style={{ padding:'10px 14px', fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' }}>{new Date(e.timestamp).toLocaleDateString()}</td>
                <td style={{ padding:'10px 14px' }}>
                  <button onClick={()=>remove(e.userId)}
                    style={{ background:'var(--red)22', color:'var(--red)', border:'1px solid var(--red)33', borderRadius:6, padding:'4px 10px', fontSize:12 }}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
