import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLiveBoard, fetchLiveMatch, formatDateTime, LIVE_POLL_MS } from '../lib/api';
import type { LiveBoardDetail, LiveBoardGroupId, LiveBoardHub, LiveBoardMatch } from '../types';
import type { PlayerOpenOrigin } from '../store/BarcaState';
import { useBarca } from '../store/BarcaState';
import { LiveGraphic } from './LiveGraphic';
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
	if (match.homeScore == null || match.awayScore == null) {
		return /finished|closed|ended/i.test(match.status) ? 'FT' : 'LIVE';
	}
	return `${match.homeScore}–${match.awayScore}`;
}

function hoursAgo(ts: number, finished = false) {
	if (!ts) return '';
	const end = finished ? ts + 105 * 60 : ts;
	const hours = Math.max(0, Math.round((Date.now() / 1000 - end) / 3600));
	if (hours < 1) return 'Just finished';
	if (hours === 1) return '1 hour ago';
	return `${hours} hours ago`;
}

function tabSlice(hub: LiveBoardHub | null, tab: LiveBoardGroupId) {
	const live = hub?.groups.find((g) => g.id === tab)?.matches ?? [];
	const history = hub?.history.find((g) => g.id === tab)?.matches ?? [];
	return { live, history, total: live.length + history.length };
}

function firstMatchId(hub: LiveBoardHub | null, tab: LiveBoardGroupId) {
	const slice = tabSlice(hub, tab);
	return slice.live[0]?.id ?? slice.history[0]?.id ?? null;
}

function matchStillExists(hub: LiveBoardHub, id: number) {
	return (
		hub.groups.some((g) => g.matches.some((m) => m.id === id)) ||
		hub.history.some((g) => g.matches.some((m) => m.id === id))
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
		};
	}, []);

	const slice = useMemo(() => tabSlice(hub, groupTab), [hub, groupTab]);

	useEffect(() => {
		if (!hub) return;
		if (selectedId && (slice.live.some((m) => m.id === selectedId) || slice.history.some((m) => m.id === selectedId))) {
			return;
		}
		setSelectedId(firstMatchId(hub, groupTab));
	}, [hub, groupTab, selectedId, slice]);

	const selectedIsLive = Boolean(slice.live.some((match) => match.id === selectedId));

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
		slice.history.find((m) => m.id === selectedId) ??
		detail?.match ??
		null;
	const fixtureId = selectedId ? String(selectedId) : '';
	const tabMeta = GROUP_TABS.find((t) => t.id === groupTab);
	const fullLabel = hub?.groups.find((g) => g.id === groupTab)?.label ?? tabMeta?.label ?? '';

	return (
		<div className="live-board-shell" ref={rootRef}>
			<header className="live-board-top">
				<div>
					<span className="panel-label">Live</span>
					<h1>Live matches</h1>
					<p className="muted">
						Pick a competition. Live games first, then full-time results from the last 24 hours — including Barça.
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
							No live or last-24-hour {fullLabel || 'matches'} right now.
						</p>
					)}
					{slice.live.length > 0 && (
						<section>
							<h2>Live</h2>
							<ul>
								{slice.live.map((match) => (
									<li key={match.id}>
										<button
											type="button"
											className={match.id === selectedId ? 'active' : ''}
											onClick={() => setSelectedId(match.id)}
										>
											<span className="live-board-comp">{match.competition}</span>
											<strong>
												{match.homeTeam} {scoreLabel(match)} {match.awayTeam}
											</strong>
											<em>{match.clock}</em>
										</button>
									</li>
								))}
							</ul>
						</section>
					)}
					{slice.history.length > 0 && (
						<section className={slice.live.length ? 'live-board-history' : undefined}>
							<h2>Last 24 hours</h2>
							<ul>
								{slice.history.map((match) => (
									<li key={match.id}>
										<button
											type="button"
											className={`is-ft${match.id === selectedId ? ' active' : ''}`}
											onClick={() => setSelectedId(match.id)}
										>
											<span className="live-board-comp">{match.competition}</span>
											<strong>
												{match.homeTeam} {scoreLabel(match)} {match.awayTeam}
											</strong>
											<em>{hoursAgo(match.startTimestamp, true)}</em>
										</button>
									</li>
								))}
							</ul>
						</section>
					)}
				</aside>

				<section className="live-board-detail">
					{!selected && <p className="muted">Select a live or last-24-hour match.</p>}
					{selected && (
						<>
							<div className="live-board-score pop-card">
								<span className="panel-label">{selected.competition}</span>
								<div className="live-board-score-row">
									<strong>{selected.homeTeam}</strong>
									<span>
										{selected.homeScore ?? '–'} : {selected.awayScore ?? '–'}
									</span>
									<strong>{selected.awayTeam}</strong>
								</div>
								<p className="muted">
									{selectedIsLive ? <span className="pulse" /> : null}{' '}
									{selectedIsLive ? detail?.clock || selected.clock : 'Full time'}
									{!selectedIsLive && selected.startTimestamp ? ` · ${hoursAgo(selected.startTimestamp, true)}` : ''}
									{selected.venue ? ` · ${selected.venue}` : ''}
								</p>
							</div>

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
				</section>
			</div>
		</div>
	);
}
