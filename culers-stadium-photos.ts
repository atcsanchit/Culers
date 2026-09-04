import fs from 'node:fs';
import path from 'node:path';
import {
	fixturePublicPath,
	loadStadiumManifest,
	localStadiumFileExists,
	resolveStadiumPathFromManifest,
	syncStadiumPhotos,
	venuePublicPath,
} from './culers-stadium-sync.ts';

const FCB_SITE = 'https://www.fcbarcelona.com';
const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const CAMP_NOU_BG = '/backgrounds/player/camp-nou-grass.jpg';
const PROJECT_ROOT = process.cwd();

const venueCache = new Map<string, string>();

function normalizeVenue(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function venueSlug(name: string) {
	return normalizeVenue(name).replace(/\s+/g, '-');
}

async function fetchTheSportsDbVenuePhoto(venueName: string): Promise<string> {
	const cacheKey = `tsdb:${normalizeVenue(venueName)}`;
	if (venueCache.has(cacheKey)) return venueCache.get(cacheKey)!;

	try {
		const res = await fetch(`${THESPORTSDB}/searchvenues.php?v=${encodeURIComponent(venueName)}`, {
			headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) {
			venueCache.set(cacheKey, '');
			return '';
		}
		const data = (await res.json()) as { venues?: Array<{ strFanart1?: string; strThumb?: string }> };
		const venue = data.venues?.[0];
		const url = venue?.strFanart1?.trim() || venue?.strThumb?.trim() || '';
		venueCache.set(cacheKey, url);
		return url;
	} catch {
		venueCache.set(cacheKey, '');
		return '';
	}
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

async function fetchFcbMatchReportPhoto(optaId: string, awayTeam: string): Promise<string> {
	if (!optaId) return '';
	const slug = venueSlug(awayTeam);
	const paths = [
		`/en/football/first-team/match-report/${optaId}/${slug}`,
		`/en/football/first-team/match-report/${optaId.replace(/^g/, '')}/${slug}`,
	];
	for (const reportPath of paths) {
		const html = await fetchText(`${FCB_SITE}${reportPath}`);
		if (!html) continue;
		const matches = [
			...html.matchAll(/photo-resources\/fcbarcelona\/photo\/20\d{2}\/[^"'\\]+\.(?:jpg|webp)(?:\?[^"'\\]*)?/gi),
		];
		for (const m of matches) {
			const raw = m[0].split('?')[0].toLowerCase();
			if (raw.includes('icon') || raw.includes('crest') || raw.includes('logo')) continue;
			return `${FCB_SITE}/${m[0].split('?')[0]}?width=1920&height=1080`;
		}
	}
	return '';
}

async function cacheFixturePhoto(fixtureId: string, remoteUrl: string): Promise<string> {
	try {
		const res = await fetch(remoteUrl, {
			headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) return remoteUrl;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.length < 8_000) return remoteUrl;
		const dir = path.join(PROJECT_ROOT, 'public/backgrounds/stadium/fixtures');
		fs.mkdirSync(dir, { recursive: true });
		const abs = path.join(dir, `${fixtureId}.jpg`);
		fs.writeFileSync(abs, buf);
		await syncStadiumPhotos(PROJECT_ROOT);
		return fixturePublicPath(fixtureId);
	} catch {
		return remoteUrl;
	}
}

export type StadiumPhotoInput = {
	fixtureId: string;
	venueName: string;
	groundId?: number;
	optaId?: string;
	awayTeam?: string;
	homeTeam?: string;
};

/**
 * Resolve stadium background for match review modal.
 * Priority: fixture override → venue bundle → TheSportsDB → FCB match photo → Camp Nou grass.
 */
export async function fetchStadiumBackground(input: StadiumPhotoInput): Promise<string> {
	const { fixtureId, venueName, groundId, optaId, awayTeam = '', homeTeam = '' } = input;
	if (!venueName?.trim() && !groundId) return CAMP_NOU_BG;

	let manifest = loadStadiumManifest(PROJECT_ROOT);
	if (!manifest?.venues || Object.keys(manifest.venues).length === 0) {
		manifest = await syncStadiumPhotos(PROJECT_ROOT);
	}

	const fromManifest = resolveStadiumPathFromManifest(manifest, fixtureId, groundId);
	if (fromManifest && localStadiumFileExists(PROJECT_ROOT, fromManifest)) return fromManifest;

	if (groundId) {
		const expected = venuePublicPath(groundId, venueName);
		if (localStadiumFileExists(PROJECT_ROOT, expected)) return expected;
	}

	const tsdb = await fetchTheSportsDbVenuePhoto(venueName);
	if (tsdb) return tsdb;

	const opponent = awayTeam.toLowerCase().includes('barcelona') ? homeTeam : awayTeam;
	const matchPhoto = await fetchFcbMatchReportPhoto(optaId ?? '', opponent);
	if (matchPhoto) return cacheFixturePhoto(fixtureId, matchPhoto);

	return CAMP_NOU_BG;
}
