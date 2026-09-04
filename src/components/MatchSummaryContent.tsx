import type { MatchEvent, StatRow } from '../types';
import type { ProfileMotion } from '../lib/motion';
import { MatchLineupPitch } from './MatchLineupPitch';

type CompareStat = {
	key: string;
	label: string;
	home: number;
	away: number;
	suffix?: string;
};

function parseCompareStat(row: StatRow): CompareStat | null {
	if (!row.available || typeof row.value !== 'string') return null;
	const parts = row.value.split('·').map((s) => parseFloat(s.trim()));
	if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
	return {
		key: row.key,
		label: row.label,
		home: parts[0],
		away: parts[1],
		suffix: row.key === 'possession_percentage' ? '%' : '',
	};
}

function StatCompareBar({
	stat,
	homeAbbr,
	awayAbbr,
	motion,
	index,
}: {
	stat: CompareStat;
	homeAbbr: string;
	awayAbbr: string;
	motion: ProfileMotion;
	index: number;
}) {
	const total = stat.home + stat.away || 1;
	const homePct = (stat.home / total) * 100;
	const awayPct = 100 - homePct;
	const leading = stat.home >= stat.away ? 'home' : 'away';

	return (
		<div
			className={`match-stat-compare profile-stat-cell profile-motion-${motion}`}
			style={{ '--stat-i': index } as React.CSSProperties}
		>
			<div className="match-stat-compare-head">
				<span className={`match-stat-num home ${leading === 'home' ? 'leading' : ''}`}>
					{stat.home}
					{stat.suffix}
				</span>
				<span className="match-stat-label">{stat.label}</span>
				<span className={`match-stat-num away ${leading === 'away' ? 'leading' : ''}`}>
					{stat.away}
					{stat.suffix}
				</span>
			</div>
			<div className="match-stat-bar-track" aria-hidden>
				<div className="match-stat-bar-home" style={{ width: `${homePct}%` }} />
				<div className="match-stat-bar-away" style={{ width: `${awayPct}%` }} />
			</div>
			<div className="match-stat-bar-labels">
				<span>{homeAbbr}</span>
				<span>{awayAbbr}</span>
			</div>
		</div>
	);
}

function minuteSortKey(minute: string) {
	const n = parseInt(minute.replace(/[^\d]/g, ''), 10);
	return Number.isNaN(n) ? 0 : n;
}

