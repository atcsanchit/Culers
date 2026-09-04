import { fetchFcbBarcaLineup } from './culers-fcb.ts';
import { fetchSofaScoreBarcaLineup, findSofaScoreEvent } from './culers-sofascore.ts';

const BARCA_TEAM_ID = '133739';
const BARCA_TEAM_NAME = 'Barcelona';

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
	inLastMatchXi?: boolean;
	inLastMatchSquad?: boolean;
};

type LineupResult = {
	mode: 'predicted' | 'last-match' | 'confirmed';
	matchDay: boolean;
	eventId: string | null;
	opponent: string | null;
	formation: string;
	starters: RawPlayer[];
	bench: RawPlayer[];
	excluded: Array<{ name: string; reason: string }>;
	sources: string[];
	confidence: 'high' | 'medium' | 'low';
	notes: string[];
};

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

function lastMatchXiFromSquad(squadPlayers: RawPlayer[]) {
	const xiPool = squadPlayers.filter((p) => p.inLastMatchXi);
	const benchPool = squadPlayers.filter((p) => p.inLastMatchSquad && !p.inLastMatchXi);
	let starters = [...xiPool];
	for (const p of benchPool) {
		if (starters.length >= 11) break;
		if (starters.some((s) => s.id === p.id)) continue;
		starters.push(p);
	}
	const bench = benchPool.filter((p) => !starters.some((s) => s.id === p.id));
	return { starters: starters.slice(0, 11), bench };
}

