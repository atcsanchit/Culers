import { useEffect, useState } from 'react';
import type { Fixture } from '../types';
import { formatFixtureWhen, resultLabel } from '../lib/api';
import {
	computeRivalryH2H,
	countdownParts,
	fixtureKickoffMs,
	type RivalryContext,
} from '../lib/rivalry';
import { BARCA_CREST } from '../lib/photos';

type Props = {
	ctx: RivalryContext;
	fixtures: Fixture[];
	onOpenFixture: (fixture: Fixture) => void;
	onGoLive?: () => void;
	compact?: boolean;
};

function pad(n: number) {
	return String(n).padStart(2, '0');
}

export function RivalryModePanel({ ctx, fixtures, onOpenFixture, onGoLive, compact }: Props) {
	const { rivalry, fixture, phase } = ctx;
	const kick = fixtureKickoffMs(fixture);
	const [now, setNow] = useState(() => Date.now());
	const [crestOk, setCrestOk] = useState(false);
	const h2h = computeRivalryH2H(fixtures, rivalry);

	useEffect(() => {
		setCrestOk(false);
	}, [rivalry.id, rivalry.crestUrl]);

	useEffect(() => {
		if (phase !== 'upcoming' || kick == null) return;
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [phase, kick]);

	const cd = kick != null ? countdownParts(kick, now) : null;

	const phaseLabel =
		phase === 'live' ? 'Live now' : phase === 'recent' ? 'Just played' : 'Countdown';

	return (
		<section
			className={`rivalry-panel rivalry-${rivalry.id}${compact ? ' is-compact' : ''}`}
			aria-label={`${rivalry.name} rivalry mode`}
			style={
				{
					'--rivalry-bg': `url(${rivalry.backgroundUrl})`,
				} as React.CSSProperties
			}
		>
			<div className="rivalry-panel-bg" aria-hidden />
			<div className="rivalry-panel-glow" aria-hidden />
			<div className="rivalry-panel-head">
				<span className="rivalry-eyebrow">{phaseLabel}</span>
				<span className={`rivalry-badge rivalry-badge-${rivalry.intensity}`}>{rivalry.name}</span>
			</div>

			<div className="rivalry-panel-main">
				<div className="rivalry-teams">
					<div className="rivalry-side">
						<img src={BARCA_CREST} alt="" className="rivalry-crest" />
						<strong>Barça</strong>
					</div>
					<div className="rivalry-vs">
						<span className="rivalry-vs-label">{fixture.isHome ? 'vs' : '@'}</span>
						{phase === 'live' || phase === 'recent' ? (
							<span className="rivalry-score">
								{fixture.isHome ? fixture.homeScore ?? '–' : fixture.awayScore ?? '–'}
								<span>–</span>
								{fixture.isHome ? fixture.awayScore ?? '–' : fixture.homeScore ?? '–'}
							</span>
						) : (
							<span className="rivalry-kick">{formatFixtureWhen(fixture.date, fixture.time)}</span>
						)}
					</div>
					<div className="rivalry-side">
						{rivalry.crestUrl && (
							<img
								src={rivalry.crestUrl}
								alt=""
								className={`rivalry-crest${crestOk ? '' : ' is-loading'}`}
								onLoad={() => setCrestOk(true)}
								onError={() => setCrestOk(false)}
							/>
						)}
						{!crestOk && (
							<span className="rivalry-crest rivalry-crest-letter" aria-hidden>
								{rivalry.opponentLabel.slice(0, 1)}
							</span>
						)}
						<strong>{rivalry.opponentLabel}</strong>
					</div>
				</div>

				<p className="rivalry-tagline">{rivalry.tagline}</p>

				{phase === 'upcoming' && cd && !cd.expired && (
					<div className="rivalry-countdown" aria-live="polite">
						{(
							[
								['Days', cd.days],
								['Hrs', cd.hours],
								['Min', cd.minutes],
								['Sec', cd.seconds],
							] as const
						).map(([label, value]) => (
							<div key={label} className="rivalry-cd-cell">
								<strong>{label === 'Days' ? value : pad(value)}</strong>
								<span>{label}</span>
							</div>
						))}
					</div>
				)}

				<div className="rivalry-history">
					<span className="rivalry-h2h-label">Rivalry history</span>
					<p>{rivalry.history}</p>
				</div>

				<div className="rivalry-h2h">
					<span className="rivalry-h2h-label">Head to head · loaded calendar</span>
					{h2h.played > 0 ? (
						<div className="rivalry-h2h-grid">
							<div>
								<strong>{h2h.wins}</strong>
								<span>Wins</span>
							</div>
							<div>
								<strong>{h2h.draws}</strong>
								<span>Draws</span>
							</div>
							<div>
								<strong>{h2h.losses}</strong>
								<span>Losses</span>
							</div>
							<div>
								<strong>
									{h2h.goalsFor}–{h2h.goalsAgainst}
								</strong>
								<span>Goals</span>
							</div>
						</div>
					) : (
						<p className="muted rivalry-h2h-empty">
							No finished meetings with {rivalry.opponentLabel} in the fixtures currently loaded —
							memorable nights are below.
						</p>
					)}
					{h2h.recent.length > 0 && (
						<ul className="rivalry-h2h-recent">
							{h2h.recent.slice(0, 3).map((m) => {
								const r = resultLabel(m);
								return (
									<li key={m.id}>
										<span className={`rivalry-result ${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}`}>
											{r ?? '–'}
										</span>
										<span>
											{m.isHome ? 'vs' : '@'} {m.opponent} · {m.homeScore}–{m.awayScore}
										</span>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className="rivalry-lore">
					<span className="rivalry-h2h-label">Memorable nights</span>
					<ul>
						{rivalry.lore.slice(0, compact ? 2 : 3).map((l) => (
							<li key={`${l.year}-${l.score}-${l.note.slice(0, 12)}`}>
								<strong>
									{l.year} · {l.score}
								</strong>
								<span>{l.note}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="rivalry-actions">
					{phase === 'live' && onGoLive ? (
						<button type="button" className="btn-live" onClick={onGoLive}>
							<span className="pulse" /> Go Live
						</button>
					) : (
						<button type="button" className="btn-primary" onClick={() => onOpenFixture(fixture)}>
							Open fixture →
						</button>
					)}
					<span className="muted rivalry-comp">
						{fixture.competition}
						{fixture.venue ? ` · ${fixture.isHome ? 'Spotify Camp Nou' : fixture.venue}` : ''}
					</span>
				</div>
			</div>
		</section>
	);
}
