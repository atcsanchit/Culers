import { useEffect, useMemo, useState } from 'react';
import type { MatchRatingsBoard, MatchRatingsSide, RatedPitchPlayer } from '../types';
import type { PlayerOpenOrigin } from '../store/BarcaState';
import { useBarca } from '../store/BarcaState';
import { fetchMatchRatings } from '../lib/api';
import { assignToFormation, formationKeyFromString } from '../lib/lineup';
import { teamCrestSrc, teamInitials, espnTeamCrest, enrichRatedSideWithSquadPhotos, isBarcaTeamName } from '../lib/photos';

type Props = {
	fixtureId: string;
	pollKey?: string | number | null;
	onPlayerClick?: (
		player: RatedPitchPlayer,
		origin: PlayerOpenOrigin,
		fixtureId: string,
		teamName: string,
	) => void;
};

function ratingClass(rating: number | null) {
	if (rating == null) return 'muted';
	if (rating >= 8) return 'elite';
	if (rating >= 7) return 'good';
	if (rating >= 6) return 'ok';
	return 'poor';
}

/** Re-place XI using role hints (Gordon LW, Raphinha ST, Yamal RW) — ESPN often only sends G/D/M/F. */
function placeSide(side: MatchRatingsSide): MatchRatingsSide {
	const key = formationKeyFromString(side.formation);
	const asPlayers = side.starters.map((p) => ({
		id: p.id,
		name: p.name,
		position: p.position,
		number: p.number,
		nationality: '',
		photo: p.photo ?? '',
		birthDate: '',
	}));
	const placed = assignToFormation(asPlayers, key);
	const byId = new Map(side.starters.map((p) => [p.id, p]));
	const starters = placed
		.map(({ player, x, y }) => {
			const raw = byId.get(player.id);
			if (!raw) return null;
			return { ...raw, x, y };
		})
		.filter(Boolean) as RatedPitchPlayer[];

	// Keep any starters assignToFormation dropped (shouldn't happen) at end.
	for (const p of side.starters) {
		if (!starters.some((s) => s.id === p.id)) starters.push(p);
	}

	return { ...side, starters };
}

function placeBoard(board: MatchRatingsBoard): MatchRatingsBoard {
	return {
		...board,
		home: placeSide(board.home),
		away: placeSide(board.away),
	};
}

function applyBarcaSquadPhotos(board: MatchRatingsBoard, squad: import('../types').Player[]): MatchRatingsBoard {
	const home = enrichRatedSideWithSquadPhotos(board.home, squad);
	const away = enrichRatedSideWithSquadPhotos(board.away, squad);
	return {
		...board,
		home: { ...board.home, starters: home.starters, bench: home.bench ?? board.home.bench },
		away: { ...board.away, starters: away.starters, bench: away.bench ?? board.away.bench },
	};
}

function SideCrest({ name, crestUrl = '', teamId = 0 }: { name: string; crestUrl?: string; teamId?: number }) {
	const remote = crestUrl.trim() || espnTeamCrest(teamId);
	const src = teamCrestSrc(name, remote);
	const [ok, setOk] = useState(false);
	useEffect(() => {
		setOk(false);
	}, [src]);
	return (
		<span className="mrp-crest-wrap" title={name}>
			{src ? (
				<img
					key={src}
					src={src}
					alt=""
					className={`mrp-crest${ok ? '' : ' is-loading'}`}
					onLoad={() => setOk(true)}
					onError={() => setOk(false)}
				/>
			) : null}
			{(!src || !ok) && <span className="mrp-crest-fallback">{teamInitials(name)}</span>}
		</span>
	);
}

