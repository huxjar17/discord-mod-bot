import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
  BAN: '#ED4245',
  KICK: '#E67E22',
  MUTE: '#FEE75C',
  WARN: '#5865F2',
  UNBAN: '#57F287',
  UNMUTE: '#57F287',
  NOTE: '#95A5A6'
};

export default function Overview() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCases: 0, activeMutes: 0, activeBans: 0 });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetching directly from Railway without utilizing api.js imports
        const response = await fetch('https://discord-mod-bot-production-7c97.up.railway.app/guilds');
        if (!response.ok) throw new Error('Failed to load servers');
        const data = await response.json();
        setGuilds(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff', backgroundColor: '#0f172a' }}>
        <h2>Loading your Discord Dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', color: '#fff', backgroundColor: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px', fontWeight: 'bold' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase' }}>Connected Servers</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>{guilds.length}</p>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: 'semibold' }}>Your Servers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {guilds.map((guild) => (
          <div key={guild.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {guild.icon ? (
              <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt={guild.name} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {guild.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{guild.name}</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>ID: {guild.id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}