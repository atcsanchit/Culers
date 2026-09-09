import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player, PlayerMatchStats, PlayerStats, StatRow } from '../types';
import type { PlayerOpenOrigin, PlayerStatsContext } from '../store/BarcaState';
import { useBarca } from '../store/BarcaState';
import { CAMP_NOU_BG, attachSquadIdentity, isBarcaTeamName, playerInitials, playerPhotoSrc } from '../lib/photos';
import { fetchClubGround, fetchPlayerMatchStats, fetchPlayerStats, fetchLaMasiaPlayerStats, formatDateTime, LIVE_POLL_MS } from '../lib/api';
import { useProfileMotion } from '../lib/motion';

type Props = {
	player: Player | null;
	origin: PlayerOpenOrigin | null;
	statsContext: PlayerStatsContext;
	onClose: () => void;
};

type StatsTab = 'match' | 'season' | 'career';

function statsSignature(stats: { key: string; value: number | string }[]) {
	return stats.map((row) => `${row.key}:${row.value}`).join('|');
}

function ratingTier(rating: number) {
	if (rating >= 8) return 'elite';
	if (rating >= 7) return 'good';
	if (rating >= 6) return 'ok';
	return 'poor';
}

function resolveSofaId(player: Player): number | undefined {
	if (player.sofaId) return player.sofaId;
	const fromId = /^sofa-(\d+)$/i.exec(player.id);
	if (fromId) return Number(fromId[1]);
	return undefined;
}

function StatsHeroGrid({ rows, motion }: { rows: StatRow[]; motion: string }) {
	return (
		<div className="stats-hero-grid">
			{rows.map((row, i) => (
				<div
					key={row.key}
					className={`stats-hero-cell ${row.available !== false ? 'available' : 'missing'} ${motion === 'idle' ? 'profile-stat-cell-visible' : ''}`}
					style={{ '--stat-i': i } as React.CSSProperties}
				>
					<strong className="stat-value">{row.available === false ? '—' : row.value}</strong>
					<span className="stat-label">{row.label}</span>
				</div>
			))}
		</div>
	);
}

