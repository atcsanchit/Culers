import { useEffect, useRef, useState } from 'react';
import type { Player, PlayerMatchStats, PlayerStats } from '../types';
import type { PlayerOpenOrigin, PlayerStatsContext } from '../store/BarcaState';
import { fetchPlayerMatchStats, fetchPlayerStats, formatDateTime, LIVE_POLL_MS } from '../lib/api';
import { useProfileMotion } from '../lib/motion';
import { CAMP_NOU_BG, playerInitials, playerPhotoSrc } from '../lib/photos';

type Props = {
	player: Player | null;
	origin: PlayerOpenOrigin | null;
	statsContext: PlayerStatsContext;
	onClose: () => void;
};

function statsSignature(stats: { key: string; value: number | string }[]) {
	return stats.map((row) => `${row.key}:${row.value}`).join('|');
}

export function PlayerStatsModal({ player, origin, statsContext, onClose }: Props) {
	const isLiveMatch = statsContext.mode === 'live';
	const liveFixtureId = isLiveMatch ? statsContext.fixtureId : null;

	const [stats, setStats] = useState<PlayerStats | null>(null);
	const [liveStats, setLiveStats] = useState<PlayerMatchStats | null>(null);
	const [initialLoading, setInitialLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<'season' | 'career'>('season');
	const [photoOk, setPhotoOk] = useState(false);
	const pollRef = useRef<number | null>(null);
	const { motion, requestClose } = useProfileMotion(player?.id ?? null, onClose);

	const photo = player ? playerPhotoSrc(player) : '';

	useEffect(() => {
		if (!player) return;
		setTab('season');
		setPhotoOk(false);
	}, [player?.id]);

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
		if (!player?.fcbId || !liveFixtureId) {
			setLiveStats(null);
			return;
		}

		let cancelled = false;

		const loadLiveStats = async (isFirst: boolean) => {
			if (isFirst) {
				setInitialLoading(true);
				setError(null);
			}
			try {
				const next = await fetchPlayerMatchStats(player.fcbId!, liveFixtureId);
				if (cancelled) return;
				setLiveStats((prev) => {
					if (prev && statsSignature(prev.stats) === statsSignature(next.stats)) return prev;
					return next;
				});
				setError(null);
			} catch {
				if (cancelled) return;
				if (isFirst) setError('Could not load live match stats.');
			} finally {
				if (!cancelled && isFirst) setInitialLoading(false);
			}
		};

		void loadLiveStats(true);
		if (pollRef.current) window.clearInterval(pollRef.current);
		pollRef.current = window.setInterval(() => void loadLiveStats(false), LIVE_POLL_MS);

		return () => {
			cancelled = true;
			if (pollRef.current) {
				window.clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};
	}, [player?.fcbId, player?.id, liveFixtureId]);

	useEffect(() => {
		if (!player || isLiveMatch) {
			setStats(null);
			return;
		}
		if (!player.fcbId) {
			setStats(null);
			setError('No FCB official ID — fetch latest to link squad.');
			setInitialLoading(false);
			return;
		}

		setStats(null);
		setInitialLoading(true);
		setError(null);
		void fetchPlayerStats(player.fcbId)
			.then(setStats)
			.catch(() => setError('Could not load stats from FC Barcelona official API.'))
			.finally(() => setInitialLoading(false));
	}, [player?.fcbId, player?.id, isLiveMatch]);

	if (!player) return null;

	const rows = isLiveMatch
		? (liveStats?.stats ?? [])
		: tab === 'season'
			? (stats?.season ?? [])
			: (stats?.career ?? []);
	const showPhoto = Boolean(photo && photoOk);
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
					className={`modal-photo-panel profile-photo-panel profile-motion-${motion}`}
					style={{ backgroundImage: `url(${CAMP_NOU_BG})` }}
					onClick={requestClose}
					role="presentation"
				>
					{photo && (
						<img
							src={photo}
							alt=""
							className={`modal-hero-photo profile-hero-photo profile-motion-${motion} ${showPhoto ? '' : 'is-loading'}`}
							onLoad={() => setPhotoOk(true)}
							onError={() => setPhotoOk(false)}
						/>
					)}
					{!showPhoto && (
						<div className={`modal-photo-fallback profile-motion-${motion}`} aria-hidden>
							<span>{playerInitials(player.name)}</span>
						</div>
					)}
					<div className={`modal-photo-meta profile-motion-${motion}`}>
						{player.number && <span className="hero-num">#{player.number}</span>}
						<h2>{player.name}</h2>
						<p className="muted">
							{player.position}
							{player.nationality ? ` · ${player.nationality}` : ''}
						</p>
					</div>
				</div>

				<div className={`modal-stats-panel profile-stats-panel profile-motion-${motion}`}>
					{isLiveMatch ? (
						<div className="stats-tabs live-match-tabs">
							<button type="button" className="active">
								<span className="pulse" /> Live match vs {liveStats?.opponent ?? '…'}
							</button>
							{liveStats?.clock && <span className="live-match-clock">{liveStats.clock}</span>}
						</div>
					) : (
						<div className="stats-tabs">
							<button type="button" className={tab === 'season' ? 'active' : ''} onClick={() => setTab('season')}>
								Season {stats?.seasonLabel ?? '2026/27'}
							</button>
							<button type="button" className={tab === 'career' ? 'active' : ''} onClick={() => setTab('career')}>
								Barça career
							</button>
						</div>
					)}

					{initialLoading && !rows.length && (
						<p className="muted loading-msg">
							{isLiveMatch ? 'Loading live match stats…' : 'Loading from FC Barcelona official…'}
						</p>
					)}
					{error && !rows.length && <p className="fetch-error">{error}</p>}

					{rows.length > 0 && (
						<div className="stats-hero-grid">
							{rows.map((row, i) => (
								<div
									key={row.key}
									className={`stats-hero-cell ${row.available ? 'available' : 'missing'} ${motion === 'idle' ? 'profile-stat-cell-visible' : ''}`}
									style={{ '--stat-i': i } as React.CSSProperties}
								>
									<strong className="stat-value">{row.value}</strong>
									<span className="stat-label">{row.label}</span>
								</div>
							))}
						</div>
					)}

					{isLiveMatch && liveStats?.fetchedAt && (
						<p className="stats-source muted">
							Updated {formatDateTime(liveStats.fetchedAt)} IST · refreshes every 10s
						</p>
					)}
					{!isLiveMatch && stats?.source && <p className="stats-source muted">{stats.source}</p>}
					{isLiveMatch && liveStats?.source && !liveStats.fetchedAt && (
						<p className="stats-source muted">{liveStats.source}</p>
					)}
				</div>
			</div>
		</div>
	);
}
