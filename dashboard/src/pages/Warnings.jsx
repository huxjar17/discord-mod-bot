import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Warnings({ guild }) {
  const [warns,  setWarns]  = useState({});
  const [search, setSearch] = useState('');

  const load = () => api.getWarns(guild.id).then(setWarns).catch(()=>{});
  useEffect(() => { load(); }, [guild.id]);

  async function remove(userId, warnId) {
    await api.deleteWarn(guild.id, userId, warnId);
    load();
  }

  const entries = Object.entries(warns).filter(([uid])=>!search||uid.includes(search)||(warns[uid]?.[0]?.reason||'').toLowerCase().includes(search.toLowerCase()));
  const totalActive = Object.values(warns).flat().filter(w=>!w.removed).length;

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Warnings</h1>
      <p style={{ color:'var(--t2)', marginBottom:20 }}>{totalActive} active warnings across all users</p>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by user ID…"
        style={{ width:'100%', maxWidth:380, background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', marginBottom:18 }} />

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {entries.map(([userId, userWarns]) => {
          const active = userWarns.filter(w=>!w.removed);
          if (!active.length) return null;
          return (
            <div key={userId} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
              <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <code style={{ fontSize:13, fontWeight:600 }}>{userId}</code>
                <span style={{ background:active.length>=4?'var(--red)22':active.length>=2?'var(--yellow)22':'var(--accent)22', color:active.length>=4?'var(--red)':active.length>=2?'var(--yellow)':'var(--accent)', borderRadius:6, padding:'2px 10px', fontSize:12, fontWeight:700 }}>
                  {active.length} warning{active.length!==1?'s':''}
                </span>
              </div>
              {active.map((w,i)=>(
                <div key={w.id} style={{ padding:'10px 18px', borderBottom:i<active.length-1?'1px solid var(--border)':'none', display:'flex', alignItems:'center', gap:12 }}>
                  <code style={{ fontSize:11, color:'var(--t3)', minWidth:80 }}>{w.id}</code>
                  <span style={{ flex:1, fontSize:13 }}>{w.reason}</span>
                  <span style={{ fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' }}>{w.modTag||w.modId}</span>
                  <span style={{ fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' }}>{new Date(w.timestamp).toLocaleDateString()}</span>
                  <button onClick={()=>remove(userId,w.id)}
                    style={{ background:'var(--red)22', color:'var(--red)', border:'1px solid var(--red)33', borderRadius:6, padding:'4px 10px', fontSize:12 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {entries.every(([,w])=>w.filter(x=>!x.removed).length===0) && (
          <p style={{ color:'var(--t3)', textAlign:'center', marginTop:50 }}>No active warnings found.</p>
        )}
      </div>
    </div>
  );
}
