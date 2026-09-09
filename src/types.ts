export type Fixture = {
	id: string;
	homeTeam: string;
	awayTeam: string;
	isHome: boolean;
	opponent: string;
	venue: string;
	date: string;
	time: string;
	competition: string;
	compShort?: string;
	season: string;
	round: string;
	homeScore: number | null;
	awayScore: number | null;
	status: string;
	thumb: string;
	kind: 'past' | 'upcoming' | 'live';
	source?: string;
};

export type NewsMedia = {
	type: 'photo' | 'video';
	url: string;
	previewUrl: string;
};

export type NewsItem = {
	title: string;
	link: string;
	pubDate: string;
	source: string;
	text?: string;
	media?: NewsMedia[];
};

export type Player = {
	id: string;
	fcbId?: number;
	/** SofaScore id — used for Barça Atlètic / reserve stats */
	sofaId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
	/** Club side when opened from a match ratings pitch (home-ground wallpaper). */
	club?: string;
};

export type Squad = {
	players: Player[];
	coach: string;
	source?: string;
	lastMatch?: {
		fixtureId: string;
		opponent: string;
		date: string;
		starters: number;
		subs: number;
	};
};

export type LaMasiaPlayer = Player & {
	sofaId?: number;
	group: 'first-team' | 'atletic' | 'juvenil';
	statsAvailable: boolean;
};

export type LaMasiaMatch = {
	opponent: string;
	isHome: boolean;
	date: string;
	time: string;
	competition: string;
	homeScore: number | null;
	awayScore: number | null;
	status: string;
};

export type LaMasiaWeekendTeam = {
	id: 'atletic' | 'juvenil';
	label: string;
	last: LaMasiaMatch | null;
	next: LaMasiaMatch | null;
};

export type LaMasiaPathwayRung = {
	id: 'infantil' | 'cadet' | 'juvenil' | 'atletic' | 'first-team';
	label: string;
	ages: string;
	live: boolean;
	count: number | null;
	note: string;
};

export type LaMasiaHub = {
	firstTeam: LaMasiaPlayer[];
	atletic: LaMasiaPlayer[];
	juvenil: LaMasiaPlayer[];
	pathway: LaMasiaPathwayRung[];
	weekend: LaMasiaWeekendTeam[];
	fetchedAt: string;
	source: string;
	note?: string;
};

export type TransferDeal = {
	player: string;
	position: string;
	club: string;
	type: string;
	fee: string;
	date: string;
	window: 'summer' | 'winter' | 'unknown';
	direction: 'in' | 'out';
};

export type TransferRecord = {
	player: string;
	club: string;
	fee: string;
	year: string;
	direction: 'in' | 'out';
};

export type TransferIntel = {
	id?: string;
	title: string;
	url: string;
	snippet: string;
	pubDate?: string;
	image?: string;
	tags?: string[];
	source: string;
};

export type SquadMarketValue = {
	name: string;
	position: string;
	number: string;
	nationality: string;
	valueEur: number;
	valueLabel: string;
	sofaId: number;
};

export type TransferRumorHeat = 'here-we-go' | 'hot' | 'watch' | 'denied';
export type TransferRumorLean = 'in' | 'out' | 'other';

export type TransferRumor = {
	title: string;
	url: string;
	text: string;
	pubDate?: string;
	source: string;
	handle?: string;
	heat: TransferRumorHeat;
	heatLabel: string;
	lean: TransferRumorLean;
	media?: NewsMedia[];
};

export type TransfersHub = {
	season: string;
	seasonPage: string;
	windowNote: string;
	arrivals: TransferDeal[];
	departures: TransferDeal[];
	intel: TransferIntel[];
	rumors: TransferRumor[];
	recordsIn: TransferRecord[];
	recordsOut: TransferRecord[];
	values: SquadMarketValue[];
	squadValueTotalEur: number;
	squadValueTotalLabel: string;
	links: { home: string; tracker: string; blog: string; xtv: string; api: string };
	sources: string[];
	fetchedAt: string;
	note: string;
};

export type TimelineEvent = {
	minute: string;
	type: string;
	player: string;
	team: string;
	detail: string;
	homeScore: number | null;
	awayScore: number | null;
};

export type LiveData = {
	live: boolean;
	match: Fixture | null;
	events: TimelineEvent[];
	clock?: string;
	message?: string;
};

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
	events: TimelineEvent[];
	clock: string;
	fetchedAt: string;
};

export type FetchPayload = {
	fetchedAt: string;
	fixtures: Fixture[];
	news: NewsItem[];
	newsNote?: string;
	newsProfile?: { name?: string; description?: string; followers?: number; avatarUrl?: string } | null;
	footballNews: NewsItem[];
	footballNewsNote?: string;
	footballNewsProfile?: { name?: string; description?: string; followers?: number; avatarUrl?: string } | null;
	squad: Squad;
	live: LiveData;
	lineup: LineupData;
	stats: TeamStats;
	transfers?: TransfersHub;
	sources: string[];
};

export type StatRow = { key: string; label: string; value: number | string; available?: boolean };

export type PlayerStats = {
	fcbId: number;
	name: string;
	position: string;
	number: string;
	seasonLabel: string;
	season: StatRow[];
	career: StatRow[];
	source: string;
};