export function PlayerStatsModal({ player: openedPlayer, origin, statsContext, onClose }: Props) {
	const { data } = useBarca();
	const resolvedPlayer = useMemo(
		() =>
			openedPlayer && data?.squad.players.length
				? attachSquadIdentity(openedPlayer, data.squad.players)
				: openedPlayer,
		[openedPlayer, data?.squad.players],
	);
	const isMatchContext = statsContext.mode === 'live' || statsContext.mode === 'match';
	const isLiveMatch = statsContext.mode === 'live';
	const isLegend = statsContext.mode === 'legend';
	const matchFixtureId = isMatchContext ? statsContext.fixtureId : null;

	const defaultTab: StatsTab = isMatchContext
		? 'match'
		: isLegend
			? 'career'
			: statsContext.mode === 'career' && statsContext.initialTab === 'career'
				? 'career'
				: 'season';

	const [stats, setStats] = useState<PlayerStats | null>(null);
	const [matchStats, setMatchStats] = useState<PlayerMatchStats | null>(null);
	const [initialLoading, setInitialLoading] = useState(false);
	const [seasonLoading, setSeasonLoading] = useState(false);
	const [seasonError, setSeasonError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<StatsTab>(defaultTab);
	const [photoOk, setPhotoOk] = useState(false);
	const [groundBg, setGroundBg] = useState(CAMP_NOU_BG);
	const pollRef = useRef<number | null>(null);
	const { motion, requestClose } = useProfileMotion(resolvedPlayer?.id ?? null, onClose);

	const photo = resolvedPlayer ? playerPhotoSrc(resolvedPlayer) : '';

	useEffect(() => {
		if (!resolvedPlayer) return;
		setTab(defaultTab);
		setPhotoOk(false);
		setSeasonError(null);
	}, [resolvedPlayer?.id, defaultTab]);

	const clubHint = resolvedPlayer?.club?.trim() || (resolvedPlayer?.fcbId ? 'Barcelona' : '');

	useEffect(() => {
		if (!resolvedPlayer) return;
		if (!clubHint || isBarcaTeamName(clubHint)) {
			setGroundBg(CAMP_NOU_BG);
			return;
		}
		setGroundBg('');
		let cancelled = false;
		void fetchClubGround(clubHint).then((next) => {
			if (cancelled) return;
			setGroundBg(next.backgroundImage?.trim() || '');
		});
		return () => {
			cancelled = true;
		};
	}, [resolvedPlayer?.id, clubHint]);

	useEffect(() => {
		if (!resolvedPlayer) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [resolvedPlayer, requestClose]);

	useEffect(() => {
		if (!resolvedPlayer || !matchFixtureId) {
			setMatchStats(null);
			return;
		}

		const sofaId = resolveSofaId(resolvedPlayer);
		if (!resolvedPlayer.fcbId && !sofaId && !resolvedPlayer.name) {
			setMatchStats(null);
			setError('No player id to load match stats.');
			setInitialLoading(false);
			return;
		}

		let cancelled = false;

		const loadMatchStats = async (isFirst: boolean) => {
			if (isFirst) {
				setInitialLoading(true);
				setError(null);
			}
			try {
				const next = await fetchPlayerMatchStats({
					fixtureId: matchFixtureId,
					fcbId: resolvedPlayer.fcbId,
					sofaId,
					playerName: resolvedPlayer.name,
				});
				if (cancelled) return;
				setMatchStats((prev) => {
					if (prev && statsSignature(prev.stats) === statsSignature(next.stats)) return prev;
					return next;
				});
				setError(null);
			} catch {
				if (cancelled) return;
				if (isFirst) setError('Could not load match stats.');
			} finally {
				if (!cancelled && isFirst) setInitialLoading(false);
			}
		};

		void loadMatchStats(true);
		if (isLiveMatch) {
			if (pollRef.current) window.clearInterval(pollRef.current);
			pollRef.current = window.setInterval(() => void loadMatchStats(false), LIVE_POLL_MS);
		}

		return () => {
			cancelled = true;
			if (pollRef.current) {
				window.clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};
	}, [resolvedPlayer?.fcbId, resolvedPlayer?.sofaId, resolvedPlayer?.id, resolvedPlayer?.name, matchFixtureId, isLiveMatch]);

	useEffect(() => {
		if (!resolvedPlayer || isLegend) {
			setStats(null);
			setSeasonLoading(false);
			if (isLegend) {
				setInitialLoading(false);
				setError(null);
			}
			return;
		}

		const sofaId = resolveSofaId(resolvedPlayer);
		let cancelled = false;

		if (resolvedPlayer.fcbId) {
			setSeasonLoading(true);
			void fetchPlayerStats(resolvedPlayer.fcbId)
				.then((next) => {
					if (!cancelled) {
						setStats(next);
						setSeasonError(null);
					}
				})
				.catch(() => {
					if (!cancelled) setSeasonError('Could not load season / Barça career stats.');
				})
				.finally(() => {
					if (!cancelled) {
						setSeasonLoading(false);
						if (!matchFixtureId) setInitialLoading(false);
					}
				});
			return () => {
				cancelled = true;
			};
		}

		if (sofaId) {
			setSeasonLoading(true);
			void fetchLaMasiaPlayerStats(sofaId)
				.then((next) => {
					if (!cancelled) {
						setStats(next);
						setSeasonError(null);
					}
				})
				.catch(() => {
					if (!cancelled) setSeasonError('Could not load Atlètic season stats.');
				})
				.finally(() => {
					if (!cancelled) {
						setSeasonLoading(false);
						if (!matchFixtureId) setInitialLoading(false);
					}
				});
			return () => {
				cancelled = true;
			};
		}

		if (!matchFixtureId) {
			setError('No stats ID — fetch latest to link this player.');
			setInitialLoading(false);
		}
		setSeasonLoading(false);
	}, [resolvedPlayer?.fcbId, resolvedPlayer?.sofaId, resolvedPlayer?.id, isLegend, matchFixtureId]);

	if (!resolvedPlayer) return null;
	const player = resolvedPlayer;

	const sofaId = resolveSofaId(player);
	const legendRows =
		isLegend
			? statsContext.stats.map((s) => ({
					key: s.label,
					label: s.label,
					value: s.value,
					available: true,
				}))
			: [];

	const matchRows = matchStats?.topStats?.length ? matchStats.topStats : (matchStats?.stats ?? []);
	const rows =
		tab === 'match'
			? matchRows
			: isLegend
				? legendRows
				: tab === 'season'
					? (stats?.season ?? [])
					: (stats?.career ?? []);

	const showPhoto = Boolean(photo && photoOk);
	const compactPhoto = Boolean(sofaId && !player.fcbId);
	const ox = origin ? (origin.x / window.innerWidth) * 100 : 22;
	const oy = origin ? (origin.y / window.innerHeight) * 100 : 78;

	return (
		<div
			className={`modal-backdrop split-backdrop fullscreen profile-backdrop profile-motion-${motion}`}
			role="presentation"
		>
			<div
				className={`player-stats-modal split blended fullscreen profile-motion-${motion}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				style={
					{
						'--origin-x': `${ox}%`,
						'--origin-y': `${oy}%`,
					} as React.CSSProperties
				}
			>
				<div
					className={`modal-photo-panel profile-photo-panel profile-motion-${motion}${compactPhoto ? ' is-compact-photo' : ''}`}
					style={groundBg ? { backgroundImage: `url(${groundBg})` } : undefined}
					onClick={requestClose}
					role="presentation"
				>
					{photo && (
						<img
							src={photo}
							alt=""
							className={`modal-hero-photo profile-hero-photo profile-motion-${motion}${compactPhoto ? ' is-compact' : ''}${showPhoto ? '' : ' is-loading'}`}
							onLoad={() => setPhotoOk(true)}
							onError={() => setPhotoOk(false)}
						/>
					)}
					{!showPhoto && (
						<div className={`modal-photo-fallback profile-motion-${motion}`} aria-hidden>
							<span>{playerInitials(player.name)}</span>
						</div>
					)}
					{tab === 'match' && matchStats?.rating != null && (
						<span className={`player-match-rating-badge mrp-rating ${ratingTier(matchStats.rating)}`}>
							{matchStats.rating.toFixed(1)}
						</span>
					)}
					<div className={`modal-photo-meta profile-motion-${motion}`}>
						{player.number && <span className="hero-num">#{player.number}</span>}
						<h2>{player.name}</h2>
						<p className="muted">
							{isLegend
								? `${player.position}${statsContext.generation ? ` · ${statsContext.generation}` : ''}`
								: player.position}
						</p>
						{!isLegend && (player.club || player.fcbId) && (
							<p className="player-club-name">{player.club?.trim() || 'FC Barcelona'}</p>
						)}
					</div>
				</div>

				<div className={`modal-stats-panel profile-stats-panel profile-motion-${motion}`}>
					{isLegend ? (
						<div className="stats-tabs">
							<button type="button" className="active">
								Barça club record · {statsContext.years}
							</button>
						</div>
					) : (
						<div className="stats-tabs">
							{isMatchContext && (
								<button
									type="button"
									className={tab === 'match' ? 'active' : ''}
									onClick={() => setTab('match')}
								>
									{isLiveMatch ? (
										<>
											<span className="pulse" /> Match vs {matchStats?.opponent ?? '…'}
										</>
									) : (
										`Match vs ${matchStats?.opponent ?? '…'}`
									)}
								</button>
							)}
							<button type="button" className={tab === 'season' ? 'active' : ''} onClick={() => setTab('season')}>
								{sofaId && !player.fcbId
									? stats?.seasonLabel ?? 'Season'
									: `Season ${stats?.seasonLabel ?? '2026/27'}`}
							</button>
							<button type="button" className={tab === 'career' ? 'active' : ''} onClick={() => setTab('career')}>
								{sofaId && !player.fcbId ? 'Logged seasons' : 'Barça career'}
							</button>
							{isLiveMatch && matchStats?.clock && (
								<span className="live-match-clock">{matchStats.clock}</span>
							)}
						</div>
					)}

					{(tab === 'season' || tab === 'career') && seasonLoading && !rows.length && (
						<p className="muted loading-msg">Loading season & Barça career from FC Barcelona official…</p>
					)}
					{(tab === 'season' || tab === 'career') && seasonError && !rows.length && (
						<p className="fetch-error">{seasonError}</p>
					)}
					{initialLoading && tab === 'match' && !rows.length && (
						<p className="muted loading-msg">Loading match stats…</p>
					)}
					{error && tab === 'match' && !rows.length && <p className="fetch-error">{error}</p>}
					{!initialLoading && !error && tab === 'match' && !rows.length && (
						<p className="muted loading-msg">No match stats available for this player yet.</p>
					)}

					{tab === 'match' && matchStats?.heatmap && matchStats.heatmap.length > 0 && (
						<div className="player-match-heatmap" aria-hidden>
							{matchStats.heatmap.slice(0, 80).map((dot, i) => (
								<span key={i} style={{ left: `${dot.x}%`, top: `${100 - dot.y}%` }} />
							))}
						</div>
					)}

					{rows.length > 0 && (
						<>
							{tab === 'match' && <h3 className="match-live-stats-label">Top stats</h3>}
							<StatsHeroGrid rows={rows} motion={motion} />
						</>
					)}

					{tab === 'match' && matchStats?.fetchedAt && (
						<p className="muted fetch-meta">Updated {formatDateTime(matchStats.fetchedAt)} IST</p>
					)}
					{tab !== 'match' && !isLegend && stats?.source && (
						<p className="stats-source muted">{stats.source}</p>
					)}
					{tab === 'match' && matchStats?.source && (
						<p className="stats-source muted">{matchStats.source}</p>
					)}
					{isLegend && <p className="stats-source muted">{statsContext.legacy}</p>}
				</div>
			</div>
		</div>
	);
}