function PlayerNode({
	player,
	side,
	onClick,
}: {
	player: RatedPitchPlayer;
	side: 'home' | 'away';
	onClick?: (origin: PlayerOpenOrigin) => void;
}) {
	/**
	 * Formation coords: x = lane across pitch, y = depth (94 = own goal, 14 = attack).
	 * Home (left half): GK on left edge. Away (right half): GK on right edge.
	 */
	const left = side === 'home' ? 100 - player.y : player.y;
	const top = player.x;

	return (
		<button
			type="button"
			className={`mrp-player mrp-${side}`}
			style={{ left: `${left}%`, top: `${top}%` }}
			onClick={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				onClick?.({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
			}}
		>
			{player.rating != null && (
				<span className={`mrp-rating ${ratingClass(player.rating)}`}>
					{player.isMotm ? '★ ' : ''}
					{player.rating.toFixed(1)}
				</span>
			)}
			<span className="mrp-avatar" aria-hidden>
				{player.photo ? (
					<img src={player.photo} alt="" className="mrp-avatar-img" loading="lazy" />
				) : (
					player.number || '·'
				)}
			</span>
			<span className="mrp-name">
				{player.number ? `${player.number} ` : ''}
				{player.name.split(' ').slice(-1)[0]}
			</span>
			<span className="mrp-icons">
				{Array.from({ length: Math.min(player.goals, 3) }).map((_, i) => (
					<span key={`g${i}`} title="Goal">
						⚽
					</span>
				))}
				{player.assists > 0 && <span title="Assist">🅰️</span>}
				{player.yellow > 0 && <span className="mrp-card yellow" title="Yellow" />}
				{player.red > 0 && <span className="mrp-card red" title="Red" />}
				{player.subOff != null && (
					<span className="mrp-sub out" title={`Off ${player.subOff}'`}>
						↺{player.subOff}'
					</span>
				)}
				{player.isCaptain && <span className="mrp-cap">C</span>}
			</span>
		</button>
	);
}

export function MatchRatingsPitch({ fixtureId, pollKey, onPlayerClick }: Props) {
	const { data } = useBarca();
	const squad = data?.squad.players ?? [];
	const [board, setBoard] = useState<MatchRatingsBoard | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!fixtureId) return;
		let cancelled = false;
		setLoading(true);
		setError(null);
		void fetchMatchRatings(fixtureId)
			.then((next) => {
				if (!cancelled) setBoard(placeBoard(next));
			})
			.catch(() => {
				if (!cancelled) {
					setBoard(null);
					setError('Match ratings unavailable for this fixture.');
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [fixtureId, pollKey]);

	const display = useMemo(() => {
		if (!board) return null;
		const placed = placeBoard(board);
		const hasBarca = isBarcaTeamName(placed.home.teamName) || isBarcaTeamName(placed.away.teamName);
		return hasBarca && squad.length ? applyBarcaSquadPhotos(placed, squad) : placed;
	}, [board, squad]);

	if (loading && !display) {
		return <p className="muted mrp-status">Loading match ratings…</p>;
	}
	if (error && !display) {
		return <p className="muted mrp-status">{error}</p>;
	}
	if (!display) return null;

	return (
		<section className="match-ratings-pitch pop-card">
			<header className="mrp-header">
				<div className="mrp-team home">
					<SideCrest name={display.home.teamName} crestUrl={display.home.crestUrl} teamId={display.home.teamId} />
					<div className="mrp-team-meta">
						<strong>{display.home.teamName}</strong>
						<span className="muted">{display.home.formation || 'XI'}</span>
					</div>
					{display.home.avgRating != null && (
						<span className={`mrp-team-rating ${ratingClass(display.home.avgRating)}`}>
							{display.home.avgRating.toFixed(1)}
						</span>
					)}
				</div>
				<div className="mrp-score">
					<span className="mrp-clock">{display.clock ?? display.status}</span>
					<strong>
						{display.homeScore ?? '–'}
						<span className="mrp-score-sep">:</span>
						{display.awayScore ?? '–'}
					</strong>
				</div>
				<div className="mrp-team away">
					{display.away.avgRating != null && (
						<span className={`mrp-team-rating ${ratingClass(display.away.avgRating)}`}>
							{display.away.avgRating.toFixed(1)}
						</span>
					)}
					<div className="mrp-team-meta">
						<strong>{display.away.teamName}</strong>
						<span className="muted">{display.away.formation || 'XI'}</span>
					</div>
					<SideCrest name={display.away.teamName} crestUrl={display.away.crestUrl} teamId={display.away.teamId} />
				</div>
			</header>

			<div className="mrp-field" aria-label="Match ratings pitch">
				<div className="mrp-half home">
					{display.home.starters.map((p) => (
						<PlayerNode
							key={`h-${p.id}`}
							player={p}
							side="home"
							onClick={(origin) => onPlayerClick?.(p, origin, fixtureId, display.home.teamName)}
						/>
					))}
				</div>
				<div className="mrp-half away">
					{display.away.starters.map((p) => (
						<PlayerNode
							key={`a-${p.id}`}
							player={p}
							side="away"
							onClick={(origin) => onPlayerClick?.(p, origin, fixtureId, display.away.teamName)}
						/>
					))}
				</div>
			</div>

			<p className="muted mrp-source">{display.source}</p>
		</section>
	);
}
