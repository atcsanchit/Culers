import { LA_MASIA_SPOTLIGHTS, findSquadMatch } from '../data/laMasiaSpotlight';
import type { Fixture, Player } from '../types';
import { barcaScore, opponentScore, resultLabel } from './api';
import { fixtureKickoffMs, matchRivalry, normalizeRivalryKey, type RivalryH2H } from './rivalry';
import type { RivalryDef } from '../data/rivalries';

/** Switch Far → Near when kickoff is within this window. */
export const BRIEFING_NEAR_MS = 48 * 60 * 60 * 1000;

export type BriefingPhase = 'far' | 'near';

export type OpponentH2H = RivalryH2H;

export type FormResult = {
	fixture: Fixture;
	label: 'W' | 'D' | 'L';
};

export function getNextUpcoming(fixtures: Fixture[], now = Date.now()): Fixture | null {
	const upcoming = fixtures
		.filter((f) => f.kind === 'upcoming')
		.map((f) => ({ f, kick: fixtureKickoffMs(f) }))
		.filter((x): x is { f: Fixture; kick: number } => x.kick != null && x.kick > now)
		.sort((a, b) => a.kick - b.kick);
	return upcoming[0]?.f ?? null;
}

export function briefingPhase(kickMs: number, now = Date.now()): BriefingPhase | null {
	const left = kickMs - now;
	if (left <= 0) return null;
	return left <= BRIEFING_NEAR_MS ? 'near' : 'far';
}

/** Hero left-rail headline based on time to kickoff. */
export function heroMatchHeadline(kickMs: number, now = Date.now()): string {
	const left = kickMs - now;
	if (left <= 0) return 'Kickoff';
	if (left <= 24 * 60 * 60 * 1000) return 'Match day';
	if (left <= BRIEFING_NEAR_MS) return 'Match day eve';
	return 'Match week';
}

function opponentsMatch(a: string, b: string) {
	const ka = normalizeRivalryKey(a);
	const kb = normalizeRivalryKey(b);
	if (!ka || !kb) return false;
	if (ka === kb) return true;
	const aTokens = ka.split(' ').filter((t) => t.length > 2);
	const bTokens = kb.split(' ').filter((t) => t.length > 2);
	if (aTokens.length && bTokens.length) {
		const overlap = aTokens.filter((t) => bTokens.includes(t));
		if (overlap.length >= Math.min(2, aTokens.length, bTokens.length)) return true;
		if (aTokens.some((t) => kb.includes(t) && t.length >= 5)) return true;
		if (bTokens.some((t) => ka.includes(t) && t.length >= 5)) return true;
	}
	return ka.includes(kb) || kb.includes(ka);
}

export function computeOpponentH2H(fixtures: Fixture[], opponent: string): OpponentH2H {
	const rivalry = matchRivalry(opponent);
	const matches = fixtures
		.filter((f) => {
			if (f.kind !== 'past') return false;
			if (rivalry) return matchRivalry(f.opponent)?.id === rivalry.id;
			return opponentsMatch(f.opponent, opponent);
		})
		.sort((a, b) => (fixtureKickoffMs(b) ?? 0) - (fixtureKickoffMs(a) ?? 0));

	let wins = 0;
	let draws = 0;
	let losses = 0;
	let goalsFor = 0;
	let goalsAgainst = 0;

	for (const f of matches) {
		const r = resultLabel(f);
		if (r === 'W') wins += 1;
		else if (r === 'D') draws += 1;
		else if (r === 'L') losses += 1;
		const gf = barcaScore(f);
		const ga = opponentScore(f);
		if (gf != null) goalsFor += gf;
		if (ga != null) goalsAgainst += ga;
	}

	return {
		played: matches.length,
		wins,
		draws,
		losses,
		goalsFor,
		goalsAgainst,
		recent: matches.slice(0, 5),
	};
}

export function lastForm(fixtures: Fixture[], count = 5): FormResult[] {
	return fixtures
		.filter((f) => f.kind === 'past')
		.sort((a, b) => (fixtureKickoffMs(b) ?? 0) - (fixtureKickoffMs(a) ?? 0))
		.slice(0, count)
		.map((fixture) => {
			const label = resultLabel(fixture);
			return { fixture, label: label === 'W' || label === 'D' || label === 'L' ? label : 'D' };
		});
}

export function stakesLine(fixture: Fixture): string {
	const comp = (fixture.competition || '').toLowerCase();
	const home = fixture.isHome;
	if (comp.includes('champions') || comp.includes('ucl')) {
		return home ? 'Champions League night under the lights at Camp Nou.' : 'European away night — every touch travels.';
	}
	if (comp.includes('copa')) {
		return home ? 'Copa del Rey — cup nights rewrite seasons.' : 'Copa away — grit over glamour.';
	}
	if (comp.includes('supercopa') || comp.includes('super cup')) {
		return 'Supercopa — silverware before the long league haul.';
	}
	if (home) return 'League points at Spotify Camp Nou — control the tempo, own the night.';
	return 'La Liga away day — take the points on the road.';
}

export function watchChecklist(fixture: Fixture, rivalry: RivalryDef | null): string[] {
	const items: string[] = [];
	if (fixture.isHome) {
		items.push('Camp Nou roar — start fast in the first 15′.');
	} else {
		items.push('Away discipline — stay compact without the ball.');
	}
	if (rivalry) {
		items.push(`${rivalry.shortLabel} intensity — set pieces and transitions decide it.`);
	} else {
		items.push('High press after turnovers — win it high, punish quickly.');
	}
	items.push('Watch the wide overloads — cut-backs create chaos.');
	return items.slice(0, 3);
}

/** Prefer current La Masia spotlight on squad; else first attacker/mid with a photo. */
export function playerToWatch(squad: Player[]): Player | null {
	for (const spotlight of LA_MASIA_SPOTLIGHTS) {
		if (spotlight.status !== 'current') continue;
		const match = findSquadMatch(spotlight, squad);
		if (match) return match;
	}

	const attacky = (p: Player) => {
		const pos = p.position.toLowerCase();
		return (
			pos.includes('forward') ||
			pos.includes('winger') ||
			pos.includes('attack') ||
			pos.includes('mid') ||
			pos.includes('striker')
		);
	};

	const withPhoto = squad.filter((p) => p.photo?.trim());
	return withPhoto.find(attacky) ?? withPhoto[0] ?? squad.find(attacky) ?? squad[0] ?? null;
}
