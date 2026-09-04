#!/usr/bin/env python3
"""Fetch SofaScore API JSON via curl_cffi (Chrome TLS impersonation)."""
from __future__ import annotations

import json
import sys

from curl_cffi import requests


def main() -> None:
	if len(sys.argv) < 2:
		print("usage: sofascore-api.py <api-path>", file=sys.stderr)
		sys.exit(2)

	path = sys.argv[1]
	if not path.startswith("/"):
		path = f"/{path}"

	session = requests.Session(impersonate="chrome120")
	response = session.get(
		f"https://api.sofascore.com/api/v1{path}",
		headers={"Referer": "https://www.sofascore.com/"},
		timeout=30,
	)

	if response.status_code != 200:
		print(json.dumps({"error": response.status_code, "path": path}), file=sys.stderr)
		sys.exit(1)

	sys.stdout.write(response.text)


if __name__ == "__main__":
	main()
