import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import type { Player } from '../types';
import type { PlayerOpenOrigin, PlayerStatsContext } from '../store/BarcaState';
import {
	alumniSpotlightToPlayer,
	findSquadMatch,
	LA_MASIA_SPOTLIGHTS,
	laMasiaIndexForDate,
} from '../data/laMasiaSpotlight';
import { PlayerAvatar } from './PlayerAvatar';
import { BARCA_CREST } from '../lib/photos';

const ROTATE_MS = 9000;

type Props = {
	squad: Player[];
	onOpenPlayer?: (player: Player, origin?: PlayerOpenOrigin, context?: PlayerStatsContext) => void;
};

export function LaMasiaSpotlight({ squad, onOpenPlayer }: Props) {
	const start = useMemo(() => laMasiaIndexForDate(new Date()), []);
	const [idx, setIdx] = useState(start);
	const [alumniPhotoOk, setAlumniPhotoOk] = useState(false);

	useEffect(() => {
		if (LA_MASIA_SPOTLIGHTS.length <= 1) return;
		const timer = window.setInterval(() => {
			setIdx((i) => (i + 1) % LA_MASIA_SPOTLIGHTS.length);
		}, ROTATE_MS);
		return () => window.clearInterval(timer);
	}, []);

	const spotlight = LA_MASIA_SPOTLIGHTS[idx]!;
	const fromSquad = findSquadMatch(spotlight, squad);
	const isAlumni = spotlight.status === 'alumni';
	const record = spotlight.barcaRecord;
	const alumniPhoto = isAlumni ? spotlight.photoUrl?.trim() : '';
	const canOpen =
		Boolean(onOpenPlayer) &&
		(Boolean(fromSquad) || (isAlumni && Boolean(record)));

	useEffect(() => {
		setAlumniPhotoOk(false);
	}, [spotlight.id, alumniPhoto]);

	const open = (e: MouseEvent) => {
		if (!onOpenPlayer || !canOpen) return;
		const origin = { x: e.clientX, y: e.clientY };
		if (isAlumni && record) {
			onOpenPlayer(alumniSpotlightToPlayer(spotlight), origin, {
				mode: 'legend',
				years: record.years,
				legacy: record.legacy,
				generation: spotlight.generation,
				stats: record.stats,
			});
			return;
		}
		if (fromSquad) {
			onOpenPlayer(fromSquad, origin, { mode: 'career', initialTab: 'career' });
		}
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

			<div className={`la-masia-spotlight${canOpen ? ' is-clickable' : ''}${isAlumni ? ' is-alumni' : ''}`}>
				<img src={BARCA_CREST} alt="" className="fixture-crest-watermark" aria-hidden />
				<button
					type="button"
					className="la-masia-spotlight-main"
					onClick={open}
					disabled={!canOpen}
				>
					<div className="la-masia-photo">
						{fromSquad ? (
							<PlayerAvatar player={fromSquad} size="lg" />
						) : alumniPhoto ? (
							<>
								<img
									src={alumniPhoto}
									alt=""
									className={`la-masia-alumni-photo${alumniPhotoOk ? '' : ' is-loading'}`}
									onLoad={() => setAlumniPhotoOk(true)}
									onError={() => setAlumniPhotoOk(false)}
								/>
								{!alumniPhotoOk && (
									<div className="la-masia-crest-fallback" aria-hidden>
										<img src={BARCA_CREST} alt="" />
									</div>
								)}
							</>
						) : (
							<div className="la-masia-crest-fallback" aria-hidden>
								<img src={BARCA_CREST} alt="" />
							</div>
						)}
					</div>
					<div className="la-masia-copy">
						<span className="culture-tag">{spotlight.generation}</span>
						{isAlumni && <span className="la-masia-alumni-pill">Barça legend</span>}
						<strong className="culture-title">
							{fromSquad?.number ? `#${fromSquad.number} ` : ''}
							{spotlight.name}
						</strong>
						<span className="muted la-masia-pos">{fromSquad?.position || spotlight.position}</span>
						<p className="culture-blurb">{spotlight.bio}</p>
						<span className="la-masia-debut muted">{spotlight.debutNote}</span>
						{canOpen && (
							<span className="la-masia-cta">
								{isAlumni ? 'View club record →' : 'View Barça career →'}
							</span>
						)}
					</div>
				</button>

				{record && (
					<div className="la-masia-record-card">
						<div className="la-masia-record-head">
							<span className="rivalry-h2h-label">
								{isAlumni ? 'Barça club record' : 'Barça career so far'}
							</span>
							<span className="muted">{record.years}</span>
						</div>
						<div className="la-masia-record-grid">
							{record.stats.map((s) => (
								<div key={s.label}>
									<strong>{s.value}</strong>
									<span>{s.label}</span>
								</div>
							))}
						</div>
						<p className="la-masia-record-legacy">{record.legacy}</p>
					</div>
				)}
			</div>
		</div>
	);
}
