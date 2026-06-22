import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Overview from './pages/Overview.jsx';
import ModLog from './pages/ModLog.jsx';
import Warnings from './pages/Warnings.jsx';
import AutoMod from './pages/AutoMod.jsx';
import Settings from './pages/Settings.jsx';
import DMTool from './pages/DMTool.jsx';
import Login from './pages/Login.jsx';
import { api } from './api.js';

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('authed'));
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);

  useEffect(() => {
    if (authed) {
      api.getGuilds().then(g => { setGuilds(g); if (g.length) setSelectedGuild(g[0]); }).catch(() => setAuthed(false));
    }
  }, [authed]);

  if (!authed) return <Login onLogin={() => { sessionStorage.setItem('authed', '1'); setAuthed(true); }} />;

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar guilds={guilds} selected={selectedGuild} onSelect={setSelectedGuild} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {selectedGuild ? (
            <Routes>
              <Route path="/" element={<Navigate to="/overview" />} />
              <Route path="/overview" element={<Overview guild={selectedGuild} />} />
              <Route path="/modlog" element={<ModLog guild={selectedGuild} />} />
              <Route path="/warnings" element={<Warnings guild={selectedGuild} />} />
              <Route path="/automod" element={<AutoMod guild={selectedGuild} />} />
              <Route path="/settings" element={<Settings guild={selectedGuild} />} />
              <Route path="/dm" element={<DMTool guild={selectedGuild} />} />
            </Routes>
          ) : <p style={{ color: 'var(--text-3)', marginTop: 80, textAlign: 'center' }}>No servers found. Make sure the bot is in at least one server.</p>}
        </main>
      </div>
    </BrowserRouter>
  );
}
