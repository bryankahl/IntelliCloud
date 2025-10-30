import React, { useEffect, useMemo, useState } from 'react';
import { USE_MOCK, API_BASE_URL } from './config';
import { register, login, logout, getCurrentUser, onAuthStateChangedSub, isMockAuth } from './firebase';
import { mapThreat, mapAudit } from './adapters';
import { runDecipher } from './decipher';

const levels = ['All', 'Critical', 'High', 'Medium', 'Low'];

const levelBadge = (lvl) => {
  const key = (lvl || '').toLowerCase();
  if (key === 'critical') return 'badge crit';
  if (key === 'high') return 'badge high';
  if (key === 'medium') return 'badge med';
  if (key === 'low') return 'badge low';
  return 'badge ok';
};

function Landing({ onShowLogin, onShowRegister }) {
  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 780 }}>
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="logo">IC</div>
          <div className="title">IntelliCloud</div>
        </div>
        <h1 className="h1">Threat Intelligence, Instantly.</h1>
        <p className="p-muted">
          A clean demo-ready frontend you can grade with confidence. Firebase Auth + mock data. No backend dependency.
        </p>
        <div className="spacer"></div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn primary" onClick={onShowRegister}>Get Started</button>
          <button className="btn" onClick={onShowLogin}>Login</button>
        </div>
        <hr className="hr" />
        <p className="helper">
          Mode: <strong>{USE_MOCK ? 'Mock Data' : 'API'}</strong>
          {' · '}
          Auth: <strong>{isMockAuth ? 'Mock (Phase 1)' : 'Firebase'}</strong>
        </p>
      </div>
    </div>
  );
}

function InlineAuth({ mode, onAuthed }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = isLogin
        ? await login(email, pw)
        : await register(email, pw, first.trim(), last.trim());
      onAuthed(user);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 620, margin: '20px auto 0' }}>
      <h2 className="h1" style={{ fontSize: 22 }}>{isLogin ? 'Login' : 'Create an account'}</h2>
      <form onSubmit={submit}>
        {!isLogin && (
          <div className="row" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <div>
              <label className="label" htmlFor="first">First name</label>
              <input className="input" id="first" placeholder="Jane" value={first} onChange={e=>setFirst(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="last">Last name</label>
              <input className="input" id="last" placeholder="Doe" value={last} onChange={e=>setLast(e.target.value)} />
            </div>
          </div>
        )}
        <div style={{ height:10 }} />
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" type="email" placeholder="you@company.com"
               value={email} onChange={e=>setEmail(e.target.value)} required />
        <div style={{ height:10 }} />
        <label className="label" htmlFor="pw">Password</label>
        <input className="input" id="pw" type="password" placeholder="********"
               value={pw} onChange={e=>setPw(e.target.value)} required />
        <div style={{ height:14 }} />
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : (isLogin ? 'Login' : 'Register')}</button>
        {error && <p className="helper" style={{ color: 'salmon', marginTop: 8 }}>{error}</p>}
      </form>
      {isMockAuth && (
        <>
          <hr className="hr" />
          <p className="helper">
            You’re in <strong>mock auth</strong>. Any email/password will work for Phase 1. When Firebase is configured, first name is saved to display name.
          </p>
        </>
      )}
    </div>
  );
}

