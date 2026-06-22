import { useState } from 'react';

export default function Login({ onLogin }) {
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await fetch('/api/guilds', { headers:{ 'x-api-key': key } });
      if (res.ok) { sessionStorage.setItem('apiKey', key); onLogin(); }
      else setErr('Invalid API key — check your DASHBOARD_API_KEY in .env');
    } catch { setErr('Cannot connect to bot API. Make sure the bot is running (npm start in the bot folder).'); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'48px 40px', width:420, textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:14 }}>🛡️</div>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>ModControl</h1>
        <p style={{ color:'var(--t2)', marginBottom:28, fontSize:13 }}>Enter your Dashboard API Key to continue</p>
        <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Dashboard API Key" required
            style={{ background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 16px', fontSize:14, outline:'none', color:'var(--t1)' }} />
          {err && <p style={{ color:'var(--red)', fontSize:12, textAlign:'left' }}>{err}</p>}
          <button type="submit" disabled={loading}
            style={{ background:'var(--accent)', color:'#fff', borderRadius:8, padding:12, fontWeight:700, fontSize:14, opacity:loading?.6:1 }}>
            {loading ? 'Connecting…' : 'Sign In'}
          </button>
        </form>
        <p style={{ color:'var(--t3)', fontSize:11, marginTop:20 }}>
          The bot must be running before you can log in.<br/>
          Run <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:4 }}>npm start</code> in the bot folder first.
        </p>
      </div>
    </div>
  );
}
