import { useEffect, useState } from 'react';
import { useBarca, useSelectedFixture } from '../store/BarcaState';
import { fetchLineup, isFinished, formatDateTime, formatFixtureWhen } from '../lib/api';
import { Scoreboard } from './Scoreboard';
import { LiveGraphic } from './LiveGraphic';
import { PitchLineup } from './PitchLineup';
import { FetchButton } from './FetchButton';
import type { LineupData } from '../types';

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

	const handlePlayerClick = (player: Parameters<typeof openPlayerStats>[0], origin?: Parameters<typeof openPlayerStats>[1]) => {
		if (fixture && isViewingLive && player.fcbId) {
			openPlayerStats(player, origin, { mode: 'live', fixtureId: fixture.id });
			return;
		}
		openPlayerStats(player, origin);
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

	// Refresh official lineup every live poll while viewing the live fixture
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
						? 'Select the live fixture for real-time score, events, and lineups — updates every 10 seconds.'
						: 'Live scoreboard, pitch lineup, and squad — hover players on the pitch for details.'}
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
							homeScore={fixture.isHome ? fixture.homeScore : fixture.awayScore}
							awayScore={fixture.isHome ? fixture.awayScore : fixture.homeScore}
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
		</section>
	);
}
