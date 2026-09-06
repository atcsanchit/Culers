import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import type { Fixture, MatchSummary, Player } from '../types';
import type { PlayerOpenOrigin, PlayerStatsContext } from '../store/BarcaState';
import { fetchMatchSummary, formatFixtureWhen } from '../lib/api';
import {
	briefingPhase,
	computeOpponentH2H,
	getNextUpcoming,
	lastForm,
	playerToWatch,
	stakesLine,
	watchChecklist,
} from '../lib/matchBriefing';
import { countdownParts, fixtureKickoffMs, matchRivalry } from '../lib/rivalry';
import { loadMatchPrediction, saveMatchPrediction } from '../lib/storage';
import {
	BARCA_CREST,
	CAMP_NOU_BG,
	playerPhotoSrc,
	playerInitials,
	teamCrestSrc,
	teamInitials,
} from '../lib/photos';
import { PlayerAvatar } from './PlayerAvatar';

type Props = {
	fixtures: Fixture[];
	squad: Player[];
	onOpenFixture: (fixture: Fixture) => void;
	onGoMatchDay: () => void;
	onOpenPlayer?: (player: Player, origin?: PlayerOpenOrigin, context?: PlayerStatsContext) => void;
};

function pad(n: number) {
	return String(n).padStart(2, '0');
}

function TeamCrest({
	name,
	url,
	ok,
	onOk,
	onFail,
}: {
	name: string;
	url: string;
	ok: boolean;
	onOk: () => void;
	onFail: () => void;
}) {
	const src = teamCrestSrc(name, url);
	return (
		<>
			{src ? (
				<img
					src={src}
					alt=""
					className={`next-briefing-crest${ok ? '' : ' is-loading'}`}
					onLoad={onOk}
					onError={onFail}
				/>
			) : null}
			{(!src || !ok) && (
				<span className="next-briefing-crest next-briefing-crest-letter" aria-hidden>
					{teamInitials(name)}
				</span>
			)}
		</>
	);
}

