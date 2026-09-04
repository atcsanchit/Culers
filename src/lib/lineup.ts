import type { Player } from '../types';

export type PitchSlot =
	| 'GK'
	| 'LB'
	| 'LCB'
	| 'RCB'
	| 'RB'
	| 'CDM'
	| 'LCM'
	| 'RCM'
	| 'LW'
	| 'ST'
	| 'RW';

export type PitchPlayer = {
	player: Player;
	slot: PitchSlot;
	x: number;
	y: number;
	isSubstitute?: boolean;
};

export const FORMATION_433: Array<{ slot: PitchSlot; x: number; y: number }> = [
	{ slot: 'GK', x: 50, y: 92 },
	{ slot: 'LB', x: 14, y: 74 },
	{ slot: 'LCB', x: 36, y: 77 },
	{ slot: 'RCB', x: 64, y: 77 },
	{ slot: 'RB', x: 86, y: 74 },
	{ slot: 'CDM', x: 50, y: 58 },
	{ slot: 'LCM', x: 28, y: 50 },
	{ slot: 'RCM', x: 72, y: 50 },
	{ slot: 'LW', x: 16, y: 26 },
	{ slot: 'ST', x: 50, y: 20 },
	{ slot: 'RW', x: 84, y: 26 },
];

export const FORMATION_4231: Array<{ slot: PitchSlot; x: number; y: number }> = [
	{ slot: 'GK', x: 50, y: 92 },
	{ slot: 'LB', x: 14, y: 74 },
	{ slot: 'LCB', x: 36, y: 77 },
	{ slot: 'RCB', x: 64, y: 77 },
	{ slot: 'RB', x: 86, y: 74 },
	{ slot: 'LCM', x: 38, y: 56 },
	{ slot: 'RCM', x: 62, y: 56 },
	{ slot: 'LW', x: 16, y: 34 },
	{ slot: 'CDM', x: 50, y: 44 },
	{ slot: 'RW', x: 84, y: 34 },
	{ slot: 'ST', x: 50, y: 18 },
];

export const FORMATION_4123: Array<{ slot: PitchSlot; x: number; y: number }> = [
	{ slot: 'GK', x: 50, y: 92 },
	{ slot: 'LB', x: 14, y: 74 },
	{ slot: 'LCB', x: 36, y: 77 },
	{ slot: 'RCB', x: 64, y: 77 },
	{ slot: 'RB', x: 86, y: 74 },
	{ slot: 'CDM', x: 50, y: 60 },
	{ slot: 'LCM', x: 30, y: 46 },
	{ slot: 'RCM', x: 70, y: 46 },
	{ slot: 'LW', x: 16, y: 24 },
	{ slot: 'ST', x: 50, y: 18 },
	{ slot: 'RW', x: 84, y: 24 },
];

export type FormationKey = '4-3-3' | '4-2-3-1' | '4-1-2-3';

const FORMATIONS: Record<FormationKey, typeof FORMATION_433> = {
	'4-3-3': FORMATION_433,
	'4-2-3-1': FORMATION_4231,
	'4-1-2-3': FORMATION_4123,
};

/** Preferred starters per slot when news signals are weak (normalized last names). */
export const SLOT_DEFAULTS: Record<PitchSlot, string[]> = {
	GK: ['ter stegen', 'joan garcia', 'pena', 'szczesny', 'garcia'],
	LB: ['balde', 'martin', 'torrents'],
	LCB: ['cubarsi', 'araujo', 'garcia'],
	RCB: ['christensen', 'kounde', 'araujo', 'cubarsi'],
	RB: ['kounde', 'espart', 'balde'],
	CDM: ['rodri', 'casado', 'bernal', 'de jong'],
	LCM: ['pedri', 'fermin', 'olmo', 'de jong'],
	RCM: ['pedri', 'fermin', 'casado', 'olmo'],
	LW: ['raphinha', 'rashford', 'torres'],
	ST: ['lewandowski', 'adeyemi', 'torres'],
	RW: ['yamal', 'raphinha', 'bardghji', 'rashford'],
};

