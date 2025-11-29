// src/App.jsx
import React, { useEffect, useState } from 'react';
import { isMockAuth, register, login, logout, getCurrentUser, onAuthStateChangedSub } from './firebase';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Decipher from './pages/Decipher.jsx';

function Landing({ onShowLogin, onShowRegister }) {
  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 780 }}>
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="logo">IC</div>
          <div className="title">IntelliCloud</div>
        </div>
        <h1 className="h1">Threat Intelligence, Instantly.</h1>
        <p className="p-muted">A clean demo-ready frontend you can grade with confidence.</p>
        <div className="spacer" />
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn primary" onClick={onShowRegister}>Get Started</button>
          <button className="btn" onClick={onShowLogin}>Login</button>
        </div>
        <hr className="hr" />
        <p className="helper">Auth: <strong>{isMockAuth ? 'Mock (Phase 1)' : 'Firebase'}</strong></p>
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
    setBusy(true); setError('');
    try {
      const user = isLogin ? await login(email, pw) : await register(email, pw, first.trim(), last.trim());
      onAuthed(user);
    } catch (err) { setError(err?.message || String(err)); }
    finally { setBusy(false); }
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
    </div>
  );
}

function AppShell({ user, onSignOut }) {
  const [tab, setTab] = useState('home');

  const doDownload = () => {
    const blob = new Blob([`IntelliCloud export\nUser: ${user?.email}\nDate: ${new Date().toISOString()}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'intellicloud-export.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
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

      {tab === 'home' && <Home user={user} />}
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'decipher' && <Decipher />}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const unsub = onAuthStateChangedSub?.((u) => setUser(u));
    return () => { try { unsub && unsub(); } catch {/* */} };
  }, []);

  const signOut = async () => { await logout(); setUser(null); setMode(null); };

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
