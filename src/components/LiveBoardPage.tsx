import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchLiveBoard, fetchLiveMatch, formatDateTime, LIVE_POLL_MS } from '../lib/api';
import type { LiveBoardDetail, LiveBoardGroupId, LiveBoardHub, LiveBoardMatch } from '../types';
import type { PlayerOpenOrigin } from '../store/BarcaState';
import { useBarca } from '../store/BarcaState';
import { LiveGraphic } from './LiveGraphic';
import { LiveMatchHoverCard } from './LiveMatchHoverCard';
import { MatchRatingsPitch } from './MatchRatingsPitch';
import type { RatedPitchPlayer } from '../types';

const GROUP_TABS: { id: LiveBoardGroupId; label: string }[] = [
	{ id: 'ucl', label: 'UCL' },
	{ id: 'uel', label: 'Europa' },
	{ id: 'europe', label: 'Leagues' },
	{ id: 'mls', label: 'MLS' },
	{ id: 'international', label: 'International' },
];

function scoreLabel(match: LiveBoardMatch) {
	if (/finished|closed|ended/i.test(match.status)) {
		if (match.homeScore == null || match.awayScore == null) return 'FT';
		return `${match.homeScore}–${match.awayScore}`;
	}
	if (/inprogress|live/i.test(match.status)) {
		if (match.homeScore == null || match.awayScore == null) return 'LIVE';
		return `${match.homeScore}–${match.awayScore}`;
	}
	return 'vs';
}

function hoursAgo(ts: number, finished = false) {
	if (!ts) return '';
	const end = finished ? ts + 105 * 60 : ts;
	const hours = Math.max(0, Math.round((Date.now() / 1000 - end) / 3600));
	if (hours < 1) return 'Just finished';
	if (hours === 1) return '1 hour ago';
	return `${hours} hours ago`;
}

function kickoffLabel(ts: number) {
	if (!ts) return 'Upcoming';
	const d = new Date(ts * 1000);
	if (Number.isNaN(d.getTime())) return 'Upcoming';
	return d.toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}

function leagueName(match: LiveBoardMatch) {
	return match.competition.trim() || 'Other';
}

/** Section = league; group matches under competition names. */
function groupByLeague(matches: LiveBoardMatch[], ascending = false) {
	const map = new Map<string, LiveBoardMatch[]>();
	for (const match of matches) {
		const key = leagueName(match);
		const list = map.get(key);
		if (list) list.push(match);
		else map.set(key, [match]);
	}
	return [...map.entries()]
		.sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
		.map(([league, rows]) => ({
			league,
			matches: [...rows].sort((a, b) =>
				ascending ? a.startTimestamp - b.startTimestamp : b.startTimestamp - a.startTimestamp,
			),
		}));
}

function tabSlice(hub: LiveBoardHub | null, tab: LiveBoardGroupId) {
	const live = hub?.groups.find((g) => g.id === tab)?.matches ?? [];
	const history = hub?.history.find((g) => g.id === tab)?.matches ?? [];
	const upcoming = hub?.upcoming?.find((g) => g.id === tab)?.matches ?? [];
	return { live, history, upcoming, total: live.length + history.length + upcoming.length };
}

function firstMatchId(hub: LiveBoardHub | null, tab: LiveBoardGroupId) {
	const slice = tabSlice(hub, tab);
	return slice.live[0]?.id ?? slice.upcoming[0]?.id ?? slice.history[0]?.id ?? null;
}

function matchStillExists(hub: LiveBoardHub, id: number) {
	return (
		hub.groups.some((g) => g.matches.some((m) => m.id === id)) ||
		hub.history.some((g) => g.matches.some((m) => m.id === id)) ||
		(hub.upcoming ?? []).some((g) => g.matches.some((m) => m.id === id))
	);
}

function leagueKey(section: 'live' | 'ft' | 'up', league: string) {
	return `${section}:${league}`;
}

type LeagueBucket = { league: string; matches: LiveBoardMatch[] };