async function fetchEventLineup(eventId: string, squad: RawPlayer[]) {
	const data = await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/lookuplineup.php?id=${eventId}`);
	const rows = ((data?.lineup as Json[]) ?? []).filter(
		(r) => String(r.strTeam ?? '').toLowerCase().includes('barcelona') && String(r.strSubstitute ?? '') === 'No',
	);

	if (rows.length < 8) return null;

	const starters: RawPlayer[] = [];
	for (const row of rows) {
		const id = String(row.idPlayer ?? '');
		const fromSquad = squad.find((p) => p.id === id);
		if (fromSquad) {
			starters.push(fromSquad);
			continue;
		}
		starters.push({
			id: id || String(row.strPlayer),
			name: String(row.strPlayer ?? ''),
			position: String(row.strPosition ?? ''),
			number: row.intSquadNumber != null ? String(row.intSquadNumber) : '',
			nationality: '',
			photo: String(row.strCutout ?? row.strThumb ?? ''),
			birthDate: '',
		});
	}

	const benchRows = ((data?.lineup as Json[]) ?? []).filter(
		(r) => String(r.strTeam ?? '').toLowerCase().includes('barcelona') && String(r.strSubstitute ?? '') === 'Yes',
	);
	const bench = benchRows.map((row) => {
		const id = String(row.idPlayer ?? '');
		return (
			squad.find((p) => p.id === id) ?? {
				id,
				name: String(row.strPlayer ?? ''),
				position: String(row.strPosition ?? ''),
				number: row.intSquadNumber != null ? String(row.intSquadNumber) : '',
				nationality: '',
				photo: String(row.strCutout ?? ''),
				birthDate: '',
			}
		);
	});

	return { starters: starters.slice(0, 11), bench };
}

async function fetchSofaScoreLineup(
	squad: RawPlayer[],
	options: { opponent?: string; date?: string; prefer: 'upcoming' | 'finished' },
) {
	const event = await findSofaScoreEvent({
		opponent: options.opponent,
		date: options.date,
		prefer: options.prefer,
	});
	if (!event) return null;

	const lineup = await fetchSofaScoreBarcaLineup(event.id, squad);
	if (!lineup) return null;

	return { event, lineup };
}

function confirmedResult(
	partial: Omit<LineupResult, 'mode' | 'confidence' | 'notes' | 'sources' | 'excluded'> & {
		formation: string;
		source: string;
		confirmed: boolean;
	},
): LineupResult {
	return {
		mode: 'confirmed',
		matchDay: partial.matchDay,
		eventId: partial.eventId,
		opponent: partial.opponent,
		formation: partial.formation,
		starters: partial.starters,
		bench: partial.bench,
		excluded: [],
		sources: [partial.source],
		confidence: partial.confirmed ? 'high' : 'medium',
		notes: partial.confirmed
			? [`Confirmed lineup from ${partial.source}.`]
			: [`Provisional lineup from ${partial.source} (not yet marked confirmed).`],
	};
}

function lastMatchResult(
	partial: Omit<LineupResult, 'mode' | 'confidence' | 'notes' | 'sources' | 'excluded'> & { source: string; note: string },
): LineupResult {
	return {
		mode: 'last-match',
		matchDay: partial.matchDay,
		eventId: partial.eventId,
		opponent: partial.opponent,
		formation: partial.formation,
		starters: partial.starters,
		bench: partial.bench,
		excluded: [],
		sources: [partial.source],
		confidence: partial.starters.length >= 11 ? 'high' : 'medium',
		notes: [partial.note],
	};
}

export async function buildLineup(
	squadPlayers: RawPlayer[],
	options: {
		fixtureId?: string;
		eventId?: string;
		opponent?: string;
		matchDate?: string;
		matchDay?: boolean;
		fixtureKind?: 'past' | 'upcoming' | 'live';
	},
): Promise<LineupResult> {
	const fixtureId = options.fixtureId ?? options.eventId ?? null;
	const preferFinished = options.fixtureKind === 'past';
	const sofaPrefer = preferFinished ? 'finished' : 'upcoming';

	// Live match — FC Barcelona official first (updates with substitutions)
	if (options.fixtureKind === 'live' && fixtureId) {
		const fcbLive = await fetchFcbBarcaLineup(fixtureId, squadPlayers);
		if (fcbLive && fcbLive.starters.length >= 8) {
			return confirmedResult({
				matchDay: true,
				eventId: fixtureId,
				opponent: options.opponent ?? null,
				formation: '4-3-3',
				starters: fcbLive.starters,
				bench: fcbLive.bench,
				source: 'FC Barcelona official (live)',
				confirmed: true,
			});
		}
	}

	// 1. SofaScore — primary source
	const sofa = await fetchSofaScoreLineup(squadPlayers, {
		opponent: options.opponent,
		date: options.matchDate,
		prefer: sofaPrefer,
	});
	if (sofa && sofa.lineup.starters.length >= 8) {
		return confirmedResult({
			matchDay: Boolean(options.matchDay),
			eventId: fixtureId,
			opponent: options.opponent ?? sofa.event.opponent,
			formation: sofa.lineup.formation || '4-3-3',
			starters: sofa.lineup.starters,
			bench: sofa.lineup.bench,
			source: 'SofaScore',
			confirmed: sofa.lineup.confirmed,
		});
	}

	// 2. FC Barcelona official (PulseLive)
	if (fixtureId) {
		const fcb = await fetchFcbBarcaLineup(fixtureId, squadPlayers);
		if (fcb && fcb.starters.length >= 8) {
			return confirmedResult({
				matchDay: Boolean(options.matchDay),
				eventId: fixtureId,
				opponent: options.opponent ?? null,
				formation: '4-3-3',
				starters: fcb.starters,
				bench: fcb.bench,
				source: 'FC Barcelona official',
				confirmed: true,
			});
		}
	}

	// 3. Upcoming with no published XI → last match lineup (never news guesses)
	if (options.matchDay || options.fixtureKind === 'upcoming') {
		const lastSofa = await fetchSofaScoreLineup(squadPlayers, { prefer: 'finished' });
		if (lastSofa && lastSofa.lineup.starters.length >= 8) {
			return lastMatchResult({
				matchDay: Boolean(options.matchDay),
				eventId: fixtureId,
				opponent: options.opponent ?? null,
				formation: lastSofa.lineup.formation || '4-3-3',
				starters: lastSofa.lineup.starters,
				bench: lastSofa.lineup.bench,
				source: 'SofaScore (last match)',
				note: `No lineup published yet for vs ${options.opponent ?? 'next opponent'} — showing last match XI from SofaScore.`,
			});
		}

		const fromSquad = lastMatchXiFromSquad(squadPlayers);
		if (fromSquad.starters.length >= 8) {
			return lastMatchResult({
				matchDay: Boolean(options.matchDay),
				eventId: fixtureId,
				opponent: options.opponent ?? null,
				formation: '4-3-3',
				starters: fromSquad.starters,
				bench: fromSquad.bench,
				source: 'FC Barcelona last match squad',
				note: 'No lineup published yet — showing last match starting XI from official squad data.',
			});
		}
	}

	// 4. Past fixtures / generic fallback — TheSportsDB last match
	const lastData = await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${BARCA_TEAM_ID}`);
	const lastEvent = ((lastData?.results as Json[]) ?? [])[0];
	const lastEventId = lastEvent ? String(lastEvent.idEvent ?? '') : '';

	if (lastEventId) {
		const lastLineup = await fetchEventLineup(lastEventId, squadPlayers);
		if (lastLineup && lastLineup.starters.length >= 5) {
			return lastMatchResult({
				matchDay: false,
				eventId: lastEventId,
				opponent: lastEvent
					? String(lastEvent.strAwayTeam === 'Barcelona' ? lastEvent.strHomeTeam : lastEvent.strAwayTeam)
					: null,
				formation: '4-3-3',
				starters: lastLineup.starters,
				bench: lastLineup.bench,
				source: 'TheSportsDB last match',
				note: 'Showing last match starting XI.',
			});
		}
	}

	const fromSquad = lastMatchXiFromSquad(squadPlayers);
	return {
		mode: 'last-match',
		matchDay: false,
		eventId: fixtureId,
		opponent: options.opponent ?? null,
		formation: '4-3-3',
		starters: fromSquad.starters,
		bench: fromSquad.bench,
		excluded: [],
		sources: ['FC Barcelona squad'],
		confidence: fromSquad.starters.length >= 11 ? 'medium' : 'low',
		notes: ['Lineup unavailable — showing best available squad XI.'],
	};
}

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

