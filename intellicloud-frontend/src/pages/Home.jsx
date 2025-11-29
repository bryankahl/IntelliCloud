// src/pages/Home.jsx
import React from 'react';
import { USE_MOCK, API_BASE_URL } from '../config';

export default function Home({ user }) {
    const name = (user?.displayName || (user?.email || '').split('@')[0] || 'there');

    return (
    <div className="page-home shell">
        <div className="card hero">
        <div className="hero-grid">
            <div>
            <div className="badge-pill">Welcome</div>
            <h2 className="h1" style={{ marginTop: 6 }}>Hello, {name} 👋</h2>
            <p className="p-muted" style={{ maxWidth: 720 }}>
                IntelliCloud brings your security signals into a clean, demo-ready workspace.
                Log in, explore the dashboard, and use the built-in Decipher tools.
            </p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop: 10 }}>
                <span className="chip">Firebase Auth</span>
                <span className="chip">Premium Dark UI</span>
                <span className="chip">Mock → API toggle</span>
                <span className="chip">Client-side Decipher</span>
            </div>
            </div>

            <div className="stats">
            <div className="stat"><div className="num">3</div><div className="lbl">Tabs</div></div>
            <div className="stat"><div className="num">2</div><div className="lbl">Data Views</div></div>
            <div className="stat"><div className="num">7</div><div className="lbl">Ciphers</div></div>
            </div>
        </div>
        </div>

        <div className="grid-balanced">
        <div className="card feature">
            <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>IntelliCloud Dashboard</h3>
            <p className="p-muted">Live Feed + Audit Log with filters and badges.</p>
            <ul className="ul">
            <li>IP & severity filters</li>
            <li>Mock JSON by default; API-ready</li>
            <li>Responsive two-panel grid</li>
            </ul>
        </div>
        <div className="card feature">
            <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>Decipher Toolkit</h3>
            <p className="p-muted">Hex, Base64, ROT13, Atbash, Morse, Rail Fence, Vigenère.</p>
            <ul className="ul">
            <li>Pure browser JavaScript</li>
            <li>Live output</li>
            <li>Copy & download</li>
            </ul>
        </div>
        <div className="card feature">
            <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>Deploy-ready</h3>
            <p className="p-muted">Vercel deploy; environment variables; Firebase domain allowlist.</p>
            <ul className="ul">
            <li>Feature branches</li>
            <li>One-click redeploy</li>
            <li>Dark theme components</li>
            </ul>
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
