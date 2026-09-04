import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { fetchAll, fetchLive, isFinished, isFixtureLive, isLiveStatus, LIVE_POLL_MS } from '../lib/api';
import { loadLastFetch, loadRatings, recordCommunityRatings, saveLastFetch, saveRatings } from '../lib/storage';
import type { CommunityAverages } from '../lib/storage';
import type {
	FetchPayload,
	Fixture,
	MatchRatings,
	Player,
	PlayerRating,
	Tab,
} from '../types';
import type { OnThisDayEvent } from '../data/onThisDay';

export type PlayerOpenOrigin = { x: number; y: number };

export type LegendClubStat = {
	label: string;
	value: string;
};

export type PlayerStatsContext =
	| { mode: 'career'; initialTab?: 'season' | 'career' }
	| { mode: 'live'; fixtureId: string }
	/** Static club-record card for La Masia alumni (no live API). */
	| {
			mode: 'legend';
			years: string;
			legacy: string;
			generation: string;
			stats: LegendClubStat[];
	  };

type State = {
	tab: Tab;
	data: FetchPayload | null;
	ratings: Record<string, MatchRatings>;
	selectedMatchId: string | null;
	selectedMatchSummary: Fixture | null;
	selectedOnThisDay: OnThisDayEvent | null;
	selectedOnThisDayExact: boolean;
	selectedPlayer: Player | null;
	playerOpenOrigin: PlayerOpenOrigin | null;
	playerStatsContext: PlayerStatsContext;
	fetching: boolean;
	livePolling: boolean;
	fetchError: string | null;
	lastLiveAt: string | null;
};

type Actions = {
	setTab: (tab: Tab) => void;
	selectMatch: (id: string | null) => void;
	fetchLatest: () => Promise<void>;
	goLive: () => void;
	stopLive: () => void;
	refreshLiveScore: () => void;
	saveMatchRatings: (
		matchId: string,
		payload: Omit<MatchRatings, 'matchId' | 'updatedAt'>,
	) => CommunityAverages | void;
	openPlayerStats: (player: Player, origin?: PlayerOpenOrigin, context?: PlayerStatsContext) => void;
	closePlayerStats: () => void;
	openMatchSummary: (fixture: Fixture) => void;
	closeMatchSummary: () => void;
	openOnThisDay: (event: OnThisDayEvent, exact?: boolean) => void;
	closeOnThisDay: () => void;
	openFixture: (fixture: Fixture) => void;
};

const Ctx = createContext<(State & Actions) | null>(null);

