import { useMemo, useState } from 'react';
import { formatOnThisDayLabel, ON_THIS_DAY, pickOnThisDay } from '../data/onThisDay';

export function OnThisDayCard() {
	const initial = useMemo(() => pickOnThisDay(new Date()), []);
	const [idx, setIdx] = useState(() => {
		const i = ON_THIS_DAY.findIndex((e) => e.md === initial.event.md && e.year === initial.event.year);
		return i >= 0 ? i : 0;
	});
	const [exactHint] = useState(initial.exact);

	const event = ON_THIS_DAY[idx] ?? initial.event;
	const exact = exactHint && event.md === initial.event.md;

	const go = (delta: number) => {
		setIdx((i) => (i + delta + ON_THIS_DAY.length) % ON_THIS_DAY.length);
	};

	return (
		<div className="home-block glass-panel culture-card on-this-day-card">
			<span className="panel-label">Archive</span>
			<h3>On this day</h3>
			<div className="culture-card-body">
				<div className="culture-meta-row">
					<span className={`culture-tag ${exact ? 'is-exact' : ''}`}>{exact ? 'Today in history' : 'Barça lore'}</span>
					<span className="culture-when muted">{formatOnThisDayLabel(event, exact)}</span>
				</div>
				<strong className="culture-title">{event.title}</strong>
				<p className="culture-blurb">{event.blurb}</p>
				<div className="culture-footer">
					<span className="comp-badge">{event.tag}</span>
					<div className="culture-nav">
						<button type="button" className="carousel-btn" onClick={() => go(-1)} aria-label="Previous moment">
							‹
						</button>
						<button type="button" className="carousel-btn" onClick={() => go(1)} aria-label="Next moment">
							›
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
