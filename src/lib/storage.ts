const KEY = 'culers-ratings';
const AVG_KEY = 'culers-rating-averages';

export type CommunityAvg = {
	sum: number;
	count: number;
};

export type CommunityAverages = Record<string, CommunityAvg>;

export function loadRatings(): Record<string, import('../types').MatchRatings> {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

export function saveRatings(data: Record<string, import('../types').MatchRatings>) {
	localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadCommunityAverages(): CommunityAverages {
	try {
		const raw = localStorage.getItem(AVG_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

/** Running local “community” average — updated every time you save a match rating. */
export function recordCommunityRatings(players: { playerId: string; rating: number }[]) {
	const avgs = loadCommunityAverages();
	for (const p of players) {
		const cur = avgs[p.playerId] ?? { sum: 0, count: 0 };
		avgs[p.playerId] = { sum: cur.sum + p.rating, count: cur.count + 1 };
	}
	localStorage.setItem(AVG_KEY, JSON.stringify(avgs));
	return avgs;
}

export function communityAverageFor(avgs: CommunityAverages, playerId: string): number | null {
	const cur = avgs[playerId];
	if (!cur || cur.count < 1) return null;
	return Math.round((cur.sum / cur.count) * 10) / 10;
}

export function loadLastFetch(): import('../types').FetchPayload | null {
	try {
		const raw = localStorage.getItem('culers-last-fetch');
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function saveLastFetch(data: import('../types').FetchPayload) {
	localStorage.setItem('culers-last-fetch', JSON.stringify(data));
}
