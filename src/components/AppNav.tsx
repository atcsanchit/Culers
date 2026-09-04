import type { Tab } from '../types';
import { useBarca } from '../store/BarcaState';

const MAIN_TABS: { id: Tab; label: string; icon: string }[] = [
	{ id: 'home', label: 'Success', icon: '◆' },
	{ id: 'fixtures', label: 'Fixtures', icon: '⚑' },
	{ id: 'news', label: 'Barça News', icon: '✦' },
	{ id: 'match', label: 'Match Day', icon: '⚽' },
	{ id: 'squad', label: 'Squad Hub', icon: '👕' },
	{ id: 'ratings', label: 'Ratings', icon: '★' },
];

const FOOTBALL_NEWS_TAB = { id: 'football-news' as Tab, label: 'Football News', icon: '🌍' };

export function AppNav() {
	const { tab, setTab, data, livePolling } = useBarca();
	const hasLive = data?.live.live;

	return (
		<nav className="app-nav">
			{MAIN_TABS.map((t) => (
				<button
					key={t.id}
					type="button"
					className={`nav-item ${tab === t.id ? 'active' : ''}`}
					onClick={() => setTab(t.id)}
				>
					<span className="nav-icon">{t.icon}</span>
					<span>{t.label}</span>
					{t.id === 'match' && (hasLive || livePolling) && <span className="live-dot" />}
				</button>
			))}
			<button
				type="button"
				className={`nav-item nav-item-right ${tab === FOOTBALL_NEWS_TAB.id ? 'active' : ''}`}
				onClick={() => setTab(FOOTBALL_NEWS_TAB.id)}
			>
				<span className="nav-icon">{FOOTBALL_NEWS_TAB.icon}</span>
				<span>{FOOTBALL_NEWS_TAB.label}</span>
			</button>
		</nav>
	);
}