/* ===== Data hooks ===== */
function useThreats() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let active = true;
    (async () => {
      try {
        const base = (API_BASE_URL || '').replace(/\/+$/, '');
        const url = USE_MOCK ? '/mock/threats.json' : `${base}/threats`;
        const res = await fetch(url);
        const data = await res.json();
        if (!active) return;
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setRaw(items.map(mapThreat));
      } catch (e) {
        console.error(e);
        if (active) setRaw([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { raw, loading };
}

function useAudit() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let active = true;
    (async () => {
      try {
        const base = (API_BASE_URL || '').replace(/\/+$/, '');
        const url = USE_MOCK ? '/mock/audit.json' : `${base}/audit`;
        const res = await fetch(url);
        const data = await res.json();
        if (!active) return;
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setRaw(items.map(mapAudit));
      } catch (e) {
        console.error(e);
        if (active) setRaw([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { raw, loading };
}

/* ===== Tabs ===== */
function HomeTab({ user }) {
  const name = (user?.displayName || (user?.email || '').split('@')[0] || 'there');

  return (
    <div className="shell">
      {/* HERO */}
      <div className="card hero">
        <div>
          <div className="badge-pill">Welcome</div>
          <h2 className="h1" style={{ marginTop: 6 }}>Hello, {name} 👋</h2>
          <p className="p-muted" style={{ maxWidth: 720 }}>
            IntelliCloud brings your security signals into a clean, demo-ready workspace. Log in with Firebase, explore
            a live-feeling dashboard powered by mock data (or your API later), and use the built-in Decipher tools —
            all in the browser.
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop: 10 }}>
            <span className="chip">Firebase Auth</span>
            <span className="chip">Premium Dark UI</span>
            <span className="chip">Mock → API toggle</span>
            <span className="chip">Client-side Decipher</span>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-stats">
            <div><div className="stat-num">3</div><div className="stat-label">Tabs</div></div>
            <div><div className="stat-num">2</div><div className="stat-label">Data Views</div></div>
            <div><div className="stat-num">7</div><div className="stat-label">Ciphers</div></div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="grid-balanced">
        <div className="card feature">
          <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>IntelliCloud Dashboard</h3>
          <p className="p-muted">A compact Live Feed and Audit Log with filters, badges, and a clean table layout.</p>
          <ul className="ul">
            <li>IP & severity filters for quick triage</li>
            <li>Mock JSON by default; API-ready later</li>
            <li>Responsive, centered two-panel grid</li>
          </ul>
        </div>
        <div className="card feature">
          <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>Decipher Toolkit</h3>
          <p className="p-muted">Encode/decode Hex, Base64, ROT13, Atbash, Morse, Rail Fence, and Vigenère — no downloads.</p>
          <ul className="ul">
            <li>Pure browser JavaScript (privacy-friendly)</li>
            <li>Live output as you type</li>
            <li>Copy & download results instantly</li>
          </ul>
        </div>
        <div className="card feature">
          <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>Ship-Ready</h3>
          <p className="p-muted">Vercel deploy with environment variables and Firebase domain authorization.</p>
          <ul className="ul">
            <li>Feature branch workflow</li>
            <li>One-click redeploys with cache clear</li>
            <li>Dark theme, badges, buttons, tables</li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="card" style={{ textAlign:'center' }}>
        <p className="p-muted" style={{ marginBottom: 10 }}>
          Want to see real data? Flip <code>VITE_USE_MOCK=false</code> and set <code>VITE_API_BASE_URL</code>.
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <span className="chip ghost">No backend required</span>
          <span className="chip ghost">Zero installs</span>
          <span className="chip ghost">Grade-ready</span>
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { raw: threats, loading: loadingThreats } = useThreats();
  const { raw: audits, loading: loadingAudit } = useAudit();

  const [ipFilter, setIpFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');

  const filteredThreats = useMemo(()=>{
    return threats.filter(t => {
      const ipOk = ipFilter.trim() ? (t.ip || '').includes(ipFilter.trim()) : true;
      const lvlOk = levelFilter === 'All' ? true : (t.level === levelFilter);
      return ipOk && lvlOk;
    });
  }, [threats, ipFilter, levelFilter]);

  return (
    <div className="shell">
      <div className="grid-balanced">
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <h3 className="h1" style={{ fontSize: 20, margin: 0 }}>Live Feed</h3>
            <span className="helper">{loadingThreats ? 'Loading…' : `${filteredThreats.length} shown`}</span>
          </div>

          <div className="toolbar">
            <input
              className="input"
              placeholder="Filter by IP (e.g. 203.0.113)"
              value={ipFilter}
              onChange={e=>setIpFilter(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <select className="input" value={levelFilter} onChange={e=>setLevelFilter(e.target.value)} style={{ maxWidth: 180 }}>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button className="btn ghost" onClick={()=>{ setIpFilter(''); setLevelFilter('All'); }}>Reset</button>
          </div>

          <div style={{ overflow: 'auto', maxHeight: 420 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>IP</th>
                  <th>Level</th>
                  <th>Source</th>
                  <th>Detected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredThreats.map(t => (
                  <tr key={t.id}>
                    <td className="mono">{t.id}</td>
                    <td className="mono">{t.ip}</td>
                    <td><span className={levelBadge(t.level)}>{t.level}</span></td>
                    <td>{t.source}</td>
                    <td className="mono">{new Date(t.detectedAt).toLocaleString()}</td>
                    <td>{t.status}</td>
                  </tr>
                ))}
                {!loadingThreats && filteredThreats.length === 0 && (
                  <tr><td colSpan="6" className="helper">No items match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <h3 className="h1" style={{ fontSize: 20, margin: 0 }}>Audit Log</h3>
            <span className="helper">{loadingAudit ? 'Loading…' : `${audits.length} events`}</span>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 420 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>At</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id}>
                    <td className="mono">{a.id}</td>
                    <td>{a.actor}</td>
                    <td>{a.action}</td>
                    <td className="mono">{a.target}</td>
                    <td className="mono">{new Date(a.at).toLocaleString()}</td>
                    <td>{a.details}</td>
                  </tr>
                ))}
                {!loadingAudit && audits.length === 0 && (
                  <tr><td colSpan="6" className="helper">No audit events.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <p className="helper">
          Data source: <strong>{USE_MOCK ? '/mock/*.json' : API_BASE_URL}</strong>
        </p>
      </div>
    </div>
  );
}

function DecipherTab() {
  const [algo, setAlgo] = useState('hex');
  const [mode, setMode] = useState('enc');
  const [input, setInput] = useState('');
  const [rails, setRails] = useState(3);
  const [key, setKey] = useState('');
  const [output, setOutput] = useState('');
  const [err, setErr] = useState('');

  // Auto-run on change
  useEffect(() => {
    try {
      const res = runDecipher({ algo, mode, input, rails, key });
      setOutput(res);
      setErr('');
    } catch (e) {
      setOutput('');
      setErr(e?.message || String(e));
    }
  }, [algo, mode, input, rails, key]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(output || '');
    } catch (e) {
      void e; 
    }
  };
  const onDownload = () => {
    const blob = new Blob([output || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `decipher-${algo}-${mode}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const showRails = algo === 'railfence';
  const showKey = algo === 'vigenere';
  const showMode = !['rot13','atbash'].includes(algo);

  return (
    <div className="card" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <h3 className="h1" style={{ fontSize: 20, margin: 0 }}>Decipher</h3>
      </div>

      <div className="toolbar" style={{ alignItems:'center' }}>
        <div>
          <label className="label">Algorithm</label>
          <select className="input" value={algo} onChange={e=>setAlgo(e.target.value)} style={{ minWidth: 180 }}>
            <option value="hex">Hex</option>
            <option value="base64">Base64</option>
            <option value="rot13">ROT13</option>
            <option value="atbash">Atbash</option>
            <option value="morse">Morse</option>
            <option value="railfence">Rail Fence</option>
            <option value="vigenere">Vigenère</option>
          </select>
        </div>
        {showMode && (
          <div>
            <label className="label">Mode</label>
            <select className="input" value={mode} onChange={e=>setMode(e.target.value)} style={{ width: 140 }}>
              <option value="enc">Encode</option>
              <option value="dec">Decode</option>
            </select>
          </div>
        )}
        {showRails && (
          <div>
            <label className="label">Rails</label>
            <input type="number" className="input" min="2" value={rails} onChange={e=>setRails(Number(e.target.value)||2)} style={{ width: 100 }} />
          </div>
        )}
        {showKey && (
          <div>
            <label className="label">Key</label>
            <input className="input" placeholder="letters only" value={key} onChange={e=>setKey(e.target.value)} style={{ width: 200 }} />
          </div>
        )}
        <div style={{ flex:1 }} />
        {/* No Run button — live output */}
      </div>

      <div className="row" style={{ gridTemplateColumns:'1fr 1fr', display:'grid', gap:18 }}>
        <div>
          <label className="label">Input</label>
          <textarea className="input" rows="10" value={input} onChange={e=>setInput(e.target.value)} placeholder="Type or paste here..." />
        </div>
        <div>
          <label className="label">Output</label>
          <textarea className="input" rows="10" value={output} readOnly placeholder="Result updates as you type..." />
          <div style={{ display:'flex', gap:10, marginTop:10 }}>
            <button className="btn" onClick={onCopy}>Copy</button>
            <button className="btn" onClick={onDownload}>Download</button>
          </div>
        </div>
      </div>
      {err && <p className="helper" style={{ color: 'salmon', marginTop: 8 }}>{err}</p>}
      <hr className="hr" />
      <p className="helper">
        Tips: Morse uses <code>"/"</code> for word gaps; Rail Fence needs rails ≥ 2; Vigenère requires a letter key.
      </p>
    </div>
  );
}

function AppShell({ user, onSignOut }) {
  const [tab, setTab] = useState('home'); // 'home' | 'dashboard' | 'decipher'

  const doDownload = () => {
    const blob = new Blob([`IntelliCloud export\nUser: ${user?.email}\nDate: ${new Date().toISOString()}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'intellicloud-export.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">IC</div>
          <div className="title">IntelliCloud</div>
        </div>
        <div className="header-actions">
          <span className="helper">{user?.email}</span>
          <button className="btn" onClick={onSignOut}>Sign out</button>
          <button className="btn" onClick={doDownload}>Download</button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Primary">
        <div className={`tab ${tab==='home' ? 'active' : ''}`} role="tab" aria-selected={tab==='home'} onClick={()=>setTab('home')}>Home</div>
        <div className={`tab ${tab==='dashboard' ? 'active' : ''}`} role="tab" aria-selected={tab==='dashboard'} onClick={()=>setTab('dashboard')}>IntelliCloud Dashboard</div>
        <div className={`tab ${tab==='decipher' ? 'active' : ''}`} role="tab" aria-selected={tab==='decipher'} onClick={()=>setTab('decipher')}>Decipher</div>
      </div>

      <div style={{ height: 14 }} />

      {tab === 'home' && <HomeTab user={user} />}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'decipher' && <DecipherTab />}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null); // 'login' | 'register' | null
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const unsub = onAuthStateChangedSub?.((u) => setUser(u));
    return () => { try { unsub && unsub(); } catch (e) { void e; } };
  }, []);

  const signOut = async () => {
    await logout();
    setUser(null);
    setMode(null);
  };

  if (!user) {
    return (
      <>
        <Landing onShowLogin={()=>setMode('login')} onShowRegister={()=>setMode('register')} />
        {mode && <InlineAuth mode={mode} onAuthed={(u)=>setUser(u)} />}
      </>
    );
  }

  return <AppShell user={user} onSignOut={signOut} />;
}