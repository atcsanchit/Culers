import fs from 'node:fs';
import path from 'node:path';

const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const FCB_API = 'https://api-fcb.pulselive.com/football';
const FCB_ORIGIN = 'https://www.fcbarcelona.com';
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export type StadiumManifestVenue = {
	groundId: number;
	name: string;
	path: string;
	source: string;
};

export type StadiumManifestFixture = {
	fixtureId: string;
	groundId?: number;
	venue: string;
	path: string;
	source: string;
};

export type StadiumManifest = {
	venues: Record<string, StadiumManifestVenue>;
	fixtures: Record<string, StadiumManifestFixture>;
	updatedAt: string;
};

type Ground = { id: number; name: string };

function stadiumRoot(root: string) {
	return path.join(root, 'public/backgrounds/stadium');
}

function venuesDir(root: string) {
	return path.join(stadiumRoot(root), 'venues');
}

function fixturesDir(root: string) {
	return path.join(stadiumRoot(root), 'fixtures');
}

export function venueSlug(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 48);
}

export function venueFileName(groundId: number, name: string) {
	return `${groundId}-${venueSlug(name || 'venue')}.jpg`;
}

export function venuePublicPath(groundId: number, name: string) {
	return `/backgrounds/stadium/venues/${venueFileName(groundId, name)}`;
}

export function fixturePublicPath(fixtureId: string) {
	return `/backgrounds/stadium/fixtures/${fixtureId}.jpg`;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url: string): Promise<Buffer | null> {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.length < 8_000) return null;
		return buf;
	} catch {
		return null;
	}
}

/** Alternate search names when TheSportsDB misses accented FCB venue labels. */
const VENUE_SEARCH_ALIASES: Record<number, string[]> = {
	9840: ['Santiago Bernabeu', 'Estadio Santiago Bernabéu'],
	9623: ['Mestalla', 'Estadio Mestalla'],
	9624: ['Ramon Sanchez Pizjuan', 'Estadio Ramon Sanchez Pizjuan'],
	9096: ['Estadio de Balaidos', 'Balaidos'],
	3294: ['La Rosaleda', 'Estadio La Rosaleda'],
	2580: ['Mendizorrotza', 'Estadio Mendizorrotza'],
	2765: ['Estadio de Riazor', 'Riazor'],
	7017: ['El Sadar', 'Estadio El Sadar'],
	7338: ['El Sardinero', 'Estadio El Sardinero'],
	9558: ['Estadio La Cartuja', 'La Cartuja Sevilla'],
	2593: ['Estadio Ciudad de Valencia', 'Ciutat de Valencia'],
};

async function fetchTsdbVenuePhoto(venueName: string, groundId?: number): Promise<{ url: string; source: string } | null> {
	const names = [venueName, ...(groundId ? VENUE_SEARCH_ALIASES[groundId] ?? [] : [])];
	for (const name of names) {
		const res = await fetch(`${THESPORTSDB}/searchvenues.php?v=${encodeURIComponent(name)}`, {
			headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) continue;
		const data = (await res.json()) as {
			venues?: Array<{ strFanart1?: string; strFanart2?: string; strThumb?: string }>;
		};
		const venue = data.venues?.[0];
		const url = venue?.strFanart1?.trim() || venue?.strFanart2?.trim() || venue?.strThumb?.trim() || '';
		if (url) return { url, source: 'TheSportsDB venue photo' };
		await sleep(400);
	}
	return null;
}

async function fetchWikimediaVenuePhoto(venueName: string): Promise<{ url: string; source: string } | null> {
	const q = encodeURIComponent(`${venueName} stadium filetype:bitmap`);
	const api = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${q}&srnamespace=6&format=json&srlimit=5`;
	try {
		const res = await fetch(api, { headers: { 'User-Agent': 'Culers/1.0' } });
		if (!res.ok) return null;
		const data = (await res.json()) as { query?: { search?: Array<{ title: string }> } };
		const title = data.query?.search?.find((s) => /stadium|estadio|arena|camp nou|mestalla|bernab/i.test(s.title))?.title
			?? data.query?.search?.[0]?.title;
		if (!title) return null;

		await sleep(800);
		const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=1920&format=json&titles=${encodeURIComponent(title)}`;
		const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': 'Culers/1.0' } });
		if (!infoRes.ok) return null;
		const info = (await infoRes.json()) as {
			query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> };
		};
		const page = Object.values(info.query?.pages ?? {})[0];
		const url = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url ?? '';
		if (!url) return null;
		return { url, source: 'Wikimedia Commons' };
	} catch {
		return null;
	}
}
/** Known direct URLs when search fails (groundId → image URL). */
const VENUE_FALLBACK_URL: Record<number, string> = {};

