import { useEffect, useMemo, useState } from 'react';
import type { Player } from '../types';
import {
	findSquadMatch,
	LA_MASIA_SPOTLIGHTS,
	laMasiaIndexForDate,
} from '../data/laMasiaSpotlight';
import { PlayerAvatar } from './PlayerAvatar';
import { BARCA_CREST } from '../lib/photos';

const ROTATE_MS = 9000;

type Props = {
	squad: Player[];
	onOpenPlayer?: (player: Player) => void;
};

export function LaMasiaSpotlight({ squad, onOpenPlayer }: Props) {
	const start = useMemo(() => laMasiaIndexForDate(new Date()), []);
	const [idx, setIdx] = useState(start);

	useEffect(() => {
		if (LA_MASIA_SPOTLIGHTS.length <= 1) return;
		const timer = window.setInterval(() => {
			setIdx((i) => (i + 1) % LA_MASIA_SPOTLIGHTS.length);
		}, ROTATE_MS);
		return () => window.clearInterval(timer);
	}, []);

	const spotlight = LA_MASIA_SPOTLIGHTS[idx]!;
	const fromSquad = findSquadMatch(spotlight, squad);

	const open = () => {
		if (fromSquad && onOpenPlayer) onOpenPlayer(fromSquad);
	};

	const go = (delta: number) => {
		setIdx((i) => (i + delta + LA_MASIA_SPOTLIGHTS.length) % LA_MASIA_SPOTLIGHTS.length);
	};

	return (
		<div className="home-block glass-panel culture-card la-masia-card">
			<span className="panel-label">Academy</span>
			<h3>La Masia spotlight</h3>

			<div className="form-carousel-controls culture-controls">
				<button type="button" className="carousel-btn" onClick={() => go(-1)} aria-label="Previous graduate">
					‹
				</button>
				<div className="form-carousel-dots">
					{LA_MASIA_SPOTLIGHTS.map((s, i) => (
						<button
							key={s.id}
							type="button"
							className={`carousel-dot ${i === idx ? 'active' : ''}`}
							onClick={() => setIdx(i)}
							aria-label={s.name}
						/>
					))}
				</div>
				<button type="button" className="carousel-btn" onClick={() => go(1)} aria-label="Next graduate">
					›
				</button>
			</div>

			<button
				type="button"
				className={`la-masia-spotlight ${fromSquad ? 'is-clickable' : ''}`}
				onClick={open}
				disabled={!fromSquad}
			>
				<img src={BARCA_CREST} alt="" className="fixture-crest-watermark" aria-hidden />
				<div className="la-masia-photo">
					{fromSquad ? (
						<PlayerAvatar player={fromSquad} size="lg" />
					) : (
						<div className="la-masia-crest-fallback" aria-hidden>
							<img src={BARCA_CREST} alt="" />
						</div>
					)}
				</div>
				<div className="la-masia-copy">
					<span className="culture-tag">{spotlight.generation}</span>
					<strong className="culture-title">
						{fromSquad?.number ? `#${fromSquad.number} ` : ''}
						{spotlight.name}
					</strong>
					<span className="muted la-masia-pos">{fromSquad?.position || spotlight.position}</span>
					<p className="culture-blurb">{spotlight.bio}</p>
					<span className="la-masia-debut muted">{spotlight.debutNote}</span>
					{fromSquad && <span className="la-masia-cta">View squad stats →</span>}
				</div>
			</button>
		</div>
	);
}
