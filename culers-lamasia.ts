import { sofaFetchPlayerStatistics, sofaFetchTeamPlayers } from './culers-sofascore.ts';
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
	/** first-team academy product vs Barça Atlètic */
	group: 'first-team' | 'atletic';
	/** Can open Opta/FCB player stats */
	statsAvailable: boolean;
};

export type LaMasiaHub = {
	firstTeam: LaMasiaPlayer[];
	atletic: LaMasiaPlayer[];
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

async function fetchAtleticLive(): Promise<LaMasiaPlayer[] | null> {
	const rows = await sofaFetchTeamPlayers(24343);
	if (!rows?.length) return null;
	return sortLaMasia(
		rows.map((p) => ({
			id: `atletic-${p.id}`,
			sofaId: p.id,
			name: p.name,
			position: mapSofaPos(p.position),
			number: p.number,
			nationality: p.nationality,
			photo: p.id ? `https://img.sofascore.com/api/v1/player/${p.id}/image` : '',
			birthDate: p.birthDate,
			group: 'atletic' as const,
			statsAvailable: Boolean(p.id),
		})),
	);
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
	const live = await fetchAtleticLive().catch(() => null);
	const atletic = live?.length ? live : fromFallback();

	return {
		firstTeam,
		atletic,
		fetchedAt: new Date().toISOString(),
		source: live?.length
			? 'La Masia — first-team academy filter + Barcelona Atlètic (SofaScore)'
			: 'La Masia — first-team academy filter + Barcelona Atlètic snapshot fallback',
		note: live?.length
			? undefined
			: 'Live Atlètic feed unavailable here — showing the latest cached Barça Atlètic snapshot.',
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
