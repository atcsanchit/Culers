import { useState } from 'react';
import { useBarca } from '../store/BarcaState';
import { formatFixtureWhen, formatShortDate, isFinished, isLiveStatus, resultLabel } from '../lib/api';
import { Scoreboard } from './Scoreboard';
import { FetchButton } from './FetchButton';
import { FetchHeroBackdrop } from './FetchHeroBackdrop';
import { useFetchAnimationState } from '../context/FetchAnimationContext';
import { FixtureCalendar } from './FixtureCalendar';
import { HomeNewsCard } from './HomeNewsCard';
import { RecentFormCarousel } from './RecentFormCarousel';
import { OnThisDayCard } from './OnThisDayCard';
import { LaMasiaSpotlight } from './LaMasiaSpotlight';
import { RivalryModePanel } from './RivalryModePanel';
import { useRivalryMode } from '../hooks/useRivalryMode';
import { matchRivalry } from '../lib/rivalry';
import { BARCA_CREST } from '../lib/photos';

export function HomePage() {
	const { data, setTab, goLive, openFixture, openPlayerStats } = useBarca();
	const { isActive: fetchAnimActive } = useFetchAnimationState();
	const liveMatch = data?.live.live ? data.live.match : null;
	const { active: rivalry } = useRivalryMode(data?.fixtures, liveMatch ?? null);

	if (!data) {
		return (
			<section className="home-page">
				<div className={`hero empty-hero glass-panel${fetchAnimActive ? ' is-fetch-active' : ''}`}>
					<FetchHeroBackdrop />
					<h2>Welcome, Culer</h2>
					<p>Your personal Barça command center — fixtures, news, live match graphics, and post-match player ratings.</p>
					<FetchButton />
				</div>
			</section>
		);
	}

	const next = data.fixtures.find((f) => f.kind === 'upcoming');
	const todayNews = data.news.slice(0, 4);
	const nextIsRivalry = next ? matchRivalry(next.opponent) : null;

	return (
		<section className="home-page">
			<div
				className={`hero home-hero${fetchAnimActive ? ' is-fetch-active' : ''}${rivalry ? ' has-rivalry' : ''}`}
			>
				<FetchHeroBackdrop />
				<div className="hero-text">
					<span className="eyebrow">{rivalry ? rivalry.rivalry.name : 'Visca el Barça'}</span>
					<h2>{rivalry ? 'Rivalry mode' : 'Més que un club'}</h2>
					<p>
						{rivalry
							? rivalry.rivalry.tagline
							: 'Fixtures, live matchday, squad intel & Barça news — synced on demand.'}
					</p>
					<div className="hero-actions">
						{data.live.live && (
							<button type="button" className="btn-live" onClick={goLive}>
								<span className="pulse" /> Go Live
							</button>
						)}
						<button type="button" className="btn-primary" onClick={() => setTab('fixtures')}>
							View fixtures
						</button>
						<button type="button" className="btn-ghost" onClick={() => setTab('match')}>
							Match day XI
						</button>
					</div>
				</div>
				<div className="hero-stats hero-stats-row">
					<div className="stat-card glass-stat">
						<strong>{data.fixtures.length}</strong>
						<span>Fixtures</span>
					</div>
					<div className="stat-card glass-stat">
						<strong>{data.news.length}</strong>
						<span>News</span>
					</div>
					<div className="stat-card glass-stat">
						<strong>{data.squad.players.length}</strong>
						<span>Squad</span>
					</div>
				</div>
			</div>

			{rivalry && (
				<RivalryModePanel
					ctx={rivalry}
					fixtures={data.fixtures}
					onOpenFixture={openFixture}
					onGoLive={goLive}
				/>
			)}

			{liveMatch && !matchRivalry(liveMatch.opponent) && (
				<div className="home-block live-block glass-panel">
					<h3>Happening now</h3>
					<Scoreboard fixture={liveMatch} live clock={data.live.clock} />
					<button type="button" className="btn-live" onClick={goLive}>
						Go Live →
					</button>
				</div>
			)}

			<div className="home-grid">
				<div className="home-block glass-panel match-spotlight">
					<span className="panel-label">Next up</span>
					<h3>Next match</h3>
					{next ? (
						<button
							type="button"
							className={`fixture-spotlight${nextIsRivalry ? ` is-rivalry rivalry-row-${nextIsRivalry.id}` : ''}`}
							onClick={() => openFixture(next)}
						>
							<img src={BARCA_CREST} alt="" className="fixture-crest-watermark" aria-hidden />
							<div className="fixture-spotlight-main">
								<span className="comp-badge">{next.competition}</span>
								{nextIsRivalry && <span className="rivalry-chip">{nextIsRivalry.shortLabel}</span>}
								<strong className="fixture-opponent">vs {next.opponent}</strong>
								<span className="fixture-when">{formatFixtureWhen(next.date, next.time)}</span>
								<span className="fixture-venue">{next.isHome ? 'Spotify Camp Nou' : next.venue}</span>
							</div>
						</button>
					) : (
						<p className="muted">No upcoming fixture loaded.</p>
					)}
				</div>
				<div className="home-block glass-panel match-spotlight">
					<span className="panel-label">Form</span>
					<h3>Recent results</h3>
					<RecentFormCarousel
						fixtures={data.fixtures}
						onSelect={(id) => {
							const fixture = data.fixtures.find((f) => f.id === id);
							if (fixture) openFixture(fixture);
						}}
					/>
				</div>
			</div>

			<div className="home-grid culture-grid">
				<OnThisDayCard />
				<LaMasiaSpotlight
					squad={data.squad.players}
					onOpenPlayer={(player, origin, context) => openPlayerStats(player, origin, context)}
				/>
			</div>

			<div className="home-block glass-panel home-news-panel">
				<div className="section-head inline">
					<div>
						<span className="panel-label">Breaking</span>
						<h3>Latest from @ReshadRahman</h3>
					</div>
					<button type="button" className="link-btn" onClick={() => setTab('news')}>
						See all →
					</button>
				</div>
				<div className="home-news-grid">
					{todayNews.map((n, i) => (
						<HomeNewsCard
							key={`${n.link}-${i}`}
							item={n}
							avatarUrl={data.newsProfile?.avatarUrl}
							authorName={data.newsProfile?.name}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

export function FixturesPage() {
	const { data, openFixture } = useBarca();
	const [filter, setFilter] = useState<'all' | 'laliga' | 'ucl' | 'upcoming' | 'past' | 'rivalries'>('all');
	const [calDate, setCalDate] = useState<string | null>(null);

	if (!data) {
		return <EmptyFetch msg="Load fixtures with Fetch latest." />;
	}

	const allowed = data.fixtures.filter(
		(f) => f.competition === 'La Liga' || f.competition === 'UEFA Champions League',
	);

	const filtered = allowed.filter((f) => {
		if (filter === 'laliga') return f.competition === 'La Liga';
		if (filter === 'ucl') return f.competition === 'UEFA Champions League';
		if (filter === 'upcoming') return f.kind === 'upcoming';
		if (filter === 'past') return f.kind === 'past';
		if (filter === 'rivalries') return Boolean(matchRivalry(f.opponent));
		return true;
	});

	const laligaCount = allowed.filter((f) => f.competition === 'La Liga').length;
	const uclCount = allowed.filter((f) => f.competition === 'UEFA Champions League').length;
	const rivalryCount = allowed.filter((f) => matchRivalry(f.opponent)).length;

	return (
		<section className="fixtures-page">
			<div className="section-head">
				<h2>Fixtures</h2>
				<p>
					La Liga & UEFA Champions League from FC Barcelona official calendar — {laligaCount} league, {uclCount}{' '}
					European
					{rivalryCount ? ` · ${rivalryCount} rivalry` : ''}.
				</p>
			</div>

			<div className="filter-pills">
				{(
					[
						['all', 'All'],
						['laliga', 'La Liga'],
						['ucl', 'UCL'],
						['rivalries', 'Rivalries'],
						['upcoming', 'Upcoming'],
						['past', 'Results'],
					] as const
				).map(([f, label]) => (
					<button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
						{label}
					</button>
				))}
			</div>

			<FixtureCalendar
				fixtures={allowed}
				selectedDate={calDate}
				onSelectDate={setCalDate}
				onSelectFixture={(id) => {
					const fixture = allowed.find((f) => f.id === id);
					if (fixture) openFixture(fixture);
				}}
			/>

			<div className="fixture-list">
				{filtered.map((f) => {
					const result = resultLabel(f);
					const rivalry = matchRivalry(f.opponent);
					return (
						<button
							key={f.id}
							type="button"
							className={`fixture-row${rivalry ? ` is-rivalry rivalry-row-${rivalry.id}` : ''}`}
							onClick={() => openFixture(f)}
						>
							<div className="fixture-date">
								<strong>{formatShortDate(f.date, f.time)}</strong>
								<span className={`comp-badge ${f.competition.includes('Champions') ? 'ucl' : 'laliga'}`}>
									{f.competition.includes('Champions') ? 'UCL' : 'La Liga'}
								</span>
								{rivalry && <span className="rivalry-chip">{rivalry.shortLabel}</span>}
							</div>
							<div className="fixture-match">
								<span>{f.isHome ? 'Barça' : f.opponent}</span>
								<span className="score-cell">
									{f.homeScore != null
										? `${f.isHome ? f.homeScore : f.awayScore}–${f.isHome ? f.awayScore : f.homeScore}`
										: '–'}
								</span>
								<span>{!f.isHome ? 'Barça' : f.opponent}</span>
							</div>
							<div className="fixture-meta">
								{f.kind === 'upcoming' && !isLiveStatus(f.status) && (
									<span className="tag upcoming">Upcoming</span>
								)}
								{isLiveStatus(f.status) && <span className="tag live">Live</span>}
								{isFinished(f.status) && result && (
									<span className={`result-pill ${result === 'W' ? 'win' : result === 'L' ? 'loss' : 'draw'}`}>
										{result}
									</span>
								)}
								<span className="muted">{formatFixtureWhen(f.date, f.time)}</span>
							</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}

function EmptyFetch({ msg }: { msg: string }) {
	return (
		<div className="empty-state">
			<p>{msg}</p>
			<FetchButton />
		</div>
	);
}
