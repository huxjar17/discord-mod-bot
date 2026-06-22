import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Save } from 'lucide-react';

function Field({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 400 }}>
        <p style={{ fontWeight: 600, fontSize: 14 }}>{label}</p>
        {desc && <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 3 }}>{desc}</p>}
      </div>
      <div style={{ minWidth: 220 }}>{children}</div>
    </div>
  );
}

const inp = {
  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', color: 'var(--text-1)',
};

export default function Settings({ guild }) {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.getSettings(guild.id).then(s => { setSettings(s); setForm({ logChannel: s.logChannel || '', ...s.escalation }); }).catch(() => {});
  }, [guild.id]);

  async function handleSave(e) {
    e.preventDefault();
    const patch = {
      logChannel: form.logChannel || null,
      escalation: {
        muteAt: parseInt(form.muteAt) || 0,
        kickAt: parseInt(form.kickAt) || 0,
        banAt: parseInt(form.banAt) || 0,
      }
    };
    await api.patchSettings(guild.id, patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!settings) return <p style={{ color: 'var(--text-3)' }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Settings</h1>
        {saved && <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>✓ Settings saved</span>}
      </div>

      <form onSubmit={handleSave}>
        {/* General */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>General</h2>
          </div>
          <Field label="Mod Log Channel ID" desc="ID of the channel where mod actions are posted">
            <input style={inp} value={form.logChannel || ''} onChange={e => setForm(f => ({ ...f, logChannel: e.target.value }))} placeholder="Channel ID" />
          </Field>
        </div>

        {/* Escalation */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>⚡ Auto-Escalation on Warnings</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>Automatically escalate actions when a user reaches a certain number of warnings. Set to 0 to disable.</p>
          </div>
          <Field label="Mute at X warnings" desc="User gets timed out (1h) when they hit this many warnings">
            <input style={inp} type="number" min={0} value={form.muteAt ?? 3} onChange={e => setForm(f => ({ ...f, muteAt: e.target.value }))} />
          </Field>
          <Field label="Kick at X warnings" desc="User gets kicked when they hit this many warnings">
            <input style={inp} type="number" min={0} value={form.kickAt ?? 0} onChange={e => setForm(f => ({ ...f, kickAt: e.target.value }))} />
          </Field>
          <Field label="Ban at X warnings" desc="User gets banned when they hit this many warnings">
            <input style={inp} type="number" min={0} value={form.banAt ?? 5} onChange={e => setForm(f => ({ ...f, banAt: e.target.value }))} />
          </Field>
        </div>

        <button type="submit" style={{
          background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '11px 24px',
          fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Save size={15} /> Save Settings
        </button>
      </form>
    </div>
  );
}