export type PlayerMatchStats = {
	fcbId?: number;
	sofaId?: number;
	fixtureId: string;
	name: string;
	position: string;
	number: string;
	opponent: string;
	clock?: string;
	rating?: number;
	stats: StatRow[];
	/** Compact list for FotMob-style “Top stats” panel */
	topStats?: StatRow[];
	/** Optional pitch heatmap points 0–100 */
	heatmap?: { x: number; y: number }[];
	fetchedAt: string;
	source: string;
};

export type MatchLineupPlayer = {
	id: string;
	name: string;
	number: string;
	position: string;
};

export type RatedPitchPlayer = {
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
	/** 0–100 within team half */
	x: number;
	y: number;
	photo?: string;
};

export type MatchRatingsSide = {
	teamName: string;
	teamId: number;
	isBarca: boolean;
	formation: string;
	avgRating: number | null;
	starters: RatedPitchPlayer[];
	bench: RatedPitchPlayer[];
};

export type MatchRatingsBoard = {
	fixtureId: string;
	sofaEventId: number;
	homeTeam: string;
	awayTeam: string;
	homeScore: number | null;
	awayScore: number | null;
	clock?: string;
	status: string;
	home: MatchRatingsSide;
	away: MatchRatingsSide;
	source: string;
};

export type WatchPlayer = {
	id: string;
	name: string;
	position: string;
	number: string;
	avgRating: number;
	matches: number;
	goals: number;
	assists: number;
};

export type MatchEvent = {
	minute: string;
	type: 'goal' | 'yellow' | 'red' | 'sub';
	player: string;
	assist?: string;
	team: 'home' | 'away';
	detail?: string;
};

export type MatchSummary = {
	fixtureId: string;
	homeTeam: string;
	awayTeam: string;
	homeScore: number;
	awayScore: number;
	date: string;
	time: string;
	competition: string;
	venue: string;
	attendance?: number;
	homeCrest: string;
	awayCrest: string;
	/** Stadium or match photo for the review modal backdrop */
	backgroundImage?: string;
	stats: StatRow[];
	events: MatchEvent[];
	lineups: {
		home: { starters: MatchLineupPlayer[]; subs: MatchLineupPlayer[] };
		away: { starters: MatchLineupPlayer[]; subs: MatchLineupPlayer[] };
	};
	source: string;
	/** Upcoming fixture preview — stats sourced from each team's last (or live) match */
	preview?: boolean;
	/** Opponent last-match data was unavailable; stats/events/XI are Barça only. */
	previewBarcaOnly?: boolean;
	previewHomeNote?: string;
	previewAwayNote?: string;
	/** Last-match goals/cards for preview (home = upcoming home side's last match) */
	previewHomeEvents?: MatchEvent[];
	previewAwayEvents?: MatchEvent[];
	/** Labels for preview event panels (actual last-match team names) */
	previewHomeMatchTeams?: { home: string; away: string };
	previewAwayMatchTeams?: { home: string; away: string };
	/** Top form players by avg rating across last 2 matches (preview) */
	playersToWatch?: {
		home: WatchPlayer[];
		away: WatchPlayer[];
		source?: string;
	};
};

export type PlayerRating = {
	playerId: string;
	name: string;
	position: string;
	rating: number;
	note: string;
};

export type MatchRatings = {
	matchId: string;
	coachRating: number;
	coachNote: string;
	players: PlayerRating[];
	updatedAt: string;
};

export type Tab =
	| 'home'
	| 'fixtures'
	| 'news'
	| 'football-news'
	| 'match'
	| 'live'
	| 'squad'
	| 'transfers'
	| 'ratings';

export type SocialPlatformId = 'instagram' | 'x';

export type SocialPlatformStats = {
	id: SocialPlatformId;
	label: string;
	handle: string;
	profileUrl: string;
	followers?: number;
	followersLabel?: string;
	postsLabel?: string;
	avatarUrl?: string;
	description?: string;
};

export type SocialHubData = {
	platforms: SocialPlatformStats[];
	fetchedAt: string;
	note?: string;
};

export type InstagramPost = {
	id: string;
	url: string;
	image: string;
	caption: string;
};

export type InstagramFeed = {
	username: string;
	profileUrl: string;
	profileImage?: string;
	followersLabel?: string;
	postsLabel?: string;
	posts: InstagramPost[];
	fetchedAt: string;
	source: string;
};

export type XFeed = {
	handle: string;
	profileUrl: string;
	profile: {
		name?: string;
		description?: string;
		followers?: number;
		avatarUrl?: string;
	} | null;
	items: NewsItem[];
	note?: string;
	fetchedAt: string;
	source: string;
};

export type MatchFilter = 'all' | 'upcoming' | 'past' | 'live';

export type LineupData = {
	mode: 'predicted' | 'last-match' | 'confirmed';
	matchDay: boolean;
	eventId: string | null;
	opponent: string | null;
	formation: string;
	starters: Player[];
	bench: Player[];
	excluded: Array<{ name: string; reason: string }>;
	sources: string[];
	confidence: 'high' | 'medium' | 'low';
	notes: string[];
};

export type TeamStats = {
	played: number;
	wins: number;
	draws: number;
	losses: number;
	goalsFor: number;
	goalsAgainst: number;
	goalDiff: number;
	home: { w: number; d: number; l: number; gf: number; ga: number };
	away: { w: number; d: number; l: number; gf: number; ga: number };
	form: Array<'W' | 'D' | 'L'>;
	byCompetition: Record<string, { p: number; w: number; d: number; l: number; gf: number; ga: number }>;
	cleanSheets: number;
	avgGoalsScored: number;
	avgGoalsConceded: number;
};
