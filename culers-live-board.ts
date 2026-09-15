import {
	fetchEspnEventById,
	fetchEspnEventIncidents,
	fetchEspnLiveAndRecentEvents,
	fetchSportsDbLiveSoccer,
	fetchSportsDbSoccerDay,
	mapEspnRawToLiveShape,
	mapSportsDbEventToLiveShape,
	resetStatsSourceReachable,
	statsSourceReachable,
} from './culers-espn.ts';

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
	upcoming: Array<{
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

const GROUP_ORDER: LiveBoardGroupId[] = ['ucl', 'uel', 'europe', 'mls', 'international'];
const GROUP_LABEL: Record<LiveBoardGroupId, string> = {
	ucl: 'UEFA Champions League',
	uel: 'Europa League & Conference',
	europe: 'European leagues',
	mls: 'MLS',
	international: 'International',
};

export function classifyCompetition(comp: string, uniqueTournamentId = 0): LiveBoardGroupId | null {
	void uniqueTournamentId;
	const name = comp.trim();
	if (/champions league/i.test(name) && !/youth|women|femenin|femenil/i.test(name)) return 'ucl';
	if (/europa league|conference league/i.test(name) && !/youth|women/i.test(name)) return 'uel';
	if (/^mls\b|major league soccer/i.test(name)) return 'mls';
	if (
		/la\s*liga|premier league|bundesliga|serie a|ligue 1|eredivisie|liga portugal|pro league|super lig|scottish premiership|championship|swiss super/i.test(
			name,
		)
	) {
		return 'europe';
	}
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
	const tagged = raw._culersGroup as LiveBoardGroupId | undefined;
	if (tagged) return tagged;
	const tournament = raw.tournament as Json | undefined;
	const unique = (tournament?.uniqueTournament as Json | undefined) ?? tournament;
	const name = String(raw._competitionName ?? unique?.name ?? tournament?.name ?? '');
	const byComp = classifyCompetition(name, Number(unique?.id ?? 0));
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

function kickoffClock(startTimestamp: number) {
	if (!startTimestamp) return 'Upcoming';
	const d = new Date(startTimestamp * 1000);
	if (Number.isNaN(d.getTime())) return 'Upcoming';
	return d.toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
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
	const live = /inprogress|live/i.test(statusType);
	const startTimestamp = Number(raw.startTimestamp ?? 0);
	return {
		id,
		homeTeam: String(home.name ?? ''),
		awayTeam: String(away.name ?? ''),
		homeScore: scoreOf(raw.homeScore as Json | undefined),
		awayScore: scoreOf(raw.awayScore as Json | undefined),
		competition: String(
			raw._competitionName ??
				((raw.tournament as Json | undefined)?.uniqueTournament as Json | undefined)?.name ??
				(raw.tournament as Json | undefined)?.name ??
				'',
		),
		group,
		clock: finished ? 'FT' : live ? String(status?.description ?? status?.type ?? 'LIVE') : kickoffClock(startTimestamp),
		status: statusType || (finished ? 'finished' : live ? 'inprogress' : 'scheduled'),
		venue: String(venue?.name ?? (venue?.stadium as Json | undefined)?.name ?? ''),
		startTimestamp,
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

function isFinishedMatch(match: LiveBoardMatch) {
	return /finished|closed|ended/i.test(match.status);
}

function isLiveMatch(match: LiveBoardMatch) {
	return !isFinishedMatch(match) && /inprogress|live/i.test(match.status);
}

async function espnShapes(): Promise<Json[]> {
	const raw = await fetchEspnLiveAndRecentEvents().catch(() => [] as Json[]);
	return raw.map(mapEspnRawToLiveShape);
}

async function sportsDbShapes(): Promise<Json[]> {
	const now = new Date();
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const [live, today, yday, tmrw] = await Promise.all([
		fetchSportsDbLiveSoccer().catch(() => [] as Json[]),
		fetchSportsDbSoccerDay(utcYmd(now)).catch(() => [] as Json[]),
		fetchSportsDbSoccerDay(utcYmd(yesterday)).catch(() => [] as Json[]),
		fetchSportsDbSoccerDay(utcYmd(tomorrow)).catch(() => [] as Json[]),
	]);
	return [...live, ...today, ...yday, ...tmrw].map(mapSportsDbEventToLiveShape);
}

export async function fetchLiveBoard(): Promise<LiveBoardHub> {
	resetStatsSourceReachable();
	let shapes = await espnShapes();
	let source = 'ESPN / Google Sports scoreboards (live + last/next 24 hours)';
	if (!shapes.length) {
		shapes = await sportsDbShapes();
		source = 'TheSportsDB live + day results (ESPN scoreboard unavailable)';
	}

	const mapped = shapes.map(mapLiveMatch).filter(Boolean) as LiveBoardMatch[];
	const live = mapped.filter(isLiveMatch);
	const liveIds = new Set(live.map((m) => m.id));
	const nowSec = Math.floor(Date.now() / 1000);
	const pastCutoff = nowSec - 28 * 60 * 60;
	const upcomingCutoff = nowSec + 28 * 60 * 60;
	const history = mapped
		.filter((m) => isFinishedMatch(m) && !liveIds.has(m.id) && m.startTimestamp >= pastCutoff)
		.sort((a, b) => b.startTimestamp - a.startTimestamp);
	const historyIds = new Set(history.map((m) => m.id));
	const upcoming = mapped
		.filter(
			(m) =>
				!isFinishedMatch(m) &&
				!liveIds.has(m.id) &&
				!historyIds.has(m.id) &&
				m.startTimestamp > 0 &&
				m.startTimestamp >= nowSec - 30 * 60 &&
				m.startTimestamp <= upcomingCutoff,
		)
		.sort((a, b) => a.startTimestamp - b.startTimestamp);

	return {
		groups: groupMatches(live),
		history: groupMatches(history),
		upcoming: groupMatches(upcoming),
		fetchedAt: new Date().toISOString(),
		source,
		note:
			!live.length && !history.length && !upcoming.length
				? statsSourceReachable()
					? 'No live, last-24-hour, or next-24-hour matches in European leagues, MLS, UCL/UEL, or internationals.'
					: 'Live score hosts were blocked or empty. Trying ESPN, then TheSportsDB — refresh after a minute.'
				: undefined,
	};
}

export async function fetchLiveMatchDetail(eventId: number): Promise<LiveBoardDetail | null> {
	const [board, event, incidents] = await Promise.all([
		fetchLiveBoard(),
		fetchEspnEventById(eventId),
		fetchEspnEventIncidents(eventId).catch(() => []),
	]);
	const fromBoard =
		[...board.groups, ...board.history, ...board.upcoming].flatMap((g) => g.matches).find((m) => m.id === eventId) ??
		null;
	const fromEvent = event
		? {
				id: event.id,
				homeTeam: event.homeTeam,
				awayTeam: event.awayTeam,
				homeScore: event.homeScore,
				awayScore: event.awayScore,
				competition: event.competition || 'Football',
				group: classifyCompetition(event.competition || '') ?? ('europe' as const),
				clock: /finished|closed|ended/i.test(event.statusType ?? '')
					? 'FT'
					: /inprogress|live/i.test(event.statusType ?? '')
						? event.clock || event.statusType || 'LIVE'
						: kickoffClock(event.startTimestamp),
				status: event.statusType || 'inprogress',
				venue: event.venue || '',
				startTimestamp: event.startTimestamp,
			}
		: null;
	const match = fromBoard ?? fromEvent;
	if (!match) return null;
	return {
		match,
		events: incidents,
		clock: match.clock,
		fetchedAt: new Date().toISOString(),
	};
}
