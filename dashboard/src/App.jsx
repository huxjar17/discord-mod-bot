import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Login   from './pages/Login.jsx';
import Overview   from './pages/Overview.jsx';
import ModLog     from './pages/ModLog.jsx';
import CmdLog     from './pages/CmdLog.jsx';
import Warnings   from './pages/Warnings.jsx';
import Blacklist  from './pages/Blacklist.jsx';
import AutoMod    from './pages/AutoMod.jsx';
import Session    from './pages/Session.jsx';
import SettingsPage from './pages/Settings.jsx';
import { api } from './api.js';

export default function App() {
  const [authed, setAuthed]           = useState(!!sessionStorage.getItem('authed'));
  const [guilds, setGuilds]           = useState([]);
  const [guild,  setGuild]            = useState(null);

  useEffect(() => {
    if (!authed) return;
    api.getGuilds()
      .then(g => { setGuilds(g); if (g.length) setGuild(g[0]); })
      .catch(() => { sessionStorage.clear(); setAuthed(false); });
  }, [authed]);

  if (!authed) return <Login onLogin={() => { sessionStorage.setItem('authed','1'); setAuthed(true); }} />;

  return (
    <BrowserRouter>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Sidebar guilds={guilds} selected={guild} onSelect={setGuild} />
        <main style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'var(--bg)' }}>
          {guild ? (
            <Routes>
              <Route path="/"          element={<Navigate to="/overview" />} />
              <Route path="/overview"  element={<Overview  guild={guild} />} />
              <Route path="/modlog"    element={<ModLog    guild={guild} />} />
              <Route path="/cmdlog"    element={<CmdLog    guild={guild} />} />
              <Route path="/warnings"  element={<Warnings  guild={guild} />} />
              <Route path="/blacklist" element={<Blacklist guild={guild} />} />
              <Route path="/automod"   element={<AutoMod   guild={guild} />} />
              <Route path="/session"   element={<Session   guild={guild} />} />
              <Route path="/settings"  element={<SettingsPage guild={guild} />} />
            </Routes>
          ) : (
            <p style={{ color:'var(--t3)', textAlign:'center', marginTop:80 }}>
              No servers found. Make sure the bot is in at least one server.
            </p>
          )}
        </main>
      </div>
    </BrowserRouter>
  );
}