export function BarcaProvider({ children }: { children: ReactNode }) {
	const [tab, setTab] = useState<Tab>('home');
	const [data, setData] = useState<FetchPayload | null>(() => {
		const cached = loadLastFetch();
		if (cached && (!cached.lineup || !cached.footballNews)) return null;
		return cached;
	});
	const [ratings, setRatings] = useState<Record<string, MatchRatings>>(() => loadRatings());
	const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
	const [selectedMatchSummary, setSelectedMatchSummary] = useState<Fixture | null>(null);
	const [selectedOnThisDay, setSelectedOnThisDay] = useState<OnThisDayEvent | null>(null);
	const [selectedOnThisDayExact, setSelectedOnThisDayExact] = useState(false);
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
	const [playerOpenOrigin, setPlayerOpenOrigin] = useState<PlayerOpenOrigin | null>(null);
	const [playerStatsContext, setPlayerStatsContext] = useState<PlayerStatsContext>({ mode: 'career' });
	const [fetching, setFetching] = useState(false);
	const [livePolling, setLivePolling] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [lastLiveAt, setLastLiveAt] = useState<string | null>(null);
	const pollRef = useRef<number | null>(null);
	const liveManualOff = useRef(false);
	const didInitialLiveRefresh = useRef(false);

	const fetchLatest = useCallback(async () => {
		setFetching(true);
		setFetchError(null);
		try {
			const payload = await fetchAll();
			setData(payload);
			saveLastFetch(payload);
			if (payload.live.match?.id) {
				setSelectedMatchId((prev) => prev ?? payload.live.match!.id);
			}
		} catch (err) {
			setFetchError(err instanceof Error ? err.message : 'Fetch failed');
		} finally {
			setFetching(false);
		}
	}, []);

	const pollLive = useCallback(async () => {
		try {
			const live = await fetchLive();
			setLastLiveAt(new Date().toISOString());
			setFetchError(null);
			setData((prev) => {
				if (!prev) return prev;
				let fixtures = prev.fixtures;
				if (live.match) {
					const exists = fixtures.some((f) => f.id === live.match!.id);
					if (exists) {
						fixtures = fixtures.map((f) => (f.id === live.match!.id ? { ...f, ...live.match! } : f));
					} else {
						fixtures = [...fixtures, live.match];
					}
				}
				const next = { ...prev, live, fixtures };
				saveLastFetch(next);
				return next;
			});
			if (live.live && live.match?.id) {
				setSelectedMatchId((prev) => prev ?? live.match!.id);
			}
		} catch {
			/* keep polling */
		}
	}, []);

	const selectMatch = useCallback((id: string | null) => {
		setSelectedMatchId(id);
	}, []);

	const startLivePolling = useCallback(() => {
		if (pollRef.current) window.clearInterval(pollRef.current);
		setLivePolling(true);
		void pollLive();
		pollRef.current = window.setInterval(() => void pollLive(), LIVE_POLL_MS);
	}, [pollLive]);

	const goLive = useCallback(() => {
		liveManualOff.current = false;
		setTab('match');
		if (data?.live.match?.id) {
			setSelectedMatchId(data.live.match.id);
		}
		startLivePolling();
	}, [startLivePolling, data?.live.match?.id]);

	const stopLive = useCallback(() => {
		liveManualOff.current = true;
		setLivePolling(false);
		if (pollRef.current) {
			window.clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (!data || didInitialLiveRefresh.current) return;
		didInitialLiveRefresh.current = true;
		const needsRefresh =
			data.live.live ||
			Boolean(data.live.match) ||
			data.fixtures.some((f) => isLiveStatus(f.status) && !isFinished(f.status));
		if (needsRefresh) void pollLive();
	}, [data, pollLive]);

	useEffect(() => {
		if (!data) return;
		const activeFixture = data.fixtures.find((f) => f.id === selectedMatchId) ?? data.live.match;
		const isLiveNow =
			data.live.live ||
			(activeFixture ? isLiveStatus(activeFixture.status) && !isFinished(activeFixture.status) : false);

		if (!isLiveNow) {
			if (livePolling) stopLive();
			liveManualOff.current = false;
			return;
		}
		if (!liveManualOff.current && !livePolling) {
			startLivePolling();
		}
	}, [data, selectedMatchId, livePolling, startLivePolling, stopLive]);

	useEffect(() => {
		return () => {
			if (pollRef.current) window.clearInterval(pollRef.current);
		};
	}, []);

	const saveMatchRatings = useCallback(
		(matchId: string, payload: Omit<MatchRatings, 'matchId' | 'updatedAt'>) => {
			const entry: MatchRatings = {
				matchId,
				...payload,
				updatedAt: new Date().toISOString(),
			};
			setRatings((prev) => {
				const next = { ...prev, [matchId]: entry };
				saveRatings(next);
				return next;
			});
			return recordCommunityRatings(payload.players);
		},
		[],
	);

	const value = useMemo(
		() => ({
			tab,
			data,
			ratings,
			selectedMatchId,
			selectedMatchSummary,
			selectedOnThisDay,
			selectedOnThisDayExact,
			selectedPlayer,
			playerOpenOrigin,
			playerStatsContext,
			fetching,
			livePolling,
			fetchError,
			lastLiveAt,
			setTab,
			selectMatch,
			fetchLatest,
			goLive,
			stopLive,
			refreshLiveScore: () => void pollLive(),
			saveMatchRatings,
			openPlayerStats: (player: Player, origin?: PlayerOpenOrigin, context?: PlayerStatsContext) => {
				setSelectedPlayer(player);
				setPlayerStatsContext(context ?? { mode: 'career' });
				setPlayerOpenOrigin(
					origin ?? { x: window.innerWidth * 0.22, y: window.innerHeight * 0.78 },
				);
			},
			closePlayerStats: () => {
				setSelectedPlayer(null);
				setPlayerOpenOrigin(null);
				setPlayerStatsContext({ mode: 'career' });
			},
			openMatchSummary: (fixture: Fixture) => {
				setSelectedMatchSummary(fixture);
			},
			closeMatchSummary: () => {
				setSelectedMatchSummary(null);
			},
			openOnThisDay: (event: OnThisDayEvent, exact = false) => {
				setSelectedOnThisDay(event);
				setSelectedOnThisDayExact(exact);
			},
			closeOnThisDay: () => {
				setSelectedOnThisDay(null);
				setSelectedOnThisDayExact(false);
			},
			openFixture: (fixture: Fixture) => {
				if (isFixtureLive(fixture)) {
					setSelectedMatchId(fixture.id);
					setTab('match');
					return;
				}
				setSelectedMatchSummary(fixture);
			},
		}),
		[
			tab,
			data,
			ratings,
			selectedMatchId,
			selectedMatchSummary,
			selectedOnThisDay,
			selectedOnThisDayExact,
			selectedPlayer,
			playerOpenOrigin,
			playerStatsContext,
			fetching,
			livePolling,
			fetchError,
			lastLiveAt,
			fetchLatest,
			goLive,
			stopLive,
			pollLive,
			saveMatchRatings,
			selectMatch,
		],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBarca() {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error('useBarca must be used within BarcaProvider');
	return ctx;
}

export function useSelectedFixture(): Fixture | null {
	const { data, selectedMatchId } = useBarca();
	if (!data || !selectedMatchId) return null;
	return data.fixtures.find((f) => f.id === selectedMatchId) ?? data.live.match;
}

export function emptyPlayerRatings(
	players: { id: string; name: string; position: string }[],
): PlayerRating[] {
	return players.map((p) => ({
		playerId: p.id,
		name: p.name,
		position: p.position,
		rating: 6,
		note: '',
	}));
}
