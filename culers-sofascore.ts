import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(ROOT, '.venv-sofascore', 'bin', 'python');
const SCRIPT = path.join(ROOT, 'scripts', 'sofascore-api.py');

export const SOFASCORE_BARCA_TEAM_ID = 2817;
export const SOFASCORE_ATLETIC_TEAM_ID = 24343;
/** Juvenil A / Barcelona U19 (División de Honor + UEFA Youth League). */
export const SOFASCORE_JUVENIL_A_TEAM_ID = 90128;

/** SofaScore team IDs for La Liga sides on Barça's calendar. */
const SOFASCORE_TEAM_IDS: Record<string, number> = {
	barcelona: 2817,
	valencia: 2828,
	rayo: 2818,
	'rayo vallecano': 2818,
	'real madrid': 2829,
	'atletico madrid': 2836,
	atletico: 2836,
	sevilla: 2833,
	'real sociedad': 2824,
	villarreal: 2819,
	'real betis': 2816,
	betis: 2816,
	getafe: 2859,
	girona: 24264,
	mallorca: 2826,
	osasuna: 2820,
	athletic: 2825,
	'athletic club': 2825,
	'athletic bilbao': 2825,
	espanyol: 2814,
	leganes: 2815,
	leganés: 2815,
	'deportivo de la coruna': 2832,
	'deportivo la coruna': 2832,
	'deportivo de a coruna': 2832,
	alaves: 2885,
	alavés: 2885,
	'celta vigo': 2821,
	celta: 2821,
	elche: 2846,
	'racing de santander': 2835,
	'real racing club': 2835,
	racing: 2835,
	// UEFA Champions League
	feyenoord: 2959,
	galatasaray: 3061,
	como: 2704,
	'como 1907': 2704,
	inter: 2697,
	porto: 3002,
	'fc porto': 3002,
	'manchester city': 17,
	'man city': 17,
	'paris saint-germain': 1644,
	psg: 1644,
	'aston villa': 40,
	'sporting cp': 3001,
	'sporting lisbon': 3001,
	sporting: 3001,
	sabah: 267828,
	'sabah fk': 267828,
	'sabah baku': 267828,
};

const SOFA_SEARCH_ALIASES: Record<string, string> = {
	racing: 'racing de santander',
	'real racing club': 'racing de santander',
	sabah: 'sabah fk',
	'como 1907': 'como',
	'man city': 'manchester city',
	psg: 'paris saint-germain',
	sporting: 'sporting cp',
};

type Json = Record<string, unknown>;

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

export type SofaScoreEvent = {
	id: number;
	date: string;
	time: string;
	/** Unix seconds — used to order "last" events (SofaScore pages are oldest-first). */
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

function eventDate(raw: Json) {
	const ts = Number(raw.startTimestamp ?? 0);
	if (!ts) return '';
	return new Date(ts * 1000).toISOString().slice(0, 10);
}

function datesClose(a: string, b: string) {
	if (!a || !b) return false;
	if (a === b) return true;
	const da = new Date(`${a}T12:00:00Z`).getTime();
	const db = new Date(`${b}T12:00:00Z`).getTime();
	return Math.abs(da - db) <= 86_400_000;
}

function mapSofaPosition(code: string) {
	switch (code.toUpperCase()) {
		case 'G':
			return 'Goalkeeper';
		case 'D':
			return 'Defender';
		case 'M':
			return 'Midfielder';
		case 'F':
			return 'Forward';
		default:
			return code || 'Unknown';
	}
}

async function sofaFetchPython(apiPath: string, timeoutMs = 10_000): Promise<Json | null> {
	return new Promise((resolve) => {
		const child = spawn(PYTHON, [SCRIPT, apiPath], { cwd: ROOT });
		let stdout = '';
		let stderr = '';
		let settled = false;
		const done = (value: Json | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(value);
		};
		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			done(null);
		}, timeoutMs);
		child.stdout.on('data', (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on('data', (chunk) => {
			stderr += String(chunk);
		});
		child.on('error', () => done(null));
		child.on('close', (code) => {
			if (code !== 0) {
				if (stderr) console.warn('[sofascore]', stderr.trim());
				done(null);
				return;
			}
			try {
				done(JSON.parse(stdout) as Json);
			} catch {
				done(null);
			}
		});
	});
}

/** Direct fetch fallback for serverless hosts (Vercel) where the Python venv is unavailable. */
async function sofaFetchDirect(apiPath: string): Promise<Json | null> {
	const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
	try {
		const res = await fetch(`https://api.sofascore.com/api/v1${path}`, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Culers/1.0)',
				Accept: 'application/json',
				Referer: 'https://www.sofascore.com/',
			},
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) return null;
		return (await res.json()) as Json;
	} catch {
		return null;
	}
}

async function sofaFetch(apiPath: string): Promise<Json | null> {
	// Skip Python venv on Vercel/Lambda — spawn can hang until maxDuration.
	if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && (await isSofaScoreReady())) {
		const viaPython = await sofaFetchPython(apiPath);
		if (viaPython) return viaPython;
	}
	return sofaFetchDirect(apiPath);
}

