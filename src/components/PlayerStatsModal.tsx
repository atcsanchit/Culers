import { useEffect, useRef, useState } from 'react';
import type { Player, PlayerMatchStats, PlayerStats } from '../types';
import type { PlayerOpenOrigin, PlayerStatsContext } from '../store/BarcaState';
import {
	fetchPlayerMatchStats,
	fetchPlayerStats,
	fetchLaMasiaPlayerStats,
	formatDateTime,
	LIVE_POLL_MS,
} from '../lib/api';
import { useProfileMotion } from '../lib/motion';
import { CAMP_NOU_BG, playerInitials, playerPhotoSrc } from '../lib/photos';

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

export function PlayerStatsModal({ player, origin, statsContext, onClose }: Props) {
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
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<StatsTab>(defaultTab);
	const [photoOk, setPhotoOk] = useState(false);
	const pollRef = useRef<number | null>(null);
	const { motion, requestClose } = useProfileMotion(player?.id ?? null, onClose);

	const photo = player ? playerPhotoSrc(player) : '';

	useEffect(() => {
		if (!player) return;
		setTab(defaultTab);
		setPhotoOk(false);
	}, [player?.id, defaultTab]);

	useEffect(() => {
		if (!player) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [player, requestClose]);

	useEffect(() => {
		if (!player || !matchFixtureId) {
			setMatchStats(null);
			return;
		}

		const sofaId = resolveSofaId(player);
		if (!player.fcbId && !sofaId && !player.name) {
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
					fcbId: player.fcbId,
					sofaId,
					playerName: player.name,
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
	}, [player?.fcbId, player?.sofaId, player?.id, player?.name, matchFixtureId, isLiveMatch]);

	useEffect(() => {
		if (!player || isLegend) {
			setStats(null);
			if (isLegend) {
				setInitialLoading(false);
				setError(null);
			}
			return;
		}
		// Always load season/career when we have an id so tabs work alongside Match.
		const sofaId = resolveSofaId(player);
		if (player.fcbId) {
			setStats(null);
			if (!matchFixtureId) {
				setInitialLoading(true);
				setError(null);
			}
			void fetchPlayerStats(player.fcbId)
				.then(setStats)
				.catch(() => {
					if (!matchFixtureId) setError('Could not load stats from FC Barcelona official API.');
				})
				.finally(() => {
					if (!matchFixtureId) setInitialLoading(false);
				});
			return;
		}
		if (sofaId) {
			setStats(null);
			if (!matchFixtureId) {
				setInitialLoading(true);
				setError(null);
			}
			void fetchLaMasiaPlayerStats(sofaId)
				.then(setStats)
				.catch(() => {
					if (!matchFixtureId) setError('Could not load Atlètic stats from SofaScore.');
				})
				.finally(() => {
					if (!matchFixtureId) setInitialLoading(false);
				});
			return;
		}
		if (!matchFixtureId) {
			setError('No stats ID — fetch latest to link this player.');
			setInitialLoading(false);
		}
	}, [player?.fcbId, player?.sofaId, player?.id, isLegend, matchFixtureId]);

	if (!player) return null;

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
					style={{ backgroundImage: `url(${CAMP_NOU_BG})` }}
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
								: `${player.position}${player.nationality ? ` · ${player.nationality}` : ''}`}
						</p>
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

					{initialLoading && !rows.length && (
						<p className="muted loading-msg">
							{tab === 'match'
								? 'Loading match stats…'
								: sofaId && !player.fcbId
									? 'Loading Atlètic stats from SofaScore…'
									: 'Loading from FC Barcelona official…'}
						</p>
					)}
					{error && !rows.length && <p className="fetch-error">{error}</p>}
					{!initialLoading && !error && tab === 'match' && !rows.length && (
						<p className="muted loading-msg">No match stats available for this player yet.</p>
					)}

					{tab === 'match' && matchStats?.heatmap && matchStats.heatmap.length > 0 && (
						<div className="player-match-heatmap" aria-hidden>
							{matchStats.heatmap.slice(0, 80).map((p, i) => (
								<span key={i} style={{ left: `${p.x}%`, top: `${100 - p.y}%` }} />
							))}
						</div>
					)}

					{tab === 'match' && rows.length > 0 ? (
						<>
							<h3 className="rivalry-h2h-label" style={{ margin: '0.25rem 0 0.5rem' }}>
								Top stats
							</h3>
							<ul className="match-top-stats">
								{rows.map((row) => (
									<li key={row.key}>
										<span className="label">{row.label}</span>
										<span className="value">{row.available === false ? '—' : row.value}</span>
									</li>
								))}
							</ul>
						</>
					) : (
						rows.length > 0 && (
							<div className="stats-hero-grid">
								{rows.map((row, i) => (
									<div
										key={row.key}
										className={`stats-hero-cell ${row.available !== false ? 'available' : 'missing'} ${motion === 'idle' ? 'profile-stat-cell-visible' : ''}`}
										style={{ '--stat-i': i } as React.CSSProperties}
									>
										<strong>{row.available === false ? '—' : row.value}</strong>
										<span>{row.label}</span>
									</div>
								))}
							</div>
						)
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
