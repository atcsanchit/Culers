import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineEvent } from '../types';

type Props = {
	events: TimelineEvent[];
	clock?: string;
	homeScore?: number | null;
	awayScore?: number | null;
	homeLabel?: string;
	awayLabel?: string;
};

const EVENT_ICONS: Record<string, string> = {
	goal: '⚽',
	card: '🟨',
	yellow: '🟨',
	'red card': '🟥',
	red: '🟥',
	substitution: '🔄',
	sub: '🔄',
};

function iconFor(type: string) {
	const t = type.toLowerCase();
	for (const [key, icon] of Object.entries(EVENT_ICONS)) {
		if (t.includes(key)) return icon;
	}
	return '•';
}

function eventKind(type: string): 'goal' | 'card' | 'sub' | 'other' {
	const t = type.toLowerCase();
	if (t.includes('goal')) return 'goal';
	if (t.includes('red') || t.includes('yellow') || t.includes('card')) return 'card';
	if (t.includes('sub')) return 'sub';
	return 'other';
}

/** Live score ticker + goals / cards / subs feed (auto-refreshed by parent poll). */
export function LiveGraphic({
	events,
	clock,
	homeScore = null,
	awayScore = null,
	homeLabel = 'Barcelona',
	awayLabel = 'Opponent',
}: Props) {
	const recent = useMemo(() => [...events].reverse().slice(0, 12), [events]);
	const goals = recent.filter((e) => eventKind(e.type) === 'goal');
	const cards = recent.filter((e) => eventKind(e.type) === 'card');
	const subs = recent.filter((e) => eventKind(e.type) === 'sub');

	const [tick, setTick] = useState(false);
	const prevScore = useRef(`${homeScore}-${awayScore}`);
	useEffect(() => {
		const next = `${homeScore}-${awayScore}`;
		if (prevScore.current !== next && homeScore != null && awayScore != null) {
			setTick(true);
			const t = window.setTimeout(() => setTick(false), 900);
			prevScore.current = next;
			return () => window.clearTimeout(t);
		}
		prevScore.current = next;
	}, [homeScore, awayScore]);

	return (
		<div className="live-graphic">
			<div className={`live-score-ticker${tick ? ' is-tick' : ''}`}>
				<div className="live-ticker-meta">
					<span className="pulse" />
					<span>LIVE</span>
					<span className="live-ticker-clock">{clock ?? '—'}</span>
				</div>
				<div className="live-ticker-score">
					<span className="live-ticker-team">{homeLabel}</span>
					<span className="live-ticker-digits">
						{homeScore ?? '–'}
						<span className="sep">:</span>
						{awayScore ?? '–'}
					</span>
					<span className="live-ticker-team">{awayLabel}</span>
				</div>
				<p className="live-caption">Score & events refresh every 10s</p>
			</div>

			<div className="timeline-panel">
				<h3>Match events</h3>
				{recent.length === 0 ? (
					<p className="muted">Waiting for events… stay on this page while the match runs.</p>
				) : (
					<>
						{(goals.length > 0 || cards.length > 0 || subs.length > 0) && (
							<div className="live-event-chips">
								{goals.length > 0 && <span className="live-chip goal">⚽ {goals.length}</span>}
								{cards.length > 0 && <span className="live-chip card">🟨 {cards.length}</span>}
								{subs.length > 0 && <span className="live-chip sub">🔄 {subs.length}</span>}
							</div>
						)}
						<ul className="timeline-list">
							{recent.map((ev, i) => (
								<li
									key={`${ev.minute}-${ev.player}-${ev.type}-${i}`}
									className={`timeline-item kind-${eventKind(ev.type)}`}
								>
									<span className="min">{ev.minute}&apos;</span>
									<span className="evt-icon">{iconFor(ev.type)}</span>
									<div>
										<strong>{ev.player || ev.type}</strong>
										<span className="muted">{ev.detail || ev.type}</span>
										{ev.team && <span className="team-tag">{ev.team}</span>}
									</div>
								</li>
							))}
						</ul>
					</>
				)}
			</div>
		</div>
	);
}
