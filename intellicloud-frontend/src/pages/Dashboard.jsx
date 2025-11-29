// src/pages/Dashboard.jsx
import React from 'react';
import { USE_MOCK, API_BASE_URL } from '../config';
import { mapThreat } from '../adapters';
// Optional demo buttons; remove if you don't use them:
// import DemoControls from '../DemoControls.jsx';

const levels = ['All', 'Critical', 'High', 'Medium', 'Low'];

const levelBadge = (lvl) => {
    const key = (lvl || '').toLowerCase();
    if (key === 'critical') return 'badge crit';
    if (key === 'high') return 'badge high';
    if (key === 'medium') return 'badge med';
    if (key === 'low') return 'badge low';
    return 'badge ok';
};

const api = (p) => `${API_BASE_URL.replace(/\/+$/, '')}${p.startsWith('/') ? '' : '/'}${p}`;

function useThreats() {
    const [raw, setRaw] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
    let active = true;
    (async () => {
        try {
        const url = USE_MOCK ? '/mock/threats.json' : api('/threats');
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (!active) return;
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setRaw(items.map(mapThreat));
        } catch {
        if (active) setRaw([]);
        } finally {
        if (active) setLoading(false);
        }
    })();
    return () => { active = false; };
    }, []);

    return { raw, loading };
    }

    function useTrafficSSE() {
    const [events, setEvents] = React.useState([]);
    const sinceRef = React.useRef(0);

    const clear = React.useCallback(() => {
    sinceRef.current = Date.now();
    setEvents([]);
    }, []);

    React.useEffect(() => {
    let cancelled = false;
    let es;

    const connect = () => {
        es = new EventSource(api('/stream/traffic'));
        es.onmessage = (e) => {
        try {
            const ev = JSON.parse(e.data);
            const t = Math.floor((ev.ts || Date.now() / 1000) * 1000);
            if (!cancelled && t >= sinceRef.current) {
            setEvents((prev) => [{ ...ev, _t: t }, ...prev].slice(0, 1000));
            }
        } catch {/* */}
        };
        es.onerror = () => {
        try { es.close(); } catch {/* */}
        if (!cancelled) setTimeout(connect, 1000);
        };
    };

    connect();
    return () => { cancelled = true; try { es && es.close(); } catch {/* */} };
    }, []);

    return { events, clear };
    }

    function useAuditSSE() {
    const [audits, setAudits] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
    let closed = false;

    (async () => {
        try {
        const res = await fetch(api('/audit-log'), { credentials: 'include' });
        const data = await res.json();
        const seed = Array.isArray(data) ? data : (data?.items ?? []);
        if (!closed) setAudits(seed);
        } catch {/* */} finally { if (!closed) setLoading(false); }
    })();

    const es = new EventSource(api('/stream/audit'), { withCredentials: true });
    es.onmessage = (e) => {
        try {
        const ev = JSON.parse(e.data);
        if (!closed) setAudits((prev) => [ev, ...prev].slice(0, 200));
        } catch {/* */}
    };
    es.onerror = () => { try { es.close(); } catch {/* */} };

    return () => { closed = true; try { es.close(); } catch {/* */} };
    }, []);

    return { audits, loading };
    }

    function ccToFlag(cc) {
        if (!cc || cc.length !== 2) return '';
        const base = 127397;
        return String.fromCodePoint(...cc.toUpperCase().split('').map(c => c.charCodeAt(0) + base));
    }

    function GeoTag({ cc, city, org }) {
    if (!cc && !city && !org) return null;
    return (
    <span className="geo">
        {cc ? <span className="flag" title={cc}>{ccToFlag(cc)}</span> : null}
        {city ? <span className="city">{city}</span> : null}
        {org ? <span className="asn">{org}</span> : null}
    </span>
    );
    }

    export default function Dashboard() {
    const { raw: threats } = useThreats();
    const { audits, loading: loadingAudit } = useAuditSSE();
    const { events: sseEvents, clear: clearFeed } = useTrafficSSE();

    const [ipFilter, setIpFilter] = React.useState('');
    const [levelFilter, setLevelFilter] = React.useState('All');
    const [sinceTs, setSinceTs] = React.useState(0);
    const [limit, setLimit] = React.useState(200);

    React.useEffect(() => {
    const s = JSON.parse(localStorage.getItem('ic-filters') || '{}');
    if (typeof s.ipFilter === 'string') setIpFilter(s.ipFilter);
    if (typeof s.levelFilter === 'string') setLevelFilter(s.levelFilter);
    if (typeof s.limit === 'number') setLimit(s.limit);
    }, []);

    React.useEffect(() => {
    localStorage.setItem('ic-filters', JSON.stringify({ ipFilter, levelFilter, limit }));
    }, [ipFilter, levelFilter, limit]);

    const filteredThreats = React.useMemo(() => {
    return threats.filter(t => {
        const ipOk  = ipFilter.trim() ? (t.ip || '').includes(ipFilter.trim()) : true;
        const lvlOk = levelFilter === 'All' ? true : (t.level === levelFilter);
        return ipOk && lvlOk;
    });
    }, [threats, ipFilter, levelFilter]);

    const rowsFromThreats = React.useMemo(() => {
    return filteredThreats.map(t => ({
        type: 'threat',
        id: t.id,
        timeMs: new Date(t.detectedAt).getTime(),
        src: t.ip || '',
        dst: t.dst || '',
        proto: t.proto || '',
        sport: t.sport,
        dport: t.dport,
        level: t.level,
        status: t.status,
        flow: t.source || 'Rule',
        dns: t.dns || '',
    }));
    }, [filteredThreats]);

    const rowsFromSSE = React.useMemo(() => {
    return sseEvents.map(ev => ({
        type: 'traffic',
        id: ev.eid || ev.id || `${ev.ts}-${ev.src}-${ev.dst}-${ev.dport}-${ev.proto}`,
        timeMs: Math.floor((ev.ts || Date.now() / 1000) * 1000),
        src: ev.src, dst: ev.dst,
        proto: ev.proto,
        sport: ev.sport, dport: ev.dport,
        level: ev.level || 'Low',
        status: 'Observed',
        flow: ev.dir || 'Live',
        dns: ev.dns || '',
        src_cc: ev.src_cc || '',  src_city: ev.src_city || '',  src_asnorg: ev.src_asnorg || '',
        dst_cc: ev.dst_cc || '',  dst_city: ev.dst_city || '',  dst_asnorg: ev.dst_asnorg || '',
    }));
    }, [sseEvents]);

    const combined = React.useMemo(() => {
    const ipq  = ipFilter.trim();
    const lvlq = levelFilter || 'All';
    let rows = [...rowsFromThreats, ...rowsFromSSE]
        .filter(r => (ipq ? (r.src?.includes(ipq) || r.dst?.includes(ipq)) : true))
        .filter(r => (lvlq === 'All' ? true : (r.level === lvlq)))
        .filter(r => (sinceTs ? r.timeMs >= sinceTs : true))
        .sort((a, b) => b.timeMs - a.timeMs);
    if (limit && limit > 0) rows = rows.slice(0, limit);
    return rows;
    }, [rowsFromThreats, rowsFromSSE, ipFilter, levelFilter, sinceTs, limit]);

    const toCSV = (rows) => {
    const headers = ["time","type","src","dst","proto","sport","dport","level","flow","status","dns"];
    const lines = [headers.join(",")].concat(
        rows.map(r => ([
        new Date(r.timeMs).toISOString(), r.type, r.src, r.dst, r.proto, r.sport ?? "", r.dport ?? "",
        r.level, r.flow, r.status, r.dns ?? ""
        ].map(x => String(x).replaceAll('"','""')).map(x => `"${x}"`).join(",")))
    );
    return lines.join("\n");
    };

    const download = (name, text) => {
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    };

    return (
    <div className="shell dashboard">
        <div className="grid-halves">
        <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <h3 className="h1" style={{ fontSize: 20, margin: 0 }}>Live Feed</h3>
            <span className="helper">{combined.length} shown</span>
            </div>

            {/* <DemoControls /> */}

            <div className="toolbar" role="group" aria-label="Live Feed controls">
            <div>
                <label className="label" htmlFor="f-ip">Filter by IP</label>
                <input id="f-ip" className="input" placeholder="e.g. 203.0.113" value={ipFilter}
                        onChange={e=>setIpFilter(e.target.value)} style={{ maxWidth: 260 }} />
            </div>

            <div>
                <label className="label" htmlFor="f-lvl">Severity</label>
                <select id="f-lvl" className="input" value={levelFilter}
                        onChange={e=>setLevelFilter(e.target.value)} style={{ maxWidth: 180 }}>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>

            <div style={{ flex:1 }} />

            <div>
                <label className="label" htmlFor="f-rows">Rows</label>
                <select id="f-rows" className="input" value={String(limit)}
                        onChange={e => setLimit(Number(e.target.value))} style={{ width: 120 }}>
                <option value="50">50</option><option value="100">100</option>
                <option value="200">200</option><option value="0">All</option>
                </select>
            </div>

            <button className="btn" onClick={clearFeed} title="Hide older events">Clear Live Feed</button>
            <button className="btn ghost" onClick={() => setSinceTs(0)}>Show All</button>
            <button className="btn" onClick={() => download(`livefeed-${Date.now()}.csv`, toCSV(combined))}>Export CSV</button>

            <button className="btn ghost" onClick={()=>{ setIpFilter(''); setLevelFilter('All'); }}>
                Reset
            </button>
            </div>

            <div style={{ overflow: 'auto', maxHeight: 420 }}>
            <table className="table">
                <thead>
                <tr>
                    <th className="col-time">Time</th>
                    <th>Type</th>
                    <th className="col-src">Source</th>
                    <th className="col-dst">Destination</th>
                    <th className="col-proto">Proto</th>
                    <th className="col-ports">Ports</th>
                    <th className="col-level">Level</th>
                    <th className="col-flow">Flow</th>
                    <th className="col-status">Status</th>
                    <th className="col-dns">DNS</th>
                </tr>
                </thead>
                <tbody>
                {combined.map(r => (
                    <tr key={`${r.type}-${r.id}`}>
                    <td className="mono">{new Date(r.timeMs).toLocaleTimeString()}</td>
                    <td><span className="chip ghost">{r.type}</span></td>
                    <td className="mono">
                        <div><code className="ipcode">{String(r.src ?? '')}</code></div>
                        <div className="geo-line"><GeoTag cc={r.src_cc} city={r.src_city} org={r.src_asnorg} /></div>
                    </td>
                    <td className="mono">
                        <div><code className="ipcode">{String(r.dst ?? '')}</code></div>
                        <div className="geo-line"><GeoTag cc={r.dst_cc} city={r.dst_city} org={r.dst_asnorg} /></div>
                    </td>
                    <td className="mono">{r.proto}</td>
                    <td className="mono col-ports">{r.sport ? `${r.sport}→${r.dport ?? ''}` : (r.dport ?? '')}</td>
                    <td className="col-level"><span className={levelBadge(r.level)}>{r.level}</span></td>
                    <td>{r.flow}</td>
                    <td>{r.status}</td>
                    <td className="mono col-dns">{r.dns}</td>
                    </tr>
                ))}
                {combined.length === 0 && (
                    <tr><td colSpan="10" className="helper">Waiting for events…</td></tr>
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
                    <th>ID</th><th>Actor</th><th>Action</th><th>Target</th><th>At</th><th>Details</th>
                </tr>
                </thead>
                <tbody>
                {audits.map(a => (
                    <tr key={a.aid}>
                    <td className="mono">{a.aid}</td>
                    <td>{a.actor}</td>
                    <td>{a.action}</td>
                    <td className="mono">{a.target}</td>
                    <td className="mono">{new Date((a.at || 0) * 1000).toLocaleString()}</td>
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
        <p className="helper">Data source: <strong>{USE_MOCK ? '/mock/*.json' : API_BASE_URL}</strong></p>
        </div>
    </div>
    );
}
