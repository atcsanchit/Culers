/**
 * Public soccer stats — ESPN scoreboards (what Google Sports typically surfaces)
 * with TheSportsDB as a second hop when a host 403s/429s.
 */

type Json = Record<string, unknown>;

const BROWSER_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const ESPN_BARCA_TEAM_ID = 83;

const ESPN_HOSTS = ['https://site.api.espn.com', 'https://site.web.api.espn.com'] as const;

const SCOREBOARD_LEAGUES: Array<{
	slug: string;
	label: string;
	group: 'ucl' | 'uel' | 'europe' | 'mls' | 'international';
}> = [
	{ slug: 'uefa.champions', label: 'UEFA Champions League', group: 'ucl' },
	{ slug: 'uefa.europa', label: 'UEFA Europa League', group: 'uel' },
	{ slug: 'uefa.europa.conf', label: 'UEFA Conference League', group: 'uel' },
	{ slug: 'esp.1', label: 'LaLiga', group: 'europe' },
	{ slug: 'eng.1', label: 'Premier League', group: 'europe' },
	{ slug: 'ger.1', label: 'Bundesliga', group: 'europe' },
	{ slug: 'ita.1', label: 'Serie A', group: 'europe' },
	{ slug: 'fra.1', label: 'Ligue 1', group: 'europe' },
	{ slug: 'ned.1', label: 'Eredivisie', group: 'europe' },
	{ slug: 'por.1', label: 'Liga Portugal', group: 'europe' },
	{ slug: 'bel.1', label: 'Belgian Pro League', group: 'europe' },
	{ slug: 'tur.1', label: 'Süper Lig', group: 'europe' },
	{ slug: 'sco.1', label: 'Scottish Premiership', group: 'europe' },
	{ slug: 'eng.2', label: 'EFL Championship', group: 'europe' },
	{ slug: 'sui.1', label: 'Swiss Super League', group: 'europe' },
	{ slug: 'usa.1', label: 'MLS', group: 'mls' },
	{ slug: 'fifa.world', label: 'FIFA World Cup', group: 'international' },
	{ slug: 'uefa.nations', label: 'UEFA Nations League', group: 'international' },
	{ slug: 'conmebol.america', label: 'Copa América', group: 'international' },
	{ slug: 'uefa.euro', label: 'UEFA Euro', group: 'international' },
];

const ESPN_TEAM_IDS: Record<string, number> = {
	barcelona: 83,
	valencia: 94,
	'rayo vallecano': 378,
	rayo: 378,
	'real madrid': 86,
	'atletico madrid': 1068,
	atletico: 1068,
	sevilla: 243,
	'real sociedad': 89,
	villarreal: 102,
	'real betis': 244,
	betis: 244,
	getafe: 2922,
	girona: 9812,
	mallorca: 84,
	osasuna: 97,
	athletic: 93,
	'athletic club': 93,
	'athletic bilbao': 93,
	espanyol: 88,
	alaves: 96,
	alavés: 96,
	'celta vigo': 85,
	celta: 85,
	elche: 3751,
	'manchester city': 382,
	'man city': 382,
	'paris saint-germain': 160,
	psg: 160,
	inter: 110,
	porto: 437,
	'fc porto': 437,
	'sporting cp': 2250,
	'sporting lisbon': 2250,
	'aston villa': 362,
	feyenoord: 142,
	galatasaray: 432,
};

let espnReachable = false;

export function statsSourceReachable() {
	return espnReachable;
}

export function resetStatsSourceReachable() {
	espnReachable = false;
}

type RawPlayer = {
	id: string;
	fcbId?: number;
	sofaId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
};

export type StatsEvent = {
	id: number;
	date: string;
	time: string;
	startTimestamp: number;
	homeTeam: string;
	awayTeam: string;
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number | null;
	awayScore: number | null;
	isHome: boolean;
	opponent: string;
	statusType?: string;
	competition?: string;
	venue?: string;
	clock?: string;
	leagueSlug?: string;
};

export type EspnTeamPlayer = {
	id: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	birthDate: string;
	marketValueEur?: number;
};

export type EspnWatchPlayer = {
	id: string;
	name: string;
	position: string;
	number: string;
	avgRating: number;
	matches: number;
	goals: number;
	assists: number;
};

export type EspnPreviewMatch = {
	eventId: number;
	homeTeam: string;
	awayTeam: string;
	teamId: number;
	isHome: boolean;
	opponent: string;
	date: string;
	time: string;
	homeScore: number | null;
	awayScore: number | null;
	stats: Record<string, number>;
	events: Array<{
		minute: string;
		type: 'goal' | 'yellow' | 'red' | 'sub';
		player: string;
		assist?: string;
		team: 'home' | 'away';
		detail?: string;
	}>;
	lineups: {
		starters: Array<{ id: string; name: string; number: string; position: string }>;
		subs: Array<{ id: string; name: string; number: string; position: string }>;
	};
};

