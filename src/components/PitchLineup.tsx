import { useMemo, useState } from 'react';
import { assignToFormation, type FormationKey } from '../lib/lineup';
import type { LineupData, Player, TimelineEvent } from '../types';
import { enrichPlayersPhotos } from '../lib/photos';
import { PlayerHoverCard } from './PlayerHoverCard';
import { PlayerAvatar } from './PlayerAvatar';
import {
	applyLiveSubstitutions,
	benchPopupStyle,
	benchSubStatusFor,
	buildBarcaSubStatus,
	type BenchSubStatus,
} from '../lib/live-lineup';

function dedupeBench(starters: Player[], bench: Player[]) {
	const pitchIds = new Set(starters.map((p) => p.id));
	const seen = new Set<string>();
	return bench.filter((p) => {
		if (pitchIds.has(p.id) || seen.has(p.id)) return false;
		seen.add(p.id);
		return true;
	});
}

import type { PlayerOpenOrigin } from '../store/BarcaState';

type Props = {
	lineup: LineupData;
	coach: string;
	squad?: Player[];
	onPlayerClick?: (player: Player, origin: PlayerOpenOrigin) => void;
	liveEvents?: TimelineEvent[];
};

type PitchHover = { kind: 'pitch'; player: Player; slot: string; x: number; y: number };
type BenchHover = { kind: 'bench'; player: Player; rect: DOMRect };
type HoverTarget = PitchHover | BenchHover;

function hoverPopupStyle(x: number, y: number) {
	const showBelow = y < 30;
	const left = Math.min(Math.max(x, 20), 80);
	return {
		left: `${left}%`,
		top: showBelow ? `${y + 14}%` : `${Math.max(y - 10, 6)}%`,
		transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
	};
}

