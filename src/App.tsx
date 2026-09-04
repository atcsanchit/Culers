import { useState } from 'react';
import { FetchAnimationProvider } from './context/FetchAnimationContext';
import { BarcaProvider, useBarca } from './store/BarcaState';
import { BarcaAmbience } from './components/BarcaAmbience';
import { StadiumBackdrop } from './components/StadiumBackdrop';
import { Header } from './components/Header';
import { AppNav } from './components/AppNav';
import { HomePage } from './components/FixturesPage';
import { FixturesPage } from './components/FixturesPage';
import { NewsPage } from './components/NewsPage';
import { FootballNewsPage } from './components/FootballNewsPage';
import { MatchPage } from './components/MatchPage';
import { SquadHubPage } from './components/SquadHubPage';
import { PlayerRatingsForm } from './components/PlayerRatingsForm';
import { PlayerStatsModal } from './components/PlayerStatsModal';
import { MatchSummaryModal } from './components/MatchSummaryModal';
import { OnThisDayModal } from './components/OnThisDayModal';
import { SocialDock } from './components/SocialDock';
import { SocialFeedModal } from './components/SocialFeedModal';
import { DATA_SOURCES } from './lib/sources';
import { useRivalryMode } from './hooks/useRivalryMode';
import { ON_THIS_DAY } from './data/onThisDay';
import type { SocialPlatformId } from './types';

function Body() {
	const {
		tab,
		data,
		selectedPlayer,
		playerOpenOrigin,
		playerStatsContext,
		closePlayerStats,
		selectedMatchSummary,
		closeMatchSummary,
		selectedOnThisDay,
		selectedOnThisDayExact,
		closeOnThisDay,
		openOnThisDay,
	} = useBarca();
	const [socialPlatform, setSocialPlatform] = useState<SocialPlatformId | null>(null);
	const liveMatch = data?.live.live ? data.live.match : null;
	const rivalry = useRivalryMode(data?.fixtures, liveMatch);

	const onThisDayIdx = selectedOnThisDay
		? ON_THIS_DAY.findIndex(
				(e) =>
					e.md === selectedOnThisDay.md &&
					e.year === selectedOnThisDay.year &&
					e.title === selectedOnThisDay.title,
			)
		: -1;

	return (
		<FetchAnimationProvider>
			<>
			<BarcaAmbience />
			<StadiumBackdrop />
			<div
				className={[
					'app-shell',
					rivalry.themeOn && rivalry.themeId ? 'rivalry-mode' : '',
					rivalry.themeOn && rivalry.themeId ? `rivalry-theme-${rivalry.themeId}` : '',
				]
					.filter(Boolean)
					.join(' ')}
				data-rivalry={rivalry.themeOn ? rivalry.themeId ?? undefined : undefined}
			>
			<Header rivalry={rivalry.active} />
			<AppNav />
			<main className="app-main">
				{tab === 'home' && <HomePage />}
				{tab === 'fixtures' && <FixturesPage />}
				{tab === 'news' && <NewsPage />}
				{tab === 'football-news' && <FootballNewsPage />}
				{tab === 'match' && <MatchPage />}
				{tab === 'squad' && <SquadHubPage />}
				{tab === 'ratings' && <PlayerRatingsForm />}
			</main>
			<PlayerStatsModal
				key={selectedPlayer?.id ?? 'player-modal-closed'}
				player={selectedPlayer}
				origin={playerOpenOrigin}
				statsContext={playerStatsContext}
				onClose={closePlayerStats}
			/>
			<MatchSummaryModal
				key={selectedMatchSummary?.id ?? 'summary-modal-closed'}
				fixture={selectedMatchSummary}
				onClose={closeMatchSummary}
			/>
			<OnThisDayModal
				key={selectedOnThisDay ? `${selectedOnThisDay.md}-${selectedOnThisDay.year}` : 'otd-closed'}
				event={selectedOnThisDay}
				exact={selectedOnThisDayExact}
				onClose={closeOnThisDay}
				onPrev={() => {
					if (onThisDayIdx < 0) return;
					const next = ON_THIS_DAY[(onThisDayIdx - 1 + ON_THIS_DAY.length) % ON_THIS_DAY.length]!;
					openOnThisDay(next, false);
				}}
				onNext={() => {
					if (onThisDayIdx < 0) return;
					const next = ON_THIS_DAY[(onThisDayIdx + 1) % ON_THIS_DAY.length]!;
					openOnThisDay(next, false);
				}}
			/>
			<SocialFeedModal platform={socialPlatform} onClose={() => setSocialPlatform(null)} />
			<SocialDock onOpenFeed={setSocialPlatform} />
			<footer className="app-footer">
				<p>Local fan app — data cached in your browser. Sources: {data?.sources.join(' · ') ?? 'not loaded yet'}</p>
				<details className="sources-detail">
					<summary>Configured source slots (extend in src/lib/sources.ts)</summary>
					<ul>
						{Object.entries(DATA_SOURCES).map(([key, list]) => (
							<li key={key}>
								<strong>{key}:</strong> {list.map((s) => s.label).join(', ')}
							</li>
						))}
					</ul>
				</details>
			</footer>
			</div>
			</>
		</FetchAnimationProvider>
	);
}

export default function App() {
	return (
		<BarcaProvider>
			<Body />
		</BarcaProvider>
	);
}