export type SofaTeamPlayer = {
	id: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	birthDate: string;
	marketValueEur?: number;
};

function sofaMarketValueEur(player: Json): number | undefined {
	const raw = player.proposedMarketValueRaw as Json | undefined;
	const fromRaw = Number(raw?.value ?? 0);
	if (Number.isFinite(fromRaw) && fromRaw > 0) return fromRaw;
	const n = Number(player.proposedMarketValue ?? 0);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Current squad list for a SofaScore team (e.g. Barcelona Atlètic = 24343). */
export async function sofaFetchTeamPlayers(teamId: number): Promise<SofaTeamPlayer[]> {
	const data = await sofaFetch(`/team/${teamId}/players`);
	const rows = (data?.players as Json[]) ?? [];
	return rows
		.map((row) => {
			const player = (row.player as Json | undefined) ?? row;
			const id = Number(player.id ?? 0);
			if (!id) return null;
			const country = player.country as Json | undefined;
			return {
				id,
				name: String(player.name ?? ''),
				position: String(player.position ?? ''),
				number: player.jerseyNumber != null || player.shirtNumber != null
					? String(player.jerseyNumber ?? player.shirtNumber)
					: '',
				nationality: String(country?.name ?? ''),
				birthDate: '',
				marketValueEur: sofaMarketValueEur(player),
			} satisfies SofaTeamPlayer;
		})
		.filter(Boolean) as SofaTeamPlayer[];
}

function parseEvent(raw: Json): SofaScoreEvent | null {
	const home = raw.homeTeam as Json | undefined;
	const away = raw.awayTeam as Json | undefined;
	if (!home || !away) return null;

	const homeTeamId = Number(home.id ?? 0);
	const awayTeamId = Number(away.id ?? 0);
	const homeTeam = String(home.name ?? '');
	const awayTeam = String(away.name ?? '');
	const homeScoreRaw = raw.homeScore as Json | undefined;
	const awayScoreRaw = raw.awayScore as Json | undefined;
	const homeScore = homeScoreRaw?.display != null ? Number(homeScoreRaw.display) : null;
	const awayScore = awayScoreRaw?.display != null ? Number(awayScoreRaw.display) : null;
	const status = raw.status as Json | undefined;
	const type = raw.statusType as Json | undefined;
	const ts = Number(raw.startTimestamp ?? 0);
	const kickoff = ts ? new Date(ts * 1000) : null;
	const tournament = raw.tournament as Json | undefined;
	const unique = tournament?.uniqueTournament as Json | undefined;

	return {
		id: Number(raw.id ?? 0),
		date: eventDate(raw),
		time: kickoff ? kickoff.toISOString().slice(11, 19) : '',
		startTimestamp: Number.isFinite(ts) ? ts : 0,
		homeTeam,
		awayTeam,
		homeTeamId,
		awayTeamId,
		homeScore,
		awayScore,
		isHome: false,
		opponent: '',
		statusType: String(type?.type ?? status?.type ?? ''),
		competition: String(unique?.name ?? tournament?.name ?? ''),
	};
}

function withTeamPerspective(event: SofaScoreEvent, teamId: number): SofaScoreEvent {
	const isHome = event.homeTeamId === teamId;
	return {
		...event,
		isHome,
		opponent: isHome ? event.awayTeam : event.homeTeam,
	};
}

export function resolveSofaScoreTeamId(teamName: string): number | null {
	const key = normalizeName(teamName);
	const aliasKey = SOFA_SEARCH_ALIASES[key] ?? key;
	if (SOFASCORE_TEAM_IDS[aliasKey]) return SOFASCORE_TEAM_IDS[aliasKey];
	const token = aliasKey.split(' ').filter(Boolean).pop() ?? aliasKey;
	for (const [k, id] of Object.entries(SOFASCORE_TEAM_IDS)) {
		if (k === aliasKey || k === token) return id;
	}
	return null;
}

function scoreEvent(event: SofaScoreEvent, opponent?: string, date?: string) {
	let score = 0;
	if (opponent && opponentMatches(event.opponent, opponent)) score += 10;
	if (date && datesClose(event.date, date)) score += 8;
	return score;
}

async function listTeamEventsForTeam(teamId: number, kind: 'next' | 'last', page = 0) {
	const data = await sofaFetch(`/team/${teamId}/events/${kind}/${page}`);
	const events = ((data?.events as Json[]) ?? []).map(parseEvent).filter(Boolean) as SofaScoreEvent[];
	// SofaScore returns `last` pages oldest→newest; callers expect most-recent first.
	if (kind === 'last') {
		return [...events].sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
	}
	return events;
}

async function listTeamEvents(kind: 'next' | 'last', page = 0) {
	return listTeamEventsForTeam(SOFASCORE_BARCA_TEAM_ID, kind, page);
}

export async function fetchTeamLastAndNext(teamId: number): Promise<{
	last: SofaScoreEvent | null;
	next: SofaScoreEvent | null;
}> {
	const [nextRows, lastRows] = await Promise.all([
		listTeamEventsForTeam(teamId, 'next'),
		listTeamEventsForTeam(teamId, 'last'),
	]);
	return {
		next: nextRows[0] ? withTeamPerspective(nextRows[0], teamId) : null,
		last: lastRows[0] ? withTeamPerspective(lastRows[0], teamId) : null,
	};
}

export async function findSofaScoreEvent(options: {
	opponent?: string;
	date?: string;
	prefer?: 'upcoming' | 'finished' | 'any';
}): Promise<SofaScoreEvent | null> {
	const [next, last] = await Promise.all([listTeamEvents('next'), listTeamEvents('last')]);
	const pool =
		options.prefer === 'upcoming'
			? next
			: options.prefer === 'finished'
				? last
				: [...next, ...last];

	let best: { event: SofaScoreEvent; score: number } | null = null;
	for (const event of pool) {
		const perspective = withTeamPerspective(event, SOFASCORE_BARCA_TEAM_ID);
		const score = scoreEvent(perspective, options.opponent, options.date);
		if (score <= 0) continue;
		if (!best || score > best.score) best = { event, score };
	}

	if (best) return withTeamPerspective(best.event, SOFASCORE_BARCA_TEAM_ID);

	if (options.prefer === 'upcoming' && next[0]) return withTeamPerspective(next[0], SOFASCORE_BARCA_TEAM_ID);
	if (options.prefer === 'finished' && last[0]) return withTeamPerspective(last[0], SOFASCORE_BARCA_TEAM_ID);
	return null;
}

function squadMatch(squad: RawPlayer[], sofaName: string) {
	const target = normalizeName(sofaName);
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

export async function fetchSofaScoreBarcaLineup(
	eventId: number,
	squad: RawPlayer[],
): Promise<{
	confirmed: boolean;
	formation: string;
	starters: RawPlayer[];
	bench: RawPlayer[];
} | null> {
	const data = await sofaFetch(`/event/${eventId}/lineups`);
	if (!data) return null;

	const confirmed = Boolean(data.confirmed);
	const home = data.home as Json | undefined;
	const away = data.away as Json | undefined;
	if (!home && !away) return null;

	const barcaSide =
		((home?.players as Json[]) ?? []).some((p) => Number(p.teamId) === SOFASCORE_BARCA_TEAM_ID)
			? home
			: away;
	if (!barcaSide) return null;

	const formation = String(barcaSide.formation ?? '4-3-3');
	const rows = (barcaSide.players as Json[]) ?? [];

	const starters: RawPlayer[] = [];
	const bench: RawPlayer[] = [];

	for (const row of rows) {
		const playerMeta = row.player as Json | undefined;
		if (!playerMeta) continue;
		const sofaName = String(playerMeta.name ?? '');
		const sofaId = Number(playerMeta.id ?? 0) || undefined;
		const fromSquad = squadMatch(squad, sofaName);
		const position = mapSofaPosition(String(row.position ?? playerMeta.position ?? ''));
		const number = String(row.jerseyNumber ?? playerMeta.jerseyNumber ?? '');
		const mapped: RawPlayer = fromSquad
			? {
					...fromSquad,
					sofaId: sofaId ?? fromSquad.sofaId,
					position: position || fromSquad.position,
					number: number || fromSquad.number,
				}
			: {
					id: sofaId ? `sofa-${sofaId}` : `sofa-${sofaName}`,
					sofaId,
					name: sofaName,
					position,
					number,
					nationality: String((playerMeta.country as Json | undefined)?.name ?? ''),
					photo: '',
					birthDate: '',
				};

		if (row.substitute) bench.push(mapped);
		else starters.push(mapped);
	}

	if (starters.length < 8) return null;

	return {
		confirmed,
		formation,
		starters: starters.slice(0, 11),
		bench,
	};
}

export async function findSofaScoreTeamLastFinishedEvent(
	teamId: number,
	options?: { opponent?: string; date?: string },
): Promise<SofaScoreEvent | null> {
	const last = await listTeamEventsForTeam(teamId, 'last');
	const finished = last.filter((e) => e.statusType === 'finished' || e.statusType === 'closed');

	let best: { event: SofaScoreEvent; score: number } | null = null;
	for (const event of finished) {
		const perspective = withTeamPerspective(event, teamId);
		let score = 1;
		if (options?.opponent && opponentMatches(perspective.opponent, options.opponent)) score += 10;
		if (options?.date && datesClose(perspective.date, options.date)) score += 8;
		if (!best || score > best.score) best = { event, score };
	}

	const pick = best?.event ?? finished[0] ?? null;
	return pick ? withTeamPerspective(pick, teamId) : null;
}

export type SofaWatchPlayer = {
	id: string;
	name: string;
	position: string;
	number: string;
	avgRating: number;
	matches: number;
	goals: number;
	assists: number;
};

type PlayerAgg = {
	id: string;
	name: string;
	position: string;
	number: string;
	ratings: number[];
	goals: number;
	assists: number;
};

function readSofaStat(stats: Json | undefined, ...keys: string[]) {
	if (!stats) return 0;
	for (const key of keys) {
		const n = Number(stats[key]);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return 0;
}

/** Top players by average SofaScore match rating across the last N finished games. */
export async function fetchSofaScorePlayersToWatch(
	teamId: number,
	lastN = 2,
	limit = 3,
): Promise<SofaWatchPlayer[]> {
	const last = await listTeamEventsForTeam(teamId, 'last');
	const finished = last
		.filter((e) => e.statusType === 'finished' || e.statusType === 'closed')
		.slice(0, Math.max(1, lastN));

	const byId = new Map<string, PlayerAgg>();

	await Promise.all(
		finished.map(async (event) => {
			const lineupsRaw = await sofaFetch(`/event/${event.id}/lineups`);
			if (!lineupsRaw) return;
			const homeSide = lineupsRaw.home as Json | undefined;
			const awaySide = lineupsRaw.away as Json | undefined;
			const teamIsHome = event.homeTeamId === teamId;
			const teamSide = teamIsHome ? homeSide : awaySide;
			for (const row of (teamSide?.players as Json[]) ?? []) {
				const playerMeta = row.player as Json | undefined;
				if (!playerMeta) continue;
				const stats = row.statistics as Json | undefined;
				const rating = Number(stats?.rating ?? 0);
				if (!Number.isFinite(rating) || rating <= 0) continue;

				const id = String(playerMeta.id ?? playerMeta.slug ?? playerMeta.name ?? '');
				if (!id) continue;
				const name = String(playerMeta.name ?? 'Unknown');
				const position = mapSofaPosition(String(row.position ?? playerMeta.position ?? ''));
				const number = String(row.jerseyNumber ?? playerMeta.jerseyNumber ?? '');
				const goals = readSofaStat(stats, 'goals', 'goal');
				const assists = readSofaStat(stats, 'goalAssist', 'assists', 'assist');

				const cur = byId.get(id) ?? {
					id,
					name,
					position,
					number,
					ratings: [],
					goals: 0,
					assists: 0,
				};
				cur.ratings.push(rating);
				cur.goals += goals;
				cur.assists += assists;
				if (!cur.position && position) cur.position = position;
				if (!cur.number && number) cur.number = number;
				byId.set(id, cur);
			}
		}),
	);

	return [...byId.values()]
		.map((p) => ({
			id: p.id,
			name: p.name,
			position: p.position || 'Player',
			number: p.number,
			avgRating: Math.round((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length) * 10) / 10,
			matches: p.ratings.length,
			goals: p.goals,
			assists: p.assists,
		}))
		.sort((a, b) => b.avgRating - a.avgRating || b.goals - a.goals || b.assists - a.assists)
		.slice(0, limit);
}

const SOFA_STAT_MAP: Record<string, string> = {
	ballPossession: 'possession_percentage',
	totalShotsOnGoal: 'total_scoring_att',
	shotsOnGoal: 'ontarget_scoring_att',
	passes: 'total_pass',
	accuratePasses: 'accurate_pass',
	cornerKicks: 'won_corners',
	fouls: 'fk_foul_lost',
	yellowCards: 'total_yel_card',
	redCards: 'total_red_card',
	totalTackle: 'total_tackle',
	offsides: 'total_offside',
};

export type SofaPreviewMatch = {
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

function lineupFromSofaSide(side: Json | undefined) {
	const starters: SofaPreviewMatch['lineups']['starters'] = [];
	const subs: SofaPreviewMatch['lineups']['subs'] = [];
	for (const row of (side?.players as Json[]) ?? []) {
		const playerMeta = row.player as Json | undefined;
		if (!playerMeta) continue;
		const mapped = {
			id: String(playerMeta.id ?? playerMeta.slug ?? ''),
			name: String(playerMeta.name ?? ''),
			number: String(row.jerseyNumber ?? playerMeta.jerseyNumber ?? ''),
			position: mapSofaPosition(String(row.position ?? playerMeta.position ?? '')),
		};
		if (row.substitute) subs.push(mapped);
		else starters.push(mapped);
	}
	return { starters: starters.slice(0, 11), subs };
}

export async function fetchSofaScorePreviewMatch(
	teamId: number,
	options?: { opponent?: string; date?: string },
): Promise<SofaPreviewMatch | null> {
	const event = await findSofaScoreTeamLastFinishedEvent(teamId, options);
	if (!event?.id) return null;

	const [statsRaw, incidentsRaw, lineupsRaw] = await Promise.all([
		sofaFetch(`/event/${event.id}/statistics`),
		sofaFetch(`/event/${event.id}/incidents`),
		sofaFetch(`/event/${event.id}/lineups`),
	]);

	const stats: Record<string, number> = {};
	const teamIsHome = event.homeTeamId === teamId;
	for (const period of (statsRaw?.statistics as Json[]) ?? []) {
		if (String(period.period ?? '') !== 'ALL') continue;
		for (const group of (period.groups as Json[]) ?? []) {
			for (const item of (group.statisticsItems as Json[]) ?? []) {
				const optaKey = SOFA_STAT_MAP[String(item.key ?? '')];
				if (!optaKey) continue;
				const val = teamIsHome ? Number(item.homeValue ?? 0) : Number(item.awayValue ?? 0);
				stats[optaKey] = val;
			}
		}
	}

	const events: SofaPreviewMatch['events'] = [];
	for (const raw of (incidentsRaw?.incidents as Json[]) ?? []) {
		const type = String(raw.incidentType ?? '');
		if (!['goal', 'card', 'substitution'].includes(type)) continue;
		const minute = String(raw.time ?? raw.addedTime ?? '?');
		const playerMeta = raw.player as Json | undefined;
		const assistMeta = raw.assist1 as Json | undefined;
		const player = String(playerMeta?.name ?? raw.playerName ?? 'Unknown');
		const isHome = Boolean(raw.isHome);
		const side: 'home' | 'away' = isHome ? 'home' : 'away';

		if (type === 'goal') {
			events.push({
				minute: minute.endsWith("'") ? minute : `${minute}'`,
				type: 'goal',
				player,
				assist: assistMeta ? String(assistMeta.name ?? '') : undefined,
				team: side,
			});
		} else if (type === 'card') {
			const cls = String(raw.incidentClass ?? 'yellow');
			events.push({
				minute: minute.endsWith("'") ? minute : `${minute}'`,
				type: cls.includes('red') ? 'red' : 'yellow',
				player,
				team: side,
			});
		} else if (type === 'substitution') {
			const subPlayer = raw.playerIn as Json | undefined;
			const subOut = raw.playerOut as Json | undefined;
			if (subOut?.name) {
				events.push({ minute: minute.endsWith("'") ? minute : `${minute}'`, type: 'sub', player: String(subOut.name), team: side, detail: 'Off' });
			}
			if (subPlayer?.name) {
				events.push({ minute: minute.endsWith("'") ? minute : `${minute}'`, type: 'sub', player: String(subPlayer.name), team: side, detail: 'On' });
			}
		}
	}

	const homeSide = lineupsRaw?.home as Json | undefined;
	const awaySide = lineupsRaw?.away as Json | undefined;
	const teamSide = teamIsHome ? homeSide : awaySide;
	const lineups = lineupFromSofaSide(teamSide);

	return {
		eventId: event.id,
		homeTeam: event.homeTeam,
		awayTeam: event.awayTeam,
		teamId,
		isHome: teamIsHome,
		opponent: teamIsHome ? event.awayTeam : event.homeTeam,
		date: event.date,
		time: event.time,
		homeScore: event.homeScore,
		awayScore: event.awayScore,
		stats,
		events,
		lineups,
	};
}

export async function isSofaScoreReady() {
	return new Promise<boolean>((resolve) => {
		spawn(PYTHON, ['--version']).on('error', () => resolve(false)).on('close', (code) => resolve(code === 0));
	});
}

export type SofaPlayerSeasonStats = {
	year: string;
	competition: string;
	statistics: Record<string, number>;
};

/** Season-by-season stats for any SofaScore player (works for Atlètic reserves). */
export async function sofaFetchPlayerStatistics(sofaId: number): Promise<{
	name: string;
	position: string;
	number: string;
	seasons: SofaPlayerSeasonStats[];
} | null> {
	const [profile, statsPack] = await Promise.all([
		sofaFetch(`/player/${sofaId}`),
		sofaFetch(`/player/${sofaId}/statistics`),
	]);
	if (!statsPack) return null;

	const player = (profile?.player as Json | undefined) ?? {};
	const seasonsRaw = (statsPack.seasons as Json[]) ?? [];
	const seasons: SofaPlayerSeasonStats[] = seasonsRaw.map((s) => {
		const tournament = (s.uniqueTournament as Json | undefined) ?? {};
		const statistics = (s.statistics as Json | undefined) ?? {};
		const nums: Record<string, number> = {};
		for (const [key, value] of Object.entries(statistics)) {
			if (typeof value === 'number' && Number.isFinite(value)) nums[key] = value;
		}
		return {
			year: String(s.year ?? ''),
			competition: String(tournament.name ?? 'Competition'),
			statistics: nums,
		};
	});

	return {
		name: String(player.name ?? ''),
		position: String(player.position ?? ''),
		number:
			player.jerseyNumber != null || player.shirtNumber != null
				? String(player.jerseyNumber ?? player.shirtNumber)
				: '',
		seasons,
	};
}

// ── Match ratings board (FotMob-style pitch) ───────────────────────────────

function formationSlots(formation: string): Array<{ x: number; y: number }> {
	/** x = width across pitch (top→bottom on side-by-side half), y = depth (own goal → attack). */
	const parts = formation
		.split('-')
		.map((n) => Number(n))
		.filter((n) => Number.isFinite(n) && n > 0);
	const rows = parts.length ? parts : [4, 3, 3];
	const slots: Array<{ x: number; y: number }> = [{ x: 50, y: 94 }];
	const depthStart = 78;
	const depthEnd = 14;
	const span = depthStart - depthEnd;
	const step = rows.length > 1 ? span / (rows.length - 1) : 0;

	rows.forEach((count, rowIdx) => {
		const y = rows.length === 1 ? 46 : depthStart - rowIdx * step;
		for (let i = 0; i < count; i++) {
			const x = count === 1 ? 50 : 10 + (i * 80) / (count - 1);
			slots.push({ x, y });
		}
	});
	while (slots.length < 11) slots.push({ x: 50, y: 20 });
	return slots.slice(0, 11);
}

function positionRank(pos: string) {
	const p = pos.toLowerCase();
	if (p === 'g' || p.includes('goal')) return 0;
	if (p === 'd' || p.includes('def')) return 1;
	if (p === 'm' || p.includes('mid')) return 2;
	return 3;
}

function mapRatedPlayer(
	row: Json,
	coords: { x: number; y: number } | null,
	motmId: number | null,
): {
	player: {
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
		substitute: boolean;
		x: number;
		y: number;
		photo?: string;
	};
} | null {
	const playerMeta = row.player as Json | undefined;
	if (!playerMeta) return null;
	const sofaId = Number(playerMeta.id ?? 0);
	if (!sofaId) return null;
	const stats = row.statistics as Json | undefined;
	const ratingRaw = Number(stats?.rating ?? 0);
	const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? Math.round(ratingRaw * 10) / 10 : null;
	const subOnRaw = Number(stats?.substitutionInTime ?? stats?.subInTime ?? NaN);
	const subOffRaw = Number(stats?.substitutionOutTime ?? stats?.subOutTime ?? NaN);
	return {
		player: {
			id: String(sofaId),
			sofaId,
			name: String(playerMeta.name ?? 'Unknown'),
			number: String(row.jerseyNumber ?? row.shirtNumber ?? playerMeta.jerseyNumber ?? ''),
			position: mapSofaPosition(String(row.position ?? playerMeta.position ?? '')),
			rating,
			goals: readSofaStat(stats, 'goals', 'goal'),
			assists: readSofaStat(stats, 'goalAssist', 'assists', 'assist'),
			yellow: readSofaStat(stats, 'yellowCards', 'yellowCard'),
			red: readSofaStat(stats, 'redCards', 'redCard'),
			minutes: readSofaStat(stats, 'minutesPlayed', 'minutes'),
			subOn: Number.isFinite(subOnRaw) ? subOnRaw : null,
			subOff: Number.isFinite(subOffRaw) ? subOffRaw : null,
			isCaptain: Boolean(row.captain ?? playerMeta.captain),
			isMotm: motmId != null && sofaId === motmId,
			substitute: Boolean(row.substitute),
			x: coords?.x ?? 50,
			y: coords?.y ?? 50,
			photo: String(playerMeta.photoUrl ?? ''),
		},
	};
}

function sideFromLineup(
	side: Json | undefined,
	teamName: string,
	teamId: number,
	motmId: number | null,
) {
	const formation = String(side?.formation ?? '4-3-3');
	const rows = (side?.players as Json[]) ?? [];
	const startersRaw = [...rows.filter((r) => !r.substitute)].sort((a, b) => {
		const pa = String(a.position ?? (a.player as Json | undefined)?.position ?? '');
		const pb = String(b.position ?? (b.player as Json | undefined)?.position ?? '');
		const ra = positionRank(pa);
		const rb = positionRank(pb);
		if (ra !== rb) return ra - rb;
		return Number(a.jerseyNumber ?? 0) - Number(b.jerseyNumber ?? 0);
	});
	const benchRaw = rows.filter((r) => r.substitute);
	const slots = formationSlots(formation);

	const starters = startersRaw
		.map((row, i) => mapRatedPlayer(row, slots[i] ?? { x: 50, y: 40 }, motmId)?.player)
		.filter(Boolean) as NonNullable<ReturnType<typeof mapRatedPlayer>>['player'][];

	const bench = benchRaw
		.map((row) => mapRatedPlayer(row, null, motmId)?.player)
		.filter(Boolean) as NonNullable<ReturnType<typeof mapRatedPlayer>>['player'][];

	const rated = starters.filter((p) => p.rating != null) as Array<{ rating: number }>;
	const avgRating =
		rated.length > 0
			? Math.round((rated.reduce((a, p) => a + p.rating, 0) / rated.length) * 10) / 10
			: null;

	return {
		teamName,
		teamId,
		isBarca: teamId === SOFASCORE_BARCA_TEAM_ID,
		formation,
		avgRating,
		starters,
		bench,
	};
}

export async function fetchSofaScoreMatchRatings(options: {
	fixtureId: string;
	opponent?: string;
	date?: string;
	prefer?: 'upcoming' | 'finished' | 'any';
}): Promise<{
	fixtureId: string;
	sofaEventId: number;
	homeTeam: string;
	awayTeam: string;
	homeScore: number | null;
	awayScore: number | null;
	clock?: string;
	status: string;
	home: ReturnType<typeof sideFromLineup>;
	away: ReturnType<typeof sideFromLineup>;
	source: string;
} | null> {
	const event = await findSofaScoreEvent({
		opponent: options.opponent,
		date: options.date,
		prefer: options.prefer ?? 'any',
	});
	if (!event) return null;

	const [lineupsRaw, eventRaw] = await Promise.all([
		sofaFetch(`/event/${event.id}/lineups`),
		sofaFetch(`/event/${event.id}`),
	]);
	if (!lineupsRaw) return null;

	const homeSide = lineupsRaw.home as Json | undefined;
	const awaySide = lineupsRaw.away as Json | undefined;
	const bestPlayer =
		(eventRaw?.bestPlayer as Json | undefined) ??
		((eventRaw?.event as Json | undefined)?.bestPlayer as Json | undefined) ??
		null;
	const bestNested = bestPlayer?.player as Json | undefined;
	const motmId =
		Number(bestPlayer?.id ?? bestNested?.id ?? 0) || null;

	// Mark MOTM as highest rating if API doesn't expose bestPlayer
	const homeMapped = sideFromLineup(homeSide, event.homeTeam, event.homeTeamId, motmId);
	const awayMapped = sideFromLineup(awaySide, event.awayTeam, event.awayTeamId, motmId);
	if (!motmId) {
		const all = [...homeMapped.starters, ...awayMapped.starters].filter((p) => p.rating != null);
		const top = all.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
		if (top) {
			for (const p of [...homeMapped.starters, ...awayMapped.starters, ...homeMapped.bench, ...awayMapped.bench]) {
				p.isMotm = p.sofaId === top.sofaId;
			}
		}
	}

	const eventNode = eventRaw?.event as Json | undefined;
	const statusNode = eventNode?.status as Json | undefined;
	const statusType = String(event.statusType ?? '');
	const clock =
		String(statusNode?.description ?? '') ||
		(statusType === 'finished' || statusType === 'closed' ? 'FT' : undefined);

	return {
		fixtureId: options.fixtureId,
		sofaEventId: event.id,
		homeTeam: event.homeTeam,
		awayTeam: event.awayTeam,
		homeScore: event.homeScore,
		awayScore: event.awayScore,
		clock,
		status: statusType || 'unknown',
		home: homeMapped,
		away: awayMapped,
		source: 'SofaScore match ratings',
	};
}

const MATCH_STAT_LABELS: Record<string, string> = {
	minutesPlayed: 'Minutes played',
	goals: 'Goals',
	goalAssist: 'Assists',
	expectedGoals: 'Expected goals (xG)',
	expectedGoalsOnTarget: 'Expected goals on target (xGOT)',
	expectedAssists: 'Expected assists (xA)',
	accuratePass: 'Accurate passes',
	totalPass: 'Passes',
	keyPass: 'Chances created',
	onTargetScoringAttempt: 'Shots on target',
	shotOffTarget: 'Shots off target',
	totalShots: 'Shots',
	touches: 'Touches',
	totalTackle: 'Tackles',
	wonContest: 'Dribbles won',
	totalClearance: 'Clearances',
	saves: 'Saves',
	rating: 'Rating',
	duelWon: 'Duels won',
	aerialWon: 'Aerials won',
	interceptionWon: 'Interceptions',
	fouls: 'Fouls',
	wasFouled: 'Fouled',
	dispossessed: 'Dispossessed',
	possessionLostCtrl: 'Possession lost',
};

function buildMatchStatRows(stats: Json | undefined): {
	stats: Array<{ key: string; label: string; value: number | string; available: boolean }>;
	topStats: Array<{ key: string; label: string; value: number | string; available: boolean }>;
	rating: number | undefined;
} {
	if (!stats) return { stats: [], topStats: [], rating: undefined };
	const ratingRaw = Number(stats.rating ?? 0);
	const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? Math.round(ratingRaw * 10) / 10 : undefined;

	const preferred = [
		'minutesPlayed',
		'goals',
		'goalAssist',
		'expectedGoals',
		'expectedGoalsOnTarget',
		'expectedAssists',
		'accuratePass',
		'totalPass',
		'keyPass',
		'onTargetScoringAttempt',
		'shotOffTarget',
		'totalShots',
		'touches',
		'totalTackle',
		'wonContest',
		'totalClearance',
		'saves',
		'duelWon',
		'aerialWon',
		'interceptionWon',
	];

	const rows: Array<{ key: string; label: string; value: number | string; available: boolean }> = [];
	for (const key of preferred) {
		if (stats[key] == null) continue;
		const n = Number(stats[key]);
		if (!Number.isFinite(n)) continue;
		let value: number | string = n;
		if (key === 'accuratePass' && stats.totalPass != null) {
			const total = Number(stats.totalPass);
			const pct = total > 0 ? Math.round((n / total) * 100) : 0;
			value = `${n}/${total} (${pct}%)`;
		} else if (key === 'expectedGoals' || key === 'expectedGoalsOnTarget' || key === 'expectedAssists') {
			value = Math.round(n * 100) / 100;
		} else {
			value = Math.round(n * 10) / 10 === Math.round(n) ? Math.round(n) : Math.round(n * 10) / 10;
		}
		rows.push({
			key,
			label: MATCH_STAT_LABELS[key] ?? key,
			value,
			available: true,
		});
	}

	if (rating != null) {
		rows.unshift({ key: 'rating', label: 'Rating', value: rating, available: true });
	}

	const xg = Number(stats.expectedGoals ?? 0);
	const xa = Number(stats.expectedAssists ?? 0);
	if (Number.isFinite(xg) || Number.isFinite(xa)) {
		const sum = (Number.isFinite(xg) ? xg : 0) + (Number.isFinite(xa) ? xa : 0);
		rows.splice(
			Math.min(6, rows.length),
			0,
			{
				key: 'xgxa',
				label: 'xG + xA',
				value: Math.round(sum * 100) / 100,
				available: sum > 0,
			},
		);
	}

	return { stats: rows, topStats: rows.filter((r) => r.key !== 'rating'), rating };
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

function findLineupPlayerRow(
	lineupsRaw: Json,
	options: { sofaId?: number; playerName?: string },
): { row: Json; sofaId: number } | null {
	const sides = [lineupsRaw.home, lineupsRaw.away] as (Json | undefined)[];
	let best: { row: Json; sofaId: number; score: number } | null = null;

	for (const side of sides) {
		for (const row of (side?.players as Json[]) ?? []) {
			const playerMeta = row.player as Json | undefined;
			const id = Number(playerMeta?.id ?? 0);
			if (options.sofaId && id === options.sofaId) {
				return { row, sofaId: id };
			}
			if (!options.playerName || !id) continue;
			const score = nameMatchScore(String(playerMeta?.name ?? ''), options.playerName);
			if (score > 0 && (!best || score > best.score)) best = { row, sofaId: id, score };
		}
	}

	return best ? { row: best.row, sofaId: best.sofaId } : null;
}

export async function fetchSofaScorePlayerMatchStats(options: {
	fixtureId: string;
	sofaId?: number;
	playerName?: string;
	opponent?: string;
	date?: string;
}): Promise<{
	sofaId: number;
	fixtureId: string;
	name: string;
	position: string;
	number: string;
	opponent: string;
	clock?: string;
	rating?: number;
	stats: Array<{ key: string; label: string; value: number | string; available: boolean }>;
	topStats: Array<{ key: string; label: string; value: number | string; available: boolean }>;
	heatmap?: { x: number; y: number }[];
	fetchedAt: string;
	source: string;
} | null> {
	if (!options.sofaId && !options.playerName) return null;

	const event = await findSofaScoreEvent({
		opponent: options.opponent,
		date: options.date,
		prefer: 'any',
	});
	if (!event) return null;

	const lineupsRaw = await sofaFetch(`/event/${event.id}/lineups`);
	if (!lineupsRaw) return null;

	const found = findLineupPlayerRow(lineupsRaw, {
		sofaId: options.sofaId,
		playerName: options.playerName,
	});
	if (!found) return null;

	const playerMeta = found.row.player as Json;
	const stats = found.row.statistics as Json | undefined;
	const built = buildMatchStatRows(stats);
	const sofaId = found.sofaId;

	let heatmap: { x: number; y: number }[] | undefined;
	try {
		const heatRaw = await sofaFetch(`/event/${event.id}/player/${sofaId}/heatmap`);
		const points = (heatRaw?.heatmap as Json[]) ?? [];
		if (points.length) {
			heatmap = points
				.map((p) => ({
					x: Number(p.x ?? 0),
					y: Number(p.y ?? 0),
				}))
				.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
		}
	} catch {
		/* optional */
	}

	return {
		sofaId,
		fixtureId: options.fixtureId,
		name: String(playerMeta.name ?? options.playerName ?? ''),
		position: mapSofaPosition(String(found.row.position ?? playerMeta.position ?? '')),
		number: String(found.row.jerseyNumber ?? playerMeta.jerseyNumber ?? ''),
		opponent: event.opponent || (event.isHome ? event.awayTeam : event.homeTeam),
		clock: event.statusType === 'finished' || event.statusType === 'closed' ? 'FT' : undefined,
		rating: built.rating,
		stats: built.stats,
		topStats: built.topStats,
		heatmap,
		fetchedAt: new Date().toISOString(),
		source: 'SofaScore match ratings',
	};
}