async function fetchFcbVenues(): Promise<Ground[]> {
	const grounds = new Map<number, Ground>();
	for (let page = 0; page < 3; page++) {
		const res = await fetch(
			`${FCB_API}/fixtures?teams=49&compSeasons=879,883&pageSize=100&page=${page}&altIds=true`,
			{ headers: { Origin: FCB_ORIGIN, 'User-Agent': 'Culers/1.0' } },
		);
		if (!res.ok) break;
		const data = (await res.json()) as { content?: Array<{ ground?: { id?: number; name?: string } }> };
		for (const fx of data.content ?? []) {
			const g = fx.ground;
			const id = Number(g?.id ?? 0);
			const name = String(g?.name ?? '').trim();
			if (id && name && name.toUpperCase() !== 'TBC') grounds.set(id, { id, name });
		}
	}
	return [...grounds.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function readExistingVenueFiles(root: string): Map<number, string> {
	const dir = venuesDir(root);
	const found = new Map<number, string>();
	if (!fs.existsSync(dir)) return found;
	for (const file of fs.readdirSync(dir)) {
		const m = /^(\d+)-.+\.(jpg|jpeg|png|webp)$/i.exec(file);
		if (m) found.set(Number(m[1]), path.join(dir, file));
	}
	return found;
}

function migrateLegacyFlatFiles(root: string) {
	const base = stadiumRoot(root);
	fs.mkdirSync(venuesDir(root), { recursive: true });
	if (!fs.existsSync(base)) return;

	const legacyMap: Record<string, { id: number; name: string }> = {
		'camp-nou.jpg': { id: 3924, name: 'Spotify Camp Nou' },
		'san-mames-fanart.jpg': { id: 2598, name: 'San Mamés' },
		'san-mames.jpg': { id: 2598, name: 'San Mamés' },
		'martinez-valero.jpg': { id: 7023, name: 'Martínez Valero' },
		'metropolitano.jpg': { id: 5342, name: 'Riyadh Air Metropolitano' },
	};

	for (const [legacy, meta] of Object.entries(legacyMap)) {
		const src = path.join(base, legacy);
		if (!fs.existsSync(src)) continue;
		const dest = path.join(venuesDir(root), venueFileName(meta.id, meta.name));
		if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
	}
}

export async function syncStadiumPhotos(root: string): Promise<StadiumManifest> {
	const base = stadiumRoot(root);
	const vDir = venuesDir(root);
	const fDir = fixturesDir(root);
	fs.mkdirSync(vDir, { recursive: true });
	fs.mkdirSync(fDir, { recursive: true });
	migrateLegacyFlatFiles(root);

	const manifest: StadiumManifest = {
		venues: {},
		fixtures: {},
		updatedAt: new Date().toISOString(),
	};

	const existing = readExistingVenueFiles(root);
	const grounds = await fetchFcbVenues();

	for (const ground of grounds) {
		const fileName = venueFileName(ground.id, ground.name);
		const absPath = path.join(vDir, fileName);
		const publicPath = venuePublicPath(ground.id, ground.name);

		if (existing.has(ground.id) && fs.existsSync(existing.get(ground.id)!)) {
			if (!fs.existsSync(absPath)) fs.copyFileSync(existing.get(ground.id)!, absPath);
			manifest.venues[String(ground.id)] = {
				groundId: ground.id,
				name: ground.name,
				path: publicPath,
				source: 'Bundled stadium photo',
			};
			continue;
		}

		if (fs.existsSync(absPath)) {
			manifest.venues[String(ground.id)] = {
				groundId: ground.id,
				name: ground.name,
				path: publicPath,
				source: 'Bundled stadium photo',
			};
			continue;
		}

		let saved = false;
		const tsdb = await fetchTsdbVenuePhoto(ground.name, ground.id);
		await sleep(600);
		if (tsdb) {
			const buf = await downloadImage(tsdb.url);
			if (buf) {
				fs.writeFileSync(absPath, buf);
				manifest.venues[String(ground.id)] = {
					groundId: ground.id,
					name: ground.name,
					path: publicPath,
					source: tsdb.source,
				};
				saved = true;
			}
		}

		if (!saved && VENUE_FALLBACK_URL[ground.id]) {
			await sleep(500);
			const buf = await downloadImage(VENUE_FALLBACK_URL[ground.id]);
			if (buf) {
				fs.writeFileSync(absPath, buf);
				manifest.venues[String(ground.id)] = {
					groundId: ground.id,
					name: ground.name,
					path: publicPath,
					source: 'Wikimedia Commons',
				};
				saved = true;
			}
		}

		if (!saved) {
			const wiki = await fetchWikimediaVenuePhoto(ground.name);
			if (wiki) {
				const buf = await downloadImage(wiki.url);
				if (buf) {
					fs.writeFileSync(absPath, buf);
					manifest.venues[String(ground.id)] = {
						groundId: ground.id,
						name: ground.name,
						path: publicPath,
						source: wiki.source,
					};
					saved = true;
				}
			}
		}

		if (!saved) {
			console.warn(`[culers] No stadium photo for ${ground.name} (${ground.id})`);
		}
	}

	// Fixture-specific overrides — any image already dropped in fixtures/
	if (fs.existsSync(fDir)) {
		for (const file of fs.readdirSync(fDir)) {
			if (!IMAGE_EXT.has(path.extname(file).toLowerCase())) continue;
			const fixtureId = path.basename(file, path.extname(file));
			manifest.fixtures[fixtureId] = {
				fixtureId,
				path: fixturePublicPath(fixtureId),
				venue: '',
				source: 'Match-specific photo',
			};
		}
	}

	fs.writeFileSync(path.join(base, 'manifest.json'), JSON.stringify(manifest, null, 2));
	return manifest;
}

export function loadStadiumManifest(root: string): StadiumManifest | null {
	const manifestPath = path.join(stadiumRoot(root), 'manifest.json');
	if (!fs.existsSync(manifestPath)) return null;
	try {
		return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as StadiumManifest;
	} catch {
		return null;
	}
}

export function resolveStadiumPathFromManifest(
	manifest: StadiumManifest | null,
	fixtureId: string,
	groundId?: number,
): string {
	if (manifest?.fixtures[fixtureId]?.path) return manifest.fixtures[fixtureId].path;
	if (groundId && manifest?.venues[String(groundId)]?.path) return manifest.venues[String(groundId)].path;
	return '';
}

export function localStadiumFileExists(root: string, publicPath: string): boolean {
	if (!publicPath.startsWith('/backgrounds/stadium/')) return false;
	const rel = publicPath.replace(/^\/backgrounds\/stadium\//, '');
	return fs.existsSync(path.join(stadiumRoot(root), rel));
}
