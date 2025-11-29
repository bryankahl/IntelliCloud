import { useEffect, useRef, useState } from "react";
import type { TrafficEvent } from "../types/traffic";

export function useTrafficStream(maxRows = 500) {
    const [rows, setRows] = useState<TrafficEvent[]>([]);
    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
    const connect = () => {
        const es = new EventSource("/api/stream/traffic");
        esRef.current = es;

        es.onmessage = (ev) => {
        try {
            const obj: TrafficEvent = JSON.parse(ev.data);
            setRows((r) => [obj, ...r].slice(0, maxRows));
        } catch {}
        };

        es.onerror = () => {
        try { es.close(); } catch {}
        setTimeout(connect, 1500);
        };
    };

    connect();
    return () => { try { esRef.current?.close(); } catch {} };
    }, [maxRows]);

    return rows;
}
