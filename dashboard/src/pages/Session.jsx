import { useState, useEffect } from 'react';
import { api } from '../api.js';

const inp = { width:'100%', background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', color:'var(--t1)' };

function Field({ label, desc, children }) {
  return (
    <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:600, fontSize:14 }}>{label}</p>
          {desc && <p style={{ color:'var(--t3)', fontSize:12, marginTop:2 }}>{desc}</p>}
        </div>
        <div style={{ minWidth:260 }}>{children}</div>
      </div>
    </div>
  );
}

export default function Session({ guild }) {
  const [s,     setS]     = useState(null);
  const [saved, setSaved] = useState(false);

  const load = () => api.getSettings(guild.id).then(setS).catch(()=>{});
  useEffect(() => { load(); }, [guild.id]);

  async function save(patch) {
    const session = { ...s.session, ...patch };
    await api.patchSettings(guild.id, { session });
    setS(prev=>({ ...prev, session }));
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  }

  function field(key) {
    return { value: s?.session?.[key]??'', onChange: e=>save({ [key]:e.target.type==='number'?Number(e.target.value):e.target.value }) };
  }

  if (!s) return <p style={{ color:'var(--t3)' }}>Loading…</p>;
  const p = s.session || {};

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <h1 style={{ fontSize:22, fontWeight:800 }}>Session Dashboard</h1>
        {saved && <span style={{ color:'var(--green)', fontWeight:600, fontSize:13 }}>✓ Saved & live panel updated</span>}
      </div>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>All changes update the live session panel in Discord instantly.</p>

      {/* Server Info */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-hover)' }}>
          <p style={{ fontWeight:700 }}>📋 Server Information</p>
        </div>
        <Field label="Server Name" desc="Name shown in the panel"><input style={inp} {...field('serverName')} placeholder="My Awesome Server" /></Field>
        <Field label="Server Owner" desc="Owner's username to display"><input style={inp} {...field('owner')} placeholder="username" /></Field>
        <Field label="Join Code" desc="Game join code / identifier"><input style={inp} {...field('joinCode')} placeholder="ABC123" /></Field>
        <Field label="Max Players" desc="Maximum player slots"><input style={{ ...inp, width:120 }} type="number" min={1} {...field('maxPlayers')} /></Field>
      </div>

      {/* Live Data */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-hover)' }}>
          <p style={{ fontWeight:700 }}>🟢 Live Session Data</p>
        </div>
        <Field label="Player Count" desc="Current players in-game">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input style={{ ...inp, width:100 }} type="number" min={0} {...field('players')} />
            <span style={{ color:'var(--t3)' }}>/ {p.maxPlayers}</span>
          </div>
        </Field>
        <Field label="Server Queue" desc="Players waiting in queue"><input style={{ ...inp, width:100 }} type="number" min={0} {...field('queue')} /></Field>
        <Field label="Staff Online" desc="Number of staff currently active"><input style={{ ...inp, width:100 }} type="number" min={0} {...field('staff')} /></Field>
      </div>

      {/* Button Links */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-hover)' }}>
          <p style={{ fontWeight:700 }}>🔗 Button Links</p>
        </div>
        <Field label="Join Game URL" desc="Link for the 'Join Game' button (leave blank to hide button)">
          <input style={inp} {...field('joinLink')} placeholder="https://…" />
        </Field>
        <div style={{ padding:'14px 20px' }}>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 16px', fontSize:13, color:'var(--t2)' }}>📡 Session Ping</div>
            {p.joinLink && <a href={p.joinLink} target="_blank" rel="noreferrer" style={{ background:'var(--accent)', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600 }}>🔗 Join Game ↗</a>}
          </div>
          <p style={{ color:'var(--t3)', fontSize:11, marginTop:8 }}>Preview of the Discord panel buttons</p>
        </div>
      </div>
    </div>
  );
}
