import type { FetchPayload, InstagramFeed, LineupData, LiveData, MatchSummary, PlayerMatchStats, PlayerStats, SocialHubData, XFeed } from '../types';

export const LIVE_POLL_MS = 10_000;

const IST = 'Asia/Kolkata';

function parseFixtureUtc(date: string, time?: string): Date | null {
	if (!date) return null;
	const t = (time?.trim() || '12:00:00').replace(/Z$/, '');
	const d = new Date(`${date}T${t}Z`);
	return Number.isNaN(d.getTime()) ? null : d;
}

const FETCH_ALL_TIMEOUT_MS = 120_000;

export async function fetchAll(): Promise<FetchPayload> {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), FETCH_ALL_TIMEOUT_MS);

	let res: Response;
	try {
		res = await fetch('/api/fetch-all', { signal: controller.signal });
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			throw new Error('Fetch timed out — lineup sources may be slow. Try again.');
		}
		throw new Error(
			'Cannot reach Culers — start the dev server (npm run dev in culers/, port 5175).',
		);
	} finally {
		window.clearTimeout(timeout);
	}

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { error?: string } | null;
		throw new Error(body?.error ?? `Fetch failed (${res.status})`);
	}
	return res.json();
}

export async function fetchLive(): Promise<LiveData> {
	const res = await fetch('/api/live');
	if (!res.ok) throw new Error('Failed to fetch live data');
	return res.json();
}

export async function fetchPlayerMatchStats(fcbId: number, fixtureId: string): Promise<PlayerMatchStats> {
	const res = await fetch(
		`/api/player-match-stats?fcbId=${fcbId}&fixtureId=${encodeURIComponent(fixtureId)}`,
	);
	if (!res.ok) throw new Error('Failed to fetch live match player stats');
	return res.json();
}

export async function fetchPlayerStats(fcbId: number): Promise<PlayerStats> {
	const res = await fetch(`/api/player-stats?fcbId=${fcbId}`);
	if (!res.ok) throw new Error('Failed to fetch player stats');
	return res.json();
}

export async function fetchMatchSummary(fixtureId: string): Promise<MatchSummary> {
	const res = await fetch(`/api/match-summary?fixtureId=${encodeURIComponent(fixtureId)}`);
	if (!res.ok) throw new Error('Failed to fetch match summary');
	return res.json();
}

export async function fetchLineup(fixtureId?: string): Promise<LineupData> {
	const qs = fixtureId ? `?fixtureId=${encodeURIComponent(fixtureId)}` : '';
	const res = await fetch(`/api/lineup${qs}`);
	if (!res.ok) throw new Error('Failed to fetch lineup');
	return res.json();
}

export async function fetchSocialHub(): Promise<SocialHubData> {
	const res = await fetch('/api/social');
	if (!res.ok) throw new Error('Failed to fetch social stats');
	return res.json();
}

export async function fetchInstagramFeed(): Promise<InstagramFeed> {
	const res = await fetch('/api/social/instagram');
	if (!res.ok) throw new Error('Failed to fetch Instagram feed');
	return res.json();
}

export async function fetchXFeed(): Promise<XFeed> {
	const res = await fetch('/api/social/x');
	if (!res.ok) throw new Error('Failed to fetch X feed');
	return res.json();
}

export function formatDate(date: string, time?: string) {
	const d = parseFixtureUtc(date, time);
	if (!d) return 'TBD';
	return d.toLocaleDateString('en-IN', {
		timeZone: IST,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export function formatTime(time?: string, date?: string) {
	if (!time || !date) return '';
	const d = parseFixtureUtc(date, time);
	if (!d) return time;
	return d.toLocaleTimeString('en-IN', {
		timeZone: IST,
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}

export function formatDateTime(iso: string) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleString('en-IN', {
		timeZone: IST,
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

export function formatCalendarDate(date: string) {
	const d = parseFixtureUtc(date);
	if (!d) return date;
	return d.toLocaleDateString('en-IN', {
		timeZone: IST,
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	});
}

export function formatMonthYear(year: number, month: number) {
	return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-IN', {
		timeZone: IST,
		month: 'long',
		year: 'numeric',
	});
}

export function formatShortDate(date: string, time?: string) {
	const d = parseFixtureUtc(date, time);
	if (!d) return date.slice(5).replace('-', '/');
	return d.toLocaleDateString('en-IN', {
		timeZone: IST,
		day: '2-digit',
		month: '2-digit',
	});
}

export function formatFixtureWhen(date: string, time?: string) {
	const when = formatDate(date, time);
	const t = formatTime(time, date);
	return t ? `${when} · ${t} IST` : when;
}

export function isLiveStatus(status: string) {
	const s = status.toLowerCase();
	return (
		s.includes('live') ||
		s.includes('1h') ||
		s.includes('2h') ||
		s.includes('ht') ||
		s.includes('in play') ||
		s.includes('extra')
	);
}

export function isFixtureLive(fixture: { kind?: string; status: string }) {
	return fixture.kind === 'live' || isLiveStatus(fixture.status);
}

/** Only fixtures that are live right now open Match Day. */
export function fixtureOpensMatchDay(fixture: { kind?: string; status: string }) {
	return isFixtureLive(fixture);
}

export function isFinished(status: string) {
	const s = status.toLowerCase();
	return s.includes('finished') || s === 'ft' || s.includes('aet') || s.includes('pen');
}

export function barcaScore(fixture: { isHome: boolean; homeScore: number | null; awayScore: number | null }) {
	if (fixture.homeScore == null || fixture.awayScore == null) return null;
	return fixture.isHome ? fixture.homeScore : fixture.awayScore;
}

export function opponentScore(fixture: { isHome: boolean; homeScore: number | null; awayScore: number | null }) {
	if (fixture.homeScore == null || fixture.awayScore == null) return null;
	return fixture.isHome ? fixture.awayScore : fixture.homeScore;
}

export function resultLabel(fixture: {
	isHome: boolean;
	homeScore: number | null;
	awayScore: number | null;
	status: string;
}) {
	if (!isFinished(fixture.status) || fixture.homeScore == null || fixture.awayScore == null) {
		return null;
	}
	const us = barcaScore(fixture)!;
	const them = opponentScore(fixture)!;
	if (us > them) return 'W';
	if (us < them) return 'L';
	return 'D';
}

export const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Forward'];

export function sortPlayers<T extends { position: string; name: string }>(players: T[]) {
	return [...players].sort((a, b) => {
		const ai = POSITION_ORDER.findIndex((p) => a.position.includes(p));
		const bi = POSITION_ORDER.findIndex((p) => b.position.includes(p));
		if (ai !== bi) return ai - bi;
		return a.name.localeCompare(b.name);
	});
}
