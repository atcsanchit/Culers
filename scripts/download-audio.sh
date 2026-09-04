#!/usr/bin/env bash
# Re-download all Culers audio into public/audio/ (offline, no runtime YouTube).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUDIO="$ROOT/public/audio"
TMP="${TMPDIR:-/tmp}/culers-audio-$$"
YT="${YT_DLP:-$(command -v yt-dlp || echo /tmp/yt-dlp)}"

mkdir -p "$AUDIO" "$TMP"

if ! command -v ffmpeg >/dev/null; then
	echo "ffmpeg is required" >&2
	exit 1
fi

if ! command -v "$YT" >/dev/null; then
	echo "Downloading yt-dlp..."
	curl -fsSL -o /tmp/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
	chmod +x /tmp/yt-dlp
	YT=/tmp/yt-dlp
fi

echo "→ Background chants (9JdugskAcS0)"
"$YT" -x --audio-format best -o "$TMP/chants.%(ext)s" "https://www.youtube.com/watch?v=9JdugskAcS0"
ffmpeg -y -i "$TMP"/chants.* -c:a libvorbis -q:a 4 "$AUDIO/barca-chants.ogg"

echo "→ Second anthem (ZM7aiHU_UZY)"
"$YT" -x --audio-format best -o "$TMP/anthem2.%(ext)s" "https://www.youtube.com/watch?v=ZM7aiHU_UZY"
ffmpeg -y -i "$TMP"/anthem2.* -c:a libvorbis -q:a 4 "$AUDIO/barca-anthem.ogg"

echo "→ Fetch dribble loop (fbNRxK-9-iE 1:27–1:40)"
"$YT" -x --audio-format best -o "$TMP/fetch-src.%(ext)s" "https://www.youtube.com/watch?v=fbNRxK-9-iE"
ffmpeg -y -ss 87 -i "$TMP"/fetch-src.* -t 13 -c:a libvorbis -q:a 4 "$AUDIO/fetch-dribble-loop.ogg"

echo "→ Goal bed + cheer (synced 7s, fades)"
ffmpeg -y -ss 87 -i "$TMP"/fetch-src.* -t 7 -af "afade=t=in:st=0:d=0.5,afade=t=out:st=5.5:d=1.5" -c:a libvorbis -q:a 4 "$AUDIO/goal-bed.ogg"
"$YT" -x --audio-format best -o "$TMP/goal-src.%(ext)s" "https://www.youtube.com/watch?v=Eh7G2lAu8f4"
ffmpeg -y -ss 102 -i "$TMP"/goal-src.* -t 7 -af "volume=15dB,afade=t=in:st=0:d=0.5,afade=t=out:st=5.5:d=1.5" -c:a libvorbis -q:a 4 "$AUDIO/goal-cheer.ogg"

rm -rf "$TMP"
echo "Done. Files in $AUDIO:"
ls -lh "$AUDIO"
