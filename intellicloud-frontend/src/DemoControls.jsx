// DemoControls.jsx
import { useState } from "react";

const BASE =
    (import.meta?.env?.VITE_API_BASE_URL || "")
        .replace(/\/+$/, ""); // "" (same origin) or "http://localhost:8080"

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomIPv4() {
    if (Math.random() < 0.7) {
        const which = Math.random();
        if (which < 0.34) return `10.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`;
        if (which < 0.67) return `172.${randInt(16,31)}.${randInt(0,255)}.${randInt(1,254)}`;
        return `192.168.${randInt(0,255)}.${randInt(1,254)}`;
    }
    const publics = ["1.1.1.1","8.8.8.8","9.9.9.9","208.67.222.222","76.76.2.38"];
    return publics[randInt(0, publics.length - 1)];
}

function randomPorts(proto) {
    const common = [80,443,53,22,25,110,143,3306,3389,445,8080,123];
    const dport = common[randInt(0, common.length - 1)];
    const sport = randInt(1024, 65535);
    if (proto === "udp" && Math.random() < 0.5) return { sport, dport: 53 };
    return { sport, dport };
}

function randomEvent() {
    const ts = Math.floor(Date.now() / 1000);
    const proto = Math.random() < 0.7 ? "tcp" : "udp";
    const { sport, dport } = randomPorts(proto);
    const src = randomIPv4();
    let dst = randomIPv4();
    if (dst === src) dst = randomIPv4();
    const ev = { ts, src, dst, proto, sport, dport };
    if (proto === "udp" && dport === 53 && Math.random() < 0.6) {
    const names = ["example.com","api.github.com","monmouth.edu","httpbin.org","cloudflare-dns.com"];
    ev.dns = names[randInt(0, names.length - 1)];
    }
    return ev;
}

async function postItems(items, { timeoutMs = 10000 } = {}) {
    const url = `${BASE}/api/traffic/ingest`;   // keep your BASE as-is
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort("timeout"), timeoutMs);

    // ← read the Vite-exposed key here
    const k = import.meta.env.VITE_INGEST_KEY || "";

    try {
        const res = await fetch(url, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "X-IC-Key": k,                       
        },
        body: JSON.stringify({ items }),
        cache: "no-store",
        signal: ctrl.signal,
    });

    console.debug("POST /api/traffic/ingest =>", res.status);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    return text ? JSON.parse(text) : { ok: true, received: items.length };
    } finally {
    clearTimeout(t);
    }
}

export default function DemoControls() {
    const [busy, setBusy] = useState(false);

    const sendOne = async () => {
    try {
        setBusy(true);
        const out = await postItems([randomEvent()]);
        console.info("ingest one:", out);
    } catch (e) {
        console.error(e);
        alert("Failed to send test event.");
    } finally {
        setBusy(false);
    }
};

const sendBurst = async (n = 30, delayMs = 40) => {
try {
    setBusy(true);
    let batch = [];
    for (let i = 0; i < n; i++) {
    batch.push(randomEvent());
    if (batch.length >= 10) {
        await postItems(batch);
        batch = [];
        await new Promise(r => setTimeout(r, delayMs));
    }
    }
    if (batch.length) await postItems(batch);
    console.info("burst complete");
} catch (e) {
    console.error(e);
    alert("Failed to send burst.");
} finally {
    setBusy(false);
}
};

return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="px-3 py-1 rounded-xl border" onClick={sendOne} disabled={busy}>
            {busy ? "Working..." : "Send Random Event"}
        </button>
        <button className="px-3 py-1 rounded-xl border" onClick={() => sendBurst(30, 40)} disabled={busy}>
            {busy ? "Working..." : "Burst 30 Events"}
        </button>
        <span className="text-xs opacity-70">
            Posts to <code>/api/traffic/ingest</code>; appears live via SSE.
        </span>
    </div>
    );
}
