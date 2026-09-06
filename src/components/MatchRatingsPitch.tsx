import { useEffect, useMemo, useState } from 'react';
import type { MatchRatingsBoard, MatchRatingsSide, RatedPitchPlayer } from '../types';
import type { PlayerOpenOrigin } from '../store/BarcaState';
import { fetchMatchRatings } from '../lib/api';
import { assignToFormation, formationKeyFromString } from '../lib/lineup';
import { teamCrestSrc, teamInitials } from '../lib/photos';

type Props = {
	fixtureId: string;
	pollKey?: string | number | null;
	onPlayerClick?: (
		player: RatedPitchPlayer,
		origin: PlayerOpenOrigin,
		fixtureId: string,
	) => void;
};

function ratingClass(rating: number | null) {
	if (rating == null) return 'muted';
	if (rating >= 8) return 'elite';
	if (rating >= 7) return 'good';
	if (rating >= 6) return 'ok';
	return 'poor';
}

/** Re-place XI using role hints (Gordon LW, Raphinha ST, Yamal RW) — SofaScore only sends G/D/M/F. */
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

function SideCrest({ name }: { name: string }) {
	const src = teamCrestSrc(name, '');
	const [ok, setOk] = useState(false);
	return (
		<span className="mrp-crest-wrap">
			{src ? (
				<img
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
				{player.number || '·'}
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
					setError('SofaScore ratings unavailable for this fixture.');
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [fixtureId, pollKey]);

	const display = useMemo(() => (board ? placeBoard(board) : null), [board]);

	if (loading && !display) {
		return <p className="muted mrp-status">Loading SofaScore match ratings…</p>;
	}
	if (error && !display) {
		return <p className="muted mrp-status">{error}</p>;
	}
	if (!display) return null;

	return (
		<section className="match-ratings-pitch">
			<header className="mrp-header">
				<div className="mrp-team home">
					<SideCrest name={display.home.teamName} />
					<div>
						<strong>{display.home.teamName}</strong>
						<span className="muted">{display.home.formation}</span>
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
						{display.homeScore ?? '–'} : {display.awayScore ?? '–'}
					</strong>
				</div>
				<div className="mrp-team away">
					{display.away.avgRating != null && (
						<span className={`mrp-team-rating ${ratingClass(display.away.avgRating)}`}>
							{display.away.avgRating.toFixed(1)}
						</span>
					)}
					<div>
						<strong>{display.away.teamName}</strong>
						<span className="muted">{display.away.formation}</span>
					</div>
					<SideCrest name={display.away.teamName} />
				</div>
			</header>

			<div className="mrp-field" aria-label="Match ratings pitch">
				<div className="mrp-half home">
					{display.home.starters.map((p) => (
						<PlayerNode
							key={`h-${p.id}`}
							player={p}
							side="home"
							onClick={(origin) => onPlayerClick?.(p, origin, fixtureId)}
						/>
					))}
				</div>
				<div className="mrp-half away">
					{display.away.starters.map((p) => (
						<PlayerNode
							key={`a-${p.id}`}
							player={p}
							side="away"
							onClick={(origin) => onPlayerClick?.(p, origin, fixtureId)}
						/>
					))}
				</div>
			</div>

			<p className="muted mrp-source">{display.source}</p>
		</section>
	);
}
