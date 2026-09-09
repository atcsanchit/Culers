#!/usr/bin/env python3
"""Scrape a public Instagram profile + cache post images locally."""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

from curl_cffi import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE_ROOT = ROOT / ".cache" / "instagram"
HEADERS = {"Referer": "https://www.instagram.com/"}


def session():
	return requests.Session(impersonate="chrome120")


def cache_dir(username: str) -> Path:
	return CACHE_ROOT / username


def cache_image(username: str, code: str, url: str, s: requests.Session) -> bool:
	post_headers = {**HEADERS, "Referer": f"https://www.instagram.com/p/{code}/"}
	res = s.get(url, headers=post_headers, timeout=30)
	if res.status_code != 200 or len(res.content) < 512:
		return False
	folder = cache_dir(username)
	folder.mkdir(parents=True, exist_ok=True)
	(folder / f"{code}.jpg").write_bytes(res.content)
	return True


def fetch_profile(username: str = "fcbarcelona") -> dict:
	s = session()
	profile_url = f"https://www.instagram.com/{username}/"
	res = s.get(profile_url, headers=HEADERS, timeout=30)
	if res.status_code != 200:
		return {"error": res.status_code, "posts": []}

	text = res.text
	og = re.search(r'property="og:description" content="([^"]+)"', text)
	og_image = re.search(r'property="og:image" content="([^"]+)"', text)
	followers_label = ""
	posts_count_label = ""
	if og:
		desc = html.unescape(og.group(1)).replace("&#064;", "@")
		followers_match = re.search(r"([\d,.]+[KMB]?)\s+Followers", desc, re.I)
		posts_match = re.search(r"([\d,.]+[KMB]?)\s+Posts", desc, re.I)
		followers_label = followers_match.group(1) if followers_match else ""
		posts_count_label = posts_match.group(1) if posts_match else ""

	if og_image:
		cache_image(username, "profile", html.unescape(og_image.group(1)), s)

	shortcodes = list(dict.fromkeys(re.findall(r"/p/([A-Za-z0-9_-]{11})", text)))[:12]
	posts = []
	caption_prefix = re.compile(
		rf"^[\d,.]+[KMB]?\s+likes,\s+[\d,.]+[KMB]?\s+comments\s+-\s+{re.escape(username)}[^:]*:\s*",
		re.I,
	)
	for code in shortcodes[:9]:
		post_res = s.get(f"https://www.instagram.com/p/{code}/", headers=HEADERS, timeout=30)
		if post_res.status_code != 200:
			continue
		image = re.search(r'property="og:image" content="([^"]+)"', post_res.text)
		caption = re.search(r'property="og:description" content="([^"]+)"', post_res.text)
		if not image:
			continue
		image_url = html.unescape(image.group(1))
		cached = cache_image(username, code, image_url, s)
		cap = html.unescape(caption.group(1)) if caption else ""
		cap = caption_prefix.sub("", cap)
		posts.append(
			{
				"id": code,
				"url": f"https://www.instagram.com/p/{code}/",
				"image": image_url,
				"cached": cached,
				"caption": cap[:280],
			}
		)

	profile_file = cache_dir(username) / "profile.jpg"
	return {
		"username": username,
		"profileUrl": profile_url,
		"profileImage": f"/api/social/instagram/image?user={username}&id=profile" if profile_file.exists() else "",
		"followersLabel": followers_label,
		"postsLabel": posts_count_label,
		"posts": posts,
	}


if __name__ == "__main__":
	user = sys.argv[1] if len(sys.argv) > 1 else "fcbarcelona"
	print(json.dumps(fetch_profile(user)))
