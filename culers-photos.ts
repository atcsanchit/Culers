const FCB_SITE = 'https://www.fcbarcelona.com';

export const CAMP_NOU_BG =
	'https://www.fcbarcelona.com/photo-resources/fcbarcelona/photo/2018/03/13/770788f8-49e4-4eb4-b4f5-aa7daa7f1e13/Camp-Nou-Grass.jpg?width=1920&height=1080';

type PhotoPlayer = { name: string; photo: string; fcbId?: number; number?: string };

const photoCache = new Map<string, string>();

function normalizeName(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function nameToSlug(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function nameTokens(name: string) {
	const norm = normalizeName(name);
	const parts = norm.split(' ').filter((p) => p.length > 2);
	return [...new Set([norm.replace(/ /g, ''), ...parts])];
}

function photoPathMatchesPlayer(path: string, name: string, number?: string) {
	const lower = path.toLowerCase();
	if (lower.includes('icon_cub') || lower.includes('fcb-share') || lower.includes('fcb-meta')) return false;
	if (lower.includes('hansi') || lower.includes('flick')) return false;

	const tokens = nameTokens(name);
	if (tokens.some((t) => t.length > 3 && lower.includes(t))) return true;
	if (number && lower.includes(`${number}-`)) return true;
	if (number && lower.includes(`/${number.padStart(2, '0')}-`)) return true;
	return false;
}

async function fetchText(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Culers/1.0; local Barcelona fan app)',
				Accept: 'text/html',
			},
		});
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	}
}

function pageLooksLikePlayer(html: string, name: string) {
	const tokens = nameTokens(name);
	const hay = html.toLowerCase();
	return tokens.filter((t) => t.length > 3).some((t) => hay.includes(t));
}

function extractHeroPhoto(html: string, name: string, number?: string) {
	const matches = [...html.matchAll(/photo-resources\/20\d{2}\/[^"']+\.(?:png|jpg|webp)(?:\?[^"']*)?/gi)];
	for (const m of matches) {
		const raw = m[0].split('?')[0];
		if (!photoPathMatchesPlayer(raw, name, number)) continue;
		return `${FCB_SITE}/${raw}?width=1200&height=1600`;
	}
	return '';
}

async function fetchFcbWebsitePhoto(fcbId: number, name: string, number?: string): Promise<string> {
	const cacheKey = `fcb-${fcbId}`;
	if (photoCache.has(cacheKey)) return photoCache.get(cacheKey)!;

	const parts = name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	const slugCandidates = [
		nameToSlug(name),
		nameToSlug(`${parts[0]}-${parts[parts.length - 1]}`),
		nameToSlug(parts[parts.length - 1] ?? name),
	];

	for (const slug of [...new Set(slugCandidates)]) {
		const html = await fetchText(`${FCB_SITE}/en/football/first-team/players/${fcbId}/${slug}`);
		if (!html || !pageLooksLikePlayer(html, name)) continue;
		const photo = extractHeroPhoto(html, name, number);
		if (photo) {
			photoCache.set(cacheKey, photo);
			return photo;
		}
	}

	photoCache.set(cacheKey, '');
	return '';
}

async function mapPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 6) {
	let i = 0;
	const runners = Array.from({ length: concurrency }, async () => {
		while (i < items.length) {
			const idx = i++;
			await worker(items[idx]);
		}
	});
	await Promise.all(runners);
}

/** Only attach photos verified from fcbarcelona.com — never substitute another person. */
export async function enrichPlayerPhotos<T extends PhotoPlayer>(players: T[]): Promise<T[]> {
	const enriched = players.map((p) => ({ ...p, photo: p.photo || '' }));

	await mapPool(enriched, async (player) => {
		if (player.photo || !player.fcbId) return;
		player.photo = await fetchFcbWebsitePhoto(player.fcbId, player.name, player.number);
	});

	return enriched;
}

export { normalizeName as normalizePlayerName };
