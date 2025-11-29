from __future__ import annotations
import os
from typing import Dict, Any, Tuple
import maxminddb

CITY_DB = os.getenv("GEOIP_CITY_DB", "/data/GeoLite2-City.mmdb")
ASN_DB  = os.getenv("GEOIP_ASN_DB",  "/data/GeoLite2-ASN.mmdb")

def load_readers(city_path: str | None = None, asn_path: str | None = None) -> Dict[str, Any]:
    city_path = city_path or CITY_DB
    asn_path  = asn_path  or ASN_DB
    readers: Dict[str, Any] = {
        "city": None,
        "asn":  None,
        "city_path": city_path,
        "asn_path":  asn_path,
    }
    if os.path.exists(city_path):
        try:
            readers["city"] = maxminddb.open_database(city_path)
        except Exception:
            readers["city"] = None
    if os.path.exists(asn_path):
        try:
            readers["asn"] = maxminddb.open_database(asn_path)
        except Exception:
            readers["asn"] = None
    return readers

def enrich_pair(src_ip: str, dst_ip: str, readers: Dict[str, Any]) -> Tuple[dict, dict]:
    def _enrich(ip: str) -> dict:
        out: dict = {}
        try:
            r = readers.get("city")
            if r:
                rec = r.get(ip) or {}
                city = (rec.get("city") or {}).get("names", {}).get("en")
                cc   = (rec.get("country") or {}).get("iso_code")
                if city: out["city"] = city
                if cc:   out["country"] = cc
        except Exception:
            pass
        try:
            r = readers.get("asn")
            if r:
                rec = r.get(ip) or {}
                asn = rec.get("autonomous_system_number")
                org = rec.get("autonomous_system_organization")
                if asn: out["asn"] = asn
                if org: out["asn_org"] = org
        except Exception:
            pass
        return out
    return _enrich(src_ip or ""), _enrich(dst_ip or "")

def geo_status(readers: Dict[str, Any]) -> Dict[str, Any]:
    city_path = readers.get("city_path", CITY_DB)
    asn_path  = readers.get("asn_path",  ASN_DB)
    return {
        "city_db":     city_path,
        "city_exists": os.path.exists(city_path),
        "city_loaded": readers.get("city") is not None,
        "asn_db":      asn_path,
        "asn_exists":  os.path.exists(asn_path),
        "asn_loaded":  readers.get("asn") is not None,
    }
