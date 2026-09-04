import type { Player, TimelineEvent } from '../types';

export type BenchSubStatus = 'ON' | 'OFF';

function normalizePlayerKey(name: string) {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function lastToken(name: string) {
	const parts = normalizePlayerKey(name).split(' ').filter(Boolean);
	return parts[parts.length - 1] ?? '';
}

function minuteSortKey(minute: string) {
	const n = parseInt(minute.replace(/[^\d]/g, ''), 10);
	return Number.isNaN(n) ? 0 : n;
}

function dedupePlayers(players: Player[]): Player[] {
	const seen = new Set<string>();
	const out: Player[] = [];
	for (const p of players) {
		if (seen.has(p.id)) continue;
		seen.add(p.id);
		out.push(p);
	}
	return out;
}

export function playerMatchesEventName(player: Player, eventName: string) {
	return findPlayerByEventName([player], eventName) != null;
}

/** Strict match — returns undefined when ambiguous (e.g. two Garcías). */
export function findPlayerByEventName(players: Player[], eventName: string): Player | undefined {
	if (!players.length || !eventName.trim()) return undefined;

	const eventKey = normalizePlayerKey(eventName);
	const exact = players.filter((p) => normalizePlayerKey(p.name) === eventKey);
	if (exact.length === 1) return exact[0];

	const token = lastToken(eventName);
	if (token.length >= 3) {
		const byLast = players.filter((p) => lastToken(p.name) === token);
		if (byLast.length === 1) return byLast[0];
	}

	return undefined;
}

function dedupeSubEvents(events: TimelineEvent[]): TimelineEvent[] {
	const seen = new Set<string>();
	const out: TimelineEvent[] = [];
	for (const ev of events) {
		if (!ev.type.toLowerCase().includes('substitution')) continue;
		if (!ev.team.toLowerCase().includes('barcelona')) continue;
		if (ev.detail !== 'On' && ev.detail !== 'Off') continue;
		const key = `${minuteSortKey(ev.minute)}|${ev.detail}|${normalizePlayerKey(ev.player)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(ev);
	}
	return out;
}

/** Latest sub state per Barça player from live timeline events. */
export function buildBarcaSubStatus(events: TimelineEvent[]): Map<string, BenchSubStatus> {
	const map = new Map<string, BenchSubStatus>();
	for (const ev of dedupeSubEvents(events)) {
		const status: BenchSubStatus = ev.detail === 'On' ? 'ON' : 'OFF';
		map.set(normalizePlayerKey(ev.player), status);
	}
	return map;
}

export function benchSubStatusFor(player: Player, statusMap: Map<string, BenchSubStatus>): BenchSubStatus | null {
	if (statusMap.size === 0) return null;

	const full = normalizePlayerKey(player.name);
	if (statusMap.has(full)) return statusMap.get(full)!;

	const last = lastToken(player.name);
	if (!last) return null;

	for (const [key, status] of statusMap) {
		if (lastToken(key) === last) return status;
	}
	return null;
}

/**
 * Apply live subs only when lineup is not from an official live refresh.
 * Rebuilds bench as squad − on-pitch (never appends duplicates).
 */
export function applyLiveSubstitutions(
	starters: Player[],
	bench: Player[],
	events: TimelineEvent[],
): { starters: Player[]; bench: Player[] } {
	const subs = dedupeSubEvents(events);
	const squad = dedupePlayers([...starters, ...bench]);
	let onPitch = dedupePlayers(starters).slice(0, 11);

	if (subs.length === 0) {
		const pitchIds = new Set(onPitch.map((p) => p.id));
		return { starters: onPitch, bench: squad.filter((p) => !pitchIds.has(p.id)) };
	}

	const groups = new Map<number, { on: string[]; off: string[] }>();
	for (const ev of subs) {
		const mk = minuteSortKey(ev.minute);
		const group = groups.get(mk) ?? { on: [], off: [] };
		if (ev.detail === 'On') {
			if (!group.on.includes(ev.player)) group.on.push(ev.player);
		} else if (!group.off.includes(ev.player)) {
			group.off.push(ev.player);
		}
		groups.set(mk, group);
	}

	const onPitchIds = () => new Set(onPitch.map((p) => p.id));

	for (const minute of [...groups.keys()].sort((a, b) => a - b)) {
		const { on, off } = groups.get(minute)!;
		const swaps = Math.min(on.length, off.length);
		for (let i = 0; i < swaps; i++) {
			const offPlayer = findPlayerByEventName(onPitch, off[i]);
			const benchPool = squad.filter((p) => !onPitchIds().has(p.id));
			const onPlayer = findPlayerByEventName(benchPool, on[i]);
			if (!offPlayer || !onPlayer) continue;
			onPitch = onPitch.map((p) => (p.id === offPlayer.id ? onPlayer : p));
		}
	}

	onPitch = dedupePlayers(onPitch).slice(0, 11);
	const pitchIds = new Set(onPitch.map((p) => p.id));
	const currentBench = squad.filter((p) => !pitchIds.has(p.id));

	return { starters: onPitch, bench: currentBench };
}

function benchPopupStyle(rect: DOMRect) {
	const pad = 12;
	const centerX = rect.left + rect.width / 2;
	const top = rect.top - pad;
	const flipBelow = top < 120;
	return {
		position: 'fixed' as const,
		left: Math.min(Math.max(centerX, pad), window.innerWidth - pad),
		top: flipBelow ? rect.bottom + pad : top,
		transform: flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
		zIndex: 120,
	};
}

export { benchPopupStyle };
