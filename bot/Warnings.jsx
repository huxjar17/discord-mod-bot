import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Trash2, Search } from 'lucide-react';

export default function Warnings({ guild }) {
  const [warns, setWarns] = useState({});
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = () => api.getWarns(guild.id).then(setWarns).catch(() => {});

  useEffect(() => { load(); }, [guild.id]);

  async function removeWarn(userId, warnId) {
    setDeleting(warnId);
    await api.deleteWarn(guild.id, userId, warnId);
    await load();
    setDeleting(null);
  }

  const filtered = Object.entries(warns).filter(([uid]) =>
    !search || uid.includes(search)
  );

  const totalActive = Object.values(warns).flat().filter(w => !w.removed).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Warnings</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 2 }}>{totalActive} active warnings across all users</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by user ID..."
          style={{
            width: '100%', paddingLeft: 36, padding: '9px 12px 9px 36px',
            background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
            fontSize: 13, outline: 'none', maxWidth: 400,
          }}
        />
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: 60 }}>No warnings found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(([userId, userWarns]) => {
          const active = userWarns.filter(w => !w.removed);
          if (active.length === 0) return null;
          return (
            <div key={userId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>{userId}</span>
                </div>
                <span style={{
                  background: active.length >= 4 ? '#ED424522' : active.length >= 2 ? '#FEE75C22' : '#5865F222',
                  color: active.length >= 4 ? 'var(--red)' : active.length >= 2 ? 'var(--yellow)' : 'var(--accent)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                }}>
                  {active.length} warning{active.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                {active.map((w, i) => (
                  <div key={w.id} style={{
                    padding: '12px 18px', borderBottom: i < active.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-3)', minWidth: 80 }}>{w.id}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{w.reason}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(w.timestamp).toLocaleDateString()}</span>
                    <button
                      onClick={() => removeWarn(userId, w.id)}
                      disabled={deleting === w.id}
                      style={{
                        background: '#ED424522', color: 'var(--red)', border: '1px solid #ED424533',
                        borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 12, opacity: deleting === w.id ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
