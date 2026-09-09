import {
	SOFASCORE_BARCA_TEAM_ID,
	fetchSofaScoreEventById,
	fetchSofaScoreEventIncidents,
	fetchSofaScoreLiveFootballEvents,
	fetchSofaScoreScheduledFootball,
	fetchSofaScoreTeamEventsRaw,
	sofaScoreReachable,
	resetSofaScoreReachable,
} from './culers-sofascore.ts';

type Json = Record<string, unknown>;

export type LiveBoardGroupId = 'ucl' | 'uel' | 'europe' | 'mls' | 'international';

export type LiveBoardMatch = {
	id: number;
	homeTeam: string;
	awayTeam: string;
	homeScore: number | null;
	awayScore: number | null;
	competition: string;
	group: LiveBoardGroupId;
	clock: string;
	status: string;
	venue: string;
	startTimestamp: number;
};

export type LiveBoardHub = {
	groups: Array<{
		id: LiveBoardGroupId;
		label: string;
		matches: LiveBoardMatch[];
	}>;
	history: Array<{
		id: LiveBoardGroupId;
		label: string;
		matches: LiveBoardMatch[];
	}>;
	fetchedAt: string;
	source: string;
	note?: string;
};

export type LiveBoardDetail = {
	match: LiveBoardMatch;
	events: Array<{
		minute: string;
		type: string;
		player: string;
		team: string;
		detail: string;
		homeScore: number | null;
		awayScore: number | null;
	}>;
	clock: string;
	fetchedAt: string;
};

/** Top European leagues (uniqueTournament ids). */
const EUROPE_LEAGUE_IDS = new Set([
	8, // LaLiga
	17, // Premier League
	35, // Bundesliga
	23, // Serie A
	34, // Ligue 1
	37, // Eredivisie
	238, // Liga Portugal
	38, // Belgian Pro League
	52, // Super Lig
	36, // Scottish Premiership
	18, // Championship
	215, // Swiss Super League
]);

const UCL_IDS = new Set([7, 465, 1331]);
const UEL_IDS = new Set([679, 17015, 17016]);
const MLS_IDS = new Set([242]);

const GROUP_ORDER: LiveBoardGroupId[] = ['ucl', 'uel', 'europe', 'mls', 'international'];
const GROUP_LABEL: Record<LiveBoardGroupId, string> = {
	ucl: 'UEFA Champions League',
	uel: 'Europa League & Conference',
	europe: 'European leagues',
	mls: 'MLS',
	international: 'International',
};

function uniqueId(raw: Json): number {
	const tournament = raw.tournament as Json | undefined;
	const unique = (tournament?.uniqueTournament as Json | undefined) ?? tournament;
	return Number(unique?.id ?? 0);
}

function competitionName(raw: Json): string {
	const tournament = raw.tournament as Json | undefined;
	const unique = tournament?.uniqueTournament as Json | undefined;
	return String(unique?.name ?? tournament?.name ?? '');
}

export function classifyCompetition(comp: string, uniqueTournamentId = 0): LiveBoardGroupId | null {
	const name = comp.trim();
	if (UCL_IDS.has(uniqueTournamentId) || (/champions league/i.test(name) && !/youth|women|femenin|femenil/i.test(name))) {
		return 'ucl';
	}
	if (
		UEL_IDS.has(uniqueTournamentId) ||
		(/europa league|conference league/i.test(name) && !/youth|women/i.test(name))
	) {
		return 'uel';
	}
	if (MLS_IDS.has(uniqueTournamentId) || /^mls\b|major league soccer/i.test(name)) return 'mls';
	if (EUROPE_LEAGUE_IDS.has(uniqueTournamentId)) return 'europe';
	if (
		/world\s*cup|euro\b|copa am[eé]rica|nations league|gold cup|afcon|africa cup|asian cup|olympics|qualif/i.test(
			name,
		)
	) {
		return 'international';
	}
	return null;
}

function classify(raw: Json): LiveBoardGroupId | null {
	const id = uniqueId(raw);
	const byComp = classifyCompetition(competitionName(raw), id);
	if (byComp) return byComp;

	const home = raw.homeTeam as Json | undefined;
	const away = raw.awayTeam as Json | undefined;
	if (Boolean(home?.national) && Boolean(away?.national)) return 'international';
	return null;
}

function scoreOf(side: Json | undefined): number | null {
	if (!side) return null;
	if (side.display != null) {
		const n = Number(side.display);
		return Number.isFinite(n) ? n : null;
	}
	const n = Number(side.current ?? side.period1 ?? NaN);
	return Number.isFinite(n) ? n : null;
}

