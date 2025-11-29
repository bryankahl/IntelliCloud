export const API_BASE =
    (import.meta as any).env?.VITE_API_BASE?.trim() || "/api";

    async function getJSON(path: string) {
        const res = await fetch(`${API_BASE}${path}`, { credentials: "omit" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Non-JSON response");
        return res.json();
    }

    export const api = {
        health: () => getJSON("/health"),
        preflight: () => getJSON("/preflight"),
    };

export const TRAFFIC_SSE_URL = `${API_BASE}/stream/traffic`;
