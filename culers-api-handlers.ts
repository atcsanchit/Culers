import { syncHomeBackgroundManifest } from './culers-home-backgrounds.ts';
import { buildLineup, computeStats } from './culers-lineup.ts';
import { fetchFcbFixtures, fetchFcbLiveSnapshot, fetchFcbMatchSummary, fetchFcbFixturePreview, fetchFcbPlayerMatchStats, fetchFcbPlayerStats, fetchFcbSquad, fetchRecentBarcaFixture } from './culers-fcb.ts';
import { enrichPlayerPhotos } from './culers-photos.ts';
import { fetchBarcaInstagramFeed, fetchBarcaSocialHub, fetchBarcaXFeed, streamInstagramImage } from './culers-social.ts';
import { fetchFabrizioProfile, fetchFabrizioRomanoNews, fetchReshadProfile, fetchReshadRahmanNews } from './culers-twitter.ts';

const BARCA_TEAM_ID = '133739';

type Json = Record<string, unknown>;

async function fetchJson(url: string): Promise<Json | null> {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) return null;
		return (await res.json()) as Json;
	} catch {
		return null;
	}
}

async function fetchNews() {
	const [reshadPack, fabrizioPack, reshadProfile, fabrizioProfile] = await Promise.all([
		fetchReshadRahmanNews(),
		fetchFabrizioRomanoNews(),
		fetchReshadProfile(),
		fetchFabrizioProfile(),
	]);

	const mapItems = (items: typeof reshadPack.items) =>
		items.map((item) => ({
			title: item.title,
			link: item.link,
			pubDate: item.pubDate,
			source: item.source,
			text: item.text,
			...(item.media?.length ? { media: item.media } : {}),
		}));

	return {
		news: mapItems(reshadPack.items),
		note: reshadPack.note,
		profile: reshadProfile,
		footballNews: mapItems(fabrizioPack.items),
		footballNote: fabrizioPack.note,
		footballProfile: fabrizioProfile,
	};
}

function normalizeEvent(raw: Json, kind: 'past' | 'upcoming') {
	const home = String(raw.strHomeTeam ?? '');
	const away = String(raw.strAwayTeam ?? '');
	const isHome = home.toLowerCase().includes('barcelona') || home.toLowerCase().includes('barça');
	const opponent = isHome ? away : home;

	return {
		id: String(raw.idEvent ?? `${home}-${away}-${raw.dateEvent}`),
		homeTeam: home,
		awayTeam: away,
		isHome,
		opponent,
		venue: isHome ? 'Spotify Camp Nou' : String(raw.strVenue ?? 'Away'),
		date: String(raw.dateEvent ?? ''),
		time: String(raw.strTime ?? ''),
		competition: String(raw.strLeague ?? 'Unknown'),
		compShort: '',
		season: String(raw.strSeason ?? ''),
		round: String(raw.intRound ?? ''),
		homeScore: raw.intHomeScore != null ? Number(raw.intHomeScore) : null,
		awayScore: raw.intAwayScore != null ? Number(raw.intAwayScore) : null,
		status: String(raw.strStatus ?? (kind === 'upcoming' ? 'Scheduled' : 'Finished')),
		thumb: String(raw.strThumb ?? ''),
		kind,
		source: 'TheSportsDB',
	};
}

async function fetchFixtures() {
	const fcb = await fetchFcbFixtures();
	if (fcb.length) return fcb;

	const [next, last] = await Promise.all([
		fetchJson(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${BARCA_TEAM_ID}`),
		fetchJson(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${BARCA_TEAM_ID}`),
	]);
	const upcoming = ((next?.events as Json[]) ?? []).map((e) => normalizeEvent(e, 'upcoming'));
	const recent = ((last?.events as Json[]) ?? []).map((e) => normalizeEvent(e, 'past'));
	return [...recent, ...upcoming];
}

async function fetchSquad() {
	const fcb = await fetchFcbSquad();
	if (fcb.players.length) {
		fcb.players = await enrichPlayerPhotos(fcb.players);
		return {
			players: fcb.players.map((p) => ({
				id: p.id,
				fcbId: p.fcbId,
				name: p.name,
				position: p.position,
				number: p.number,
				nationality: p.nationality,
				photo: p.photo,
				birthDate: p.birthDate,
				inLastMatchXi: p.inLastMatchXi,
				inLastMatchSquad: p.inLastMatchSquad,
			})),
			coach: fcb.coach,
			source: fcb.source,
			lastMatch: fcb.lastMatch,
		};
	}

	const data = await fetchJson(
		`https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${BARCA_TEAM_ID}`,
	);
	const players = await enrichPlayerPhotos(
		((data?.player as Json[]) ?? []).map((p) => ({
			id: String(p.idPlayer ?? ''),
			fcbId: undefined,
			name: String(p.strPlayer ?? ''),
			position: String(p.strPosition ?? ''),
			number: p.strNumber != null ? String(p.strNumber) : '',
			nationality: String(p.strNationality ?? ''),
			photo: String(p.strCutout ?? p.strThumb ?? ''),
			birthDate: String(p.dateBorn ?? ''),
		})),
	);
	return { players, coach: 'Hansi Flick' };
}

