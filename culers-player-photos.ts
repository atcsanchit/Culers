const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';

const cutoutCache = new Map<string, string>();

function normalizeName(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function lastToken(name: string) {
	const parts = normalizeName(name).split(' ').filter(Boolean);
	return parts[parts.length - 1] ?? '';
}

type TsdbPlayer = {
	idPlayer?: string;
	strPlayer?: string;
	strTeam?: string;
	strCutout?: string;
	strThumb?: string;
	strSport?: string;
};

/** ESPN jersey kits / kit icons — never treat these as player photos. */
export function isJerseyAsset(url: string) {
	const u = url.toLowerCase();
	return /jersey|kitimage|kit_|\/kits\/|shirt|uniform|jerseyimages/i.test(u);
}

function scoreCandidate(row: TsdbPlayer, playerName: string, teamName?: string) {
	const sport = String(row.strSport ?? 'Soccer');
	if (/baseball|basketball|hockey|tennis|cricket|rugby|american/i.test(sport)) return -1;

	const pname = normalizeName(String(row.strPlayer ?? ''));
	const want = normalizeName(playerName);
	if (!pname || !want) return -1;
	let score = 0;
	if (pname === want) score += 8;
	else if (pname.endsWith(lastToken(want)) && lastToken(want).length > 3) score += 5;
	else if (pname.includes(want) || want.includes(pname)) score += 3;
	else return -1;

	if (teamName) {
		const team = normalizeName(teamName);
		const rowTeam = normalizeName(String(row.strTeam ?? ''));
		if (team && rowTeam) {
			if (rowTeam === team || rowTeam.includes(team) || team.includes(rowTeam)) score += 4;
			else {
				const tLast = lastToken(team);
				if (tLast.length > 3 && rowTeam.includes(tLast)) score += 2;
			}
		}
	}
	// Prefer real photographic thumbs over cartoon/jersey “cutouts”.
	if (row.strThumb) score += 3;
	if (row.strCutout) score += 1;
	return score;
}

/**
 * Prefer strThumb (studio/action headshots). Many strCutout values are
 * cartoon jersey backs (Haaland #9), not portraits.
 */
function pickPhoto(row: TsdbPlayer) {
	const thumb = String(row.strThumb?.trim() || '');
	const cutout = String(row.strCutout?.trim() || '');
	if (thumb && !isJerseyAsset(thumb)) return thumb;
	if (cutout && !isJerseyAsset(cutout)) return cutout;
	return thumb || cutout || '';
}

/** Resolve a real player headshot from TheSportsDB (cached). */
export async function fetchPlayerCutout(playerName: string, teamName?: string): Promise<string> {
	const key = `${normalizeName(playerName)}::${normalizeName(teamName ?? '')}`;
	if (cutoutCache.has(key)) return cutoutCache.get(key)!;
	if (!playerName.trim()) {
		cutoutCache.set(key, '');
		return '';
	}

	try {
		const res = await fetch(`${TSDB}/searchplayers.php?p=${encodeURIComponent(playerName.trim())}`, {
			headers: { 'User-Agent': 'Culers/1.0' },
		});
		if (!res.ok) {
			cutoutCache.set(key, '');
			return '';
		}
		const data = (await res.json()) as { player?: TsdbPlayer[] };
		const rows = data.player ?? [];
		let best: TsdbPlayer | null = null;
		let bestScore = 0;
		for (const row of rows) {
			const score = scoreCandidate(row, playerName, teamName);
			if (score > bestScore && pickPhoto(row)) {
				best = row;
				bestScore = score;
			}
		}
		const photo = best ? pickPhoto(best) : '';
		cutoutCache.set(key, photo);
		return photo;
	} catch {
		cutoutCache.set(key, '');
		return '';
	}
}

/** Best-effort photo from an ESPN athlete payload — never jersey kits. */
export function photoFromEspnAthlete(athlete: Record<string, unknown> | null | undefined): string {
	if (!athlete) return '';
	const headshot = athlete.headshot as { href?: string } | string | undefined;
	if (typeof headshot === 'string' && headshot.trim() && !isJerseyAsset(headshot)) return headshot.trim();
	if (headshot && typeof headshot === 'object' && headshot.href) {
		const href = String(headshot.href).trim();
		if (href && !isJerseyAsset(href)) return href;
	}
	// jerseyImages are kit PNGs (number on back) — not player photos.
	return '';
}

/** Enrich rated XI photos without blocking forever (bounded concurrency). */
export async function enrichPlayersWithCutouts<T extends { name: string; photo?: string }>(
	players: T[],
	teamName: string,
	concurrency = 5,
): Promise<T[]> {
	const out = [...players];
	let i = 0;
	async function worker() {
		while (i < out.length) {
			const idx = i++;
			const p = out[idx]!;
			const existing = p.photo?.trim() || '';
			// Replace missing or jersey-kit placeholders with a real headshot.
			if (existing && !isJerseyAsset(existing)) continue;
			const photo = await fetchPlayerCutout(p.name, teamName);
			if (photo) out[idx] = { ...p, photo };
			else if (existing && isJerseyAsset(existing)) out[idx] = { ...p, photo: '' };
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(out.length, 1)) }, () => worker()));
	return out;
}
