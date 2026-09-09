import { useEffect, useState } from 'react';
import { useBarca, useSelectedFixture } from '../store/BarcaState';
import { fetchLineup, isFinished, isLiveStatus, formatDateTime, formatFixtureWhen } from '../lib/api';
import { Scoreboard } from './Scoreboard';
import { LiveGraphic } from './LiveGraphic';
import { PitchLineup } from './PitchLineup';
import { MatchRatingsPitch } from './MatchRatingsPitch';
import { FetchButton } from './FetchButton';
import type { LineupData, RatedPitchPlayer } from '../types';

export function MatchPage() {
	const {
		data,
		selectedMatchId,
		selectMatch,
		goLive,
		stopLive,
		livePolling,
		lastLiveAt,
		refreshLiveScore,
		setTab,
		openPlayerStats,
	} = useBarca();
	const selectedFixture = useSelectedFixture();

	if (!data) {
		return (
			<div className="empty-state">
				<p>Fetch data to open match day view.</p>
				<FetchButton />
			</div>
		);
	}

	const fixture = selectedFixture;
	const liveMatch = data.live.live ? data.live.match : null;
	const isViewingLive = Boolean(liveMatch && fixture?.id === liveMatch.id);
	const showLiveGraphic = isViewingLive && livePolling;
	const matchOptions = data.fixtures.slice(0, 30);
	const showRatingsPitch = Boolean(
		fixture &&
			(fixture.kind === 'live' ||
				isLiveStatus(fixture.status) ||
				isFinished(fixture.status) ||
				fixture.kind === 'past'),
	);

	const handlePlayerClick = (
		player: Parameters<typeof openPlayerStats>[0],
		origin?: Parameters<typeof openPlayerStats>[1],
	) => {
		const sofaFromId = /^sofa-(\d+)$/i.exec(player.id);
		const sofaId = player.sofaId ?? (sofaFromId ? Number(sofaFromId[1]) : undefined);
		const fromSquad = data.squad.players.find(
			(p) =>
				(sofaId && p.sofaId === sofaId) ||
				(player.fcbId && p.fcbId === player.fcbId) ||
				p.id === player.id ||
				p.name.toLowerCase() === player.name.toLowerCase(),
		);
		const merged = {
			...(fromSquad ?? player),
			...player,
			fcbId: fromSquad?.fcbId ?? player.fcbId,
			sofaId: sofaId ?? fromSquad?.sofaId,
			photo: player.photo || fromSquad?.photo || '',
			nationality: player.nationality || fromSquad?.nationality || '',
		};

		if (fixture && (isViewingLive || isFinished(fixture.status) || fixture.kind === 'past')) {
			openPlayerStats(merged, origin, {
				mode: isViewingLive ? 'live' : 'match',
				fixtureId: fixture.id,
			});
			return;
		}
		openPlayerStats(merged, origin);
	};

	const handleRatedPlayerClick = (
		rated: RatedPitchPlayer,
		origin: { x: number; y: number },
		fixtureId: string,
		teamName: string,
	) => {
		const fromSquad = data.squad.players.find(
			(p) =>
				(rated.sofaId && p.sofaId === rated.sofaId) ||
				p.name.toLowerCase() === rated.name.toLowerCase() ||
				(p.number &&
					rated.number &&
					p.number === rated.number &&
					p.name.includes(rated.name.split(' ').slice(-1)[0]!)),
		);
		openPlayerStats(
			{
				id: fromSquad?.id ?? rated.id,
				name: fromSquad?.name ?? rated.name,
				position: rated.position || fromSquad?.position || '',
				number: rated.number || fromSquad?.number || '',
				nationality: fromSquad?.nationality ?? '',
				photo: rated.photo ?? fromSquad?.photo ?? '',
				birthDate: fromSquad?.birthDate ?? '',
				sofaId: rated.sofaId ?? fromSquad?.sofaId,
				fcbId: fromSquad?.fcbId,
				club: teamName,
			},
			origin,
			{ mode: isViewingLive ? 'live' : 'match', fixtureId },
		);
	};

	const [lineup, setLineup] = useState<LineupData>(data.lineup);
	const [lineupLoading, setLineupLoading] = useState(false);

	useEffect(() => {
		setLineup(data.lineup);
	}, [data.lineup]);

	useEffect(() => {
		const targetId = fixture?.id ?? null;
		let cancelled = false;
		setLineupLoading(true);
		void fetchLineup(targetId ?? undefined)
			.then((next) => {
				if (!cancelled) setLineup(next);
			})
			.catch(() => {
				if (!cancelled) setLineup(data.lineup);
			})
			.finally(() => {
				if (!cancelled) setLineupLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [fixture?.id, data.lineup]);

	useEffect(() => {
		if (!fixture?.id) return;
		void refreshLiveScore();
	}, [fixture?.id, refreshLiveScore]);

	useEffect(() => {
		if (!isViewingLive || !fixture?.id || !livePolling) return;
		let cancelled = false;
		void fetchLineup(fixture.id)
			.then((next) => {
				if (!cancelled) setLineup(next);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [isViewingLive, fixture?.id, livePolling, lastLiveAt]);

	return (
		<section className="match-page">
			<div className="section-head">
				<h2>Match day</h2>
				<p>
					{liveMatch
						? 'Select the live fixture for real-time score, XI, and ratings — updates every 10 seconds.'
						: 'Scoreboard, confirmed XI, and SofaScore ratings — tap a player for match stats.'}
				</p>
			</div>

			<label className="field">
				<span>Select fixture</span>
				<select
					value={selectedMatchId ?? ''}
					onChange={(e) => selectMatch(e.target.value || null)}
				>
					<option value="">Choose match…</option>
					{matchOptions.map((f) => (
						<option key={f.id} value={f.id}>
							{formatFixtureWhen(f.date, f.time)} — {f.isHome ? 'vs' : '@'} {f.opponent} ({f.competition})
							{f.kind === 'live' ? ' · LIVE' : ''}
						</option>
					))}
				</select>
			</label>

			<div className="match-actions">
				{showLiveGraphic ? (
					livePolling ? (
						<>
							<span className="tag live">
								<span className="pulse" /> Live recon · every 10s
							</span>
							<button type="button" className="btn-ghost" onClick={stopLive}>
								Pause updates
							</button>
						</>
					) : (
						<button type="button" className="btn-live" onClick={goLive}>
							<span className="pulse" /> Resume live updates
						</button>
					)
				) : isViewingLive ? (
					<span className="muted">Live updates paused — resume to keep the scoreboard in sync.</span>
				) : liveMatch ? (
					<span className="muted">
						{fixture && !isViewingLive && isFinished(fixture.status)
							? `Full time — ${formatFixtureWhen(fixture.date, fixture.time)}`
							: `Barça live vs ${liveMatch.opponent} — select that fixture above or open it from Fixtures.`}
					</span>
				) : fixture && isFinished(fixture.status) ? (
					<span className="muted">
						Full time — final score · {formatFixtureWhen(fixture.date, fixture.time)}
						{lastLiveAt ? ` · Last refresh ${formatDateTime(lastLiveAt)} IST` : ''}
					</span>
				) : (
					<span className="muted">No Barça match live right now — updates start automatically at kickoff.</span>
				)}
				{lastLiveAt && livePolling && (
					<span className="fetch-meta">Last refresh {formatDateTime(lastLiveAt)} IST</span>
				)}
			</div>

			{fixture && (
				<>
					<Scoreboard
						fixture={fixture}
						large
						live={showLiveGraphic}
						clock={isViewingLive ? data.live.clock : undefined}
					/>

					{showLiveGraphic && (
						<LiveGraphic
							events={data.live.events}
							clock={data.live.clock}
							homeScore={fixture.homeScore}
							awayScore={fixture.awayScore}
							homeLabel={fixture.isHome ? 'Barcelona' : fixture.opponent}
							awayLabel={fixture.isHome ? fixture.opponent : 'Barcelona'}
						/>
					)}

					{isFinished(fixture.status) && !isViewingLive && (
						<div className="post-match-cta">
							<p>Full time — rate the squad and coach.</p>
							<button type="button" className="btn-primary" onClick={() => setTab('ratings')}>
								Rate players →
							</button>
						</div>
					)}
				</>
			)}

			{lineup && (
				<PitchLineup
					lineup={lineup}
					coach={data.squad.coach}
					squad={data.squad.players}
					onPlayerClick={handlePlayerClick}
					liveEvents={isViewingLive ? data.live.events : undefined}
				/>
			)}
			{lineupLoading && <p className="muted fetch-meta">Refreshing lineup from SofaScore…</p>}

			{showRatingsPitch && fixture && (
				<details className="match-ratings-details">
					<summary>Both-teams SofaScore ratings</summary>
					<MatchRatingsPitch
						fixtureId={fixture.id}
						pollKey={isViewingLive ? lastLiveAt : fixture.id}
						onPlayerClick={handleRatedPlayerClick}
					/>
				</details>
			)}
		</section>
	);
}
