import { useEffect, useState } from 'react';
import type { OnThisDayEvent } from '../data/onThisDay';
import { formatOnThisDayLabel, photosForOnThisDay } from '../data/onThisDay';
import { useProfileMotion } from '../lib/motion';
import { CAMP_NOU_BG } from '../lib/photos';

type Props = {
	event: OnThisDayEvent | null;
	exact: boolean;
	onClose: () => void;
	onPrev?: () => void;
	onNext?: () => void;
};

export function OnThisDayModal({ event, exact, onClose, onPrev, onNext }: Props) {
	const { motion, requestClose } = useProfileMotion(event ? `${event.md}-${event.year}` : null, onClose);
	const photos = event ? photosForOnThisDay(event) : [];
	const [photoIdx, setPhotoIdx] = useState(0);
	const [photoOk, setPhotoOk] = useState(false);

	useEffect(() => {
		setPhotoIdx(0);
		setPhotoOk(false);
	}, [event?.md, event?.year, event?.title]);

	useEffect(() => {
		if (!event) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
			if (e.key === 'ArrowLeft') onPrev?.();
			if (e.key === 'ArrowRight') onNext?.();
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [event, requestClose, onPrev, onNext]);

	if (!event) return null;

	const activePhoto = photos[photoIdx]?.src ?? CAMP_NOU_BG;
	const activeCaption = photos[photoIdx]?.caption;

	return (
		<div
			className={`modal-backdrop split-backdrop fullscreen profile-backdrop match-backdrop profile-motion-${motion}`}
			role="presentation"
		>
			<div
				className={`player-stats-modal split blended fullscreen on-this-day-modal profile-motion-${motion}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label={`On this day — ${event.title}`}
			>
				<div
					className={`modal-photo-panel match-photo-panel profile-photo-panel on-this-day-photo-panel profile-motion-${motion}`}
					style={{ backgroundImage: `url(${CAMP_NOU_BG})` }}
					onClick={requestClose}
					role="presentation"
				>
					<img
						src={activePhoto}
						alt=""
						className={`on-this-day-hero-photo profile-motion-${motion}${photoOk ? '' : ' is-loading'}`}
						onLoad={() => setPhotoOk(true)}
						onError={() => setPhotoOk(false)}
					/>
					{!photoOk && (
						<div className={`modal-photo-fallback profile-motion-${motion}`} aria-hidden />
					)}

					{photos.length > 1 && (
						<div className="on-this-day-photo-thumbs" onClick={(e) => e.stopPropagation()}>
							{photos.map((photo, i) => (
								<button
									key={photo.src}
									type="button"
									className={`on-this-day-thumb${i === photoIdx ? ' active' : ''}`}
									onClick={() => {
										setPhotoOk(false);
										setPhotoIdx(i);
									}}
									aria-label={photo.caption || `Archive photo ${i + 1}`}
								>
									<img src={photo.src} alt="" />
								</button>
							))}
						</div>
					)}

					<div className={`modal-photo-meta match-photo-meta profile-motion-${motion}`}>
						<span className="hero-num">{formatOnThisDayLabel(event, exact)}</span>
						<h2>{event.title}</h2>
						<p className="muted">
							{event.competition ?? event.tag}
							{event.venue ? ` · ${event.venue}` : ''}
						</p>
						{event.scoreline && <p className="on-this-day-scoreline">{event.scoreline}</p>}
						{activeCaption && <p className="on-this-day-photo-caption muted">{activeCaption}</p>}
					</div>
				</div>

				<div className={`modal-stats-panel profile-stats-panel on-this-day-history-panel profile-motion-${motion}`}>
					<button type="button" className="modal-close" onClick={requestClose} aria-label="Close">
						×
					</button>

					<div className="on-this-day-modal-head">
						<span className={`culture-tag ${exact ? 'is-exact' : ''}`}>
							{exact ? 'Today in history' : 'Barça lore'}
						</span>
						<div className="culture-nav">
							<button type="button" className="carousel-btn" onClick={onPrev} aria-label="Previous moment">
								‹
							</button>
							<button type="button" className="carousel-btn" onClick={onNext} aria-label="Next moment">
								›
							</button>
						</div>
					</div>

					<p className="on-this-day-modal-blurb">{event.blurb}</p>

					{(event.scoreline || event.venue || event.competition) && (
						<div className="on-this-day-meta-strip">
							{event.scoreline && (
								<div>
									<span className="on-this-day-detail-label">Score</span>
									<strong>{event.scoreline}</strong>
								</div>
							)}
							{event.competition && (
								<div>
									<span className="on-this-day-detail-label">Competition</span>
									<strong>{event.competition}</strong>
								</div>
							)}
							{event.venue && (
								<div>
									<span className="on-this-day-detail-label">Venue</span>
									<strong>{event.venue}</strong>
								</div>
							)}
						</div>
					)}

					<article className="on-this-day-detail-block">
						<span className="on-this-day-detail-label">The scene</span>
						<p>{event.context}</p>
					</article>

					<article className="on-this-day-detail-block">
						<span className="on-this-day-detail-label">What happened</span>
						<p>{event.incident}</p>
					</article>

					{event.timeline.length > 0 && (
						<article className="on-this-day-detail-block on-this-day-timeline-block">
							<span className="on-this-day-detail-label">Key moments</span>
							<ul className="on-this-day-timeline">
								{event.timeline.map((beat) => (
									<li key={`${beat.time}-${beat.text.slice(0, 24)}`}>
										<span className="on-this-day-beat-time">{beat.time}</span>
										<span className="on-this-day-beat-text">{beat.text}</span>
									</li>
								))}
							</ul>
						</article>
					)}

					<article className="on-this-day-detail-block is-why">
						<span className="on-this-day-detail-label">Why it matters for Barcelona</span>
						<p>{event.whyItMatters}</p>
					</article>

					<article className="on-this-day-detail-block is-aftermath">
						<span className="on-this-day-detail-label">What followed</span>
						<p>{event.aftermath}</p>
					</article>

					<div className="on-this-day-modal-footer">
						<span className="comp-badge">{event.tag}</span>
						<span className="muted">Click the photo to close · ← → for other days</span>
					</div>
				</div>
			</div>
		</div>
	);
}
