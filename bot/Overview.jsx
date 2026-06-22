import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield, AlertTriangle, UserX, Ban } from 'lucide-react';
import { api } from '../api.js';

const COLORS = {
  BAN: '#ED4245', KICK: '#E67E22', MUTE: '#FEE75C', WARN: '#5865F2',
  UNBAN: '#57F287', UNMUTE: '#57F287', NOTE: '#EB459E', DM: '#9B59B6',
  AUTO_BAN: '#C0392B', AUTO_KICK: '#D35400', AUTO_MUTE: '#F39C12', PURGE: '#7F8C8D',
};

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{value}</p>
      </div>
    </div>
  );
}

export default function Overview({ guild }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats(guild.id).then(setStats).catch(() => {});
  }, [guild.id]);

  const chartData = stats ? Object.entries(stats.actionCounts).map(([k, v]) => ({ name: k, count: v })) : [];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Overview</h1>
      <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>{guild.name} · {guild.memberCount?.toLocaleString()} members</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={<Shield size={20} color="#5865F2" />} label="Total Actions" value={stats?.totalActions ?? '—'} color="#5865F2" />
        <StatCard icon={<Ban size={20} color="#ED4245" />} label="Total Bans" value={stats?.actionCounts?.BAN ?? 0} color="#ED4245" />
        <StatCard icon={<UserX size={20} color="#E67E22" />} label="Total Kicks" value={stats?.actionCounts?.KICK ?? 0} color="#E67E22" />
        <StatCard icon={<AlertTriangle size={20} color="#FEE75C" />} label="Total Warns" value={stats?.actionCounts?.WARN ?? 0} color="#FEE75C" />
      </div>

      {chartData.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Actions Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-2)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map(e => <Cell key={e.name} fill={COLORS[e.name] || '#5865F2'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
