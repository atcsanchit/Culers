import { fetchTeamBadge, normalizeTeamKey } from './culers-team-badges.ts';
import { fetchStadiumBackground } from './culers-stadium-photos.ts';
import { fetchSofaScorePreviewMatch, resolveSofaScoreTeamId } from './culers-sofascore.ts';

const FCB_API = 'https://api-fcb.pulselive.com/football';
const FCB_ORIGIN = 'https://www.fcbarcelona.com';
const BARCA_TEAM_ID = 49;
const LA_LIGA_COMP_SEASON = 879;
const UCL_COMP_SEASON = 883;
const CURRENT_COMP_SEASONS = `${LA_LIGA_COMP_SEASON},${UCL_COMP_SEASON}`;

type Json = Record<string, unknown>;

export type FcbPlayer = {
	id: string;
	fcbId: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
	onLoan?: boolean;
	inLastMatchXi?: boolean;
	inLastMatchSquad?: boolean;
};

export type SquadMeta = {
	coach: string;
	source: string;
	lastMatch?: {
		fixtureId: string;
		opponent: string;
		date: string;
		starters: number;
		subs: number;
	};
};

async function fcbFetch(path: string): Promise<Json | null> {
	try {
		const res = await fetch(`${FCB_API}${path}`, {
			headers: { Origin: FCB_ORIGIN, 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) return null;
		return (await res.json()) as Json;
	} catch {
		return null;
	}
}

function kickoffMillis(raw: Json) {
	const kick = raw.kickoff as Json | undefined;
	const prov = raw.provisionalKickoff as Json | undefined;
	return Number(kick?.millis ?? prov?.millis ?? 0) || null;
}

function normalizeFcbFixture(raw: Json) {
	const teams = (raw.teams as Json[]) ?? [];
	const home = teams[0]?.team as Json | undefined;
	const away = teams[1]?.team as Json | undefined;
	const homeName = String(home?.shortName ?? home?.name ?? '');
	const awayName = String(away?.shortName ?? away?.name ?? '');
	const isHome = homeName.toLowerCase().includes('barcelona');
	const opponent = isHome ? awayName : homeName;
	const ms = kickoffMillis(raw);
	const dateObj = ms ? new Date(ms) : null;
	const date = dateObj ? dateObj.toISOString().slice(0, 10) : '';
	const time = dateObj ? dateObj.toISOString().slice(11, 19) : '';
	const compSeason = ((raw.gameweek as Json)?.compSeason as Json) ?? {};
	const competition = String((compSeason.competition as Json)?.description ?? 'Unknown');
	const compShort = String((compSeason.competition as Json)?.abbreviation ?? '');
	const homeScore = teams[0]?.score != null ? Number(teams[0].score) : null;
	const awayScore = teams[1]?.score != null ? Number(teams[1].score) : null;
	const statusCode = String(raw.status ?? 'U');
	const status =
		statusCode === 'C'
			? 'Match Finished'
			: statusCode === 'L'
				? 'Live'
				: 'Scheduled';
	const ground = raw.ground as Json | undefined;
	const kind =
		statusCode === 'C' ? ('past' as const) : statusCode === 'L' ? ('live' as const) : ('upcoming' as const);

	return {
		id: String(raw.id ?? `${homeName}-${awayName}-${date}`),
		homeTeam: homeName,
		awayTeam: awayName,
		isHome,
		opponent,
		venue: String(ground?.name ?? (isHome ? 'Spotify Camp Nou' : 'Away')),
		date,
		time,
		competition,
		compShort,
		season: String(compSeason.label ?? ''),
		round: String(((raw.gameweek as Json)?.gameweek as number | string) ?? ''),
		homeScore,
		awayScore,
		status,
		thumb: '',
		kind,
		source: 'FC Barcelona / PulseLive (La Liga & UCL)',
	};
}

export async function fetchFcbFixtures() {
	const all: ReturnType<typeof normalizeFcbFixture>[] = [];
	let page = 0;
	let pages = 1;

	while (page < pages) {
		const data = await fcbFetch(
			`/fixtures?teams=49&compSeasons=${CURRENT_COMP_SEASONS}&pageSize=100&page=${page}&altIds=true`,
		);
		if (!data) break;
		const info = data.pageInfo as Json | undefined;
		pages = Number(info?.numPages ?? 1);
		const rows = (data.content as Json[]) ?? [];
		all.push(...rows.map(normalizeFcbFixture));
		page++;
	}

	const byId = new Map(all.map((f) => [f.id, f]));
	return [...byId.values()]
		.filter((f) => f.competition === 'La Liga' || f.competition === 'UEFA Champions League')
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function fetchFcbFixtureById(fixtureId: string) {
	const detail = await fcbFetch(`/fixtures/${fixtureId}?altIds=true`);
	if (!detail) return null;
	return normalizeFcbFixture(detail);
}

export async function fetchRecentBarcaFixture() {
	const fixtures = await fetchFcbFixtures();
	const now = Date.now();
	const maxAgeMs = 48 * 60 * 60 * 1000;
	const preKickoffMs = 3 * 60 * 60 * 1000;

	let bestPast: (typeof fixtures)[0] | null = null;
	let bestPastMs = -Infinity;
	let bestAny: (typeof fixtures)[0] | null = null;
	let bestAnyMs = -Infinity;

	for (const f of fixtures) {
		const ms = new Date(`${f.date}T${f.time || '12:00:00'}Z`).getTime();
		if (Number.isNaN(ms)) continue;
		const elapsed = now - ms;
		if (elapsed < -preKickoffMs || elapsed > maxAgeMs) continue;

		if (f.kind === 'past' && ms > bestPastMs) {
			bestPastMs = ms;
			bestPast = f;
		}
		if (ms > bestAnyMs) {
			bestAnyMs = ms;
			bestAny = f;
		}
	}

	return bestPast ?? bestAny;
}

/** @deprecated Use fetchRecentBarcaFixture */
export async function fetchTodayBarcaFixture() {
	return fetchRecentBarcaFixture();
}

function playerFromLineupRow(raw: Json, flags: { starter: boolean }): FcbPlayer | null {
	const fcbId = Number(raw.id ?? 0);
	if (!fcbId) return null;
	const info = (raw.info as Json | undefined) ?? {};
	const posInfo = info.positionInfo;
	const position =
		typeof posInfo === 'string'
			? posInfo
			: String((posInfo as Json | undefined)?.description ?? info.position ?? raw.matchPosition ?? '');
	const nat = raw.nationalTeam as Json | undefined;
	const name = raw.name as Json | undefined;
	const birth = raw.birth as Json | undefined;
	const numberRaw = raw.matchShirtNumber ?? info.shirtNum;
	return {
		id: String(fcbId),
		fcbId,
		name: String(name?.display ?? ''),
		position,
		number: numberRaw != null ? String(Math.trunc(Number(numberRaw))) : '',
		nationality: String(nat?.country ?? ''),
		photo: '',
		birthDate: String((birth?.date as Json | undefined)?.label ?? ''),
		onLoan: Boolean(info.loan),
		inLastMatchXi: flags.starter,
		inLastMatchSquad: true,
	};
}

export async function fetchLastMatchSquad(): Promise<{ players: FcbPlayer[] } & SquadMeta> {
	const fixtures = await fetchFcbFixtures();
	const last = [...fixtures]
		.filter((f) => f.kind === 'past')
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

	if (!last) {
		const fallback = await fetchFcbFirstTeamSquad();
		return {
			...fallback,
			source: 'FC Barcelona first team (no finished match found)',
		};
	}

	const detail = await fcbFetch(`/fixtures/${last.id}?altIds=true`);
	const teamList = ((detail?.teamLists as Json[]) ?? []).find(
		(t) => t != null && Number(t.teamId) === BARCA_TEAM_ID,
	);
	if (!teamList) {
		const fallback = await fetchFcbFirstTeamSquad();
		return {
			...fallback,
			source: `FC Barcelona first team (lineup unavailable for ${last.opponent})`,
		};
	}

	const lineup = ((teamList.lineup as Json[]) ?? []).map((r) => playerFromLineupRow(r, { starter: true }));
	const subs = ((teamList.substitutes as Json[]) ?? []).map((r) => playerFromLineupRow(r, { starter: false }));
	const players = [...lineup, ...subs].filter(Boolean) as FcbPlayer[];

	return {
		players,
		coach: 'Hansi Flick',
		source: `Last match squad — vs ${last.opponent} (${last.date})`,
		lastMatch: {
			fixtureId: last.id,
			opponent: last.opponent,
			date: last.date,
			starters: lineup.length,
			subs: subs.length,
		},
	};
}

type LineupSquadPlayer = {
	id: string;
	fcbId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
};

export async function fetchFcbBarcaLineup(
	fixtureId: string,
	squad: LineupSquadPlayer[],
): Promise<{ starters: LineupSquadPlayer[]; bench: LineupSquadPlayer[] } | null> {
	const detail = await fcbFetch(`/fixtures/${fixtureId}?altIds=true`);
	const teamList = ((detail?.teamLists as Json[]) ?? []).find(
		(t) => t != null && Number(t.teamId) === BARCA_TEAM_ID,
	);
	if (!teamList) return null;

	const mapRow = (raw: Json, starter: boolean): LineupSquadPlayer | null => {
		const row = playerFromLineupRow(raw, { starter });
		if (!row) return null;
		const fromSquad = squad.find((p) => p.fcbId === row.fcbId || p.id === row.id);
		if (fromSquad) {
			return {
				...fromSquad,
				number: row.number || fromSquad.number,
				position: row.position || fromSquad.position,
			};
		}
		return row;
	};

	const starters = ((teamList.lineup as Json[]) ?? [])
		.map((r) => mapRow(r, true))
		.filter(Boolean) as LineupSquadPlayer[];
	const bench = ((teamList.substitutes as Json[]) ?? [])
		.map((r) => mapRow(r, false))
		.filter(Boolean) as LineupSquadPlayer[];

	if (starters.length < 8) return null;
	return { starters: starters.slice(0, 11), bench };
}

async function fetchFcbFirstTeamSquad(): Promise<{ players: FcbPlayer[]; coach: string }> {
	const html = await fetch(`${FCB_ORIGIN}/en/football/first-team/players`, {
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Culers/1.0)' },
	})
		.then((r) => (r.ok ? r.text() : ''))
		.catch(() => '');

	const ids = [...new Set((html.match(/\/en\/football\/first-team\/players\/(\d+)\//g) ?? []).map((m) => Number(m.match(/(\d+)/)?.[1])))].filter(
		Boolean,
	) as number[];

	const players: FcbPlayer[] = [];
	for (const fcbId of ids) {
		const raw = await fcbFetch(`/players/${fcbId}?altIds=true`);
		if (!raw) continue;
		const info = (raw.info as Json | undefined) ?? {};
		if (Boolean(info.loan)) continue;
		const posInfo = info.positionInfo;
		const position = typeof posInfo === 'string' ? posInfo : String((posInfo as Json)?.description ?? '');
		const name = raw.name as Json | undefined;
		const nat = raw.nationalTeam as Json | undefined;
		const birth = raw.birth as Json | undefined;
		players.push({
			id: String(fcbId),
			fcbId,
			name: String(name?.display ?? ''),
			position,
			number: info.shirtNum != null ? String(Math.trunc(Number(info.shirtNum))) : '',
			nationality: String(nat?.country ?? ''),
			photo: '',
			birthDate: String((birth?.date as Json | undefined)?.label ?? ''),
			onLoan: false,
			inLastMatchXi: false,
			inLastMatchSquad: false,
		});
	}

	return {
		players: players.sort((a, b) => {
			const an = Number(a.number) || 999;
			const bn = Number(b.number) || 999;
			if (an !== bn) return an - bn;
			return a.name.localeCompare(b.name);
		}),
		coach: 'Hansi Flick',
	};
}

export async function fetchFcbSquad(): Promise<{ players: FcbPlayer[]; coach: string; source?: string; lastMatch?: SquadMeta['lastMatch'] }> {
	const [firstTeam, lastMatch] = await Promise.all([
		fetchFcbFirstTeamSquad().catch(() => null),
		fetchLastMatchSquad().catch(() => null),
	]);

	const roster = firstTeam?.players?.length ? firstTeam.players : lastMatch?.players ?? [];
	if (!roster.length) {
		return { players: [], coach: 'Hansi Flick', source: 'FC Barcelona squad unavailable' };
	}

	const lastById = new Map((lastMatch?.players ?? []).map((p) => [p.fcbId, p]));
	const players: FcbPlayer[] = roster.map((p) => {
		const last = lastById.get(p.fcbId);
		if (!last) return { ...p, inLastMatchXi: false, inLastMatchSquad: false };
		return {
			...p,
			number: p.number || last.number,
			position: p.position || last.position,
			inLastMatchXi: Boolean(last.inLastMatchXi),
			inLastMatchSquad: Boolean(last.inLastMatchSquad),
		};
	});

	// Include anyone from last match who is missing from the scraped first-team page
	for (const last of lastMatch?.players ?? []) {
		if (!players.some((p) => p.fcbId === last.fcbId)) {
			players.push({
				...last,
				inLastMatchXi: Boolean(last.inLastMatchXi),
				inLastMatchSquad: Boolean(last.inLastMatchSquad),
			});
		}
	}

	players.sort((a, b) => {
		const an = Number(a.number) || 999;
		const bn = Number(b.number) || 999;
		if (an !== bn) return an - bn;
		return a.name.localeCompare(b.name);
	});

	const source = firstTeam?.players?.length
		? `FC Barcelona official first team${lastMatch?.lastMatch ? ` · last match vs ${lastMatch.lastMatch.opponent}` : ''}`
		: lastMatch?.source ?? 'FC Barcelona squad';

	return {
		players,
		coach: firstTeam?.coach ?? lastMatch?.coach ?? 'Hansi Flick',
		source,
		lastMatch: lastMatch?.lastMatch,
	};
}

const STAT_LABELS: Record<string, string> = {
	appearances: 'Appearances',
	game_started: 'Starts',
	goals: 'Goals',
	goal_assist: 'Assists',
	assists: 'Assists',
	mins_played: 'Minutes',
	yellow_card: 'Yellow cards',
	red_card: 'Red cards',
	total_pass: 'Passes',
	accurate_pass: 'Accurate passes',
	touches: 'Touches',
	total_tackle: 'Tackles',
	total_scoring_att: 'Shots',
	ontarget_scoring_att: 'Shots on target',
	saves: 'Saves',
	clean_sheet: 'Clean sheets',
};

const PLAYER_MATCH_STAT_KEYS = [
	'mins_played',
	'goals',
	'goal_assist',
	'total_scoring_att',
	'ontarget_scoring_att',
	'total_pass',
	'accurate_pass',
	'touches',
	'total_tackle',
	'yellow_card',
	'red_card',
	'saves',
];

function statsToRows(raw: Record<string, number>, keys: string[]) {
	return keys.map((k) => {
		const v = raw[k];
		const has = v != null && v > 0;
		return {
			key: k,
			label: STAT_LABELS[k] ?? k.replaceAll('_', ' '),
			value: has ? v : '—',
			available: has,
		};
	});
}

function pickStatMap(data: Json | null) {
	const stats = (data?.stats as Json[]) ?? [];
	const map: Record<string, number> = {};
	for (const s of stats) {
		const key = String(s.name ?? '');
		if (key) map[key] = Number(s.value ?? 0);
	}
	return map;
}

export async function fetchFcbPlayerMatchStats(fcbId: number, fixtureId: string) {
	const [matchData, fixtureDetail] = await Promise.all([
		fcbFetch(`/stats/player/${fcbId}?fixtures=${fixtureId}&altIds=true`),
		fcbFetch(`/fixtures/${fixtureId}?altIds=true`),
	]);

	const entity = matchData?.entity as Json | undefined;
	const name = String((entity?.name as Json)?.display ?? 'Player');
	const info = (entity?.info as Json | undefined) ?? {};
	const posInfo = info.positionInfo;
	const position = typeof posInfo === 'string' ? posInfo : String(posInfo ?? '');
	const number = info.shirtNum != null ? String(Math.trunc(Number(info.shirtNum))) : '';

	const teams = (fixtureDetail?.teams as Json[]) ?? [];
	const isHome = String((teams[0]?.team as Json | undefined)?.shortName ?? '').toLowerCase().includes('barcelona');
	const opponent = isHome
		? String((teams[1]?.team as Json | undefined)?.shortName ?? 'Opponent')
		: String((teams[0]?.team as Json | undefined)?.shortName ?? 'Opponent');
	const clock = String((fixtureDetail?.clock as Json | undefined)?.label ?? '');

	const raw = pickStatMap(matchData);
	return {
		fcbId,
		fixtureId,
		name,
		position,
		number,
		opponent,
		clock: clock || undefined,
		stats: statsToRows(raw, PLAYER_MATCH_STAT_KEYS),
		fetchedAt: new Date().toISOString(),
		source: 'FC Barcelona official — live match stats (Opta / api-fcb.pulselive.com)',
	};
}

export async function fetchFcbLiveSnapshot() {
	const fixtures = await fetchFcbFixtures();
	const liveFixture = fixtures.find((f) => f.status === 'Live');
	if (!liveFixture) return null;

	const detail = await fcbFetch(`/fixtures/${liveFixture.id}?altIds=true`);
	if (!detail) return { fixture: liveFixture, events: [] as TimelineEvent[], clock: 'LIVE' };

	const teams = (detail.teams as Json[]) ?? [];
	const homeTeamId = Number((teams[0]?.team as Json | undefined)?.id ?? teams[0]?.teamId ?? 0);
	const awayTeamId = Number((teams[1]?.team as Json | undefined)?.id ?? teams[1]?.teamId ?? 0);
	const teamSide = new Map<number, 'home' | 'away'>([
		[homeTeamId, 'home'],
		[awayTeamId, 'away'],
	]);

	const people = new Map<number, string>();
	for (const tl of (detail.teamLists as Json[]) ?? []) {
		if (!tl) continue;
		for (const p of [...((tl.lineup as Json[]) ?? []), ...((tl.substitutes as Json[]) ?? [])]) {
			people.set(Number(p.id), String((p.name as Json | undefined)?.display ?? ''));
		}
	}

	type TimelineEvent = {
		minute: string;
		type: string;
		player: string;
		team: string;
		detail: string;
		homeScore: number | null;
		awayScore: number | null;
	};

	const events: TimelineEvent[] = [];
	for (const raw of (detail.events as Json[]) ?? []) {
		const typeCode = String(raw.type ?? '');
		if (!['G', 'B', 'S'].includes(typeCode)) continue;
		const tid = Number(raw.teamId ?? 0);
		const side = teamSide.get(tid) ?? 'home';
		const teamName =
			side === 'home'
				? String((teams[0]?.team as Json | undefined)?.shortName ?? 'Home')
				: String((teams[1]?.team as Json | undefined)?.shortName ?? 'Away');
		const minute =
			String((raw.clock as Json | undefined)?.label ?? '')
				.replace("'00", "'")
				.replace(/^0+/, '') || '?';
		const player = people.get(Number(raw.personId)) ?? 'Unknown';
		const score = raw.score as Json | undefined;

		if (typeCode === 'G') {
			events.push({
				minute,
				type: 'Goal',
				player,
				team: teamName,
				detail: 'Goal',
				homeScore: score?.homeScore != null ? Number(score.homeScore) : null,
				awayScore: score?.awayScore != null ? Number(score.awayScore) : null,
			});
		} else if (typeCode === 'B') {
			const card = String(raw.description ?? 'Y').toUpperCase();
			events.push({
				minute,
				type: card.startsWith('R') ? 'Red card' : 'Yellow card',
				player,
				team: teamName,
				detail: card.startsWith('R') ? 'Red card' : 'Yellow card',
				homeScore: null,
				awayScore: null,
			});
		} else if (typeCode === 'S') {
			const subType = String(raw.description ?? '');
			events.push({
				minute,
				type: 'Substitution',
				player,
				team: teamName,
				detail: subType === 'ON' ? 'On' : subType === 'OFF' ? 'Off' : subType,
				homeScore: null,
				awayScore: null,
			});
		}
	}

	const homeScore = teams[0]?.score != null ? Number(teams[0].score) : liveFixture.homeScore;
	const awayScore = teams[1]?.score != null ? Number(teams[1].score) : liveFixture.awayScore;
	const clock = String((detail.clock as Json | undefined)?.label ?? 'LIVE');

	return {
		fixture: {
			...liveFixture,
			homeScore,
			awayScore,
			status: 'Live',
			kind: 'live' as const,
		},
		events,
		clock,
	};
}

export async function fetchFcbPlayerStats(fcbId: number) {
	const [seasonData, careerData] = await Promise.all([
		fcbFetch(`/stats/player/${fcbId}?compSeasons=${LA_LIGA_COMP_SEASON}&teams=${BARCA_TEAM_ID}&altIds=true`),
		fcbFetch(`/stats/player/${fcbId}?teams=${BARCA_TEAM_ID}&altIds=true`),
	]);

	const entity = (seasonData?.entity ?? careerData?.entity) as Json | undefined;
	const name = String((entity?.name as Json)?.display ?? 'Player');
	const posInfo = (entity?.info as Json)?.positionInfo;
	const position = typeof posInfo === 'string' ? posInfo : String(posInfo ?? '');
	const number =
		(entity?.info as Json)?.shirtNum != null ? String(Math.trunc(Number((entity?.info as Json).shirtNum))) : '';

	const pick = (data: Json | null) => {
		const stats = (data?.stats as Json[]) ?? [];
		const map: Record<string, number> = {};
		for (const s of stats) {
			const key = String(s.name ?? '');
			if (key) map[key] = Number(s.value ?? 0);
		}
		return map;
	};

	const seasonRaw = pick(seasonData);
	const careerRaw = pick(careerData);

	const highlightKeys = [
		'appearances',
		'game_started',
		'goals',
		'goal_assist',
		'mins_played',
		'yellow_card',
		'red_card',
		'total_scoring_att',
		'ontarget_scoring_att',
		'total_pass',
		'accurate_pass',
		'touches',
		'total_tackle',
		'saves',
		'clean_sheet',
	];

	const toRows = (raw: Record<string, number>) =>
		highlightKeys.map((k) => {
			const has = raw[k] != null && raw[k] > 0;
			return {
				key: k,
				label: STAT_LABELS[k] ?? k.replaceAll('_', ' '),
				value: has ? raw[k] : '—',
				available: has,
			};
		});

	return {
		fcbId,
		name,
		position,
		number,
		seasonLabel: '2026/27',
		season: toRows(seasonRaw),
		career: toRows(careerRaw),
		source: 'FC Barcelona official — Barça-only stats (api-fcb.pulselive.com / Opta)',
	};
}

export { LA_LIGA_COMP_SEASON, UCL_COMP_SEASON, CURRENT_COMP_SEASONS };

const MATCH_STAT_LABELS: Record<string, string> = {
	possession_percentage: 'Possession %',
	total_scoring_att: 'Shots',
	ontarget_scoring_att: 'Shots on target',
	total_pass: 'Passes',
	accurate_pass: 'Accurate passes',
	won_corners: 'Corners',
	fk_foul_lost: 'Fouls',
	total_yel_card: 'Yellow cards',
	total_red_card: 'Red cards',
	total_tackle: 'Tackles',
	total_offside: 'Offsides',
	touches: 'Touches',
	saves: 'Saves',
};

const MATCH_STAT_KEYS = Object.keys(MATCH_STAT_LABELS);

function lineupPlayerFromRow(raw: Json): { id: string; name: string; number: string; position: string } {
	const info = (raw.info as Json | undefined) ?? {};
	const posInfo = info.positionInfo;
	const position =
		typeof posInfo === 'string'
			? posInfo
			: String((posInfo as Json | undefined)?.description ?? info.position ?? raw.matchPosition ?? '');
	const name = raw.name as Json | undefined;
	const numberRaw = raw.matchShirtNumber ?? info.shirtNum;
	return {
		id: String(raw.id ?? ''),
		name: String(name?.display ?? ''),
		number: numberRaw != null ? String(Math.trunc(Number(numberRaw))) : '',
		position,
	};
}

function statMapFromMatchData(rows: Json[]): Record<string, number> {
	const map: Record<string, number> = {};
	for (const row of rows) {
		const key = String(row.name ?? '');
		if (key) map[key] = Number(row.value ?? 0);
	}
	return map;
}

type FcbMatchExtras = {
	homeTeam: string;
	awayTeam: string;
	homeTeamId: number;
	awayTeamId: number;
	events: Array<{
		minute: string;
		type: 'goal' | 'yellow' | 'red' | 'sub';
		player: string;
		assist?: string;
		team: 'home' | 'away';
		detail?: string;
	}>;
	lineups: {
		home: { starters: ReturnType<typeof lineupPlayerFromRow>[]; subs: ReturnType<typeof lineupPlayerFromRow>[] };
		away: { starters: ReturnType<typeof lineupPlayerFromRow>[]; subs: ReturnType<typeof lineupPlayerFromRow>[] };
	};
};

async function fetchFcbMatchExtras(fixtureId: string): Promise<FcbMatchExtras | null> {
	const detail = await fcbFetch(`/fixtures/${fixtureId}?altIds=true`);
	if (!detail) return null;

	const teams = (detail.teams as Json[]) ?? [];
	const homeMeta = teams[0]?.team as Json | undefined;
	const awayMeta = teams[1]?.team as Json | undefined;
	const homeTeam = String(homeMeta?.shortName ?? homeMeta?.name ?? 'Home');
	const awayTeam = String(awayMeta?.shortName ?? awayMeta?.name ?? 'Away');
	const homeTeamId = Number(homeMeta?.id ?? teams[0]?.teamId ?? 0);
	const awayTeamId = Number(awayMeta?.id ?? teams[1]?.teamId ?? 0);

	const people = new Map<number, string>();
	const teamSide = new Map<number, 'home' | 'away'>();
	teamSide.set(homeTeamId, 'home');
	teamSide.set(awayTeamId, 'away');

	const lineups: FcbMatchExtras['lineups'] = {
		home: { starters: [], subs: [] },
		away: { starters: [], subs: [] },
	};

	for (const tl of (detail.teamLists as Json[]) ?? []) {
		if (!tl) continue;
		const tid = Number(tl.teamId ?? 0);
		const side = teamSide.get(tid) ?? (tid === homeTeamId ? 'home' : 'away');
		const bucket = lineups[side];
		for (const p of (tl.lineup as Json[]) ?? []) {
			const row = lineupPlayerFromRow(p);
			people.set(Number(p.id), row.name);
			bucket.starters.push(row);
		}
		for (const p of (tl.substitutes as Json[]) ?? []) {
			const row = lineupPlayerFromRow(p);
			people.set(Number(p.id), row.name);
			bucket.subs.push(row);
		}
	}

	const events: FcbMatchExtras['events'] = [];
	for (const raw of (detail.events as Json[]) ?? []) {
		const typeCode = String(raw.type ?? '');
		if (!['G', 'B', 'S'].includes(typeCode)) continue;
		const tid = Number(raw.teamId ?? 0);
		const side = teamSide.get(tid) ?? (tid === homeTeamId ? 'home' : 'away');
		const minute = String((raw.clock as Json | undefined)?.label ?? '').replace("'00", "'").replace(/^0+/, '') || '?';
		const player = people.get(Number(raw.personId)) ?? 'Unknown';
		const assist = raw.assistId ? people.get(Number(raw.assistId)) : undefined;

		if (typeCode === 'G') {
			events.push({ minute, type: 'goal', player, assist, team: side });
		} else if (typeCode === 'B') {
			const card = String(raw.description ?? 'Y').toUpperCase();
			events.push({ minute, type: card.startsWith('R') ? 'red' : 'yellow', player, team: side });
		} else if (typeCode === 'S') {
			const subType = String(raw.description ?? '');
			events.push({
				minute,
				type: 'sub',
				player,
				team: side,
				detail: subType === 'ON' ? 'On' : subType === 'OFF' ? 'Off' : subType,
			});
		}
	}

	return { homeTeam, awayTeam, homeTeamId, awayTeamId, events, lineups };
}

function teamLineupFromExtras(extras: FcbMatchExtras, teamId: number) {
	if (teamId === extras.homeTeamId) return extras.lineups.home;
	if (teamId === extras.awayTeamId) return extras.lineups.away;
	return { starters: [], subs: [] };
}

export async function fetchFcbMatchSummary(fixtureId: string) {
	const [detail, statsRaw] = await Promise.all([
		fcbFetch(`/fixtures/${fixtureId}?altIds=true`),
		fcbFetch(`/stats/match/${fixtureId}?altIds=true`),
	]);

	if (!detail) throw new Error('Fixture not found');

	const teams = (detail.teams as Json[]) ?? [];
	const homeMeta = teams[0]?.team as Json | undefined;
	const awayMeta = teams[1]?.team as Json | undefined;
	const homeTeam = String(homeMeta?.shortName ?? homeMeta?.name ?? 'Home');
	const awayTeam = String(awayMeta?.shortName ?? awayMeta?.name ?? 'Away');
	const compSeason = ((detail.gameweek as Json)?.compSeason as Json) ?? {};
	const competition = String((compSeason.competition as Json)?.description ?? 'Unknown');

	const [homeBadge, awayBadge] = await Promise.all([
		fetchTeamBadge(homeTeam, competition),
		fetchTeamBadge(awayTeam, competition),
	]);
	const homeScore = Number(teams[0]?.score ?? 0);
	const awayScore = Number(teams[1]?.score ?? 0);
	const homeTeamId = Number(homeMeta?.id ?? teams[0]?.teamId ?? 0);
	const awayTeamId = Number(awayMeta?.id ?? teams[1]?.teamId ?? 0);

	const ms = kickoffMillis(detail);
	const dateObj = ms ? new Date(ms) : null;
	const date = dateObj ? dateObj.toISOString().slice(0, 10) : '';
	const time = dateObj ? dateObj.toISOString().slice(11, 19) : '';
	const ground = detail.ground as Json | undefined;
	const attendance = detail.attendance != null ? Number(detail.attendance) : undefined;

	const extras = await fetchFcbMatchExtras(fixtureId);
	const lineups = extras?.lineups ?? {
		home: { starters: [], subs: [] },
		away: { starters: [], subs: [] },
	};
	const events = extras?.events ?? [];

	const dataBlock = (statsRaw?.data as Json | undefined) ?? {};
	const homeStats = statMapFromMatchData(((dataBlock[String(homeTeamId)] as Json)?.M as Json[]) ?? []);
	const awayStats = statMapFromMatchData(((dataBlock[String(awayTeamId)] as Json)?.M as Json[]) ?? []);

	const stats = MATCH_STAT_KEYS.map((key) => {
		const hv = homeStats[key];
		const av = awayStats[key];
		const has = hv != null || av != null;
		let value: string | number = '—';
		if (key === 'possession_percentage' && hv != null && av != null) {
			value = `${hv} · ${av}`;
		} else if (has) {
			value = `${hv ?? 0} · ${av ?? 0}`;
		}
		return {
			key,
			label: MATCH_STAT_LABELS[key] ?? key,
			value,
			available: has,
		};
	});

	const venueName = String(ground?.name ?? '');
	const groundId = ground?.id != null ? Number(ground.id) : undefined;
	const altIds = detail.altIds as Json | undefined;
	const optaId = String(altIds?.opta ?? '');

	const backgroundImage = await fetchStadiumBackground({
		fixtureId,
		venueName,
		groundId,
		optaId,
		homeTeam,
		awayTeam,
	});

	return {
		fixtureId,
		homeTeam,
		awayTeam,
		homeScore,
		awayScore,
		date,
		time,
		competition,
		venue: venueName,
		attendance,
		homeCrest: homeBadge,
		awayCrest: awayBadge,
		backgroundImage,
		stats,
		events,
		lineups,
		source: 'FC Barcelona official — fixtures, lineups, events & Opta match stats (api-fcb.pulselive.com)',
	};
}

type FcbFixture = ReturnType<typeof normalizeFcbFixture>;

type TeamMatchRef = {
	id: string;
	homeTeam: string;
	awayTeam: string;
	isHome: boolean;
	opponent: string;
	date: string;
	time: string;
	homeScore: number | null;
	awayScore: number | null;
};

function normalizeFcbFixtureForTeam(raw: Json, teamId: number): TeamMatchRef {
	const teams = (raw.teams as Json[]) ?? [];
	const home = teams[0]?.team as Json | undefined;
	const away = teams[1]?.team as Json | undefined;
	const homeId = Number(home?.id ?? teams[0]?.teamId ?? 0);
	const homeName = String(home?.shortName ?? home?.name ?? '');
	const awayName = String(away?.shortName ?? away?.name ?? '');
	const isHome = homeId === teamId;
	const opponent = isHome ? awayName : homeName;
	const ms = kickoffMillis(raw);
	const dateObj = ms ? new Date(ms) : null;
	return {
		id: String(raw.id ?? `${homeName}-${awayName}`),
		homeTeam: homeName,
		awayTeam: awayName,
		isHome,
		opponent,
		date: dateObj ? dateObj.toISOString().slice(0, 10) : '',
		time: dateObj ? dateObj.toISOString().slice(11, 19) : '',
		homeScore: teams[0]?.score != null ? Number(teams[0].score) : null,
		awayScore: teams[1]?.score != null ? Number(teams[1].score) : null,
	};
}

async function fetchLastFinishedMatchForTeam(teamId: number, excludeFixtureId?: string) {
	let page = 0;
	let pages = 1;
	const finished: TeamMatchRef[] = [];

	while (page < pages) {
		const data = await fcbFetch(
			`/fixtures?teams=${teamId}&compSeasons=${CURRENT_COMP_SEASONS}&pageSize=100&page=${page}&altIds=true`,
		);
		if (!data) break;
		pages = Number((data.pageInfo as Json)?.numPages ?? 1);
		for (const raw of (data.content as Json[]) ?? []) {
			if (String(raw.status ?? '') !== 'C') continue;
			const ref = normalizeFcbFixtureForTeam(raw, teamId);
			if (excludeFixtureId && ref.id === excludeFixtureId) continue;
			finished.push(ref);
		}
		page++;
	}

	const sorted = finished.sort((a, b) => {
		const ad = new Date(`${a.date}T${a.time || '12:00:00'}`).getTime();
		const bd = new Date(`${b.date}T${b.time || '12:00:00'}`).getTime();
		return bd - ad;
	});

	for (const ref of sorted) {
		const stats = await teamStatsForFixture(ref.id, teamId);
		if (Object.keys(stats).length > 0) {
			return { ref, stats };
		}
	}

	const fallback = sorted[0] ?? null;
	return fallback ? { ref: fallback, stats: await teamStatsForFixture(fallback.id, teamId) } : null;
}

function barcaFixtureToRef(fixture: FcbFixture): TeamMatchRef {
	return {
		id: fixture.id,
		homeTeam: fixture.homeTeam,
		awayTeam: fixture.awayTeam,
		isHome: fixture.isHome,
		opponent: fixture.opponent,
		date: fixture.date,
		time: fixture.time,
		homeScore: fixture.homeScore,
		awayScore: fixture.awayScore,
	};
}

function teamMatchesFixture(fixture: FcbFixture, teamLabel: string) {
	const key = normalizeTeamKey(teamLabel);
	const names = [fixture.homeTeam, fixture.awayTeam, fixture.opponent].map(normalizeTeamKey);
	if (key.includes('barcelona') || key === 'barca') {
		return names.some((n) => n.includes('barcelona') || n.includes('barca'));
	}
	const token = key.split(' ').filter(Boolean).pop() ?? key;
	return names.some((n) => n.includes(key) || n.includes(token) || key.includes(n));
}

function findLastFinishedMatch(fixtures: FcbFixture[], teamLabel: string, excludeId?: string) {
	return (
		[...fixtures]
			.filter((f) => f.kind === 'past' && f.id !== excludeId)
			.filter((f) => teamMatchesFixture(f, teamLabel))
			.sort((a, b) => {
				const ad = new Date(`${a.date}T${a.time || '12:00:00'}`).getTime();
				const bd = new Date(`${b.date}T${b.time || '12:00:00'}`).getTime();
				return bd - ad;
			})[0] ?? null
	);
}

async function teamStatsForFixture(fixtureId: string, teamId: number) {
	const statsRaw = await fcbFetch(`/stats/match/${fixtureId}?altIds=true`);
	const rows = ((statsRaw?.data as Json | undefined)?.[String(teamId)] as Json | undefined)?.M as Json[] | undefined;
	return statMapFromMatchData(rows ?? []);
}

function buildCompareStats(homeStats: Record<string, number>, awayStats: Record<string, number>) {
	return MATCH_STAT_KEYS.map((key) => {
		const hv = homeStats[key];
		const av = awayStats[key];
		const has = hv != null || av != null;
		let value: string | number = '—';
		if (key === 'possession_percentage' && hv != null && av != null) {
			value = `${hv} · ${av}`;
		} else if (has) {
			value = `${hv ?? 0} · ${av ?? 0}`;
		}
		return {
			key,
			label: MATCH_STAT_LABELS[key] ?? key,
			value,
			available: has,
		};
	});
}

function referenceLabel(match: TeamMatchRef, live: boolean) {
	const side = match.isHome ? 'vs' : '@';
	const score =
		match.homeScore != null && match.awayScore != null
			? ` (${match.isHome ? match.homeScore : match.awayScore}–${match.isHome ? match.awayScore : match.homeScore})`
			: '';
	return live ? `Live ${side} ${match.opponent}${score}` : `Last match ${side} ${match.opponent}${score}`;
}

function sofaPreviewToTeamRef(sofa: import('./culers-sofascore.ts').SofaPreviewMatch): TeamMatchRef {
	return {
		id: String(sofa.eventId),
		homeTeam: sofa.homeTeam,
		awayTeam: sofa.awayTeam,
		isHome: sofa.isHome,
		opponent: sofa.opponent,
		date: sofa.date,
		time: sofa.time,
		homeScore: sofa.homeScore,
		awayScore: sofa.awayScore,
	};
}

function statsHaveValues(stats: Record<string, number>) {
	return Object.values(stats).some((v) => v > 0);
}

export async function fetchFcbFixturePreview(
	targetFixtureId: string,
	allFixtures: FcbFixture[],
	liveBarcaFixtureId?: string | null,
) {
	const detail = await fcbFetch(`/fixtures/${targetFixtureId}?altIds=true`);
	if (!detail) throw new Error('Fixture not found');

	const teams = (detail.teams as Json[]) ?? [];
	const homeMeta = teams[0]?.team as Json | undefined;
	const awayMeta = teams[1]?.team as Json | undefined;
	const homeTeam = String(homeMeta?.shortName ?? homeMeta?.name ?? 'Home');
	const awayTeam = String(awayMeta?.shortName ?? awayMeta?.name ?? 'Away');
	const isBarcaHome = homeTeam.toLowerCase().includes('barcelona');
	const barcaTeamId = BARCA_TEAM_ID;
	const opponentTeamId = Number((isBarcaHome ? awayMeta : homeMeta)?.id ?? 0);

	const compSeason = ((detail.gameweek as Json)?.compSeason as Json) ?? {};
	const competition = String((compSeason.competition as Json)?.description ?? 'Unknown');

	const [homeBadge, awayBadge] = await Promise.all([
		fetchTeamBadge(homeTeam, competition),
		fetchTeamBadge(awayTeam, competition),
	]);

	const ms = kickoffMillis(detail);
	const dateObj = ms ? new Date(ms) : null;
	const date = dateObj ? dateObj.toISOString().slice(0, 10) : '';
	const time = dateObj ? dateObj.toISOString().slice(11, 19) : '';
	const ground = detail.ground as Json | undefined;
	const venueName = String(ground?.name ?? '');

	let barcaRef: TeamMatchRef | null = null;
	let barcaLive = false;
	if (liveBarcaFixtureId) {
		const liveFixture = allFixtures.find((f) => f.id === liveBarcaFixtureId) ?? null;
		if (liveFixture) {
			barcaRef = barcaFixtureToRef(liveFixture);
			barcaLive = true;
		}
	}
	if (!barcaRef) {
		const lastBarca = findLastFinishedMatch(allFixtures, 'barcelona', targetFixtureId);
		if (lastBarca) {
			barcaRef = barcaFixtureToRef(lastBarca);
		} else {
			const fetched = await fetchLastFinishedMatchForTeam(barcaTeamId, targetFixtureId);
			barcaRef = fetched?.ref ?? null;
		}
	}

	if (!opponentTeamId) {
		throw new Error('Could not resolve opponent team id');
	}

	const opponentName = isBarcaHome ? awayTeam : homeTeam;
	const opponentSofaId = resolveSofaScoreTeamId(opponentName);

	const [oppFetched, barcaStats, barcaExtras] = await Promise.all([
		fetchLastFinishedMatchForTeam(opponentTeamId, targetFixtureId),
		barcaRef ? teamStatsForFixture(barcaRef.id, barcaTeamId) : Promise.resolve({}),
		barcaRef ? fetchFcbMatchExtras(barcaRef.id) : Promise.resolve(null),
	]);

	const oppSofa =
		opponentSofaId && oppFetched?.ref
			? await fetchSofaScorePreviewMatch(opponentSofaId, {
					opponent: oppFetched.ref.opponent,
					date: oppFetched.ref.date,
				})
			: opponentSofaId
				? await fetchSofaScorePreviewMatch(opponentSofaId)
				: null;

	let oppRef = oppFetched?.ref ?? null;
	if (!oppRef && oppSofa) {
		oppRef = sofaPreviewToTeamRef(oppSofa);
	}

	if (!barcaRef) {
		throw new Error('Not enough recent matches to build a preview');
	}
	if (!oppRef && !oppSofa) {
		throw new Error('Not enough recent matches to build a preview');
	}

	const oppStatsFromFcb = oppFetched?.stats ?? {};

	let resolvedOppStats =
		oppSofa?.stats && statsHaveValues(oppSofa.stats)
			? oppSofa.stats
			: statsHaveValues(oppStatsFromFcb)
				? oppStatsFromFcb
				: {};

	const barcaSideTeamId = barcaTeamId;
	const oppSideTeamId = opponentTeamId;

	let previewHomeEvents: FcbMatchExtras['events'] = [];
	let previewAwayEvents: FcbMatchExtras['events'] = [];
	let previewHomeMatchTeams: { home: string; away: string } | undefined;
	let previewAwayMatchTeams: { home: string; away: string } | undefined;
	let homePreviewLineup = { starters: [] as ReturnType<typeof lineupPlayerFromRow>[], subs: [] as ReturnType<typeof lineupPlayerFromRow>[] };
	let awayPreviewLineup = { starters: [] as ReturnType<typeof lineupPlayerFromRow>[], subs: [] as ReturnType<typeof lineupPlayerFromRow>[] };

	if (barcaExtras) {
		const barcaLineup = teamLineupFromExtras(barcaExtras, barcaSideTeamId);
		const barcaEvents = barcaExtras.events;
		const barcaMatchTeams = { home: barcaExtras.homeTeam, away: barcaExtras.awayTeam };
		if (isBarcaHome) {
			homePreviewLineup = barcaLineup;
			previewHomeEvents = barcaEvents;
			previewHomeMatchTeams = barcaMatchTeams;
		} else {
			awayPreviewLineup = barcaLineup;
			previewAwayEvents = barcaEvents;
			previewAwayMatchTeams = barcaMatchTeams;
		}
	}

	if (oppSofa) {
		const oppLineup = oppSofa.lineups;
		const oppEvents = oppSofa.events;
		const oppMatchTeams = { home: oppSofa.homeTeam, away: oppSofa.awayTeam };
		if (isBarcaHome) {
			awayPreviewLineup = oppLineup;
			previewAwayEvents = oppEvents;
			previewAwayMatchTeams = oppMatchTeams;
		} else {
			homePreviewLineup = oppLineup;
			previewHomeEvents = oppEvents;
			previewHomeMatchTeams = oppMatchTeams;
		}
	} else if (oppRef && statsHaveValues(resolvedOppStats)) {
		const oppExtras = await fetchFcbMatchExtras(oppRef.id);
		if (oppExtras) {
			const oppLineup = teamLineupFromExtras(oppExtras, oppSideTeamId);
			const oppMatchTeams = { home: oppExtras.homeTeam, away: oppExtras.awayTeam };
			if (isBarcaHome) {
				awayPreviewLineup = oppLineup;
				previewAwayEvents = oppExtras.events;
				previewAwayMatchTeams = oppMatchTeams;
			} else {
				homePreviewLineup = oppLineup;
				previewHomeEvents = oppExtras.events;
				previewHomeMatchTeams = oppMatchTeams;
			}
		}
	}

	const homeStats = isBarcaHome ? barcaStats : resolvedOppStats;
	const awayStats = isBarcaHome ? resolvedOppStats : barcaStats;
	const oppRefForLabel = oppRef ?? (oppSofa ? sofaPreviewToTeamRef(oppSofa) : null);
	const previewHomeNote = isBarcaHome ? referenceLabel(barcaRef, barcaLive) : oppRefForLabel ? referenceLabel(oppRefForLabel, false) : '';
	const previewAwayNote = isBarcaHome ? (oppRefForLabel ? referenceLabel(oppRefForLabel, false) : '') : referenceLabel(barcaRef, barcaLive);

	const backgroundImage = await fetchStadiumBackground({
		fixtureId: targetFixtureId,
		venueName,
		groundId: ground?.id != null ? Number(ground.id) : undefined,
		optaId: String((detail.altIds as Json | undefined)?.opta ?? ''),
		homeTeam,
		awayTeam,
	});

	return {
		fixtureId: targetFixtureId,
		preview: true,
		previewHomeNote,
		previewAwayNote,
		homeTeam,
		awayTeam,
		homeScore: 0,
		awayScore: 0,
		date,
		time,
		competition,
		venue: venueName,
		homeCrest: homeBadge,
		awayCrest: awayBadge,
		backgroundImage,
		stats: buildCompareStats(homeStats, awayStats),
		events: [],
		lineups: {
			home: homePreviewLineup,
			away: awayPreviewLineup,
		},
		previewHomeEvents,
		previewAwayEvents,
		previewHomeMatchTeams,
		previewAwayMatchTeams,
		source: 'Preview — Opta stats from each team’s latest match (Barça uses live data when a match is in progress). Opponent stats via SofaScore when not on FCB feed.',
	};
}
