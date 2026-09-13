import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineEvent } from '../types';

type Props = {
	events: TimelineEvent[];
	clock?: string;
	live?: boolean;
	homeScore?: number | null;
	awayScore?: number | null;
	homeLabel?: string;
	awayLabel?: string;
};

const EVENT_ICONS: Array<[string, string]> = [
	['red card', '🟥'],
	['redcard', '🟥'],
	['yellow card', '🟨'],
	['yellowcard', '🟨'],
	['yellow', '🟨'],
	['red', '🟥'],
	['goal', '⚽'],
	['substitut', '🔄'],
	['sub', '🔄'],
];

function iconFor(type: string, detail = '') {
	const t = `${type} ${detail}`.toLowerCase();
	// Prefer red over generic "card" — ESPN labels like "Red Card" / "redcard" also contain "card".
	if (/redcard|\bred\b/.test(t)) return '🟥';
	if (/yellowcard|\byellow\b|\bcard\b/.test(t)) return '🟨';
	for (const [key, icon] of EVENT_ICONS) {
		if (t.includes(key)) return icon;
	}
	return '•';
}

function eventKind(type: string, detail = ''): 'goal' | 'yellow' | 'red' | 'sub' | 'other' {
	const t = `${type} ${detail}`.toLowerCase();
	if (t.includes('goal')) return 'goal';
	if (/redcard|\bred\b/.test(t)) return 'red';
	if (/yellowcard|\byellow\b|\bcard\b/.test(t)) return 'yellow';
	if (t.includes('sub')) return 'sub';
	return 'other';
}

/** Live score ticker + goals / cards / subs feed (auto-refreshed by parent poll). */
export function LiveGraphic({
	events,
	clock,
	live = true,
	homeScore = null,
	awayScore = null,
	homeLabel = 'Barcelona',
	awayLabel = 'Opponent',
}: Props) {
	const recent = useMemo(() => [...events].reverse().slice(0, 12), [events]);
	const goals = recent.filter((e) => eventKind(e.type, e.detail) === 'goal');
	const yellows = recent.filter((e) => eventKind(e.type, e.detail) === 'yellow');
	const reds = recent.filter((e) => eventKind(e.type, e.detail) === 'red');
	const subs = recent.filter((e) => eventKind(e.type, e.detail) === 'sub');

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
			<div className={`live-score-ticker pop-card${tick ? ' is-tick' : ''}${live ? '' : ' is-ft'}`}>
				<div className="live-ticker-meta">
					{live ? <span className="pulse" /> : null}
					<span>{live ? 'LIVE' : 'FT'}</span>
					{live && <span className="live-ticker-clock">{clock ?? '—'}</span>}
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
				<p className="live-caption">
					{live ? 'Score & events refresh every 10s' : 'Full time — events from this match'}
				</p>
			</div>

			<div className="timeline-panel pop-card is-quiet">
				<h3>Match events</h3>
				{recent.length === 0 ? (
					<p className="muted">
						{live ? 'Waiting for events… stay on this page while the match runs.' : 'No match events recorded.'}
					</p>
				) : (
					<>
						{(goals.length > 0 || yellows.length > 0 || reds.length > 0 || subs.length > 0) && (
							<div className="live-event-chips">
								{goals.length > 0 && <span className="live-chip goal">⚽ {goals.length}</span>}
								{yellows.length > 0 && <span className="live-chip card">🟨 {yellows.length}</span>}
								{reds.length > 0 && <span className="live-chip card-red">🟥 {reds.length}</span>}
								{subs.length > 0 && <span className="live-chip sub">🔄 {subs.length}</span>}
							</div>
						)}
						<ul className="timeline-list">
							{recent.map((ev, i) => {
								const kind = eventKind(ev.type, ev.detail);
								return (
									<li
										key={`${ev.minute}-${ev.player}-${ev.type}-${i}`}
										className={`timeline-item kind-${kind}`}
									>
										<span className="min">{ev.minute}&apos;</span>
										<span className="evt-icon">{iconFor(ev.type, ev.detail)}</span>
										<div>
											<strong>{ev.player || ev.type}</strong>
											<span className="muted">{ev.detail || ev.type}</span>
											{ev.team && <span className="team-tag">{ev.team}</span>}
										</div>
									</li>
								);
							})}
						</ul>
					</>
				)}
			</div>
		</div>
	);
}
