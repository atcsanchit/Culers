import { useEffect, useState } from 'react';
import type { Fixture } from '../types';
import { formatFixtureWhen, resultLabel, isFixtureLive } from '../lib/api';
import { BARCA_CREST } from '../lib/photos';

const AUTO_MS = 5500;

type Props = {
	fixtures: Fixture[];
	onSelect: (id: string) => void;
};

export function RecentFormCarousel({ fixtures, onSelect }: Props) {
	const recent = [...fixtures]
		.filter((f) => f.kind === 'past' && !isFixtureLive(f) && f.homeScore != null)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 5);
	const [idx, setIdx] = useState(0);

	useEffect(() => {
		setIdx(0);
	}, [recent.length]);

	useEffect(() => {
		if (recent.length <= 1) return;
		const timer = window.setInterval(() => {
			setIdx((i) => (i + 1) % recent.length);
		}, AUTO_MS);
		return () => window.clearInterval(timer);
	}, [recent.length]);

	if (!recent.length) {
		return <p className="muted">No recent results loaded.</p>;
	}

	const match = recent[idx];

	const go = (delta: number) => {
		setIdx((i) => (i + delta + recent.length) % recent.length);
	};

	return (
		<div className="form-carousel">
			<div className="form-carousel-controls">
				<button type="button" className="carousel-btn" onClick={() => go(-1)} aria-label="Previous result">
					‹
				</button>
				<div className="form-carousel-dots">
					{recent.map((f, i) => (
						<button
							key={f.id}
							type="button"
							className={`carousel-dot ${i === idx ? 'active' : ''}`}
							onClick={() => setIdx(i)}
							aria-label={`Result ${i + 1}`}
						/>
					))}
				</div>
				<button type="button" className="carousel-btn" onClick={() => go(1)} aria-label="Next result">
					›
				</button>
			</div>

			<button type="button" className="fixture-spotlight form-slide" onClick={() => onSelect(match.id)}>
				<img src={BARCA_CREST} alt="" className="fixture-crest-watermark" aria-hidden />
				<div className="form-slide-main">
					<span className="form-slide-count">
						{idx + 1} / {recent.length}
					</span>
					<span
						className={`result-pill large ${resultLabel(match) === 'W' ? 'win' : resultLabel(match) === 'L' ? 'loss' : 'draw'}`}
					>
						{resultLabel(match)}
					</span>
					<strong className="fixture-opponent">vs {match.opponent}</strong>
					<span className="fixture-score">
						{match.isHome ? match.homeScore : match.awayScore}–{match.isHome ? match.awayScore : match.homeScore}
					</span>
					<span className="fixture-when">{formatFixtureWhen(match.date, match.time)}</span>
					<span className="comp-badge">{match.competition}</span>
				</div>
			</button>
		</div>
	);
}