function GoalsAndCardsPanel({
	events,
	homeTeam,
	awayTeam,
	motion,
}: {
	events: MatchEvent[];
	homeTeam: string;
	awayTeam: string;
	motion: ProfileMotion;
}) {
	const goals = events.filter((e) => e.type === 'goal').sort((a, b) => minuteSortKey(a.minute) - minuteSortKey(b.minute));
	const cards = events.filter((e) => e.type === 'yellow' || e.type === 'red').sort((a, b) => minuteSortKey(a.minute) - minuteSortKey(b.minute));
	const subs = events.filter((e) => e.type === 'sub');

	// Pair sub ON/OFF at same minute
	const subPairs: Array<{ minute: string; off?: MatchEvent; on?: MatchEvent; team: 'home' | 'away' }> = [];
	const byMinute = new Map<string, MatchEvent[]>();
	for (const s of subs) {
		const k = `${s.minute}-${s.team}`;
		(byMinute.get(k) ?? byMinute.set(k, []).get(k)!).push(s);
	}
	for (const [key, group] of byMinute) {
		const [minute] = key.split('-');
		subPairs.push({
			minute,
			off: group.find((e) => e.detail === 'Off'),
			on: group.find((e) => e.detail === 'On'),
			team: group[0]?.team ?? 'home',
		});
	}
	subPairs.sort((a, b) => minuteSortKey(a.minute) - minuteSortKey(b.minute));

	return (
		<div className="match-events-rich">
			<section className="match-goals-section">
				<h4 className="match-section-title">Goals</h4>
				{goals.length ? (
					<div className="goal-card-grid">
						{goals.map((g, i) => {
							const teamName = g.team === 'home' ? homeTeam : awayTeam;
							return (
								<article
									key={`goal-${i}`}
									className={`goal-card ${g.team} profile-stat-cell profile-motion-${motion}`}
									style={{ '--stat-i': i } as React.CSSProperties}
								>
									<div className="goal-card-top">
										<span className="goal-minute-badge">{g.minute}</span>
										<span className="goal-ball" aria-hidden>
											⚽
										</span>
									</div>
									<strong className="goal-scorer">{g.player}</strong>
									{g.assist && <p className="goal-assist">Assist · {g.assist}</p>}
									<span className="goal-team-tag">{teamName}</span>
								</article>
							);
						})}
					</div>
				) : (
					<p className="muted">No goals.</p>
				)}
			</section>

			{cards.length > 0 && (
				<section className="match-cards-section">
					<h4 className="match-section-title">Cards</h4>
					<div className="card-chip-row">
						{cards.map((c, i) => (
							<div key={`card-${i}`} className={`card-chip ${c.type}`}>
								<span className="goal-minute-badge">{c.minute}</span>
								<span className={`card-swatch ${c.type}`} />
								<strong>{c.player}</strong>
								<span className="muted">{c.team === 'home' ? homeTeam : awayTeam}</span>
							</div>
						))}
					</div>
				</section>
			)}

			{subPairs.length > 0 && (
				<section className="match-subs-section">
					<h4 className="match-section-title">Substitutions</h4>
					<div className="sub-pair-list">
						{subPairs.map((pair, i) => (
							<div key={`sub-${i}`} className="sub-pair-row">
								<span className="goal-minute-badge">{pair.minute}</span>
								<div className="sub-pair-players">
									{pair.off && (
										<span className="sub-off">
											↩ {pair.off.player}
										</span>
									)}
									{pair.on && (
										<span className="sub-on">
											↪ {pair.on.player}
										</span>
									)}
								</div>
								<span className="muted sub-team">{pair.team === 'home' ? homeTeam : awayTeam}</span>
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

function teamAbbr(name: string) {
	const clean = name.replace(/^FC\s+/i, '').trim();
	const parts = clean.split(/\s+/);
	if (parts.length >= 2) return (parts[0].slice(0, 3) + parts[1].slice(0, 2)).toUpperCase();
	return clean.slice(0, 4).toUpperCase();
}

export function MatchSummaryContent({
	summary,
	homeTeam,
	awayTeam,
	tab,
	motion,
}: {
	summary: NonNullable<import('../types').MatchSummary>;
	homeTeam: string;
	awayTeam: string;
	tab: 'stats' | 'events' | 'lineups';
	motion: ProfileMotion;
}) {
	const compareStats = summary.stats.map(parseCompareStat).filter(Boolean) as CompareStat[];
	const homeAbbr = teamAbbr(homeTeam);
	const awayAbbr = teamAbbr(awayTeam);

	if (tab === 'stats') {
		return (
			<div className="match-stats-rich">
				<div className="match-stats-teams-row">
					<span className="team-pill home">{homeTeam}</span>
					<span className="vs-dot">vs</span>
					<span className="team-pill away">{awayTeam}</span>
				</div>
				{summary.preview && (summary.previewHomeNote || summary.previewAwayNote) && (
					<div className="match-preview-notes">
						{summary.previewHomeNote && (
							<p className="match-preview-note home">
								<strong>{homeAbbr}</strong> · {summary.previewHomeNote}
							</p>
						)}
						{summary.previewAwayNote && (
							<p className="match-preview-note away">
								<strong>{awayAbbr}</strong> · {summary.previewAwayNote}
							</p>
						)}
					</div>
				)}
				<div className="match-stat-compare-list">
					{compareStats.map((stat, i) => (
						<StatCompareBar
							key={stat.key}
							stat={stat}
							homeAbbr={homeAbbr}
							awayAbbr={awayAbbr}
							motion={motion}
							index={i}
						/>
					))}
				</div>
			</div>
		);
	}

	if (tab === 'events') {
		if (summary.preview) {
			const homeEvents = summary.previewHomeEvents ?? [];
			const awayEvents = summary.previewAwayEvents ?? [];
			if (!homeEvents.length && !awayEvents.length) {
				return <p className="muted">No recent goals or cards found for either team.</p>;
			}
			return (
				<div className="match-preview-split">
					{summary.previewHomeNote && homeEvents.length > 0 && (
						<section className="match-preview-side">
							<h4 className="match-section-title">{summary.previewHomeNote}</h4>
							<GoalsAndCardsPanel
								events={homeEvents}
								homeTeam={summary.previewHomeMatchTeams?.home ?? homeTeam}
								awayTeam={summary.previewHomeMatchTeams?.away ?? homeTeam}
								motion={motion}
							/>
						</section>
					)}
					{summary.previewAwayNote && awayEvents.length > 0 && (
						<section className="match-preview-side">
							<h4 className="match-section-title">{summary.previewAwayNote}</h4>
							<GoalsAndCardsPanel
								events={awayEvents}
								homeTeam={summary.previewAwayMatchTeams?.home ?? awayTeam}
								awayTeam={summary.previewAwayMatchTeams?.away ?? awayTeam}
								motion={motion}
							/>
						</section>
					)}
				</div>
			);
		}
		return <GoalsAndCardsPanel events={summary.events} homeTeam={homeTeam} awayTeam={awayTeam} motion={motion} />;
	}

	if (summary.preview) {
		const homeXi = summary.lineups.home.starters.length;
		const awayXi = summary.lineups.away.starters.length;
		if (!homeXi && !awayXi) {
			return <p className="muted">No recent lineups found for either team.</p>;
		}
		return (
			<div className="match-preview-split lineups">
				{summary.previewHomeNote && homeXi > 0 && (
					<section className="match-preview-side">
						<h4 className="match-section-title">{summary.previewHomeNote}</h4>
						<div className="match-lineups-rich pitch-layout single-team">
							<MatchLineupPitch team={homeTeam} starters={summary.lineups.home.starters} subs={summary.lineups.home.subs} side="home" />
						</div>
					</section>
				)}
				{summary.previewAwayNote && awayXi > 0 && (
					<section className="match-preview-side">
						<h4 className="match-section-title">{summary.previewAwayNote}</h4>
						<div className="match-lineups-rich pitch-layout single-team">
							<MatchLineupPitch team={awayTeam} starters={summary.lineups.away.starters} subs={summary.lineups.away.subs} side="away" />
						</div>
					</section>
				)}
			</div>
		);
	}

	return (
		<div className="match-lineups-rich pitch-layout">
			<MatchLineupPitch team={homeTeam} starters={summary.lineups.home.starters} subs={summary.lineups.home.subs} side="home" />
			<MatchLineupPitch team={awayTeam} starters={summary.lineups.away.starters} subs={summary.lineups.away.subs} side="away" />
		</div>
	);
}

export function MatchSummarySkeleton() {
	return (
		<div className="match-stats-rich skeleton">
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="match-stat-compare skeleton-bar" />
			))}
		</div>
	);
}