export function PitchLineup({ lineup, coach, squad = [], onPlayerClick, liveEvents }: Props) {
	const [hovered, setHovered] = useState<HoverTarget | null>(null);
	const formation = (lineup.formation as FormationKey) || '4-3-3';
	const live = Boolean(liveEvents?.length);

	const { starters, bench } = useMemo(() => {
		const fromFcbLive = lineup.sources.some((s) => s.includes('FC Barcelona official'));
		const base = !liveEvents?.length || fromFcbLive
			? { starters: lineup.starters, bench: lineup.bench }
			: applyLiveSubstitutions(lineup.starters, lineup.bench, liveEvents);
		return {
			starters: enrichPlayersPhotos(base.starters, squad),
			bench: enrichPlayersPhotos(dedupeBench(base.starters, base.bench), squad),
		};
	}, [lineup.starters, lineup.bench, lineup.sources, liveEvents, squad]);

	const pitchPlayers = assignToFormation(starters, formation);
	const subStatusMap = live ? buildBarcaSubStatus(liveEvents!) : new Map<string, BenchSubStatus>();

	const modeLabel =
		lineup.mode === 'predicted'
			? 'Predicted XI'
			: lineup.mode === 'confirmed'
				? 'Confirmed XI'
				: 'Last match XI';

	const clearHover = () => setHovered(null);

	return (
		<div className="pitch-lineup">
			<div className="lineup-header">
				<div>
					<h3>{live ? 'Live XI' : modeLabel}</h3>
					<p className="muted">
						{lineup.formation}
						{lineup.opponent ? ` · vs ${lineup.opponent}` : ''}
						{live && ' · pitch updates with substitutions'}
						{lineup.matchDay && lineup.mode === 'predicted' && !live && ' · Match day prediction'}
					</p>
				</div>
				<div className="lineup-badges">
					<span className={`conf-badge ${lineup.confidence}`}>{lineup.confidence} confidence</span>
					{live && (
						<span className="tag live">
							<span className="pulse" /> Live lineup
						</span>
					)}
					{lineup.matchDay && lineup.mode === 'predicted' && !live && (
						<span className="tag live">Match day</span>
					)}
				</div>
			</div>

			{lineup.notes.length > 0 && (
				<ul className="lineup-notes">
					{lineup.notes.map((n) => (
						<li key={n}>{n}</li>
					))}
				</ul>
			)}

			{lineup.excluded.length > 0 && (
				<div className="excluded-panel">
					<h4>Out / injured (from news scan)</h4>
					<ul>
						{lineup.excluded.map((e) => (
							<li key={e.name}>
								<strong>{e.name}</strong>
								<span className="muted">{e.reason}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="pitch-stage">
				<div className="formation-pitch">
					<div className="pitch-grass" />
					<div className="pitch-box top" />
					<div className="pitch-box bottom" />
					<div className="pitch-half-line" />
					<div className="pitch-center-circle" />

					{pitchPlayers.map(({ player, slot, x, y }) => (
						<PitchPlayerDot
							key={`${player.id}-${slot}`}
							player={player}
							slot={slot}
							x={x}
							y={y}
							active={hovered?.kind === 'pitch' && hovered.player.id === player.id}
							onHover={(on) =>
								setHovered(on ? { kind: 'pitch', player, slot, x, y } : null)
							}
							onClick={(origin) => onPlayerClick?.(player, origin)}
						/>
					))}

					{hovered?.kind === 'pitch' && (
						<div className="hover-popup" style={hoverPopupStyle(hovered.x, hovered.y)}>
							<PlayerHoverCard player={hovered.player} slot={hovered.slot} />
						</div>
					)}
				</div>

				<aside className="lineup-sidebar">
					<div className="coach-card compact">
						<span className="coach-label">Head Coach</span>
						<strong>{coach}</strong>
					</div>

					{bench.length > 0 && (
						<section>
							<h4>Bench</h4>
							<p className="muted bench-hint">Click any player for live match stats</p>
							<div className="bench-list">
								{bench.map((p) => {
									const subStatus = benchSubStatusFor(p, subStatusMap);
									return (
										<button
											key={p.id}
											type="button"
											className={`bench-chip${subStatus ? ` sub-${subStatus.toLowerCase()}` : ''}${hovered?.kind === 'bench' && hovered.player.id === p.id ? ' active' : ''}`}
											onMouseEnter={(e) =>
												setHovered({
													kind: 'bench',
													player: p,
													rect: e.currentTarget.getBoundingClientRect(),
												})
											}
											onMouseLeave={clearHover}
											onFocus={(e) =>
												setHovered({
													kind: 'bench',
													player: p,
													rect: e.currentTarget.getBoundingClientRect(),
												})
											}
											onBlur={clearHover}
											onClick={(e) => {
												const rect = e.currentTarget.getBoundingClientRect();
												onPlayerClick?.(p, {
													x: rect.left + rect.width / 2,
													y: rect.top + rect.height / 2,
												});
											}}
										>
											{subStatus && (
												<span
													className={`bench-sub-status ${subStatus.toLowerCase()}`}
													aria-label={`Substituted ${subStatus === 'ON' ? 'on' : 'off'}`}
												>
													{subStatus}
												</span>
											)}
											<div className="bench-chip-body">
												<span className="num">#{p.number || '–'}</span>
												<span className="bench-name">{p.name.split(' ').pop()}</span>
											</div>
										</button>
									);
								})}
							</div>
						</section>
					)}

					<section className="lineup-sources">
						<h4>Sources</h4>
						<ul>
							{lineup.sources.map((s) => (
								<li key={s}>{s}</li>
							))}
						</ul>
					</section>
				</aside>
			</div>

			{hovered?.kind === 'bench' && (
				<div className="bench-hover-popup hover-popup" style={benchPopupStyle(hovered.rect)}>
					<PlayerHoverCard player={hovered.player} slot="SUB" />
				</div>
			)}
		</div>
	);
}

function PitchPlayerDot({
	player,
	x,
	y,
	active,
	onHover,
	onClick,
}: {
	player: Player;
	slot: string;
	x: number;
	y: number;
	active: boolean;
	onHover: (on: boolean) => void;
	onClick: (origin: PlayerOpenOrigin) => void;
}) {
	return (
		<button
			type="button"
			className={`pitch-player ${active ? 'active' : ''}`}
			style={{ left: `${x}%`, top: `${y}%` }}
			onMouseEnter={() => onHover(true)}
			onMouseLeave={() => onHover(false)}
			onFocus={() => onHover(true)}
			onBlur={() => onHover(false)}
			onClick={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				onClick({
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height / 2,
				});
			}}
		>
			<PlayerAvatar player={player} size="sm" imgClassName="pitch-avatar" />
			<span className="pitch-num">{player.number || '·'}</span>
			<span className="pitch-name">{player.name.split(' ').pop()}</span>
		</button>
	);
}
