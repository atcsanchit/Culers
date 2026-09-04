import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(ROOT, '.venv-sofascore', 'bin', 'python');
const SCRIPT = path.join(ROOT, 'scripts', 'sofascore-api.py');

export const SOFASCORE_BARCA_TEAM_ID = 2817;

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
	homeTeam: string;
	awayTeam: string;
	homeTeamId: number;
	awayTeamId: number;
	homeScore: number | null;
	awayScore: number | null;
	isHome: boolean;
	opponent: string;
	statusType?: string;
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

async function sofaFetchPython(apiPath: string): Promise<Json | null> {
	return new Promise((resolve) => {
		const child = spawn(PYTHON, [SCRIPT, apiPath], { cwd: ROOT });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on('data', (chunk) => {
			stderr += String(chunk);
		});
		child.on('error', () => resolve(null));
		child.on('close', (code) => {
			if (code !== 0) {
				if (stderr) console.warn('[sofascore]', stderr.trim());
				resolve(null);
				return;
			}
			try {
				resolve(JSON.parse(stdout) as Json);
			} catch {
				resolve(null);
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
};

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

	return {
		id: Number(raw.id ?? 0),
		date: eventDate(raw),
		time: kickoff ? kickoff.toISOString().slice(11, 19) : '',
		homeTeam,
		awayTeam,
		homeTeamId,
		awayTeamId,
		homeScore,
		awayScore,
		isHome: false,
		opponent: '',
		statusType: String(type?.type ?? status?.type ?? ''),
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
	return events;
}

async function listTeamEvents(kind: 'next' | 'last', page = 0) {
	return listTeamEventsForTeam(SOFASCORE_BARCA_TEAM_ID, kind, page);
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
		const fromSquad = squadMatch(squad, sofaName);
		const mapped: RawPlayer =
			fromSquad ??
			({
				id: `sofa-${playerMeta.id ?? sofaName}`,
				name: sofaName,
				position: mapSofaPosition(String(row.position ?? playerMeta.position ?? '')),
				number: String(row.jerseyNumber ?? playerMeta.jerseyNumber ?? ''),
				nationality: String((playerMeta.country as Json | undefined)?.name ?? ''),
				photo: '',
				birthDate: '',
			} satisfies RawPlayer);

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
