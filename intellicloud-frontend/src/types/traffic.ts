export type Dir = "outbound" | "inbound" | "internal" | "external";

export interface GeoLite {
    city?: string;
    country?: string;   // ISO-2, e.g., "US"
    asn?: number;
    asn_org?: string;
}

export interface TrafficEvent {
    eid: string;
    ts: number;
    src: string;
    dst: string;
    proto: string;
    sport?: number | null;
    dport?: number | null;
    dns?: string;
    dir: Dir;
    level: string;      // "High"/"Low"/...
    src_geo?: GeoLite;
    dst_geo?: GeoLite;
}
