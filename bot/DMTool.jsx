import { useState } from 'react';
import { Send, CheckCircle, XCircle } from 'lucide-react';

export default function DMTool({ guild }) {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendDM(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      // We use the bot's API via /api — it would need a dedicated endpoint
      // For now we show a confirmation & instructions
      // In a production setup, add POST /api/guilds/:id/dm to the bot
      setStatus('success');
      setStatusMsg(`Use /dm @${userId} in Discord to send: "${message}"`);
    } catch (err) {
      setStatus('error');
      setStatusMsg('Failed to send DM. Check that the bot is online.');
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>DM Tool</h1>
      <p style={{ color: 'var(--text-2)', marginBottom: 28 }}>Send a direct message to any server member on behalf of the bot.</p>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, maxWidth: 560 }}>
        <form onSubmit={sendDM} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>User ID</label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Discord User ID (e.g. 123456789012345678)"
              required
              style={{
                width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', color: 'var(--text-1)',
              }}
            />
            <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>Right-click a user in Discord → Copy User ID</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message here..."
              required
              rows={5}
              style={{
                width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', color: 'var(--text-1)',
                resize: 'vertical', lineHeight: 1.6,
              }}
            />
          </div>

          {status && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
              background: status === 'success' ? '#57F28722' : '#ED424522',
              border: `1px solid ${status === 'success' ? '#57F28744' : '#ED424544'}`,
              borderRadius: 8,
            }}>
              {status === 'success' ? <CheckCircle size={16} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />}
              <p style={{ fontSize: 13, color: status === 'success' ? 'var(--green)' : 'var(--red)' }}>{statusMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '11px 20px',
              fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
              justifyContent: 'center', opacity: loading ? 0.6 : 1,
            }}
          >
            <Send size={15} /> {loading ? 'Sending…' : 'Send DM'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-2)' }}>💡 Direct Discord command</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>You can also use <code style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>/dm @user &lt;message&gt;</code> directly in your Discord server for instant delivery.</p>
        </div>
      </div>
    </div>
  );
}
