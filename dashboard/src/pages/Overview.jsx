import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import  api  from '../api.js';

const COLORS = { BAN:'#ED4245',KICK:'#E67E22',MUTE:'#FEE75C',WARN:'#5865F2',UNBAN:'#57F287',UNMUTE:'#57F287',NOTE:'#EB459E',DM:'#9B59B6',PURGE:'#7F8C8D',LOCKDOWN:'#FF0000',BLACKLIST_ADD:'#FF00FF',AUTO_BAN:'#C0392B',AUTO_KICK:'#D35400',AUTO_MUTE:'#F39C12' };

function Card({ label, value, color='var(--t1)', sub }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'20px 22px' }}>
      <p style={{ color:'var(--t3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{label}</p>
      <p style={{ fontSize:30, fontWeight:800, color }}>{value ?? '—'}</p>
      {sub && <p style={{ color:'var(--t3)', fontSize:11, marginTop:4 }}>{sub}</p>}
    </div>
  );
}

export default function Overview({ guild }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.getStats(guild.id).then(setStats).catch(()=>{}); }, [guild.id]);
  const chart = stats ? Object.entries(stats.actionCounts).map(([k,v])=>({name:k,count:v})) : [];

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Overview</h1>
      <p style={{ color:'var(--t2)', marginBottom:24 }}>{guild.name} · {guild.memberCount?.toLocaleString()} members</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
        <Card label="Total Mod Actions" value={stats?.totalActions}   color="var(--t1)"    />
        <Card label="Total Bans"        value={stats?.actionCounts?.BAN??0}  color="var(--red)"   />
        <Card label="Total Kicks"       value={stats?.actionCounts?.KICK??0} color="var(--orange)"/>
        <Card label="Total Warns"       value={stats?.actionCounts?.WARN??0} color="var(--yellow)"/>
        <Card label="Commands Run"      value={stats?.cmdCount}        color="var(--accent)" />
        <Card label="DMs Sent"          value={stats?.actionCounts?.DM??0}   color="var(--purple)" />
      </div>
      {chart.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:24 }}>
          <h2 style={{ fontSize:14, fontWeight:700, marginBottom:18 }}>Actions Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{left:-20}}>
              <XAxis dataKey="name" tick={{fill:'var(--t2)',fontSize:11}} />
              <YAxis tick={{fill:'var(--t2)',fontSize:11}} />
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {chart.map(e=><Cell key={e.name} fill={COLORS[e.name]||'#5865F2'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
