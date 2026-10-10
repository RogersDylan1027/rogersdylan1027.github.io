#!/usr/bin/env python3
"""Jobs v0.1.1: local-only private UI + JSON API + SQLite store. Put behind Tailscale Serve.
Requirements: Python 3.10+; no third-party dependencies.
"""
import hmac
import json
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote
from urllib.parse import urlsplit

HOST = os.environ.get("JOBS_BIND", "127.0.0.1")
PORT = int(os.environ.get("JOBS_PORT", "8765"))
KEY = os.environ.get("JOBS_API_KEY", "")
DATA = Path(os.environ.get("JOBS_DATA_DIR", str(Path.home() / ".local/share/dashboard-jobs"))).expanduser()
DB = DATA / "jobs.sqlite3"
STATES = {"pending_review", "accepted", "declined", "drafting", "answers_review", "ready_to_submit", "submitted", "interviewing", "offer", "rejected", "withdrawn"}
COLLECTIONS = {"jobs", "answers", "preferences", "profile", "activity"}
MAX_BODY = 1024 * 1024
UI = Path(__file__).with_name("index.html")

def now():
    return datetime.now(timezone.utc).isoformat()

def connect():
    connection = sqlite3.connect(DB, timeout=20)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 20000")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection

def initialize():
    if not KEY or len(KEY) < 32:
        raise SystemExit("Set JOBS_API_KEY to a secret of at least 32 characters.")
    if HOST not in ("127.0.0.1", "::1"):
        raise SystemExit("Refusing non-loopback bind. Use Tailscale Serve to provide private HTTPS.")
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(DATA, 0o700)
    with connect() as db:
        db.execute("CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection,id))")
        db.execute("CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, action TEXT NOT NULL, collection TEXT NOT NULL, record_id TEXT NOT NULL)")
    if DB.exists():
        os.chmod(DB, 0o600)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format_string, *args):
        # Do not print credentials, request bodies, or URL query strings.
        print("%s %s" % (self.address_string(), format_string % args))

    def respond(self, code, body):
        raw = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def authorized(self):
        value = self.headers.get("Authorization", "")
        return hmac.compare_digest(value, "Bearer " + KEY)

    def route(self):
        if not self.authorized():
            self.respond(401, {"error":"Unauthorized"})
            return None
        parsed = urlsplit(self.path)
        if parsed.query:
            self.respond(400, {"error":"Query parameters are not supported"})
            return None
        parts = parsed.path.strip("/").split("/")
        if parts == ["health"]:
            return ("health", None)
        if len(parts) in (2, 3) and parts[0] == "api" and parts[1] in COLLECTIONS:
            return (parts[1], parts[2] if len(parts) == 3 else None)
        self.respond(404, {"error":"Not found"})
        return None

    def do_GET(self):
        # The UI is served only by this loopback-bound process, via the separately
        # authorized Tailscale HTTPS endpoint. Never expose this port publicly.
        if urlsplit(self.path).path in ("/", "/index.html") and not urlsplit(self.path).query:
            try:
                raw = UI.read_bytes()
            except OSError:
                return self.respond(503, {"error": "UI unavailable"})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        route = self.route()
        if not route:
            return
        coll, identifier = route
        if coll == "health":
            return self.respond(200, {"status":"ok", "version":"0.1.1"})
        with connect() as db:
            if identifier:
                result = db.execute("SELECT payload FROM records WHERE collection=? AND id=?", (coll, identifier)).fetchone()
                if result is None:
                    return self.respond(404, {"error":"Not found"})
                return self.respond(200, json.loads(result["payload"]))
            rows = db.execute("SELECT payload FROM records WHERE collection=? ORDER BY updated_at DESC", (coll,)).fetchall()
            return self.respond(200, {"items":[json.loads(row["payload"]) for row in rows]})

    def do_PUT(self):
        route = self.route()
        if not route:
            return
        coll, identifier = route
        if coll == "health" or not identifier or len(identifier) > 120 or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for ch in identifier):
            return self.respond(400, {"error":"Invalid record path"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > MAX_BODY:
                return self.respond(413, {"error":"Body size invalid"})
            data = json.loads(self.rfile.read(size))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            return self.respond(400, {"error":"Invalid JSON"})
        if not isinstance(data, dict) or (data.get("id") not in (None, identifier)):
            return self.respond(400, {"error":"Expected object with matching id"})
        data["id"] = identifier
        if coll == "jobs":
            if data.get("status", "pending_review") not in STATES:
                return self.respond(400, {"error":"Invalid status"})
            previous = None
            with connect() as db:
                row = db.execute("SELECT payload FROM records WHERE collection='jobs' AND id=?", (identifier,)).fetchone()
                if row: previous = json.loads(row["payload"])
            # Nova can prepare an application, but a separate human-only submission channel is required.
            if data.get("status") == "submitted" and (not previous or previous.get("status") != "submitted"):
                return self.respond(403, {"error":"Submission status must be recorded using a separately approved workflow"})
            if data.get("application", {}).get("submitted") is True and (not previous or not previous.get("application", {}).get("submitted")):
                return self.respond(403, {"error":"Automated submission is not supported"})
        data["updated_at"] = now()
        with connect() as db:
            db.execute("INSERT INTO records(collection,id,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at", (coll, identifier, json.dumps(data), data["updated_at"]))
            db.execute("INSERT INTO audit(timestamp,action,collection,record_id) VALUES(?,?,?,?)", (now(), "upsert", coll, identifier))
        self.respond(200, data)

    def do_DELETE(self):
        route = self.route()
        if not route: return
        coll, identifier = route
        if coll != "jobs" or not identifier:
            return self.respond(405, {"error":"Delete only supports individual jobs"})
        # Soft deletion retains declined positions so Nova never suggests them twice.
        with connect() as db:
            row = db.execute("SELECT payload FROM records WHERE collection='jobs' AND id=?", (identifier,)).fetchone()
        if not row: return self.respond(404, {"error":"Not found"})
        data = json.loads(row["payload"]); data["status"] = "declined"; data["updated_at"] = now()
        with connect() as db:
            db.execute("UPDATE records SET payload=?,updated_at=? WHERE collection='jobs' AND id=?", (json.dumps(data), data["updated_at"], identifier))
            db.execute("INSERT INTO audit(timestamp,action,collection,record_id) VALUES(?,?,?,?)", (now(), "decline", "jobs", identifier))
        self.respond(200, data)

if __name__ == "__main__":
    initialize()
    print(f"Jobs API listening on http://{HOST}:{PORT} (loopback only)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
