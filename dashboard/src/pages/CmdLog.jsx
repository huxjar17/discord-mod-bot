import { useState, useEffect } from 'react';
import { api } from '../api.js';

function ts(ms) { return new Date(ms).toLocaleString(); }

export default function CmdLog({ guild }) {
  const [logs,   setLogs]   = useState([]);
  const [search, setSearch] = useState('');
  const [cmd,    setCmd]    = useState('ALL');
  const [expand, setExpand] = useState(null);

  useEffect(() => { api.getCmdLog(guild.id).then(setLogs).catch(()=>{}); }, [guild.id]);

  const cmds = ['ALL', ...new Set(logs.map(l=>l.command))];
  const shown = logs.filter(l =>
    (cmd==='ALL' || l.command===cmd) &&
    (!search || [l.userTag,l.userId,l.guildName,l.command,JSON.stringify(l.details)].some(v=>v?.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Command Log</h1>
      <p style={{ color:'var(--t2)', marginBottom:20 }}>Every command run — who ran it, from what server, and with what options</p>

      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search user, server, command…"
          style={{ flex:1, minWidth:200, background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }} />
        <select value={cmd} onChange={e=>setCmd(e.target.value)}
          style={{ background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none' }}>
          {cmds.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Command','User','Server','Channel','Time'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'var(--t3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length===0 && <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'var(--t3)' }}>No commands logged yet.</td></tr>}
            {shown.map((l,i) => (
              <>
                <tr key={l.id||i} onClick={()=>setExpand(expand===i?null:i)}
                  style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ background:'var(--accent)22', color:'var(--accent)', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:700 }}>/{l.command}</span>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t2)' }}>
                    <span>{l.userTag}</span>
                    <span style={{ color:'var(--t3)', fontSize:11, display:'block' }}>{l.userId}</span>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t2)' }}>{l.guildName||'DM'}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--t3)' }}>#{l.channelName||'—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' }}>{ts(l.timestamp)}</td>
                </tr>
                {expand===i && (
                  <tr key={`exp-${i}`} style={{ background:'var(--bg-hover)' }}>
                    <td colSpan={5} style={{ padding:'14px 20px' }}>
                      <p style={{ color:'var(--t3)', fontSize:11, marginBottom:8 }}>COMMAND DETAILS</p>
                      {Object.keys(l.details||{}).length === 0
                        ? <p style={{ color:'var(--t2)', fontSize:12 }}>No additional details.</p>
                        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
                            {Object.entries(l.details).map(([k,v])=>(
                              <div key={k}>
                                <span style={{ color:'var(--t3)', fontSize:11 }}>{k}</span><br/>
                                <span style={{ color: k==='message'||k==='dmMessage' ? 'var(--purple)' : 'var(--t2)', fontSize:12, wordBreak:'break-all' }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                      }
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop:8, color:'var(--t3)', fontSize:11 }}>Showing {shown.length} of {logs.length} logged commands — click a row to expand details</p>
    </div>
  );
}
