import sys, os, json, time, urllib.request, urllib.error
from typing import List, Dict, Any

API_URL = os.getenv("API_URL", "http://localhost:5000/api/traffic/ingest")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "50"))
BATCH_SECS = float(os.getenv("BATCH_SECS", ".5"))

header: List[str] = []
index: Dict[str, int] = {}
batch: List[Dict[str, Any]] = []
last_send = time.time()

FIELDS = [
    "frame.time_epoch",
    "ip.src", "ip.dst",
    "ipv6.src", "ipv6.dst",
    "tcp.srcport", "tcp.dstport",
    "udp.srcport", "udp.dstport",
    "tcp.flags.syn", "tcp.flags.ack",
    "dns.qry.name",
]

def _post(items: List[Dict[str, Any]]) -> None:
    if not items:
        return
    data = json.dumps({"items": items}).encode()
    req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            sys.stderr.write(f"[ingest] sent {len(items)} events -> {resp.status} \n")
    except urllib.error.URLError as e:
        sys.stderr.write(f"[ingest] error: {e}\n")

def _get(colname: str, cols: List[str]) -> str:
    """safe column accessor by name."""
    i = index.get(colname, -1)
    if i < 0 or i >= len(cols):
        return ""
    return cols[i]

def _flush_if_needed() -> None:
    global batch, last_send
    now = time.time()
    if len(batch) >= BATCH_SIZE or (now - last_send) >= BATCH_SECS:
        _post(batch)
        batch = []
        last_send = now

def main() -> None:
    global header, index, batch, last_send

    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue

        if not header:
            header = line.split(",")
            index = {name: i for i, name in enumerate(header)}

            missing = [f for f in FIELDS if f not in index]
            if missing:
                sys.stderr.write(f"[warn] tshark header missing {missing}; proceeding anyway \n")
            continue
    cols = line.split(",")

    try:
        ts = float(_get("frame.time_epoch", cols) or time.time())
    except ValueError:
        ts = time.time()

    ip4s, ip4d = _get("ip.src", cols), _get("ip.dst", cols)
    ip6s, ip6d = _get("ipv6.src", cols), _get("ipv6.dst", cols)
    src = ip4s or ip6s
    dst = ip4d or ip6d
    if not (src and dst):
        pass

    t_s, t_d = _get("tcp.srcport", cols), _get("tcp.dstport", cols)
    u_s, u_d = _get("udp.srcport", cols), _get("udp.dstport", cols)

    try:
        sport = int(t_s or u_s) if (t_s or u_s) else None
    except ValueError:
        sport = None
    
    try:
        dport = int(t_d or u_d) if (t_d or u_d) else None
    except ValueError:
        dport = None

    proto = "tcp" if (t_s or t_d) else ("udp" if (u_s or u_d) else "ip")
    syn = _get("tcp.flags.syn", cols) == "1"
    ack = _get("tcp.flags.ack", cols) == "1"
    dns = _get("dns.qry.name", cols) or None

    ev: Dict[str, Any] = {
        "ts": ts,
        "src": src,
        "dst": dst,
        "proto": proto,
        "sport": sport,
        "dport": dport,
        "syn": syn,
        "ack": ack,
    }

    if dns:
        ev["dns"] = dns

    batch.append(ev)
    _flush_if_needed()

_post(batch)

if __name__ == "__name__":
    try:
        main()
    except KeyboardInterrupt:
        pass