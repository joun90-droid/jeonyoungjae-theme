# -*- coding: utf-8 -*-
"""Lightweight API for theme app: live KR + US prices + static hosting."""
import json
import os
import time
import threading
import concurrent.futures
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests

ROOT = Path(__file__).resolve().parent
_RAW = json.loads((ROOT / "codes.json").read_text(encoding="utf-8"))
# backward compatible: list[str] or list[dict]
if _RAW and isinstance(_RAW[0], str):
    INSTRUMENTS = [{"code": c, "symbol": c, "market": "KR", "currency": "KRW"} for c in _RAW]
else:
    INSTRUMENTS = _RAW

HTTP = requests.Session()
HTTP.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
})

CACHE = {"ts": 0.0, "json": b"{}", "map": {}}
LOCK = threading.Lock()
TTL = 15


def _is_kr(inst):
    m = (inst.get("market") or "").upper()
    c = str(inst.get("code") or "")
    if m in ("NASDAQ", "NYSE", "US"):
        return False
    if m in ("KOSPI", "KOSDAQ", "KR"):
        return True
    return c.isdigit()


def _fetch_kr(instruments):
    out = {}
    codes = [i["code"] for i in instruments]
    for i in range(0, len(codes), 40):
        chunk = codes[i:i + 40]
        url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:" + ",".join(chunk)
        try:
            r = HTTP.get(url, headers={"Referer": "https://finance.naver.com/"}, timeout=4)
            r.raise_for_status()
            areas = (((r.json() or {}).get("result") or {}).get("areas") or [])
            for area in areas:
                for row in area.get("datas") or []:
                    code = str(row.get("cd") or "")
                    if not code:
                        continue
                    nv = row.get("nv")
                    cr = row.get("cr")
                    cv = row.get("cv")
                    out[code] = {
                        "code": code,
                        "name": row.get("nm") or "",
                        "price": int(nv) if nv is not None else None,
                        "change": int(cv) if cv is not None else None,
                        "changeRate": float(cr) if cr is not None else None,
                        "currency": "KRW",
                        "status": row.get("ms") or "",
                        "liveAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                    }
        except Exception as e:
            print("KR batch error", e)
    return out


def _fetch_us_one(inst):
    symbol = inst.get("symbol") or inst.get("code")
    code = inst.get("code") or symbol
    candidates = [symbol]
    if symbol.endswith(".O") or symbol.endswith(".N"):
        candidates.append(symbol[:-2])
    else:
        candidates.append(symbol + ".O")
    for sym in candidates:
        try:
            r = HTTP.get(
                f"https://api.stock.naver.com/stock/{sym}/basic",
                headers={"Referer": "https://m.stock.naver.com/"},
                timeout=2.5,
            )
            if r.status_code != 200:
                continue
            d = r.json()
            price_s = str(d.get("closePrice") or "").replace(",", "")
            chg_s = d.get("fluctuationsRatio")
            cmp_s = str(d.get("compareToPreviousClosePrice") or "").replace(",", "")
            price = float(price_s) if price_s else None
            return code, {
                "code": code,
                "symbol": d.get("reutersCode") or sym,
                "name": d.get("stockName") or "",
                "price": round(price, 2) if price is not None else None,
                "change": float(cmp_s) if cmp_s else None,
                "changeRate": float(chg_s) if chg_s not in (None, "") else None,
                "currency": "USD",
                "status": d.get("marketStatus") or "",
                "liveAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            }
        except Exception:
            continue
    return code, None


def fetch_prices(instruments=None):
    instruments = instruments or INSTRUMENTS
    kr = [i for i in instruments if _is_kr(i)]
    us = [i for i in instruments if not _is_kr(i)]
    out = {}
    out.update(_fetch_kr(kr))
    if us:
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
            for code, row in ex.map(_fetch_us_one, us):
                if row:
                    out[code] = row
    # KR fallback for missing numeric
    missing = [i for i in kr if i["code"] not in out]
    for inst in missing[:15]:
        code = inst["code"]
        try:
            r = HTTP.get(
                f"https://m.stock.naver.com/api/stock/{code}/basic",
                headers={"Referer": "https://m.stock.naver.com/"},
                timeout=2.5,
            )
            if r.status_code != 200:
                continue
            d = r.json()
            price = str(d.get("closePrice") or "").replace(",", "")
            out[code] = {
                "code": code,
                "name": d.get("stockName") or "",
                "price": int(float(price)) if price else None,
                "change": None,
                "changeRate": float(d.get("fluctuationsRatio") or 0),
                "currency": "KRW",
                "status": d.get("marketStatus") or "",
                "liveAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            }
        except Exception:
            pass
    return out


def refresh_cache(force=False):
    now = time.time()
    with LOCK:
        if not force and CACHE["map"] and now - CACHE["ts"] < TTL:
            return CACHE["map"]
    data = fetch_prices()
    payload = {
        "success": True,
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "count": len(data),
        "prices": data,
    }
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    with LOCK:
        CACHE["ts"] = time.time()
        CACHE["map"] = data
        CACHE["json"] = raw
    return data


def loop():
    while True:
        try:
            refresh_cache(force=True)
            print("prices refreshed", len(CACHE["map"]))
        except Exception as e:
            print("refresh fail", e)
        time.sleep(20)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/prices":
            qs = parse_qs(parsed.query)
            refresh_cache(force="force" in qs)
            with LOCK:
                body = CACHE["json"]
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=5")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/api/health":
            body = b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()


def main():
    os.chdir(ROOT)
    refresh_cache(force=True)
    threading.Thread(target=loop, daemon=True).start()
    port = int(os.environ.get("PORT", "8080"))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("theme api on", port, "instruments", len(INSTRUMENTS))
    httpd.serve_forever()


if __name__ == "__main__":
    main()
