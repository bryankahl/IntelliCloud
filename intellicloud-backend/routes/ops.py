from flask import Blueprint, jsonify, current_app, request
import time
import socket
import redis as _redis
from services.geo import geo_status, load_readers

bp = Blueprint("ops", __name__)

@bp.get("/health")
def health():
    return jsonify({
        "ok": True,
        "time": time.time(),
        "host": socket.gethostname(),
    })

@bp.get("/preflight")
def preflight():
    payload = {
        "ok": True,
        "service": {"hostname": socket.gethostname()},
        "redis": {
            "ok": True,
            "url": current_app.config.get("REDIS_URL", "redis://redis:6379/0"),
        },
        "geo": {
            "city_db": None, "city_exists": False, "city_loaded": False,
            "asn_db":  None, "asn_exists":  False, "asn_loaded":  False,
        },
    }
    try:
        r = _redis.from_url(payload["redis"]["url"], socket_timeout=0.25)
        r.ping()
    except Exception as e:
        payload["redis"]["ok"] = False
        payload["redis"]["error"] = (str(e) or e.__class__.__name__)[:200]

    readers = (
        current_app.extensions.get("geo")
        or current_app.config.get("GEO_READERS")
        or {}
    )
    try:
        payload["geo"] = geo_status(readers)
    except Exception as e:
        payload["geo"]["error"] = (str(e) or e.__class__.__name__)[:200]

    return jsonify(payload)

@bp.post("/ops/reload-geo")
def reload_geo():
    old = current_app.extensions.get("geo") or current_app.config.get("GEO_READERS") or {}
    for r in (old.get("city"), old.get("asn")):
        try:
            if r:
                r.close()
        except Exception:
            pass
    readers = load_readers()
    current_app.extensions["geo"] = readers
    current_app.config["GEO_READERS"] = readers
    return jsonify({"ok": True, "geo": geo_status(readers)})
