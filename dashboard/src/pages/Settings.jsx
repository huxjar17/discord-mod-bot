import { useState, useEffect } from 'react';
import { api } from '../api.js';

const inp = { width:'100%', background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', color:'var(--t1)' };

function Section({ title, children }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-hover)' }}>
        <p style={{ fontWeight:700, fontSize:14 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20 }}>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:600 }}>{label}</p>
        {desc && <p style={{ color:'var(--t3)', fontSize:12, marginTop:2 }}>{desc}</p>}
      </div>
      <div style={{ minWidth:240 }}>{children}</div>
    </div>
  );
}

export default function SettingsPage({ guild }) {
  const [s,     setS]     = useState(null);
  const [saved, setSaved] = useState(false);
  const [form,  setForm]  = useState({});

  useEffect(() => {
    api.getSettings(guild.id).then(data => {
      setS(data);
      setForm({
        logChannel:          data.logChannel || '',
        ticketCategory:      data.ticketCategory || '',
        ticketLogChannel:    data.ticketLogChannel || '',
        muteAt:              data.escalation?.muteAt ?? 3,
        kickAt:              data.escalation?.kickAt ?? 0,
        banAt:               data.escalation?.banAt  ?? 5,
      });
    }).catch(()=>{});
  }, [guild.id]);

  async function save(e) {
    e.preventDefault();
    await api.patchSettings(guild.id, {
      logChannel:       form.logChannel || null,
      ticketCategory:   form.ticketCategory || null,
      ticketLogChannel: form.ticketLogChannel || null,
      escalation: { muteAt:+form.muteAt, kickAt:+form.kickAt, banAt:+form.banAt },
    });
    setSaved(true); setTimeout(()=>setSaved(false), 2500);
  }

  if (!s) return <p style={{ color:'var(--t3)' }}>Loading…</p>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800 }}>Settings</h1>
        {saved && <span style={{ color:'var(--green)', fontWeight:600, fontSize:13 }}>✓ Saved</span>}
      </div>

      <form onSubmit={save}>
        <Section title="📋 General">
          <Row label="Mod Log Channel ID" desc="Right-click a channel in Discord → Copy Channel ID — mod actions post here">
            <input style={inp} value={form.logChannel} onChange={e=>setForm(f=>({...f,logChannel:e.target.value}))} placeholder="Channel ID e.g. 1234567890123456789" />
          </Row>
        </Section>

        <Section title="🎫 Ticket System">
          <Row label="Ticket Category ID" desc="ID of the category where ticket channels are created">
            <input style={inp} value={form.ticketCategory} onChange={e=>setForm(f=>({...f,ticketCategory:e.target.value}))} placeholder="Category ID" />
          </Row>
          <Row label="Ticket Log Channel ID" desc="Channel where ticket open/close events are logged">
            <input style={inp} value={form.ticketLogChannel} onChange={e=>setForm(f=>({...f,ticketLogChannel:e.target.value}))} placeholder="Channel ID" />
          </Row>
          <div style={{ padding:'12px 20px' }}>
            <p style={{ color:'var(--t3)', fontSize:12 }}>
              💡 To get IDs: enable Developer Mode in Discord Settings → Appearance, then right-click any channel/category → Copy ID
            </p>
          </div>
        </Section>

        <Section title="⚡ Auto-Escalation on Warnings">
          <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ color:'var(--t3)', fontSize:12 }}>Automatically escalate actions when a user accumulates warnings. Set to 0 to disable that tier.</p>
          </div>
          <Row label="Mute at X warnings" desc="User gets timed out for 1 hour">
            <input style={{ ...inp, width:100 }} type="number" min={0} value={form.muteAt} onChange={e=>setForm(f=>({...f,muteAt:e.target.value}))} />
          </Row>
          <Row label="Kick at X warnings" desc="User gets kicked from the server">
            <input style={{ ...inp, width:100 }} type="number" min={0} value={form.kickAt} onChange={e=>setForm(f=>({...f,kickAt:e.target.value}))} />
          </Row>
          <Row label="Ban at X warnings" desc="User gets permanently banned">
            <input style={{ ...inp, width:100 }} type="number" min={0} value={form.banAt} onChange={e=>setForm(f=>({...f,banAt:e.target.value}))} />
          </Row>
        </Section>

        <button type="submit" style={{ background:'var(--accent)', color:'#fff', borderRadius:8, padding:'11px 28px', fontWeight:700, fontSize:14 }}>
          💾 Save Settings
        </button>
      </form>

      {/* Read-only info */}
      <Section title="ℹ️ Bot Info">
        <Row label="Guild ID" desc="This server's Discord ID">
          <code style={{ color:'var(--t2)', fontSize:12 }}>{guild.id}</code>
        </Row>
        <Row label="Members" desc="Current member count">
          <span style={{ color:'var(--t2)' }}>{guild.memberCount?.toLocaleString()}</span>
        </Row>
        <div style={{ padding:'16px 20px' }}>
          <p style={{ fontWeight:600, marginBottom:6 }}>Support Roles</p>
          <p style={{ color:'var(--t3)', fontSize:12 }}>
            {s.supportRoles?.length ? s.supportRoles.map(r=><code key={r} style={{ background:'var(--bg-inp)', padding:'2px 6px', borderRadius:4, marginRight:6 }}>{r}</code>) : 'None set — use /ticket setup in Discord to configure'}
          </p>
        </div>
      </Section>
    </div>
  );
}