export function computeStats(
	fixtures: Array<{
		isHome: boolean;
		homeScore: number | null;
		awayScore: number | null;
		status: string;
		competition: string;
		date: string;
	}>,
) {
	const finished = fixtures.filter((f) => {
		const s = f.status.toLowerCase();
		return f.homeScore != null && f.awayScore != null && (s.includes('finished') || s === 'ft' || s.includes('match finished'));
	});

	const stats: TeamStats = {
		played: 0,
		wins: 0,
		draws: 0,
		losses: 0,
		goalsFor: 0,
		goalsAgainst: 0,
		goalDiff: 0,
		home: { w: 0, d: 0, l: 0, gf: 0, ga: 0 },
		away: { w: 0, d: 0, l: 0, gf: 0, ga: 0 },
		form: [],
		byCompetition: {},
		cleanSheets: 0,
		avgGoalsScored: 0,
		avgGoalsConceded: 0,
	};

	const formFixtures = [...finished].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	for (const f of finished) {
		const us = f.isHome ? f.homeScore! : f.awayScore!;
		const them = f.isHome ? f.awayScore! : f.homeScore!;
		stats.played++;
		stats.goalsFor += us;
		stats.goalsAgainst += them;
		if (them === 0) stats.cleanSheets++;

		const side = f.isHome ? stats.home : stats.away;
		side.gf += us;
		side.ga += them;

		let result: 'W' | 'D' | 'L';
		if (us > them) {
			stats.wins++;
			side.w++;
			result = 'W';
		} else if (us < them) {
			stats.losses++;
			side.l++;
			result = 'L';
		} else {
			stats.draws++;
			side.d++;
			result = 'D';
		}

		const comp = f.competition || 'Other';
		stats.byCompetition[comp] ??= { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
		const c = stats.byCompetition[comp];
		c.p++;
		c.gf += us;
		c.ga += them;
		if (result === 'W') c.w++;
		else if (result === 'D') c.d++;
		else c.l++;
	}

	stats.goalDiff = stats.goalsFor - stats.goalsAgainst;
	stats.avgGoalsScored = stats.played ? +(stats.goalsFor / stats.played).toFixed(2) : 0;
	stats.avgGoalsConceded = stats.played ? +(stats.goalsAgainst / stats.played).toFixed(2) : 0;
	stats.form = formFixtures.slice(0, 5).map((f) => {
		const us = f.isHome ? f.homeScore! : f.awayScore!;
		const them = f.isHome ? f.awayScore! : f.homeScore!;
		if (us > them) return 'W';
		if (us < them) return 'L';
		return 'D';
	});

	return stats;
}

export { BARCA_TEAM_ID, BARCA_TEAM_NAME, fetchJson };
