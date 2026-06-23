import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Overview from './pages/Overview.jsx';
import ModLog from './pages/ModLog.jsx';
import CmdLog from './pages/CmdLog.jsx';
import Warnings from './pages/Warnings.jsx';
import Blacklist from './pages/Blacklist.jsx';
import AutoMod from './pages/AutoMod.jsx';
import Session from './pages/Session.jsx';
import SettingsPage from './pages/Settings.jsx';
import { api } from './api.js';

export default function App() {
  const [guilds, setGuilds] = useState([]);
  const [guild, setGuild] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getGuilds()
      .then(g => { setGuilds(g); if (g.length) setGuild(g[0]); })
      .catch(() => setError(true));
  }, []);

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:48 }}>❌</div>
      <h1 style={{ color:'var(--red)', fontSize:20, fontWeight:700 }}>Connection Error</h1>
      <p style={{ color:'var(--t2)' }}>Could not connect to the bot API on Railway.</p>
      <button onClick={()=>{ setError(false); api.getGuilds().then(g=>{setGuilds(g);if(g.length)setGuild(g[0]);}).catch(()=>setError(true)); }}
        style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontWeight:700, cursor:'pointer', marginTop:8 }}>
        Retry Connection
      </button>
    </div>
  );

  return (
    <BrowserRouter>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Sidebar guilds={guilds} selected={guild} onSelect={setGuild} />
        <main style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'var(--bg)' }}>
          {guild ? (
            <Routes>
              <Route path="/" element={<Navigate to="/overview" />} />
              <Route path="/overview" element={<Overview guild={guild} />} />
              <Route path="/modlog" element={<ModLog guild={guild} />} />
              <Route path="/cmdlog" element={<CmdLog guild={guild} />} />
              <Route path="/warnings" element={<Warnings guild={guild} />} />
              <Route path="/blacklist" element={<Blacklist guild={guild} />} />
              <Route path="/automod" element={<AutoMod guild={guild} />} />
              <Route path="/session" element={<Session guild={guild} />} />
              <Route path="/settings" element={<SettingsPage guild={guild} />} />
            </Routes>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
              <p style={{ color:'var(--t3)' }}>Loading servers…</p>
            </div>
          )}
        </main>
      </div>
    </BrowserRouter>
  );
}