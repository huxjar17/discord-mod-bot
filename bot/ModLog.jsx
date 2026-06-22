import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Search } from 'lucide-react';

const ACTION_COLORS = {
  BAN: '#ED4245', KICK: '#E67E22', MUTE: '#FEE75C', WARN: '#5865F2',
  UNBAN: '#57F287', UNMUTE: '#57F287', NOTE: '#EB459E', DM: '#9B59B6',
  AUTO_BAN: '#C0392B', AUTO_KICK: '#D35400', AUTO_MUTE: '#F39C12',
  PURGE: '#7F8C8D', LOCK: '#AAB7C4', LOCKDOWN: '#FF0000', UNMUTE: '#57F287',
};

const ACTION_ICONS = {
  BAN: '🔨', KICK: '👢', MUTE: '🔇', WARN: '⚠️', UNBAN: '✅', UNMUTE: '🔊',
  NOTE: '📝', DM: '📨', AUTO_BAN: '🤖🔨', AUTO_KICK: '🤖👢', AUTO_MUTE: '🤖🔇',
  PURGE: '🗑️', LOCK: '🔒', LOCKDOWN: '🚨',
};

function ts(ms) {
  return new Date(ms).toLocaleString();
}

export default function ModLog({ guild }) {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.getModLog(guild.id).then(setLogs).catch(() => {});
  }, [guild.id]);

  const actions = ['ALL', ...new Set(logs.map(l => l.action))];
  const shown = logs.filter(l =>
    (filter === 'ALL' || l.action === filter) &&
    (!search || l.targetId?.includes(search) || l.reason?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Mod Log</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user ID or reason..."
            style={{
              width: '100%', paddingLeft: 36, padding: '9px 12px 9px 36px',
              background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
              fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}
        >
          {actions.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Action', 'Target', 'Moderator', 'Reason', 'Time'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No entries found.</td></tr>
            )}
            {shown.map((l, i) => (
              <tr key={l.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '11px 16px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: (ACTION_COLORS[l.action] || '#5865F2') + '22',
                    color: ACTION_COLORS[l.action] || '#5865F2',
                    borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700,
                  }}>
                    {ACTION_ICONS[l.action] || '•'} {l.action}
                  </span>
                </td>
                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-2)' }}>{l.targetId}</td>
                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-2)' }}>{l.modId}</td>
                <td style={{ padding: '11px 16px', color: 'var(--text-2)', fontSize: 13, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                <td style={{ padding: '11px 16px', color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{ts(l.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 10, color: 'var(--text-3)', fontSize: 12 }}>Showing {shown.length} of {logs.length} entries (last 200)</p>
    </div>
  );
}
