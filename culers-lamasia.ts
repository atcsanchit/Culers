import {
	SOFASCORE_ATLETIC_TEAM_ID,
	SOFASCORE_JUVENIL_A_TEAM_ID,
	fetchTeamLastAndNext,
	sofaFetchPlayerStatistics,
	sofaFetchTeamPlayers,
	type SofaScoreEvent,
} from './culers-sofascore.ts';
import atleticFallback from './culers-lamasia-atletic-fallback.json' with { type: 'json' };

export type LaMasiaPlayer = {
	id: string;
	fcbId?: number;
	sofaId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
	/** first-team academy product vs Barça Atlètic vs Juvenil A */
	group: 'first-team' | 'atletic' | 'juvenil';
	/** Can open Opta/FCB player stats */
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

type SquadPlayer = {
	id: string;
	fcbId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
};

/** Loose name keys for current first-team La Masia products. */
const FIRST_TEAM_ACADEMY_KEYS = [
	'lamine yamal',
	'yamal',
	'pau cubarsi',
	'cubarsi',
	'gavi',
	'paez gavira',
	'pedri',
	'pedro gonzalez',
	'alejandro balde',
	'balde',
	'fermin',
	'fermin lopez',
	'marc bernal',
	'bernal',
	'eric garcia',
	'gerard martin',
	'xavi espart',
	'espart',
	'brian farinas',
	'farinas',
	'hamza abdelkarim',
	'abdelkarim',
	'jesse bisiwu',
	'bisiwu',
	'eder aller',
	'aller',
	'toni fernandez',
];

function normalizeNameKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function isFirstTeamAcademy(name: string) {
	const n = normalizeNameKey(name);
	return FIRST_TEAM_ACADEMY_KEYS.some((k) => n === k || n.includes(k) || k.includes(n));
}

function mapSofaPos(code: string) {
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

function sortLaMasia(players: LaMasiaPlayer[]) {
	return [...players].sort((a, b) => {
		const an = Number(a.number) || 999;
		const bn = Number(b.number) || 999;
		if (an !== bn) return an - bn;
		return a.name.localeCompare(b.name);
	});
}

function fromFallback(): LaMasiaPlayer[] {
	return (atleticFallback as Array<Omit<LaMasiaPlayer, 'statsAvailable' | 'group'> & { group?: string }>).map((p) => ({
		id: `atletic-${p.id}`,
		sofaId: p.sofaId,
		name: p.name,
		position: p.position,
		number: p.number,
		nationality: p.nationality,
		photo: p.photo,
		birthDate: p.birthDate || '',
		group: 'atletic' as const,
		statsAvailable: Boolean(p.sofaId),
	}));
}

function mapSofaSquad(
	rows: Awaited<ReturnType<typeof sofaFetchTeamPlayers>>,
	group: 'atletic' | 'juvenil',
): LaMasiaPlayer[] {
	return sortLaMasia(
		rows.map((p) => ({
			id: `${group}-${p.id}`,
			sofaId: p.id,
			name: p.name,
			position: mapSofaPos(p.position),
			number: p.number,
			nationality: p.nationality,
			photo: p.id ? `https://img.sofascore.com/api/v1/player/${p.id}/image` : '',
			birthDate: p.birthDate,
			group,
			statsAvailable: Boolean(p.id),
		})),
	);
}

async function fetchAtleticLive(): Promise<LaMasiaPlayer[] | null> {
	const rows = await sofaFetchTeamPlayers(SOFASCORE_ATLETIC_TEAM_ID);
	if (!rows?.length) return null;
	return mapSofaSquad(rows, 'atletic');
}

async function fetchJuvenilLive(): Promise<LaMasiaPlayer[] | null> {
	const rows = await sofaFetchTeamPlayers(SOFASCORE_JUVENIL_A_TEAM_ID);
	if (!rows?.length) return null;
	return mapSofaSquad(rows, 'juvenil');
}

function eventToMatch(event: SofaScoreEvent | null): LaMasiaMatch | null {
	if (!event) return null;
	return {
		opponent: event.opponent,
		isHome: event.isHome,
		date: event.date,
		time: event.time,
		competition: event.competition || '',
		homeScore: event.homeScore,
		awayScore: event.awayScore,
		status: event.statusType || '',
	};
}

async function fetchWeekendTeam(
	teamId: number,
	id: 'atletic' | 'juvenil',
	label: string,
): Promise<LaMasiaWeekendTeam> {
	const pack = await fetchTeamLastAndNext(teamId);
	return {
		id,
		label,
		last: eventToMatch(pack.last),
		next: eventToMatch(pack.next),
	};
}

export function filterFirstTeamAcademy(squad: SquadPlayer[]): LaMasiaPlayer[] {
	return sortLaMasia(
		squad
			.filter((p) => isFirstTeamAcademy(p.name))
			.map((p) => ({
				id: p.id,
				fcbId: p.fcbId,
				name: p.name,
				position: p.position,
				number: p.number,
				nationality: p.nationality,
				photo: p.photo,
				birthDate: p.birthDate,
				group: 'first-team' as const,
				statsAvailable: Boolean(p.fcbId),
			})),
	);
}

export async function fetchLaMasiaHub(firstTeamSquad: SquadPlayer[]): Promise<LaMasiaHub> {
	const firstTeam = filterFirstTeamAcademy(firstTeamSquad);
	const [live, juvenilLive, atleticWeekend, juvenilWeekend] = await Promise.all([
		fetchAtleticLive().catch(() => null),
		fetchJuvenilLive().catch(() => null),
		fetchWeekendTeam(SOFASCORE_ATLETIC_TEAM_ID, 'atletic', 'Barça Atlètic').catch(() => ({
			id: 'atletic' as const,
			label: 'Barça Atlètic',
			last: null,
			next: null,
		})),
		fetchWeekendTeam(SOFASCORE_JUVENIL_A_TEAM_ID, 'juvenil', 'Juvenil A').catch(() => ({
			id: 'juvenil' as const,
			label: 'Juvenil A',
			last: null,
			next: null,
		})),
	]);
	const atletic = live?.length ? live : fromFallback();
	const juvenil = juvenilLive?.length ? juvenilLive : [];
	const notes: string[] = [];
	if (!live?.length) notes.push('Live Atlètic feed unavailable — showing a cached Barça Atlètic snapshot.');
	if (!juvenil.length) notes.push('Juvenil A roster did not load this time.');

	return {
		firstTeam,
		atletic,
		juvenil,
		pathway: [
			{
				id: 'infantil',
				label: 'Infantil',
				ages: 'U12–U14',
				live: false,
				count: null,
				note: 'Train at Joan Gamper. Not in this live feed.',
			},
			{
				id: 'cadet',
				label: 'Cadet',
				ages: 'U15–U16',
				live: false,
				count: null,
				note: 'Same campus, same language. Not in this live feed.',
			},
			{
				id: 'juvenil',
				label: 'Juvenil A',
				ages: 'U19',
				live: true,
				count: juvenil.length || null,
				note: 'División de Honor + UEFA Youth League.',
			},
			{
				id: 'atletic',
				label: 'Atlètic',
				ages: 'B team',
				live: true,
				count: atletic.length || null,
				note: 'Segunda Federación. Home: Estadi Johan Cruyff.',
			},
			{
				id: 'first-team',
				label: 'First team',
				ages: 'Camp Nou',
				live: true,
				count: firstTeam.length || null,
				note: 'Academy products on the senior roster.',
			},
		],
		weekend: [atleticWeekend, juvenilWeekend],
		fetchedAt: new Date().toISOString(),
		source: live?.length
			? 'La Masia pathway — Juvenil A, Barça Atlètic, and first-team academy (SofaScore)'
			: 'La Masia pathway — first-team academy + Barça Atlètic snapshot fallback',
		note: notes.length ? notes.join(' ') : undefined,
	};
}

type StatRow = { key: string; label: string; value: number | string; available?: boolean };

const SOFA_STAT_LABELS: Record<string, string> = {
	appearances: 'Appearances',
	minutesPlayed: 'Minutes',
	goals: 'Goals',
	assists: 'Assists',
	rating: 'Avg rating',
	yellowCards: 'Yellow cards',
	redCards: 'Red cards',
	totalShots: 'Shots',
	shotsOnTarget: 'Shots on target',
	keyPasses: 'Key passes',
	accuratePassesPercentage: 'Pass %',
	tackles: 'Tackles',
	interceptions: 'Interceptions',
	successfulDribbles: 'Dribbles',
	aerialDuelsWon: 'Aerials won',
	saves: 'Saves',
	cleanSheet: 'Clean sheets',
	goalsConceded: 'Goals conceded',
};

const SEASON_KEYS = [
	'appearances',
	'minutesPlayed',
	'goals',
	'assists',
	'rating',
	'totalShots',
	'shotsOnTarget',
	'keyPasses',
	'accuratePassesPercentage',
	'tackles',
	'interceptions',
	'successfulDribbles',
	'aerialDuelsWon',
	'yellowCards',
	'redCards',
	'saves',
	'cleanSheet',
	'goalsConceded',
];

function preferSeasonIndex(seasons: { competition: string }[]) {
	const primera = seasons.findIndex((s) => /primera\s*feder/i.test(s.competition));
	if (primera >= 0) return primera;
	return 0;
}

function rowsFromStats(stats: Record<string, number>): StatRow[] {
	return SEASON_KEYS.filter((key) => stats[key] != null).map((key) => {
		const raw = stats[key]!;
		const value =
			key === 'rating' || key === 'accuratePassesPercentage'
				? Number(raw.toFixed(1))
				: Math.round(raw);
		return {
			key,
			label: SOFA_STAT_LABELS[key] ?? key,
			value,
			available: true,
		};
	});
}

/** SofaScore season + career totals for an Atlètic / reserve player. */
export async function fetchLaMasiaPlayerStats(sofaId: number) {
	const pack = await sofaFetchPlayerStatistics(sofaId);
	if (!pack || !pack.seasons.length) {
		throw new Error('No SofaScore stats found for this player');
	}

	const seasonIdx = preferSeasonIndex(pack.seasons);
	const latest = pack.seasons[seasonIdx]!;
	const season = rowsFromStats(latest.statistics);

	const totals: Record<string, number> = {};
	for (const s of pack.seasons) {
		for (const key of ['appearances', 'minutesPlayed', 'goals', 'assists', 'yellowCards', 'redCards', 'totalShots', 'tackles', 'saves', 'cleanSheet'] as const) {
			if (s.statistics[key] != null) totals[key] = (totals[key] ?? 0) + s.statistics[key]!;
		}
	}
	const ratings = pack.seasons
		.map((s) => s.statistics.rating)
		.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
	if (ratings.length) {
		totals.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
	}

	const career = rowsFromStats(totals);
	career.unshift({
		key: 'seasonsLogged',
		label: 'Seasons logged',
		value: pack.seasons.length,
		available: true,
	});

	return {
		fcbId: 0,
		sofaId,
		name: pack.name,
		position: mapSofaPos(pack.position),
		number: pack.number,
		seasonLabel: `${latest.competition} · ${latest.year}`,
		season,
		career,
		source: 'SofaScore — Barça Atlètic / youth competition stats (not FCB Opta)',
	};
}