export function NextMatchBriefing({ fixtures, squad, onOpenFixture, onGoMatchDay, onOpenPlayer }: Props) {
	const fixture = useMemo(() => getNextUpcoming(fixtures), [fixtures]);
	const kick = fixture ? fixtureKickoffMs(fixture) : null;
	const [now, setNow] = useState(() => Date.now());
	const [summary, setSummary] = useState<MatchSummary | null>(null);

	useEffect(() => {
		if (kick == null) return;
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [kick]);

	useEffect(() => {
		if (!fixture?.id) {
			setSummary(null);
			return;
		}
		let cancelled = false;
		setSummary(null);
		void fetchMatchSummary(fixture.id)
			.then((s) => {
				if (!cancelled) setSummary(s);
			})
			.catch(() => {
				if (!cancelled) setSummary(null);
			});
		return () => {
			cancelled = true;
		};
	}, [fixture?.id]);

	const phase = kick != null ? briefingPhase(kick, now) : null;
	const cd = kick != null ? countdownParts(kick, now) : null;

	const rivalry = fixture ? matchRivalry(fixture.opponent) : null;
	const h2h = useMemo(
		() => (fixture ? computeOpponentH2H(fixtures, fixture.opponent) : null),
		[fixtures, fixture],
	);
	const form = useMemo(() => lastForm(fixtures, 5), [fixtures]);
	const watch = useMemo(() => playerToWatch(squad), [squad]);
	const checklist = useMemo(
		() => (fixture && phase === 'near' ? watchChecklist(fixture, rivalry) : []),
		[fixture, phase, rivalry],
	);

	const [barcaGoals, setBarcaGoals] = useState(2);
	const [oppGoals, setOppGoals] = useState(1);
	const [savedPrediction, setSavedPrediction] = useState(() =>
		fixture ? loadMatchPrediction(fixture.id) : null,
	);
	const [homeCrestOk, setHomeCrestOk] = useState(false);
	const [awayCrestOk, setAwayCrestOk] = useState(false);

	useEffect(() => {
		if (!fixture) {
			setSavedPrediction(null);
			return;
		}
		const existing = loadMatchPrediction(fixture.id);
		setSavedPrediction(existing);
		if (existing) {
			setBarcaGoals(existing.barcaGoals);
			setOppGoals(existing.oppGoals);
		} else {
			setBarcaGoals(2);
			setOppGoals(1);
		}
		setHomeCrestOk(false);
		setAwayCrestOk(false);
	}, [fixture?.id]);

	if (!fixture || !phase || !cd || cd.expired) return null;

	const homeTeam = summary?.homeTeam ?? fixture.homeTeam;
	const awayTeam = summary?.awayTeam ?? fixture.awayTeam;
	const homeIsBarca = fixture.isHome;
	const venue = summary?.venue || (fixture.isHome ? 'Spotify Camp Nou' : fixture.venue);
	const homeCrestUrl = summary?.homeCrest || (homeIsBarca ? BARCA_CREST : rivalry?.crestUrl || '');
	const awayCrestUrl = summary?.awayCrest || (!homeIsBarca ? BARCA_CREST : rivalry?.crestUrl || '');
	const wallpaper = summary?.backgroundImage?.trim() || CAMP_NOU_BG;
	const stakes = stakesLine(fixture);
	const lore = rivalry?.lore[0] ?? null;

	const homeGoals = homeIsBarca ? barcaGoals : oppGoals;
	const awayGoals = homeIsBarca ? oppGoals : barcaGoals;
	const setHomeGoals = (n: number) => (homeIsBarca ? setBarcaGoals(n) : setOppGoals(n));
	const setAwayGoals = (n: number) => (homeIsBarca ? setOppGoals(n) : setBarcaGoals(n));

	const openWatch = (e: MouseEvent) => {
		if (!watch || !onOpenPlayer) return;
		onOpenPlayer(watch, { x: e.clientX, y: e.clientY }, { mode: 'career', initialTab: 'career' });
	};

	const lockPrediction = () => {
		const next = {
			fixtureId: fixture.id,
			barcaGoals,
			oppGoals,
			savedAt: new Date().toISOString(),
		};
		saveMatchPrediction(next);
		setSavedPrediction(next);
	};

	const countdownCells =
		phase === 'far'
			? ([
					['Days', cd.days, false],
					['Hrs', cd.hours, true],
					['Min', cd.minutes, true],
				] as const)
			: ([
					['Hrs', cd.days * 24 + cd.hours, true],
					['Min', cd.minutes, true],
					['Sec', cd.seconds, true],
				] as const);

	const lockedHome = savedPrediction
		? homeIsBarca
			? savedPrediction.barcaGoals
			: savedPrediction.oppGoals
		: null;
	const lockedAway = savedPrediction
		? homeIsBarca
			? savedPrediction.oppGoals
			: savedPrediction.barcaGoals
		: null;

	return (
		<section
			className={`next-briefing glass-panel${phase === 'near' ? ' is-near' : ' is-far'}${rivalry ? ` is-rivalry rivalry-row-${rivalry.id}` : ''}`}
			aria-label="Next match briefing"
			style={{ '--briefing-ground': `url(${wallpaper})` } as CSSProperties}
		>
			<div className="next-briefing-ground" aria-hidden />
			<div className="next-briefing-head">
				<div className="next-briefing-titles">
					<span className="panel-label">Next up</span>
					<h3>Next match briefing</h3>
				</div>
				<span className={`next-briefing-chip${phase === 'near' ? ' is-urgent' : ''}`}>
					{phase === 'far' ? 'Match week' : 'Within 48 hours'}
				</span>
			</div>

			<div className="next-briefing-main">
				<div className="next-briefing-teams">
					<div className="next-briefing-side">
						<TeamCrest
							name={homeTeam}
							url={homeCrestUrl}
							ok={homeCrestOk}
							onOk={() => setHomeCrestOk(true)}
							onFail={() => setHomeCrestOk(false)}
						/>
						<strong>{homeTeam}</strong>
					</div>
					<div className="next-briefing-vs">
						<span className="next-briefing-vs-label">vs</span>
						<span className="next-briefing-when">{formatFixtureWhen(fixture.date, fixture.time)}</span>
					</div>
					<div className="next-briefing-side">
						<TeamCrest
							name={awayTeam}
							url={awayCrestUrl}
							ok={awayCrestOk}
							onOk={() => setAwayCrestOk(true)}
							onFail={() => setAwayCrestOk(false)}
						/>
						<strong>{awayTeam}</strong>
					</div>
				</div>

				<div className="next-briefing-meta">
					<span className="comp-badge">{summary?.competition ?? fixture.competition}</span>
					{rivalry && <span className="rivalry-chip">{rivalry.shortLabel}</span>}
					<span className="muted">{venue}</span>
				</div>

				<p className="next-briefing-stakes">{stakes}</p>

				<div className={`next-briefing-countdown${phase === 'near' ? ' is-urgent' : ''}`} aria-live="polite">
					{countdownCells.map(([label, value, padded]) => (
						<div key={label} className="next-briefing-cd-cell">
							<strong>{padded ? pad(value) : value}</strong>
							<span>{label}</span>
						</div>
					))}
				</div>

				<div className={`next-briefing-stats${phase === 'near' ? ' is-compressed' : ''}`}>
					<div className="next-briefing-form">
						<span className="rivalry-h2h-label">Recent form</span>
						{form.length ? (
							<div className="next-briefing-form-pills" aria-label="Last five results">
								{form.map(({ fixture: f, label }) => (
									<button
										key={f.id}
										type="button"
										className={`next-briefing-form-pill form-${label.toLowerCase()}`}
										title={`${label} · ${f.isHome ? 'vs' : '@'} ${f.opponent}`}
										onClick={() => onOpenFixture(f)}
									>
										{label}
									</button>
								))}
							</div>
						) : (
							<p className="muted">No finished matches loaded yet.</p>
						)}
						{form[0] && (
							<button
								type="button"
								className="next-briefing-form-last muted"
								onClick={() => onOpenFixture(form[0]!.fixture)}
							>
								Last: {form[0].fixture.isHome ? 'vs' : '@'} {form[0].fixture.opponent}{' '}
								{form[0].fixture.homeScore}–{form[0].fixture.awayScore} →
							</button>
						)}
					</div>

					<div className="next-briefing-h2h">
						<span className="rivalry-h2h-label">
							{rivalry && phase === 'near' ? 'Rivalry H2H' : 'Head to head'}
						</span>
						{h2h && h2h.played > 0 ? (
							<div className="next-briefing-h2h-grid">
								<div>
									<strong>{h2h.wins}</strong>
									<span>W</span>
								</div>
								<div>
									<strong>{h2h.draws}</strong>
									<span>D</span>
								</div>
								<div>
									<strong>{h2h.losses}</strong>
									<span>L</span>
								</div>
								<div>
									<strong>
										{h2h.goalsFor}–{h2h.goalsAgainst}
									</strong>
									<span>GF–GA</span>
								</div>
							</div>
						) : (
							<p className="muted">No meetings with this side in the loaded calendar.</p>
						)}
						{rivalry && phase === 'near' && (
							<span className={`rivalry-badge rivalry-badge-${rivalry.intensity}`}>
								{rivalry.name}
							</span>
						)}
					</div>
				</div>

				{phase === 'far' && rivalry && (
					<div className="next-briefing-rivalry-teaser">
						<span className="rivalry-h2h-label">{rivalry.name}</span>
						<p>{rivalry.tagline}</p>
						{lore && (
							<p className="next-briefing-lore">
								<strong>
									{lore.year} · {lore.score}
								</strong>{' '}
								{lore.note}
							</p>
						)}
					</div>
				)}

				{phase === 'far' && watch && (
					<button type="button" className="next-briefing-watch" onClick={openWatch} disabled={!onOpenPlayer}>
						{playerPhotoSrc(watch) ? (
							<PlayerAvatar player={watch} size="sm" />
						) : (
							<span className="next-briefing-watch-fallback" aria-hidden>
								{playerInitials(watch.name)}
							</span>
						)}
						<span className="next-briefing-watch-copy">
							<span className="rivalry-h2h-label">Player to watch</span>
							<strong>
								{watch.number ? `#${watch.number} ` : ''}
								{watch.name}
							</strong>
							<span className="muted">{watch.position}</span>
						</span>
						<span className="next-briefing-watch-cta">Career →</span>
					</button>
				)}

				{phase === 'near' && checklist.length > 0 && (
					<div className="next-briefing-checklist">
						<span className="rivalry-h2h-label">What to watch</span>
						<ul>
							{checklist.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				)}

				{phase === 'near' && (
					<div className="next-briefing-prediction">
						<span className="rivalry-h2h-label">Your score prediction</span>
						{savedPrediction && lockedHome != null && lockedAway != null ? (
							<p className="next-briefing-prediction-locked">
								Locked in:{' '}
								<strong>
									{homeTeam} {lockedHome}–{lockedAway} {awayTeam}
								</strong>
								<span className="muted"> · local only</span>
							</p>
						) : (
							<div className="next-briefing-prediction-inputs">
								<label>
									{homeTeam}
									<input
										type="number"
										min={0}
										max={15}
										value={homeGoals}
										onChange={(e) => setHomeGoals(Math.max(0, Number(e.target.value) || 0))}
									/>
								</label>
								<span className="next-briefing-prediction-sep">–</span>
								<label>
									{awayTeam}
									<input
										type="number"
										min={0}
										max={15}
										value={awayGoals}
										onChange={(e) => setAwayGoals(Math.max(0, Number(e.target.value) || 0))}
									/>
								</label>
								<button type="button" className="btn-primary" onClick={lockPrediction}>
									Lock prediction
								</button>
							</div>
						)}
					</div>
				)}

				<div className="next-briefing-actions">
					{phase === 'near' && (
						<button type="button" className="btn-live" onClick={onGoMatchDay}>
							Match Day →
						</button>
					)}
					<button type="button" className="btn-primary" onClick={() => onOpenFixture(fixture)}>
						{phase === 'near' ? 'Open preview →' : 'Open fixture →'}
					</button>
				</div>
			</div>
		</section>
	);
}
