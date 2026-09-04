import { RIVALRIES, rivalryMatchPriority, type RivalryDef } from '../data/rivalries';
import type { Fixture } from '../types';
import { barcaScore, opponentScore, resultLabel } from './api';

export type RivalryPhase = 'live' | 'upcoming' | 'recent';

export type RivalryContext = {
	rivalry: RivalryDef;
	fixture: Fixture;
	phase: RivalryPhase;
};

export type RivalryH2H = {
	played: number;
	wins: number;
	draws: number;
	losses: number;
	goalsFor: number;
	goalsAgainst: number;
	recent: Fixture[];
};

export function normalizeRivalryKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Avoid matching "Madrid" inside unrelated strings; require token / phrase hits. */
export function matchRivalry(opponent: string): RivalryDef | null {
	const key = normalizeRivalryKey(opponent);
	if (!key) return null;

	const hits = RIVALRIES.filter((r) =>
		r.matchers.some((m) => {
			const needle = normalizeRivalryKey(m);
			if (!needle) return false;
			if (needle === 'madrid') {
				// Real Madrid only — not Atlético Madrid (handled by atleti matchers first)
				return (
					key === 'madrid' ||
					key === 'real madrid' ||
					key.includes('real madrid') ||
					(/\bmadrid\b/.test(key) && !key.includes('atletico'))
				);
			}
			return key === needle || key.includes(needle);
		}),
	);

	if (!hits.length) return null;
	return hits.sort((a, b) => rivalryMatchPriority(b) - rivalryMatchPriority(a))[0]!;
}

export function fixtureKickoffMs(fixture: Pick<Fixture, 'date' | 'time'>): number | null {
	if (!fixture.date) return null;
	const t = (fixture.time?.trim() || '12:00:00').replace(/Z$/, '');
	const d = new Date(`${fixture.date}T${t}Z`);
	return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function isRivalryFixture(f: Fixture): RivalryDef | null {
	return matchRivalry(f.opponent);
}

/** Live rivalry → next upcoming rivalry → recent finished rivalry (≤ 4 days). */
export function resolveActiveRivalry(
	fixtures: Fixture[],
	liveMatch: Fixture | null,
	now = Date.now(),
): RivalryContext | null {
	if (liveMatch) {
		const rivalry = isRivalryFixture(liveMatch);
		if (rivalry) return { rivalry, fixture: liveMatch, phase: 'live' };
	}

	const upcoming = fixtures
		.filter((f) => f.kind === 'upcoming' || f.kind === 'live')
		.map((f) => ({ f, rivalry: isRivalryFixture(f), kick: fixtureKickoffMs(f) }))
		.filter((x): x is { f: Fixture; rivalry: RivalryDef; kick: number } => Boolean(x.rivalry) && x.kick != null)
		.sort((a, b) => a.kick - b.kick);

	if (upcoming[0]) {
		return { rivalry: upcoming[0].rivalry, fixture: upcoming[0].f, phase: 'upcoming' };
	}

	const recentWindow = 4 * 24 * 60 * 60 * 1000;
	const recent = fixtures
		.filter((f) => f.kind === 'past')
		.map((f) => ({ f, rivalry: isRivalryFixture(f), kick: fixtureKickoffMs(f) }))
		.filter(
			(x): x is { f: Fixture; rivalry: RivalryDef; kick: number } =>
				Boolean(x.rivalry) && x.kick != null && now - x.kick >= 0 && now - x.kick <= recentWindow,
		)
		.sort((a, b) => b.kick - a.kick);

	if (recent[0]) {
		return { rivalry: recent[0].rivalry, fixture: recent[0].f, phase: 'recent' };
	}

	return null;
}

/** Next rivalry on the calendar even if not "active" yet (horizon strip). */
export function findNextRivalryFixture(fixtures: Fixture[]): RivalryContext | null {
	const upcoming = fixtures
		.filter((f) => f.kind === 'upcoming')
		.map((f) => ({ f, rivalry: isRivalryFixture(f), kick: fixtureKickoffMs(f) }))
		.filter((x): x is { f: Fixture; rivalry: RivalryDef; kick: number } => Boolean(x.rivalry) && x.kick != null)
		.sort((a, b) => a.kick - b.kick);
	if (!upcoming[0]) return null;
	return { rivalry: upcoming[0].rivalry, fixture: upcoming[0].f, phase: 'upcoming' };
}

export function computeRivalryH2H(fixtures: Fixture[], rivalry: RivalryDef): RivalryH2H {
	const matches = fixtures
		.filter((f) => f.kind === 'past' && matchRivalry(f.opponent)?.id === rivalry.id)
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

export type CountdownParts = {
	totalMs: number;
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	expired: boolean;
};

export function countdownParts(targetMs: number, now = Date.now()): CountdownParts {
	const totalMs = Math.max(0, targetMs - now);
	const expired = totalMs <= 0;
	const sec = Math.floor(totalMs / 1000);
	return {
		totalMs,
		days: Math.floor(sec / 86_400),
		hours: Math.floor((sec % 86_400) / 3600),
		minutes: Math.floor((sec % 3600) / 60),
		seconds: sec % 60,
		expired,
	};
}

/** Activate full theme when kickoff is within this window (or live / just finished). */
export const RIVALRY_THEME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function shouldApplyRivalryTheme(ctx: RivalryContext | null, now = Date.now()): boolean {
	if (!ctx) return false;
	if (ctx.phase === 'live' || ctx.phase === 'recent') return true;
	const kick = fixtureKickoffMs(ctx.fixture);
	if (kick == null) return false;
	return kick - now <= RIVALRY_THEME_WINDOW_MS && kick - now >= -RIVALRY_THEME_WINDOW_MS;
}