function mapLiveMatch(raw: Json): LiveBoardMatch | null {
	const group = classify(raw);
	if (!group) return null;
	const id = Number(raw.id ?? 0);
	const home = raw.homeTeam as Json | undefined;
	const away = raw.awayTeam as Json | undefined;
	if (!id || !home || !away) return null;
	const status = raw.status as Json | undefined;
	const venue = raw.venue as Json | undefined;
	const statusType = String(status?.type ?? '');
	const finished = /finished|closed|ended/i.test(statusType);
	return {
		id,
		homeTeam: String(home.name ?? ''),
		awayTeam: String(away.name ?? ''),
		homeScore: scoreOf(raw.homeScore as Json | undefined),
		awayScore: scoreOf(raw.awayScore as Json | undefined),
		competition: competitionName(raw),
		group,
		clock: finished ? 'FT' : String(status?.description ?? status?.type ?? 'LIVE'),
		status: statusType || (finished ? 'finished' : 'inprogress'),
		venue: String(venue?.name ?? (venue?.stadium as Json | undefined)?.name ?? ''),
		startTimestamp: Number(raw.startTimestamp ?? 0),
	};
}

function groupMatches(matches: LiveBoardMatch[]) {
	return GROUP_ORDER.map((id) => ({
		id,
		label: GROUP_LABEL[id],
		matches: matches.filter((m) => m.group === id),
	}));
}

function utcYmd(d: Date) {
	return d.toISOString().slice(0, 10);
}

async function fetchScheduledWindow(): Promise<Json[]> {
	const now = new Date();
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const dates = [...new Set([utcYmd(now), utcYmd(yesterday)])];
	const [pages, barcaLast] = await Promise.all([
		Promise.all(dates.map((ymd) => fetchSofaScoreScheduledFootball(ymd).catch(() => [] as Json[]))),
		fetchSofaScoreTeamEventsRaw(SOFASCORE_BARCA_TEAM_ID, 'last').catch(() => [] as Json[]),
	]);
	const byId = new Map<number, Json>();
	for (const row of [...pages.flat(), ...barcaLast]) {
		const id = Number(row.id ?? 0);
		if (id) byId.set(id, row);
	}
	return [...byId.values()];
}

function isFinishedMatch(match: LiveBoardMatch) {
	return /finished|closed|ended/i.test(match.status);
}

export async function fetchLiveBoard(): Promise<LiveBoardHub> {
	resetSofaScoreReachable();
	const [liveRaw, scheduledRaw] = await Promise.all([
		fetchSofaScoreLiveFootballEvents().catch(() => [] as Json[]),
		fetchScheduledWindow(),
	]);
	const live = liveRaw.map(mapLiveMatch).filter(Boolean) as LiveBoardMatch[];
	const liveIds = new Set(live.map((m) => m.id));
	const cutoff = Math.floor(Date.now() / 1000) - 28 * 60 * 60;
	const history = (scheduledRaw.map(mapLiveMatch).filter(Boolean) as LiveBoardMatch[])
		.filter((m) => isFinishedMatch(m) && !liveIds.has(m.id) && m.startTimestamp >= cutoff)
		.sort((a, b) => b.startTimestamp - a.startTimestamp);
	const groups = groupMatches(live);
	const historyGroups = groupMatches(history);

	return {
		groups,
		history: historyGroups,
		fetchedAt: new Date().toISOString(),
		source: 'SofaScore live football + last 24 hours',
		note:
			!live.length && !history.length
				? sofaScoreReachable()
					? 'No live or last-24-hour matches in European leagues, MLS, UCL/UEL, or internationals.'
					: 'SofaScore blocked this host (common on Vercel without Chrome impersonation). Live matches should appear after the Python proxy is deployed.'
				: undefined,
	};
}

export async function fetchLiveMatchDetail(eventId: number): Promise<LiveBoardDetail | null> {
	const [rawList, event, incidents] = await Promise.all([
		fetchSofaScoreLiveFootballEvents(),
		fetchSofaScoreEventById(eventId),
		fetchSofaScoreEventIncidents(eventId),
	]);
	const fromLive = rawList.map(mapLiveMatch).find((m) => m?.id === eventId) ?? null;
	const fromEvent = event
		? {
				id: event.id,
				homeTeam: event.homeTeam,
				awayTeam: event.awayTeam,
				homeScore: event.homeScore,
				awayScore: event.awayScore,
				competition: event.competition || 'Football',
				group: classifyCompetition(event.competition || '') ?? ('europe' as const),
				clock: /finished|closed|ended/i.test(event.statusType ?? '') ? 'FT' : event.statusType || 'LIVE',
				status: event.statusType || 'inprogress',
				venue: '',
				startTimestamp: event.startTimestamp,
			}
		: null;
	const match = fromLive ?? fromEvent;
	if (!match) return null;
	return {
		match,
		events: incidents,
		clock: match.clock,
		fetchedAt: new Date().toISOString(),
	};
}
