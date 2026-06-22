import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Bot, Plus, X, Save } from 'lucide-react';

const FEATURES = [
  { key: 'antispam',    label: 'Anti-Spam',          desc: 'Auto-mute users who send 5+ messages in 5 seconds' },
  { key: 'badwords',    label: 'Bad Words Filter',    desc: 'Delete messages containing words from your custom list' },
  { key: 'antiraid',    label: 'Anti-Raid',           desc: 'Detect & kick new accounts during sudden join spikes' },
  { key: 'antiinvite',  label: 'Block Invite Links',  desc: 'Remove Discord invite links posted by members' },
  { key: 'massmention', label: 'Mass Mention Guard',  desc: 'Delete messages mentioning 5+ users at once' },
  { key: 'caps',        label: 'Caps Lock Filter',    desc: 'Remove messages that are >70% uppercase (8+ chars)' },
];

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 99, padding: '3px',
        background: on ? 'var(--accent)' : 'var(--bg-input)',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'all 0.2s', display: 'flex', alignItems: 'center',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 99, background: '#fff',
        transform: on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s',
      }} />
    </button>
  );
}

export default function AutoMod({ guild }) {
  const [settings, setSettings] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [saved, setSaved] = useState(false);

  const load = () => api.getSettings(guild.id).then(setSettings).catch(() => {});
  useEffect(() => { load(); }, [guild.id]);

  async function save(patch) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await api.patchSettings(guild.id, updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleFeature(key, val) {
    const automod = { ...settings.automod, [key]: val };
    save({ automod });
  }

  function addWord(e) {
    e.preventDefault();
    const w = newWord.trim().toLowerCase();
    if (!w || settings.badWordList.includes(w)) return;
    const list = [...settings.badWordList, w];
    save({ badWordList: list });
    setNewWord('');
  }

  function removeWord(w) {
    save({ badWordList: settings.badWordList.filter(x => x !== w) });
  }

  if (!settings) return <p style={{ color: 'var(--text-3)' }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>AutoMod</h1>
        {saved && <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
      </div>

      {/* Feature Toggles */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={16} color="var(--accent)" />
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>AutoMod Features</h2>
        </div>
        {FEATURES.map((f, i) => (
          <div key={f.key} style={{
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
            borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</p>
              <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>{f.desc}</p>
            </div>
            <Toggle on={!!settings.automod?.[f.key]} onChange={v => toggleFeature(f.key, v)} />
          </div>
        ))}
      </div>

      {/* Bad Word List */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>🚫 Bad Word List</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>Messages containing these words will be auto-deleted (requires Bad Words Filter to be on)</p>
        </div>
        <div style={{ padding: 20 }}>
          <form onSubmit={addWord} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="Add a word or phrase..."
              style={{
                flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
              }}
            />
            <button type="submit" style={{
              background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '9px 16px',
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Plus size={14} /> Add
            </button>
          </form>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(settings.badWordList || []).map(w => (
              <span key={w} style={{
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 10px', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {w}
                <button onClick={() => removeWord(w)} style={{ background: 'none', color: 'var(--text-3)', lineHeight: 0 }}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {(settings.badWordList || []).length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No words added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