function LeagueGroup({
	section,
	bucket,
	collapsed,
	onToggle,
	children,
}: {
	section: 'live' | 'ft' | 'up';
	bucket: LeagueBucket;
	collapsed: boolean;
	onToggle: () => void;
	children: ReactNode;
}) {
	const panelId = `live-board-${section}-${bucket.league.replace(/\s+/g, '-').toLowerCase()}`;
	return (
		<div className={`live-board-league${collapsed ? ' is-collapsed' : ''}`}>
			<button
				type="button"
				className="live-board-league-toggle"
				aria-expanded={!collapsed}
				aria-controls={panelId}
				onClick={onToggle}
			>
				<span className="live-board-league-chevron" aria-hidden>
					{collapsed ? '▸' : '▾'}
				</span>
				<span className="live-board-league-name">{bucket.league}</span>
				<span className="live-board-league-count">{bucket.matches.length}</span>
			</button>
			{!collapsed && (
				<ul id={panelId} className="live-board-league-matches">
					{children}
				</ul>
			)}
		</div>
	);
}

export function LiveBoardPage() {
	const rootRef = useRef<HTMLDivElement>(null);
	const { openPlayerStats } = useBarca();
	const [hub, setHub] = useState<LiveBoardHub | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [groupTab, setGroupTab] = useState<LiveBoardGroupId>('ucl');
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [detail, setDetail] = useState<LiveBoardDetail | null>(null);
	/** Expanded league keys only — groups start closed. */
	const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(() => new Set());
	const [hoverMatch, setHoverMatch] = useState<LiveBoardMatch | null>(null);
	const [hoverAnchor, setHoverAnchor] = useState<{ top: number; left: number } | null>(null);
	const hoverCloseTimer = useRef<number | null>(null);

	const clearHoverCloseTimer = () => {
		if (hoverCloseTimer.current != null) {
			window.clearTimeout(hoverCloseTimer.current);
			hoverCloseTimer.current = null;
		}
	};

	const openHover = (match: LiveBoardMatch, el: HTMLElement) => {
		clearHoverCloseTimer();
		const rect = el.getBoundingClientRect();
		setHoverMatch(match);
		setHoverAnchor({ top: rect.top, left: rect.right + 14 });
	};

	const scheduleCloseHover = () => {
		clearHoverCloseTimer();
		hoverCloseTimer.current = window.setTimeout(() => {
			setHoverMatch(null);
			setHoverAnchor(null);
			hoverCloseTimer.current = null;
		}, 280);
	};

	const toggleLeague = (key: string) => {
		setExpandedLeagues((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	useEffect(() => {
		let cancelled = false;
		const load = () =>
			fetchLiveBoard()
				.then((next) => {
					if (cancelled) return;
					setHub(next);
					setError(null);
					setGroupTab((currentTab) => {
						const currentHas = tabSlice(next, currentTab).total > 0;
						if (currentHas) return currentTab;
						const withLive = GROUP_TABS.find((t) => (next.groups.find((g) => g.id === t.id)?.matches.length ?? 0) > 0);
						if (withLive) return withLive.id;
						const withAny = GROUP_TABS.find((t) => tabSlice(next, t.id).total > 0);
						return withAny?.id ?? currentTab;
					});
					setSelectedId((current) => {
						if (current && matchStillExists(next, current)) return current;
						return null;
					});
				})
				.catch(() => {
					if (!cancelled) setError('Could not load live matches.');
				});
		void load();
		const timer = window.setInterval(() => void load(), LIVE_POLL_MS * 2);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
			clearHoverCloseTimer();
		};
	}, []);

	const slice = useMemo(() => tabSlice(hub, groupTab), [hub, groupTab]);
	const liveByLeague = useMemo(() => groupByLeague(slice.live), [slice.live]);
	const historyByLeague = useMemo(() => groupByLeague(slice.history), [slice.history]);
	const upcomingByLeague = useMemo(() => groupByLeague(slice.upcoming, true), [slice.upcoming]);

	useEffect(() => {
		setHoverMatch(null);
		setHoverAnchor(null);
		// Reset — all league groups closed when switching competition tabs.
		setExpandedLeagues(new Set());
	}, [groupTab]);

	useEffect(() => {
		if (!hub) return;
		if (
			selectedId &&
			(slice.live.some((m) => m.id === selectedId) ||
				slice.history.some((m) => m.id === selectedId) ||
				slice.upcoming.some((m) => m.id === selectedId))
		) {
			return;
		}
		setSelectedId(firstMatchId(hub, groupTab));
	}, [hub, groupTab, selectedId, slice]);

	const selectedIsLive = Boolean(slice.live.some((match) => match.id === selectedId));
	const selectedIsUpcoming = Boolean(slice.upcoming.some((match) => match.id === selectedId));

	useEffect(() => {
		if (!selectedId) {
			setDetail(null);
			return;
		}
		let cancelled = false;
		const load = () =>
			fetchLiveMatch(selectedId)
				.then((next) => {
					if (!cancelled) setDetail(next);
				})
				.catch(() => {
					if (!cancelled) setDetail(null);
				});
		void load();
		if (!selectedIsLive) {
			return () => {
				cancelled = true;
			};
		}
		const timer = window.setInterval(() => void load(), LIVE_POLL_MS);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [selectedId, selectedIsLive]);

	const goFullScreen = () => {
		const el = rootRef.current;
		if (!el) return;
		if (document.fullscreenElement) {
			void document.exitFullscreen();
			return;
		}
		void el.requestFullscreen?.();
	};

	const openRated = (
		rated: RatedPitchPlayer,
		clickOrigin: PlayerOpenOrigin,
		fixtureId: string,
		teamName: string,
	) => {
		openPlayerStats(
			{
				id: rated.id,
				sofaId: rated.sofaId,
				name: rated.name,
				position: rated.position,
				number: rated.number,
				nationality: '',
				photo: rated.photo ?? '',
				birthDate: '',
				club: teamName,
			},
			clickOrigin,
			{ mode: selectedIsLive ? 'live' : 'match', fixtureId },
		);
	};

	const selected =
		slice.live.find((m) => m.id === selectedId) ??
		slice.upcoming.find((m) => m.id === selectedId) ??
		slice.history.find((m) => m.id === selectedId) ??
		detail?.match ??
		null;
	const fixtureId = selectedId ? String(selectedId) : '';
	const tabMeta = GROUP_TABS.find((t) => t.id === groupTab);
	const fullLabel = hub?.groups.find((g) => g.id === groupTab)?.label ?? tabMeta?.label ?? '';
	const hoverIsLive = Boolean(hoverMatch && slice.live.some((m) => m.id === hoverMatch.id));
	const hoverIsUpcoming = Boolean(hoverMatch && slice.upcoming.some((m) => m.id === hoverMatch.id));

	const renderMatchButton = (match: LiveBoardMatch, kind: 'live' | 'ft' | 'up') => (
		<li key={match.id}>
			<button
				type="button"
				className={`${kind === 'ft' ? 'is-ft' : ''}${kind === 'up' ? ' is-upcoming' : ''}${match.id === selectedId ? ' active' : ''}${hoverMatch?.id === match.id ? ' is-hovering' : ''}`}
				onClick={() => setSelectedId(match.id)}
				onMouseEnter={(e) => openHover(match, e.currentTarget)}
				onMouseLeave={scheduleCloseHover}
			>
				<strong>
					{match.homeTeam} {scoreLabel(match)} {match.awayTeam}
				</strong>
				<em>
					{kind === 'ft'
						? hoursAgo(match.startTimestamp, true)
						: kind === 'up'
							? kickoffLabel(match.startTimestamp)
							: match.clock}
				</em>
			</button>
		</li>
	);

	return (
		<div className="live-board-shell" ref={rootRef}>
			<header className="live-board-top">
				<div>
					<span className="panel-label">Live</span>
					<h1>Live matches</h1>
					<p className="muted">
						Pick a competition. Live games, upcoming kickoffs in the next 24 hours, then full-time from the last 24
						hours — including Barça.
					</p>
				</div>
				<div className="live-board-actions">
					{hub?.fetchedAt && <span className="muted">Updated {formatDateTime(hub.fetchedAt)}</span>}
					<button type="button" className="btn-ghost" onClick={goFullScreen}>
						Full screen
					</button>
				</div>
			</header>

			<nav className="live-board-subtabs" aria-label="Competitions">
				{GROUP_TABS.map((t) => {
					const n = tabSlice(hub, t.id).total;
					return (
						<button
							key={t.id}
							type="button"
							className={groupTab === t.id ? 'active' : ''}
							onClick={() => setGroupTab(t.id)}
						>
							{t.label}
							<span className="live-board-tab-count">{n}</span>
						</button>
					);
				})}
			</nav>

			{error && <p className="fetch-error">{error}</p>}
			{!hub && !error && <p className="muted loading-msg">Loading live board…</p>}
			{hub?.note && <p className="muted">{hub.note}</p>}

			<div className="live-board-layout">
				<aside className="live-board-list">
					{hub && slice.total === 0 && (
						<p className="muted live-board-empty">
							No live, next-24-hour, or last-24-hour {fullLabel || 'matches'} right now.
						</p>
					)}
					{slice.live.length > 0 && (
						<section>
							<h2>Live</h2>
							{liveByLeague.map((bucket) => {
								const key = leagueKey('live', bucket.league);
								return (
									<LeagueGroup
										key={key}
										section="live"
										bucket={bucket}
										collapsed={!expandedLeagues.has(key)}
										onToggle={() => toggleLeague(key)}
									>
										{bucket.matches.map((match) => renderMatchButton(match, 'live'))}
									</LeagueGroup>
								);
							})}
						</section>
					)}
					{slice.upcoming.length > 0 && (
						<section className={slice.live.length ? 'live-board-upcoming' : undefined}>
							<h2>Next 24 hours</h2>
							{upcomingByLeague.map((bucket) => {
								const key = leagueKey('up', bucket.league);
								return (
									<LeagueGroup
										key={key}
										section="up"
										bucket={bucket}
										collapsed={!expandedLeagues.has(key)}
										onToggle={() => toggleLeague(key)}
									>
										{bucket.matches.map((match) => renderMatchButton(match, 'up'))}
									</LeagueGroup>
								);
							})}
						</section>
					)}
					{slice.history.length > 0 && (
						<section className={slice.live.length || slice.upcoming.length ? 'live-board-history' : undefined}>
							<h2>Last 24 hours</h2>
							{historyByLeague.map((bucket) => {
								const key = leagueKey('ft', bucket.league);
								return (
									<LeagueGroup
										key={key}
										section="ft"
										bucket={bucket}
										collapsed={!expandedLeagues.has(key)}
										onToggle={() => toggleLeague(key)}
									>
										{bucket.matches.map((match) => renderMatchButton(match, 'ft'))}
									</LeagueGroup>
								);
							})}
						</section>
					)}
				</aside>

				<section className="live-board-detail">
					{!selected && <p className="muted">Select a live, upcoming, or last-24-hour match.</p>}
					{selected && (
						<>
							<div className="live-board-score pop-card">
								<span className="panel-label">{selected.competition}</span>
								<div className="live-board-score-row">
									<strong>{selected.homeTeam}</strong>
									<span>
										{selectedIsUpcoming
											? 'vs'
											: `${selected.homeScore ?? '–'} : ${selected.awayScore ?? '–'}`}
									</span>
									<strong>{selected.awayTeam}</strong>
								</div>
								<p className="muted">
									{selectedIsLive ? <span className="pulse" /> : null}{' '}
									{selectedIsLive
										? detail?.clock || selected.clock
										: selectedIsUpcoming
											? `Kick-off ${kickoffLabel(selected.startTimestamp)}`
											: 'Full time'}
									{!selectedIsLive && !selectedIsUpcoming && selected.startTimestamp
										? ` · ${hoursAgo(selected.startTimestamp, true)}`
										: ''}
									{selected.venue ? ` · ${selected.venue}` : ''}
								</p>
							</div>

							{selectedIsUpcoming ? (
								<p className="muted live-board-upcoming-note">
									Lineups and match events appear here once the match kicks off.
								</p>
							) : (
								<>
									<LiveGraphic
										events={detail?.events ?? []}
										clock={detail?.clock || selected.clock}
										live={selectedIsLive}
										homeScore={selected.homeScore}
										awayScore={selected.awayScore}
										homeLabel={selected.homeTeam}
										awayLabel={selected.awayTeam}
									/>

									<details className="match-ratings-details" open>
										<summary>Both-teams match ratings</summary>
										<MatchRatingsPitch
											fixtureId={fixtureId}
											pollKey={detail?.fetchedAt ?? selected.id}
											onPlayerClick={openRated}
										/>
									</details>
								</>
							)}
						</>
					)}
				</section>
			</div>

			{hoverMatch && hoverAnchor && (
				<LiveMatchHoverCard
					match={hoverMatch}
					isLive={hoverIsLive}
					isUpcoming={hoverIsUpcoming}
					anchor={hoverAnchor}
					onKeepOpen={clearHoverCloseTimer}
					onRequestClose={scheduleCloseHover}
				/>
			)}
		</div>
	);
}
