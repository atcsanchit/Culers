"""SofaScore proxy for Vercel — Chrome TLS impersonation (curl_cffi).

Local `npm run dev` uses scripts/sofascore-api.py instead. Node fetch from
Vercel datacenter IPs is 403'd by SofaScore; curl_cffi is not.
Only SofaScore API paths are allowed (no open URL proxy).
"""

from __future__ import annotations

import json
import re
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from curl_cffi import requests

SAFE_PATH = re.compile(r"^/[A-Za-z0-9][A-Za-z0-9_./-]*$")


class handler(BaseHTTPRequestHandler):
	def log_message(self, format: str, *args: object) -> None:
		return

	def do_GET(self) -> None:
		qs = parse_qs(urlparse(self.path).query)
		raw = (qs.get("path") or [""])[0].strip()
		path = raw if raw.startswith("/") else f"/{raw}"
		if ".." in path or path.startswith("//") or not SAFE_PATH.match(path):
			self._send(400, {"error": "invalid path"})
			return
		try:
			response = requests.get(
				f"https://api.sofascore.com/api/v1{path}",
				impersonate="chrome120",
				headers={"Referer": "https://www.sofascore.com/"},
				timeout=20,
			)
			self.send_response(response.status_code)
			self.send_header("Content-Type", "application/json; charset=utf-8")
			self.send_header("Cache-Control", "no-store")
			self.end_headers()
			self.wfile.write(response.content)
		except Exception as err:
			self._send(502, {"error": str(err)})

	def _send(self, status: int, payload: dict) -> None:
		body = json.dumps(payload).encode("utf-8")
		self.send_response(status)
		self.send_header("Content-Type", "application/json; charset=utf-8")
		self.end_headers()
		self.wfile.write(body)