export function normalizeName(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function playerMatchesText(player: Player, text: string) {
	const hay = normalizeName(text);
	const full = normalizeName(player.name);
	if (hay.includes(full)) return true;
	const parts = full.split(' ').filter((p) => p.length > 2);
	const last = parts[parts.length - 1];
	if (last && last.length > 3 && hay.includes(last)) return true;
	const first = parts[0];
	if (first && first.length > 3 && hay.includes(first)) return true;
	return false;
}

function slotPatterns(slot: PitchSlot): RegExp[] {
	switch (slot) {
		case 'GK':
			return [/goalkeeper/];
		case 'LB':
			return [/left full back/, /left.back/, /left wing.back/];
		case 'LCB':
		case 'RCB':
			return [/central defender/, /centre.back/, /center.back/, /centre central defender/];
		case 'RB':
			return [/right full back/, /right.back/, /right wing.back/];
		case 'CDM':
			return [/defensive midfield/, /centre defensive/, /center defensive/];
		case 'LCM':
		case 'RCM':
			return [
				/centre central midfield/,
				/center central midfield/,
				/central midfield/,
				/attacking midfield/,
				/midfielder/,
			];
		case 'LW':
			return [/left winger/, /left wing(?!\s*back)/, /left\/right winger/];
		case 'RW':
			return [/right winger/, /right wing(?!\s*back)/, /left\/right winger/];
		case 'ST':
			return [/centre striker/, /center striker/, /striker/, /^forward$/];
		default:
			return [];
	}
}

export function slotFitScore(position: string, slot: PitchSlot, playerName = ''): number {
	const pos = position.toLowerCase();
	const name = normalizeName(playerName);

	for (const pattern of slotPatterns(slot)) {
		if (pattern.test(pos)) {
			let score = 10;
			if (slot === 'LW' && /left winger|left wing/.test(pos)) score += 5;
			if (slot === 'RW' && /right winger|right wing/.test(pos)) score += 5;
			if (slot === 'LW' && /left\/right/.test(pos) && /raphinha|rashford|gordon/.test(name)) score += 4;
			if (slot === 'RW' && /left\/right/.test(pos) && /yamal|bardghji/.test(name)) score += 4;
			if (slot === 'LB' && /left full back/.test(pos)) score += 8;
			if (slot === 'RB' && /right full back/.test(pos)) score += 8;
			if (slot === 'CDM' && /defensive/.test(pos)) score += 6;
			return score;
		}
	}

	if (slot === 'LW' || slot === 'RW' || slot === 'ST') {
		if (/winger|striker|forward|attacking/.test(pos)) return 4;
	}
	if (slot === 'LCM' || slot === 'RCM' || slot === 'CDM') {
		if (/midfield/.test(pos)) return 4;
	}
	if (slot === 'LB' || slot === 'RB' || slot === 'LCB' || slot === 'RCB') {
		if (/defender|back/.test(pos)) return 4;
	}
	if (slot === 'GK' && /goalkeeper/.test(pos)) return 10;

	return 0;
}

function defaultBoost(slot: PitchSlot, playerName: string): number {
	const name = normalizeName(playerName);
	const prefs = SLOT_DEFAULTS[slot];
	for (let i = 0; i < prefs.length; i++) {
		if (name.includes(prefs[i])) return (prefs.length - i) * 20;
	}
	return 0;
}

export function assignToFormation(players: Player[], formation: FormationKey = '4-3-3'): PitchPlayer[] {
	const slots = FORMATIONS[formation] ?? FORMATION_433;
	const used = new Set<string>();
	const result: PitchPlayer[] = [];

	for (const { slot, x, y } of slots) {
		let best: { player: Player; score: number } | null = null;

		for (const player of players) {
			if (used.has(player.id)) continue;
			const score = slotFitScore(player.position, slot, player.name) + defaultBoost(slot, player.name);
			if (score <= 0) continue;
			if (!best || score > best.score) best = { player, score };
		}

		if (!best) {
			for (const player of players) {
				if (used.has(player.id)) continue;
				const score = defaultBoost(slot, player.name);
				if (score > 0 && (!best || score > best.score)) best = { player, score };
			}
		}

		if (!best) {
			const fallback = players.find((p) => !used.has(p.id));
			if (!fallback) break;
			best = { player: fallback, score: 0 };
		}

		used.add(best.player.id);
		result.push({ player: best.player, slot, x, y });
	}

	return result;
}

export function pickElevenForFormation(
	pool: Player[],
	excludedIds: Set<string>,
	formation: FormationKey = '4-3-3',
	scoreFn?: (player: Player) => number,
): Player[] {
	const available = pool.filter((p) => !excludedIds.has(p.id));
	const assigned = assignToFormation(available, formation);
	const starters = assigned.map((a) => a.player);

	if (starters.length >= 11) return starters.slice(0, 11);

	const used = new Set(starters.map((p) => p.id));
	const scored = [...available]
		.filter((p) => !used.has(p.id))
		.sort((a, b) => (scoreFn?.(b) ?? 0) - (scoreFn?.(a) ?? 0));

	for (const p of scored) {
		if (starters.length >= 11) break;
		starters.push(p);
	}

	return starters.slice(0, 11);
}

export function isMatchDay(dateStr: string) {
	if (!dateStr) return false;
	const today = new Date();
	const y = today.getFullYear();
	const m = String(today.getMonth() + 1).padStart(2, '0');
	const d = String(today.getDate()).padStart(2, '0');
	return dateStr === `${y}-${m}-${d}`;
}
