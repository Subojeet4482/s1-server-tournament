"""LOAD BALANCER CONTROL (Servers & Control tab).

The browser never talks to the load balancer directly and never sees its admin key:
  browser  ->  /api/lb/*  (owner login + X-Requested-With, like every other panel API)  ->  this file  ->  LB /lb/admin/*  (X-Admin-Key)

Env (Render -> Environment):  LB_URL=https://<your load balancer>.onrender.com   LB_ADMIN_KEY=<same value as the load balancer's LB_ADMIN_KEY>
"""
import os
import requests
from flask import jsonify, request
import security

LB_URL = os.environ.get("LB_URL", "").strip().rstrip("/")
LB_ADMIN_KEY = os.environ.get("LB_ADMIN_KEY", "").strip()


def _call(method, path, body=None, timeout=25):
    if not LB_URL or not LB_ADMIN_KEY:
        return {"ok": False, "error": "LB_URL / LB_ADMIN_KEY set nahi hain (Render -> Environment me daalo)", "code": "not_configured"}, 503
    try:
        r = requests.request(method, LB_URL + path, json=body if method != "GET" else None, headers={"X-Admin-Key": LB_ADMIN_KEY}, timeout=timeout)
    except requests.exceptions.Timeout:
        return {"ok": False, "error": "Load balancer ne jawab nahi diya (sleep ho sakta hai) - thodi der baad dobara try karo"}, 504
    except Exception as e:
        return {"ok": False, "error": "Load balancer tak pahunch nahi paya: " + str(e)[:100]}, 502
    try:
        j = r.json()
    except Exception:
        return {"ok": False, "error": f"Load balancer ne galat jawab diya (HTTP {r.status_code}). LB_URL sahi hai?"}, 502
    if r.status_code == 403:
        return {"ok": False, "error": "LB_ADMIN_KEY match nahi kar raha (panel aur load balancer me alag key hai)"}, 502
    return j, r.status_code


def register(app):
    def out(res):
        j, st = res
        return jsonify(j), st

    @app.get("/api/lb/overview")
    @security.login_required
    def lb_overview():
        return out(_call("GET", "/lb/admin/overview"))

    @app.post("/api/lb/settings")
    @security.login_required
    def lb_settings():
        return out(_call("POST", "/lb/admin/settings", request.get_json(silent=True) or {}))

    @app.post("/api/lb/ip")
    @security.login_required
    def lb_ip():
        return out(_call("POST", "/lb/admin/ip", request.get_json(silent=True) or {}))

    @app.post("/api/lb/detect")
    @security.login_required
    def lb_detect():
        return out(_call("POST", "/lb/admin/detect", request.get_json(silent=True) or {}, 30))

    @app.post("/api/lb/server-url")
    @security.login_required
    def lb_server_url():
        return out(_call("POST", "/lb/admin/server-url", request.get_json(silent=True) or {}, 30))

    @app.post("/api/lb/domains")
    @security.login_required
    def lb_domains():
        return out(_call("POST", "/lb/admin/domains", request.get_json(silent=True) or {}))

    @app.post("/api/lb/server/<sid>")
    @security.login_required
    def lb_server(sid):
        if sid not in ("s1", "s2", "s3", "s4", "s5"):
            return jsonify(ok=False, error="unknown server"), 400
        return out(_call("POST", f"/lb/admin/servers/{sid}", request.get_json(silent=True) or {}, 20))

    @app.post("/api/lb/check")
    @security.login_required
    def lb_check():
        return out(_call("POST", "/lb/admin/check", {}, 40))

    return app