async function fetchLive() {
	const fcbLive = await fetchFcbLiveSnapshot();
	if (fcbLive) {
		return {
			live: true as const,
			match: fcbLive.fixture,
			events: fcbLive.events,
			clock: fcbLive.clock,
		};
	}

	// No live snapshot — return recent result if the match just finished (or kicks off soon)
	const recentFixture = await fetchRecentBarcaFixture();
	if (recentFixture) {
		return {
			live: false as const,
			match: recentFixture,
			events: [] as const,
			clock: recentFixture.kind === 'past' ? 'FT' : undefined,
			message:
				recentFixture.kind === 'past'
					? 'Full time — final score from FC Barcelona official.'
					: "No live feed — today's fixture shown if scheduled.",
		};
	}

	const liveData = await fetchJson('https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Soccer');
	const events = (liveData?.events as Json[]) ?? [];
	const barcaLive = events.find((e) => {
		const home = String(e.strHomeTeam ?? '').toLowerCase();
		const away = String(e.strAwayTeam ?? '').toLowerCase();
		return home.includes('barcelona') || away.includes('barcelona');
	});

	if (!barcaLive) {
		return { live: false as const, match: null, events: [] };
	}

	const eventId = String(barcaLive.idEvent ?? '');
	const timeline = eventId
		? await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/lookuptimeline.php?id=${eventId}`)
		: null;
	const timelineEvents = ((timeline?.timeline as Json[]) ?? []).map((t) => ({
		minute: String(t.intTime ?? t.strTime ?? ''),
		type: String(t.strTimeline ?? t.strTimelineDetail ?? 'Event'),
		player: String(t.strPlayer ?? ''),
		team: String(t.strTeam ?? ''),
		detail: String(t.strTimelineDetail ?? t.strComment ?? ''),
		homeScore: t.intHomeScore != null ? Number(t.intHomeScore) : null,
		awayScore: t.intAwayScore != null ? Number(t.intAwayScore) : null,
	}));

	return {
		live: true as const,
		match: normalizeEvent(barcaLive, 'past'),
		events: timelineEvents,
		clock: String(barcaLive.strProgress ?? barcaLive.strStatus ?? 'LIVE'),
	};
}

function pickTargetFixture(
	fixtures: Awaited<ReturnType<typeof fetchFixtures>>,
	fixtureId?: string | null,
) {
	if (fixtureId) {
		return fixtures.find((f) => f.id === fixtureId) ?? null;
	}

	const liveFixture = fixtures.find((f) => f.kind === 'live');
	if (liveFixture) return liveFixture;

	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
	const todayFixture = fixtures.find((f) => f.date === todayStr);
	if (todayFixture) return todayFixture;

	const upcoming = fixtures
		.filter((f) => f.kind === 'upcoming')
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	return upcoming[0] ?? null;
}

async function fetchLineupForFixture(
	squad: Awaited<ReturnType<typeof fetchSquad>>,
	fixtures: Awaited<ReturnType<typeof fetchFixtures>>,
	fixtureId?: string | null,
) {
	const target = pickTargetFixture(fixtures, fixtureId);
	return buildLineup(squad.players, {
		fixtureId: target?.id,
		eventId: target?.id,
		opponent: target?.opponent,
		matchDate: target?.date,
		matchDay: target?.kind === 'upcoming' || target?.kind === 'live',
		fixtureKind: target?.kind ?? 'upcoming',
	});
}

async function fetchAll() {
	const [fixturesResult, newsResult, squadResult, liveResult] = await Promise.allSettled([
		fetchFixtures(),
		fetchNews(),
		fetchSquad(),
		fetchLive(),
	]);

	const failures: string[] = [];
	const fixtures = fixturesResult.status === 'fulfilled' ? fixturesResult.value : (failures.push('fixtures'), []);
	const newsPack =
		newsResult.status === 'fulfilled'
			? newsResult.value
			: (failures.push('news'),
				{
					news: [],
					note: 'News temporarily unavailable.',
					profile: null,
					footballNews: [],
					footballNote: 'News temporarily unavailable.',
					footballProfile: null,
				});
	const squad =
		squadResult.status === 'fulfilled'
			? squadResult.value
			: (failures.push('squad'), { players: [], coach: 'Hansi Flick' });
	const live =
		liveResult.status === 'fulfilled'
			? liveResult.value
			: (failures.push('live'), { live: false as const, match: null, events: [] });

	if (!fixtures.length && !squad.players.length) {
		throw new Error(
			failures.length
				? `Could not load Barça data (${failures.join(', ')}). Check your network and try again.`
				: 'Could not load Barça data. Check your network and try again.',
		);
	}

	const targetFixture = pickTargetFixture(fixtures);
	let lineup;
	try {
		lineup = await fetchLineupForFixture(squad, fixtures, targetFixture?.id);
	} catch {
		lineup = await fetchLineupForFixture({ players: squad.players, coach: squad.coach }, [], undefined);
	}

	const stats = computeStats(fixtures);

	return {
		fetchedAt: new Date().toISOString(),
		fixtures,
		news: newsPack.news,
		newsNote: newsPack.note,
		newsProfile: newsPack.profile,
		footballNews: newsPack.footballNews,
		footballNewsNote: newsPack.footballNote,
		footballNewsProfile: newsPack.footballProfile,
		squad,
		live,
		lineup,
		stats,
		sources: [
			'FC Barcelona official — api-fcb.pulselive.com (La Liga & UCL fixtures, squad, player stats)',
			'SofaScore — confirmed lineups (api.sofascore.com)',
			'@ReshadRahman on X — api.fxtwitter.com',
			'@FabrizioRomano on X — api.fxtwitter.com',
			'TheSportsDB (live scores fallback)',
		],
	};
}

function json(res: import('http').ServerResponse, body: unknown, status = 200) {
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
}

export async function handleCulersApiRequest(
	req: import('http').IncomingMessage,
	res: import('http').ServerResponse,
	server: import('vite').ViteDevServer,
) {
	if (!req.url?.startsWith('/api/')) return false;

	try {
		const url = new URL(req.url, 'http://localhost');

		if (url.pathname === '/api/fetch-all') {
			json(res, await fetchAll());
			return true;
		}
		if (url.pathname === '/api/fixtures') {
			json(res, await fetchFixtures());
			return true;
		}
		if (url.pathname === '/api/news') {
			json(res, await fetchNews());
			return true;
		}
		if (url.pathname === '/api/squad') {
			json(res, await fetchSquad());
			return true;
		}
		if (url.pathname === '/api/live') {
			json(res, await fetchLive());
			return true;
		}
		if (url.pathname === '/api/lineup') {
			const squad = await fetchSquad();
			const fixtures = await fetchFixtures();
			const fixtureId = url.searchParams.get('fixtureId');
			json(res, await fetchLineupForFixture(squad, fixtures, fixtureId));
			return true;
		}
		if (url.pathname === '/api/stats') {
			const fixtures = await fetchFixtures();
			json(res, computeStats(fixtures));
			return true;
		}
		if (url.pathname === '/api/player-stats') {
			const fcbId = Number(url.searchParams.get('fcbId'));
			if (!fcbId) {
				json(res, { error: 'fcbId required' }, 400);
				return true;
			}
			json(res, await fetchFcbPlayerStats(fcbId));
			return true;
		}
		if (url.pathname === '/api/player-match-stats') {
			const fcbId = Number(url.searchParams.get('fcbId'));
			const fixtureId = url.searchParams.get('fixtureId');
			if (!fcbId || !fixtureId) {
				json(res, { error: 'fcbId and fixtureId required' }, 400);
				return true;
			}
			json(res, await fetchFcbPlayerMatchStats(fcbId, fixtureId));
			return true;
		}
		if (url.pathname === '/api/match-summary') {
			const fixtureId = url.searchParams.get('fixtureId');
			if (!fixtureId) {
				json(res, { error: 'fixtureId required' }, 400);
				return true;
			}
			const fixtures = await fetchFcbFixtures();
			const fixture = fixtures.find((f) => f.id === fixtureId);
			if (fixture?.kind === 'upcoming') {
				const liveFixture = fixtures.find((f) => f.kind === 'live');
				json(res, await fetchFcbFixturePreview(fixtureId, fixtures, liveFixture?.id ?? null));
			} else {
				json(res, await fetchFcbMatchSummary(fixtureId));
			}
			return true;
		}
		if (url.pathname === '/api/social') {
			json(res, await fetchBarcaSocialHub());
			return true;
		}
		if (url.pathname === '/api/social/instagram') {
			json(res, await fetchBarcaInstagramFeed());
			return true;
		}
		if (url.pathname === '/api/social/instagram/image') {
			const id = url.searchParams.get('id');
			if (!id) {
				json(res, { error: 'id required' }, 400);
				return true;
			}
			const image = await streamInstagramImage(id);
			if (!image) {
				json(res, { error: 'Image not found' }, 404);
				return true;
			}
			res.statusCode = 200;
			res.setHeader('Content-Type', image.contentType);
			res.setHeader('Cache-Control', 'public, max-age=3600');
			res.end(image.body);
			return true;
		}
		if (url.pathname === '/api/social/x') {
			json(res, await fetchBarcaXFeed());
			return true;
		}
		if (url.pathname === '/api/home-backgrounds') {
			json(res, {
				images: syncHomeBackgroundManifest(server.config.root),
				updatedAt: new Date().toISOString(),
			});
			return true;
		}
		json(res, { error: 'Not found' }, 404);
		return true;
	} catch (err) {
		json(res, { error: String(err) }, 500);
		return true;
	}
}
