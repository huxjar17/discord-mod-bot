import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const NAV = [
  { to:'/overview',  label:'📊 Overview'     },
  { to:'/modlog',    label:'🛡️ Mod Log'      },
  { to:'/cmdlog',    label:'📟 Command Log'   },
  { to:'/warnings',  label:'⚠️ Warnings'     },
  { to:'/blacklist', label:'🚫 Blacklist'     },
  { to:'/automod',   label:'🤖 AutoMod'      },
  { to:'/session',   label:'📡 Session'       },
  { to:'/settings',  label:'⚙️ Settings'     },
];

const base = { display:'block', padding:'9px 14px', borderRadius:'var(--rs)', marginBottom:2, fontSize:13, fontWeight:500, color:'var(--t2)', transition:'all .15s' };
const active = { ...base, background:'var(--accent)', color:'#fff' };

export default function Sidebar({ guilds, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <aside style={{ width:220, background:'var(--bg-card)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontWeight:800, fontSize:15 }}>🛡️ ModControl</span>
      </div>

      {/* Guild picker */}
      <div style={{ padding:'12px', position:'relative' }}>
        <button onClick={()=>setOpen(!open)} style={{ width:'100%', background:'var(--bg-inp)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 12px', color:'var(--t1)', fontSize:13, textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected?.name || 'Select Server'}</span>
          <span>▾</span>
        </button>
        {open && (
          <div style={{ position:'absolute', top:'100%', left:12, right:12, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--rs)', zIndex:20, maxHeight:200, overflowY:'auto' }}>
            {guilds.map(g => (
              <button key={g.id} onClick={()=>{ onSelect(g); setOpen(false); }} style={{ width:'100%', padding:'9px 14px', background:'transparent', color:'var(--t1)', fontSize:13, textAlign:'left' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding:'8px 10px', flex:1 }}>
        {NAV.map(({to, label}) => (
          <NavLink key={to} to={to} style={({isActive})=>isActive?active:{...base}}
            onMouseEnter={e=>{ if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background='var(--bg-hover)'; }}
            onMouseLeave={e=>{ if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background='transparent'; }}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', color:'var(--t3)', fontSize:11 }}>ModControl v2.0</div>
    </aside>
  );
}
