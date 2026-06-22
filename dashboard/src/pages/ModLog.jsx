import { useState, useEffect } from 'react';
import { api } from '../api.js';

const BADGE = { BAN:'#ED4245',KICK:'#E67E22',MUTE:'#FEE75C',WARN:'#5865F2',UNBAN:'#57F287',UNMUTE:'#57F287',NOTE:'#EB459E',DM:'#9B59B6',PURGE:'#7F8C8D',LOCKDOWN:'#FF0000',UNLOCKDOWN:'#57F287',BLACKLIST_ADD:'#FF00FF',BLACKLIST_REMOVE:'#AA00AA',AUTO_BAN:'#C0392B',AUTO_KICK:'#D35400',AUTO_MUTE:'#F39C12',LOCK:'#AAB7C4' };

function Badge({ action }) {
  const c = BADGE[action] || '#5865F2';
  return <span style={{ background:c+'22', color:c, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{action}</span>;
}

function ts(ms) { return new Date(ms).toLocaleString(); }

export default function ModLog({ guild }) {
  const [logs,   setLogs]   = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [expand, setExpand] = useState(null);

  useEffect(() => { api.getModLog(guild.id).then(setLogs).catch(()=>{}); }, [guild.id]);

  const actions = ['ALL', ...new Set(logs.map(l=>l.action))];
  const shown = logs.filter(l =>
    (filter==='ALL' || l.action===filter) &&
    (!search || [l.targetId,l.targetTag,l.modTag,l.reason].some(v=>v?.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:20 }}>Mod Log</h1>
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search user, reason, ID…"
          style={{ flex:1, minWidth:200, background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }} />
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{ background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }}>
          {actions.map(a=><option key={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Action','Target','Moderator','Server','Reason','Time'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'var(--t3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--t3)' }}>No entries found.</td></tr>}
            {shown.map((l,i) => (
              <>
                <tr key={l.id||i} onClick={()=>setExpand(expand===i?null:i)} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{ padding:'10px 14px' }}><Badge action={l.action} /></td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t2)', fontFamily:'monospace' }}>{l.targetTag||l.targetId}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t2)' }}>{l.modTag||l.modId}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t3)' }}>{l.guildName||'—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t2)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {l.action==='DM' ? <span style={{ color:'var(--purple)' }}>📨 {l.extra?.dmMessage||l.reason}</span> : l.reason}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' }}>{ts(l.timestamp)}</td>
                </tr>
                {expand===i && (
                  <tr key={`exp-${i}`} style={{ background:'var(--bg-hover)' }}>
                    <td colSpan={6} style={{ padding:'12px 20px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10, fontSize:12 }}>
                        <div><span style={{ color:'var(--t3)' }}>Log ID</span><br/><code style={{ color:'var(--t2)' }}>{l.id}</code></div>
                        <div><span style={{ color:'var(--t3)' }}>Target ID</span><br/><code style={{ color:'var(--t2)' }}>{l.targetId}</code></div>
                        <div><span style={{ color:'var(--t3)' }}>Mod ID</span><br/><code style={{ color:'var(--t2)' }}>{l.modId}</code></div>
                        {l.extra?.duration && <div><span style={{ color:'var(--t3)' }}>Duration</span><br/><span style={{ color:'var(--t2)' }}>{l.extra.duration}</span></div>}
                        {l.extra?.dmMessage && <div style={{ gridColumn:'1/-1' }}><span style={{ color:'var(--t3)' }}>DM Message</span><br/><span style={{ color:'var(--purple)' }}>{l.extra.dmMessage}</span></div>}
                        {l.extra?.warnId && <div><span style={{ color:'var(--t3)' }}>Warning ID</span><br/><code style={{ color:'var(--yellow)' }}>{l.extra.warnId}</code></div>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop:8, color:'var(--t3)', fontSize:11 }}>Showing {shown.length} of {logs.length} entries — click a row to expand</p>
    </div>
  );
}