function normalizeName(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function opponentMatches(a: string, b: string) {
	const left = normalizeName(a);
	const right = normalizeName(b);
	if (!left || !right) return false;
	if (left.includes(right) || right.includes(left)) return true;
	const lt = left.split(' ').filter((p) => p.length > 2);
	const rt = right.split(' ').filter((p) => p.length > 2);
	const ll = lt[lt.length - 1];
	const rl = rt[rt.length - 1];
	return Boolean(ll && rl && (ll === rl || left.includes(rl) || right.includes(ll)));
}

function datesClose(a: string, b: string) {
	if (!a || !b) return false;
	if (a === b) return true;
	const da = new Date(`${a}T12:00:00Z`).getTime();
	const db = new Date(`${b}T12:00:00Z`).getTime();
	return Math.abs(da - db) <= 86_400_000;
}

export async function fetchPublicJson(urls: string[]): Promise<Json | null> {
	for (const url of urls) {
		try {
			const res = await fetch(url, {
				headers: {
					'User-Agent': BROWSER_UA,
					Accept: 'application/json',
				},
			});
			if (res.status === 403 || res.status === 429 || res.status === 451) {
				console.warn(`[stats] blocked ${res.status} ${url}`);
				continue;
			}
			if (!res.ok) continue;
			const data = (await res.json()) as Json;
			espnReachable = true;
			return data;
		} catch (err) {
			console.warn('[stats] fetch failed', url, err);
		}
	}
	return null;
}

async function espnPath(path: string, query = ''): Promise<Json | null> {
	const suffix = query ? `${path}?${query}` : path;
	return fetchPublicJson(ESPN_HOSTS.map((host) => `${host}${suffix}`));
}

export function parseEspnEventId(fixtureId: string | null | undefined): number | null {
	if (!fixtureId) return null;
	const match = /^(?:espn-)?(\d{8,})$/i.exec(fixtureId.trim());
	if (!match) return null;
	const id = Number(match[1]);
	return Number.isFinite(id) && id > 0 ? id : null;
}

function mapEspnPosition(code: string) {
	const c = code.toUpperCase();
	if (c === 'G' || /goal/i.test(code)) return 'Goalkeeper';
	if (c === 'D' || /defen/i.test(code)) return 'Defender';
	if (c === 'M' || /mid/i.test(code)) return 'Midfielder';
	if (c === 'F' || /forward|attack|wing|strik/i.test(code)) return 'Forward';
	return code || 'Unknown';
}

function num(v: unknown): number | null {
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function eventFromEspn(ev: Json, leagueName = '', leagueSlug = ''): StatsEvent | null {
	const id = Number(ev.id ?? 0);
	const competition = ev.competitions as Json[] | undefined;
	const c = competition?.[0] ?? (ev as Json);
	const comps = (c.competitors as Json[]) ?? [];
	const home = comps.find((x) => String(x.homeAway) === 'home');
	const away = comps.find((x) => String(x.homeAway) === 'away');
	if (!id || !home || !away) return null;
	const homeTeam = home.team as Json | undefined;
	const awayTeam = away.team as Json | undefined;
	const status = (c.status as Json | undefined)?.type as Json | undefined;
	const dateIso = String(ev.date ?? c.date ?? '');
	const start = dateIso ? Math.floor(new Date(dateIso).getTime() / 1000) : 0;
	const state = String(status?.state ?? '');
	const completed = Boolean(status?.completed) || state === 'post';
	const inplay = state === 'in';
	const venue = c.venue as Json | undefined;
	return {
		id,
		date: dateIso.slice(0, 10),
		time: dateIso.slice(11, 19),
		startTimestamp: start,
		homeTeam: String(homeTeam?.displayName ?? homeTeam?.name ?? ''),
		awayTeam: String(awayTeam?.displayName ?? awayTeam?.name ?? ''),
		homeTeamId: Number(homeTeam?.id ?? home.id ?? 0),
		awayTeamId: Number(awayTeam?.id ?? away.id ?? 0),
		homeScore: num(home.score),
		awayScore: num(away.score),
		isHome: true,
		opponent: String(awayTeam?.displayName ?? ''),
		statusType: completed ? 'finished' : inplay ? 'inprogress' : String(status?.name ?? status?.state ?? 'scheduled'),
		competition: leagueName || String((ev.season as Json | undefined)?.displayName ?? ''),
		venue: String(venue?.fullName ?? ''),
		clock: completed ? 'FT' : String((c.status as Json | undefined)?.displayClock ?? status?.detail ?? (inplay ? 'LIVE' : '')),
		leagueSlug,
	};
}

function withTeamPerspective(event: StatsEvent, teamId: number): StatsEvent {
	const isHome = event.homeTeamId === teamId;
	return {
		...event,
		isHome,
		opponent: isHome ? event.awayTeam : event.homeTeam,
	};
}

export async function fetchEspnScoreboard(slug: string, dates?: string): Promise<Json[]> {
	const q = dates ? `dates=${dates}` : '';
	const data = await espnPath(`/apis/site/v2/sports/soccer/${slug}/scoreboard`, q);
	return (data?.events as Json[]) ?? [];
}

export async function fetchEspnLiveAndRecentEvents(): Promise<Json[]> {
	const now = new Date();
	const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const dateKeys = [...new Set([ymd(now), ymd(yesterday)])];

	const pages = await Promise.all(
		SCOREBOARD_LEAGUES.flatMap((league) =>
			dateKeys.map(async (dates) => {
				const events = await fetchEspnScoreboard(league.slug, dates).catch(() => [] as Json[]);
				return events.map((ev) => ({
					...ev,
					_culersLeague: league.slug,
					_culersGroup: league.group,
					_culersLabel: league.label,
				}) as Json);
			}),
		),
	);

	const byId = new Map<number, Json>();
	for (const ev of pages.flat()) {
		const id = Number(ev.id ?? 0);
		if (id) byId.set(id, ev);
	}

	if (!byId.size) {
		const all = await espnPath('/apis/site/v2/sports/soccer/all/scoreboard');
		for (const ev of (all?.events as Json[]) ?? []) {
			const id = Number(ev.id ?? 0);
			if (id) byId.set(id, ev);
		}
	}

	return [...byId.values()];
}

export function mapEspnRawToLiveShape(raw: Json): Json {
	const parsed = eventFromEspn(
		raw,
		String(raw._culersLabel ?? raw._culersLeague ?? ''),
		String(raw._culersLeague ?? ''),
	);
	const status = ((raw.competitions as Json[] | undefined)?.[0]?.status as Json | undefined)?.type as Json | undefined;
	const state = String(status?.state ?? '');
	const completed = Boolean(status?.completed) || state === 'post';
	return {
		id: parsed?.id ?? Number(raw.id ?? 0),
		homeTeam: { name: parsed?.homeTeam, national: false },
		awayTeam: { name: parsed?.awayTeam, national: false },
		homeScore: { current: parsed?.homeScore, display: parsed?.homeScore },
		awayScore: { current: parsed?.awayScore, display: parsed?.awayScore },
		tournament: {
			name: parsed?.competition,
			uniqueTournament: { name: parsed?.competition, id: 0 },
		},
		status: {
			type: completed ? 'finished' : state === 'in' ? 'inprogress' : 'scheduled',
			description: parsed?.clock ?? status?.detail,
		},
		venue: { name: parsed?.venue },
		startTimestamp: parsed?.startTimestamp ?? 0,
		_culersGroup: raw._culersGroup,
		_culersLeague: raw._culersLeague,
		_competitionName: parsed?.competition,
	};
}

export async function fetchEspnEventById(eventId: number): Promise<StatsEvent | null> {
	const data = await espnPath('/apis/site/v2/sports/soccer/all/summary', `event=${eventId}`);
	if (!data) return null;
	const header = data.header as Json | undefined;
	const comps = (header?.competitions as Json[]) ?? [];
	const c = comps[0];
	if (!c) return null;
	const competitors = (c.competitors as Json[]) ?? [];
	const home = competitors.find((x) => String(x.homeAway) === 'home');
	const away = competitors.find((x) => String(x.homeAway) === 'away');
	const dateIso = String(header?.competitions ? c.date ?? header?.date ?? '' : '');
	const status = (c.status as Json | undefined)?.type as Json | undefined;
	const completed = Boolean(status?.completed);
	const league = header?.league as Json | undefined;
	return {
		id: eventId,
		date: dateIso.slice(0, 10),
		time: dateIso.slice(11, 19),
		startTimestamp: dateIso ? Math.floor(new Date(dateIso).getTime() / 1000) : 0,
		homeTeam: String((home?.team as Json | undefined)?.displayName ?? ''),
		awayTeam: String((away?.team as Json | undefined)?.displayName ?? ''),
		homeTeamId: Number((home?.team as Json | undefined)?.id ?? home?.id ?? 0),
		awayTeamId: Number((away?.team as Json | undefined)?.id ?? away?.id ?? 0),
		homeScore: num(home?.score),
		awayScore: num(away?.score),
		isHome: true,
		opponent: String((away?.team as Json | undefined)?.displayName ?? ''),
		statusType: completed ? 'finished' : String(status?.state ?? '') === 'in' ? 'inprogress' : 'scheduled',
		competition: String(league?.name ?? ''),
		clock: completed ? 'FT' : String(status?.detail ?? ''),
		leagueSlug: String(league?.slug ?? league?.midsizeName ?? ''),
	};
}

export type StatsIncident = {
	minute: string;
	type: string;
	player: string;
	team: string;
	detail: string;
	homeScore: number | null;
	awayScore: number | null;
};

export async function fetchEspnEventIncidents(eventId: number): Promise<StatsIncident[]> {
	const data = await espnPath('/apis/site/v2/sports/soccer/all/summary', `event=${eventId}`);
	const keyEvents = (data?.keyEvents as Json[]) ?? [];
	const out: StatsIncident[] = [];
	for (const ev of keyEvents) {
		const type = String((ev.type as Json | undefined)?.type ?? '');
		if (!/goal|yellow|red|substitut|penalty|own/i.test(type)) continue;
		const clock = ev.clock as Json | undefined;
		const participants = (ev.participants as Json[]) ?? [];
		const player = String((participants[0]?.athlete as Json | undefined)?.displayName ?? ev.shortText ?? '');
		out.push({
			minute: String(clock?.displayValue ?? ''),
			type,
			player,
			team: String((ev.team as Json | undefined)?.displayName ?? ''),
			detail: String(ev.text ?? ev.shortText ?? ''),
			homeScore: null,
			awayScore: null,
		});
	}
	return out;
}

export async function fetchEspnTeamSchedule(teamId: number, leagueSlug = 'esp.1'): Promise<StatsEvent[]> {
	const data = await espnPath(`/apis/site/v2/sports/soccer/${leagueSlug}/teams/${teamId}/schedule`);
	const events = ((data?.events as Json[]) ?? []).map((ev) => eventFromEspn(ev, String(leagueSlug), leagueSlug)).filter(Boolean) as StatsEvent[];
	const extra = await espnPath(`/apis/site/v2/sports/soccer/uefa.champions/teams/${teamId}/schedule`);
	for (const ev of (extra?.events as Json[]) ?? []) {
		const parsed = eventFromEspn(ev, 'UEFA Champions League', 'uefa.champions');
		if (parsed && !events.some((e) => e.id === parsed.id)) events.push(parsed);
	}
	return events.sort((a, b) => b.startTimestamp - a.startTimestamp);
}

export async function resolveEspnTeamId(teamName: string): Promise<number | null> {
	const key = normalizeName(teamName);
	if (ESPN_TEAM_IDS[key]) return ESPN_TEAM_IDS[key];
	for (const [name, id] of Object.entries(ESPN_TEAM_IDS)) {
		if (key.includes(name) || name.includes(key)) return id;
	}
	const data = await espnPath('/apis/common/v3/search', `query=${encodeURIComponent(teamName)}&limit=8`);
	const items = (data?.items as Json[]) ?? [];
	const team = items.find((it) => String(it.type) === 'team' && String(it.sport) === 'soccer');
	const id = Number(team?.id ?? 0);
	return id || null;
}

export function resolveEspnTeamIdSync(teamName: string): number | null {
	const key = normalizeName(teamName);
	if (ESPN_TEAM_IDS[key]) return ESPN_TEAM_IDS[key];
	for (const [name, id] of Object.entries(ESPN_TEAM_IDS)) {
		if (key.includes(name) || name.includes(key)) return id;
	}
	return null;
}

export async function findEspnBarcaEvent(options: {
	opponent?: string;
	date?: string;
	prefer?: 'upcoming' | 'finished' | 'any';
}): Promise<StatsEvent | null> {
	const events = (await fetchEspnTeamSchedule(ESPN_BARCA_TEAM_ID)).map((e) => withTeamPerspective(e, ESPN_BARCA_TEAM_ID));
	const prefer = options.prefer ?? 'any';
	const filtered = events.filter((e) => {
		if (prefer === 'finished') return e.statusType === 'finished';
		if (prefer === 'upcoming') return e.statusType !== 'finished' && e.statusType !== 'inprogress';
		return true;
	});
	let best: { event: StatsEvent; score: number } | null = null;
	for (const event of filtered.length ? filtered : events) {
		let score = 1;
		if (options.opponent && opponentMatches(event.opponent, options.opponent)) score += 10;
		if (options.date && datesClose(event.date, options.date)) score += 8;
		if (event.statusType === 'inprogress') score += 5;
		if (!best || score > best.score) best = { event, score };
	}
	return best?.event ?? null;
}

async function resolveEventForFixture(options: {
	fixtureId: string;
	opponent?: string;
	date?: string;
	prefer?: 'upcoming' | 'finished' | 'any';
}): Promise<StatsEvent | null> {
	const id = parseEspnEventId(options.fixtureId);
	if (id) return fetchEspnEventById(id);
	return findEspnBarcaEvent({
		opponent: options.opponent,
		date: options.date,
		prefer: options.prefer ?? 'any',
	});
}

function squadMatch(squad: RawPlayer[], name: string) {
	const target = normalizeName(name);
	let best: { player: RawPlayer; score: number } | null = null;
	for (const player of squad) {
		const full = normalizeName(player.name);
		if (full === target) return player;
		const parts = full.split(' ').filter(Boolean);
		const last = parts[parts.length - 1];
		let score = 0;
		if (target.includes(full) || full.includes(target)) score = 100;
		else if (last && last.length > 3 && target.includes(last)) score = 60;
		else if (parts.some((p) => p.length > 3 && target.includes(p))) score = 40;
		if (score > 0 && (!best || score > best.score)) best = { player, score };
	}
	return best?.player ?? null;
}

function rosterStat(row: Json, ...names: string[]) {
	const stats = (row.stats as Json[]) ?? [];
	for (const name of names) {
		const hit = stats.find((s) => String(s.name) === name);
		const n = Number(hit?.value ?? hit?.displayValue ?? NaN);
		if (Number.isFinite(n)) return n;
	}
	return 0;
}

/** Derived 4.0–10.0 score from ESPN box-score counting stats (no editor match rating on that feed). */
export function performanceRating(row: Json, isKeeper: boolean) {
	const goals = rosterStat(row, 'totalGoals');
	const assists = rosterStat(row, 'goalAssists');
	const sot = rosterStat(row, 'shotsOnTarget');
	const shots = rosterStat(row, 'totalShots');
	const saves = rosterStat(row, 'saves');
	const yellow = rosterStat(row, 'yellowCards');
	const red = rosterStat(row, 'redCards');
	const own = rosterStat(row, 'ownGoals');
	const conceded = rosterStat(row, 'goalsConceded');
	let rating = 6.4 + goals * 0.85 + assists * 0.5 + sot * 0.12 + shots * 0.04 + saves * 0.18;
	rating -= yellow * 0.25 + red * 1.1 + own * 0.8;
	if (isKeeper) rating -= conceded * 0.12;
	return Math.round(Math.min(9.8, Math.max(4.2, rating)) * 10) / 10;
}

export async function fetchEspnSummary(eventId: number): Promise<Json | null> {
	return espnPath('/apis/site/v2/sports/soccer/all/summary', `event=${eventId}`);
}

export async function fetchEspnBarcaLineup(
	eventId: number,
	squad: RawPlayer[],
): Promise<{
	confirmed: boolean;
	formation: string;
	starters: RawPlayer[];
	bench: RawPlayer[];
} | null> {
	const data = await fetchEspnSummary(eventId);
	const rosters = (data?.rosters as Json[]) ?? [];
	const barca = rosters.find((r) => /barcel/i.test(String((r.team as Json | undefined)?.displayName ?? '')));
	if (!barca) return null;
	const formation = String(barca.formation ?? '4-3-3');
	const starters: RawPlayer[] = [];
	const bench: RawPlayer[] = [];
	for (const row of (barca.roster as Json[]) ?? []) {
		const athlete = row.athlete as Json | undefined;
		const name = String(athlete?.displayName ?? athlete?.fullName ?? '');
		const espnId = Number(athlete?.id ?? 0) || undefined;
		const fromSquad = squadMatch(squad, name);
		const position = mapEspnPosition(String((row.position as Json | undefined)?.abbreviation ?? (row.position as Json | undefined)?.name ?? ''));
		const number = String(row.jersey ?? athlete?.jersey ?? '');
		const mapped: RawPlayer = fromSquad
			? {
					...fromSquad,
					sofaId: espnId ?? fromSquad.sofaId,
					position: position || fromSquad.position,
					number: number || fromSquad.number,
				}
			: {
					id: espnId ? `espn-${espnId}` : `espn-${name}`,
					sofaId: espnId,
					name,
					position,
					number,
					nationality: '',
					photo: '',
					birthDate: '',
				};
		if (row.starter) starters.push(mapped);
		else bench.push(mapped);
	}
	if (starters.length < 8) return null;
	return { confirmed: true, formation, starters: starters.slice(0, 11), bench };
}

function sideFromRoster(
	roster: Json | undefined,
	teamName: string,
	teamId: number,
): {
	teamName: string;
	teamId: number;
	isBarca: boolean;
	formation: string;
	avgRating: number | null;
	starters: Array<{
		id: string;
		sofaId: number;
		name: string;
		number: string;
		position: string;
		rating: number | null;
		goals: number;
		assists: number;
		yellow: number;
		red: number;
		minutes: number;
		subOn: number | null;
		subOff: number | null;
		isCaptain: boolean;
		isMotm: boolean;
		photo?: string;
		x?: number;
		y?: number;
	}>;
	bench: Array<{
		id: string;
		sofaId: number;
		name: string;
		number: string;
		position: string;
		rating: number | null;
		goals: number;
		assists: number;
		yellow: number;
		red: number;
		minutes: number;
		subOn: number | null;
		subOff: number | null;
		isCaptain: boolean;
		isMotm: boolean;
		photo?: string;
	}>;
} {
	const formation = String(roster?.formation ?? '4-3-3');
	const mapRow = (row: Json) => {
		const athlete = row.athlete as Json | undefined;
		const sofaId = Number(athlete?.id ?? 0);
		const pos = String((row.position as Json | undefined)?.abbreviation ?? '');
		const isKeeper = pos === 'G' || /goal/i.test(String((row.position as Json | undefined)?.name ?? ''));
		return {
			id: sofaId ? `espn-${sofaId}` : String(athlete?.displayName ?? ''),
			sofaId,
			name: String(athlete?.displayName ?? ''),
			number: String(row.jersey ?? ''),
			position: mapEspnPosition(pos || String((row.position as Json | undefined)?.name ?? '')),
			rating: performanceRating(row, isKeeper),
			goals: rosterStat(row, 'totalGoals'),
			assists: rosterStat(row, 'goalAssists'),
			yellow: rosterStat(row, 'yellowCards'),
			red: rosterStat(row, 'redCards'),
			minutes: 0,
			subOn: row.subbedIn ? 0 : null,
			subOff: row.subbedOut ? 0 : null,
			isCaptain: false,
			isMotm: false,
		};
	};
	const rows = (roster?.roster as Json[]) ?? [];
	const starters = rows.filter((r) => r.starter).map(mapRow);
	const bench = rows.filter((r) => !r.starter).map(mapRow);
	const rated = starters.filter((p) => p.rating != null);
	const avgRating =
		rated.length > 0 ? Math.round((rated.reduce((a, p) => a + (p.rating ?? 0), 0) / rated.length) * 10) / 10 : null;
	return {
		teamName,
		teamId,
		isBarca: /barcel/i.test(teamName) || teamId === ESPN_BARCA_TEAM_ID,
		formation,
		avgRating,
		starters,
		bench,
	};
}

export async function fetchEspnMatchRatings(options: {
	fixtureId: string;
	opponent?: string;
	date?: string;
	prefer?: 'upcoming' | 'finished' | 'any';
}) {
	const event = await resolveEventForFixture(options);
	if (!event) return null;
	const data = await fetchEspnSummary(event.id);
	if (!data) return null;
	const rosters = (data.rosters as Json[]) ?? [];
	const homeRoster = rosters.find((r) => String(r.homeAway) === 'home');
	const awayRoster = rosters.find((r) => String(r.homeAway) === 'away');
	const home = sideFromRoster(homeRoster, event.homeTeam, event.homeTeamId);
	const away = sideFromRoster(awayRoster, event.awayTeam, event.awayTeamId);
	const all = [...home.starters, ...away.starters];
	const top = [...all].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
	if (top) {
		for (const p of [...home.starters, ...away.starters, ...home.bench, ...away.bench]) {
			p.isMotm = p.sofaId === top.sofaId;
		}
	}
	return {
		fixtureId: options.fixtureId,
		sofaEventId: event.id,
		homeTeam: event.homeTeam,
		awayTeam: event.awayTeam,
		homeScore: event.homeScore,
		awayScore: event.awayScore,
		clock: event.clock,
		status: event.statusType || 'unknown',
		home,
		away,
		source: 'ESPN / Google Sports box score — performance rating derived from match stats',
	};
}

const MATCH_STAT_LABELS: Record<string, string> = {
	totalGoals: 'Goals',
	goalAssists: 'Assists',
	totalShots: 'Shots',
	shotsOnTarget: 'Shots on target',
	saves: 'Saves',
	foulsCommitted: 'Fouls',
	foulsSuffered: 'Fouled',
	yellowCards: 'Yellow cards',
	redCards: 'Red cards',
	offsides: 'Offsides',
	goalsConceded: 'Goals conceded',
	appearances: 'Appeared',
};

export async function fetchEspnPlayerMatchStats(options: {
	fixtureId: string;
	sofaId?: number;
	playerName?: string;
	opponent?: string;
	date?: string;
}) {
	if (!options.sofaId && !options.playerName) return null;
	const event = await resolveEventForFixture(options);
	if (!event) return null;
	const data = await fetchEspnSummary(event.id);
	const rosters = (data?.rosters as Json[]) ?? [];
	let found: Json | null = null;
	let foundId = 0;
	for (const side of rosters) {
		for (const row of (side.roster as Json[]) ?? []) {
			const athlete = row.athlete as Json | undefined;
			const id = Number(athlete?.id ?? 0);
			if (options.sofaId && id === options.sofaId) {
				found = row;
				foundId = id;
				break;
			}
			if (options.playerName && nameMatchScore(String(athlete?.displayName ?? ''), options.playerName) >= 60) {
				if (!found || nameMatchScore(String(athlete?.displayName ?? ''), options.playerName) > 60) {
					found = row;
					foundId = id;
				}
			}
		}
		if (found && options.sofaId) break;
	}
	if (!found) return null;
	const athlete = found.athlete as Json;
	const isKeeper = String((found.position as Json | undefined)?.abbreviation ?? '') === 'G';
	const rating = performanceRating(found, isKeeper);
	const stats = ((found.stats as Json[]) ?? [])
		.filter((s) => MATCH_STAT_LABELS[String(s.name)] || Number(s.value) > 0)
		.map((s) => ({
			key: String(s.name),
			label: MATCH_STAT_LABELS[String(s.name)] ?? String(s.displayName ?? s.name),
			value: Number(s.displayValue ?? s.value ?? 0),
			available: true,
		}));
	stats.unshift({ key: 'rating', label: 'Performance rating', value: rating, available: true });
	return {
		sofaId: foundId,
		fixtureId: options.fixtureId,
		name: String(athlete.displayName ?? options.playerName ?? ''),
		position: mapEspnPosition(String((found.position as Json | undefined)?.abbreviation ?? '')),
		number: String(found.jersey ?? ''),
		opponent: event.opponent || (event.isHome ? event.awayTeam : event.homeTeam),
		clock: event.statusType === 'finished' ? 'FT' : event.clock,
		rating,
		stats,
		topStats: stats.filter((r) => r.key !== 'rating'),
		fetchedAt: new Date().toISOString(),
		source: 'ESPN / Google Sports box score',
	};
}

function nameMatchScore(candidate: string, target: string) {
	const full = normalizeName(candidate);
	const want = normalizeName(target);
	if (!full || !want) return 0;
	if (full === want) return 100;
	if (want.includes(full) || full.includes(want)) return 80;
	const parts = full.split(' ').filter(Boolean);
	const last = parts[parts.length - 1];
	if (last && last.length > 3 && want.includes(last)) return 60;
	if (parts.some((p) => p.length > 3 && want.includes(p))) return 40;
	return 0;
}

export async function fetchEspnTeamPlayers(teamId: number): Promise<EspnTeamPlayer[]> {
	const data = await espnPath(`/apis/site/v2/sports/soccer/esp.1/teams/${teamId}/roster`);
	const athletes = (data?.athletes as Json[]) ?? [];
	const groups = athletes.length ? athletes : ((data?.team as Json | undefined)?.athletes as Json[]) ?? [];
	const out: EspnTeamPlayer[] = [];
	const items = groups.flatMap((g) => {
		if (Array.isArray(g.items)) return g.items as Json[];
		if (g.displayName && g.id) return [g];
		return ((g.athletes as Json[]) ?? []);
	});
	for (const p of items.length ? items : ((data?.athletes as Json[]) ?? [])) {
		const id = Number(p.id ?? (p.athlete as Json | undefined)?.id ?? 0);
		if (!id) continue;
		out.push({
			id,
			name: String(p.displayName ?? p.fullName ?? (p.athlete as Json | undefined)?.displayName ?? ''),
			position: mapEspnPosition(String((p.position as Json | undefined)?.abbreviation ?? (p.position as Json | undefined)?.displayName ?? '')),
			number: String(p.jersey ?? ''),
			nationality: String((p.citizenship as Json | undefined)?.displayName ?? ''),
			birthDate: String(p.dateOfBirth ?? ''),
		});
	}
	return out;
}

export async function fetchEspnPlayersToWatch(teamId: number, lastN = 2, limit = 3): Promise<EspnWatchPlayer[]> {
	const events = (await fetchEspnTeamSchedule(teamId)).filter((e) => e.statusType === 'finished').slice(0, lastN);
	const byId = new Map<string, EspnWatchPlayer & { ratings: number[] }>();
	await Promise.all(
		events.map(async (event) => {
			const data = await fetchEspnSummary(event.id);
			const roster = ((data?.rosters as Json[]) ?? []).find((r) => Number((r.team as Json | undefined)?.id) === teamId);
			for (const row of (roster?.roster as Json[]) ?? []) {
				if (!row.starter && !rosterStat(row, 'totalGoals', 'goalAssists')) continue;
				const athlete = row.athlete as Json | undefined;
				const id = String(athlete?.id ?? '');
				if (!id) continue;
				const isKeeper = String((row.position as Json | undefined)?.abbreviation ?? '') === 'G';
				const rating = performanceRating(row, isKeeper);
				const cur = byId.get(id) ?? {
					id,
					name: String(athlete?.displayName ?? ''),
					position: mapEspnPosition(String((row.position as Json | undefined)?.abbreviation ?? '')),
					number: String(row.jersey ?? ''),
					avgRating: 0,
					matches: 0,
					goals: 0,
					assists: 0,
					ratings: [] as number[],
				};
				cur.ratings.push(rating);
				cur.goals += rosterStat(row, 'totalGoals');
				cur.assists += rosterStat(row, 'goalAssists');
				byId.set(id, cur);
			}
		}),
	);
	return [...byId.values()]
		.map((p) => ({
			id: p.id,
			name: p.name,
			position: p.position,
			number: p.number,
			avgRating: Math.round((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length) * 10) / 10,
			matches: p.ratings.length,
			goals: p.goals,
			assists: p.assists,
		}))
		.sort((a, b) => b.avgRating - a.avgRating || b.goals - a.goals)
		.slice(0, limit);
}

const ESPN_STAT_MAP: Record<string, string> = {
	possessionPct: 'possession_percentage',
	totalShots: 'total_scoring_att',
	shotsOnTarget: 'ontarget_scoring_att',
	wonCorners: 'won_corners',
	foulsCommitted: 'fk_foul_lost',
	yellowCards: 'total_yel_card',
	redCards: 'total_red_card',
	offsides: 'total_offside',
	saves: 'saves',
};

export async function fetchEspnPreviewMatch(teamId: number, options?: { opponent?: string; date?: string }): Promise<EspnPreviewMatch | null> {
	const schedule = (await fetchEspnTeamSchedule(teamId)).map((e) => withTeamPerspective(e, teamId));
	const finished = schedule.filter((e) => e.statusType === 'finished');
	let event = finished[0] ?? null;
	if (options?.opponent || options?.date) {
		let best: { event: StatsEvent; score: number } | null = null;
		for (const e of finished) {
			let score = 1;
			if (options.opponent && opponentMatches(e.opponent, options.opponent)) score += 10;
			if (options.date && datesClose(e.date, options.date)) score += 8;
			if (!best || score > best.score) best = { event: e, score };
		}
		event = best?.event ?? event;
	}
	if (!event) return null;
	const data = await fetchEspnSummary(event.id);
	if (!data) return null;
	const stats: Record<string, number> = {};
	const isHome = event.homeTeamId === teamId;
	const teamBox = ((data.boxscore as Json | undefined)?.teams as Json[] | undefined)?.find(
		(t) => Number((t.team as Json | undefined)?.id) === teamId,
	);
	for (const row of (teamBox?.statistics as Json[]) ?? []) {
		const key = ESPN_STAT_MAP[String(row.name)] ?? String(row.name);
		const n = Number(String(row.displayValue ?? '').replace('%', ''));
		if (Number.isFinite(n)) stats[key] = n;
	}
	const incidents = await fetchEspnEventIncidents(event.id);
	const mappedEvents: EspnPreviewMatch['events'] = incidents.map((inc) => ({
		minute: inc.minute,
		type: /goal/i.test(inc.type) ? 'goal' : /red/i.test(inc.type) ? 'red' : /yellow/i.test(inc.type) ? 'yellow' : 'sub',
		player: inc.player,
		team: /barcel/i.test(inc.team) === isHome || normalizeName(inc.team) === normalizeName(event.homeTeam) ? 'home' : 'away',
		detail: inc.detail,
	}));
	const roster = ((data.rosters as Json[]) ?? []).find((r) => Number((r.team as Json | undefined)?.id) === teamId);
	const starters: EspnPreviewMatch['lineups']['starters'] = [];
	const subs: EspnPreviewMatch['lineups']['subs'] = [];
	for (const row of (roster?.roster as Json[]) ?? []) {
		const athlete = row.athlete as Json | undefined;
		const mapped = {
			id: String(athlete?.id ?? ''),
			name: String(athlete?.displayName ?? ''),
			number: String(row.jersey ?? ''),
			position: mapEspnPosition(String((row.position as Json | undefined)?.abbreviation ?? '')),
		};
		if (row.starter) starters.push(mapped);
		else subs.push(mapped);
	}
	return {
		eventId: event.id,
		homeTeam: event.homeTeam,
		awayTeam: event.awayTeam,
		teamId,
		isHome: event.isHome,
		opponent: event.opponent,
		date: event.date,
		time: event.time,
		homeScore: event.homeScore,
		awayScore: event.awayScore,
		stats,
		events: mappedEvents,
		lineups: { starters: starters.slice(0, 11), subs },
	};
}

export async function fetchTeamLastAndNext(teamId: number): Promise<{ last: StatsEvent | null; next: StatsEvent | null }> {
	const events = (await fetchEspnTeamSchedule(teamId)).map((e) => withTeamPerspective(e, teamId));
	const last = events.find((e) => e.statusType === 'finished') ?? null;
	const next = events.find((e) => e.statusType !== 'finished') ?? null;
	return { last, next };
}

export async function fetchEspnAthleteStats(athleteId: number): Promise<{
	name: string;
	position: string;
	number: string;
	seasons: Array<{ competition: string; year: string; statistics: Record<string, number> }>;
} | null> {
	const data = await espnPath(`/apis/common/v3/sports/soccer/athletes/${athleteId}`);
	const athlete = data?.athlete as Json | undefined;
	if (!athlete) return null;
	const statsData = await espnPath(`/apis/common/v3/sports/soccer/athletes/${athleteId}/stats`);
	const categories = (statsData?.categories as Json[]) ?? (statsData?.splits as Json[]) ?? [];
	const seasons: Array<{ competition: string; year: string; statistics: Record<string, number> }> = [];
	for (const cat of categories.slice(0, 6)) {
		const statistics: Record<string, number> = {};
		for (const s of (cat.statistics as Json[]) ?? (cat.stats as Json[]) ?? []) {
			const n = Number(s.value ?? s.displayValue);
			if (Number.isFinite(n)) statistics[String(s.name ?? s.abbreviation ?? '')] = n;
		}
		if (Object.keys(statistics).length) {
			seasons.push({
				competition: String(cat.displayName ?? cat.name ?? 'Season'),
				year: String(cat.abbreviation ?? ''),
				statistics,
			});
		}
	}
	return {
		name: String(athlete.displayName ?? athlete.fullName ?? ''),
		position: String((athlete.position as Json | undefined)?.abbreviation ?? ''),
		number: String(athlete.jersey ?? ''),
		seasons,
	};
}

/** TheSportsDB day+live fallback when ESPN hosts are blocked. */
export async function fetchSportsDbSoccerDay(ymd: string): Promise<Json[]> {
	const data = await fetchPublicJson([`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${ymd}&s=Soccer`]);
	return (data?.events as Json[]) ?? [];
}

export async function fetchSportsDbLiveSoccer(): Promise<Json[]> {
	const data = await fetchPublicJson(['https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Soccer']);
	const rows = data?.livescore;
	return Array.isArray(rows) ? (rows as Json[]) : [];
}

export function mapSportsDbEventToLiveShape(raw: Json): Json {
	const home = String(raw.strHomeTeam ?? '');
	const away = String(raw.strAwayTeam ?? '');
	const ts = raw.strTimestamp ? Math.floor(new Date(String(raw.strTimestamp)).getTime() / 1000) : 0;
	const progress = String(raw.strProgress ?? raw.strStatus ?? '');
	const finished = /ft|finished|aet|pen/i.test(progress) || String(raw.strStatus ?? '') === 'Match Finished';
	return {
		id: Number(raw.idEvent ?? 0),
		homeTeam: { name: home, national: false },
		awayTeam: { name: away, national: false },
		homeScore: { current: num(raw.intHomeScore), display: num(raw.intHomeScore) },
		awayScore: { current: num(raw.intAwayScore), display: num(raw.intAwayScore) },
		tournament: {
			name: String(raw.strLeague ?? ''),
			uniqueTournament: { name: String(raw.strLeague ?? ''), id: 0 },
		},
		status: {
			type: finished ? 'finished' : /live|\d/i.test(progress) ? 'inprogress' : 'scheduled',
			description: finished ? 'FT' : progress || 'LIVE',
		},
		venue: { name: String(raw.strVenue ?? '') },
		startTimestamp: ts,
		_competitionName: String(raw.strLeague ?? ''),
	};
}
