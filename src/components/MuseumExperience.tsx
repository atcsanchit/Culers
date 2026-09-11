import { useEffect, useMemo, useState } from 'react';
import {
	MUSEUM_EXHIBITS,
	MUSEUM_META,
	MUSEUM_WINGS,
	exhibitsForWing,
	type MuseumExhibit,
	type MuseumWingId,
} from '../data/museum';

function preferFullscreen(el: HTMLElement) {
	const req =
		el.requestFullscreen?.bind(el) ??
		(el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(el);
	if (!req) return;
	void Promise.resolve(req()).catch(() => {
		/* popup blockers / gesture — stay windowed */
	});
}

export function MuseumExperience() {
	const [wing, setWing] = useState<MuseumWingId>('origins');
	const rooms = useMemo(() => exhibitsForWing(wing), [wing]);
	const [exhibitId, setExhibitId] = useState(rooms[0]?.id ?? MUSEUM_EXHIBITS[0]!.id);
	const [backdropOverride, setBackdropOverride] = useState<string | null>(null);
	const [bgReady, setBgReady] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		if (!rooms.some((r) => r.id === exhibitId)) {
			setExhibitId(rooms[0]?.id ?? exhibitId);
		}
	}, [rooms, exhibitId]);

	useEffect(() => {
		setBackdropOverride(null);
	}, [exhibitId]);

	const exhibit: MuseumExhibit =
		rooms.find((r) => r.id === exhibitId) ?? rooms[0] ?? MUSEUM_EXHIBITS[0]!;
	const backdrop = backdropOverride ?? exhibit.background;

	useEffect(() => {
		document.title = `${MUSEUM_META.title} — FC Barcelona`;
		const syncFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
		syncFs();
		document.addEventListener('fullscreenchange', syncFs);
		preferFullscreen(document.documentElement);
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && document.fullscreenElement) {
				void document.exitFullscreen?.();
			}
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				const list = exhibitsForWing(wing);
				const idx = list.findIndex((r) => r.id === exhibit.id);
				if (idx < 0) return;
				const next =
					e.key === 'ArrowRight'
						? list[(idx + 1) % list.length]
						: list[(idx - 1 + list.length) % list.length];
				if (next) setExhibitId(next.id);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			document.removeEventListener('fullscreenchange', syncFs);
		};
	}, [wing, exhibit.id]);

	useEffect(() => {
		setBgReady(false);
	}, [backdrop]);

	const wingMeta = MUSEUM_WINGS.find((w) => w.id === wing)!;

	return (
		<div className="museum-root">
			<div className="museum-bg" aria-hidden>
				<img
					key={backdrop}
					src={backdrop}
					alt=""
					className={`museum-bg-img${bgReady ? ' is-ready' : ''}`}
					onLoad={() => setBgReady(true)}
				/>
				<div className="museum-bg-veil" />
			</div>

			{!isFullscreen && (
				<button
					type="button"
					className="museum-fs-banner"
					onClick={() => preferFullscreen(document.documentElement)}
				>
					Enter full screen · same tab museum experience
				</button>
			)}

			<header className="museum-top">
				<div className="museum-brand">
					<img src="/barca-crest.svg" alt="" className="museum-crest" />
					<div>
						<span className="museum-kicker">{MUSEUM_META.title}</span>
						<h1>{MUSEUM_META.tagline}</h1>
					</div>
				</div>
				<div className="museum-top-actions">
					<button
						type="button"
						className="btn-ghost museum-fs-btn"
						onClick={() => preferFullscreen(document.documentElement)}
					>
						Full screen
					</button>
					<a className="btn-ghost museum-back" href="/">
						← Back to Culers
					</a>
				</div>
			</header>

			<p className="museum-intro muted">{MUSEUM_META.intro}</p>

			<nav className="museum-wings" aria-label="Museum wings">
				{MUSEUM_WINGS.map((w) => (
					<button
						key={w.id}
						type="button"
						className={wing === w.id ? 'active' : ''}
						onClick={() => setWing(w.id)}
					>
						<span>{w.label}</span>
						<em>{w.tagline}</em>
					</button>
				))}
			</nav>

			<div className="museum-stage">
				<aside className="museum-rail" aria-label={`${wingMeta.label} rooms`}>
					<span className="panel-label">{wingMeta.label}</span>
					<ul>
						{rooms.map((room) => (
							<li key={room.id}>
								<button
									type="button"
									className={room.id === exhibit.id ? 'active' : ''}
									onClick={() => setExhibitId(room.id)}
								>
									<strong>{room.title}</strong>
									<span>{room.era}</span>
								</button>
							</li>
						))}
					</ul>
				</aside>

				<article className="museum-room" key={exhibit.id}>
					<header className="museum-room-head">
						<span className="museum-era">{exhibit.era}</span>
						<h2>{exhibit.title}</h2>
						<p className="museum-sub">{exhibit.subtitle}</p>
						{exhibit.year != null && <span className="museum-year-chip">{exhibit.year}</span>}
					</header>

					<div className="museum-room-body">
						{exhibit.body.split(/\n\n+/).map((para) => (
							<p key={para.slice(0, 48)}>{para}</p>
						))}
					</div>

					{exhibit.timeline && exhibit.timeline.length > 0 && (
						<section className="museum-timeline">
							<span className="panel-label">Timeline</span>
							<ol>
								{exhibit.timeline.map((beat) => (
									<li key={`${beat.time}-${beat.text.slice(0, 24)}`}>
										<span>{beat.time}</span>
										<p>{beat.text}</p>
									</li>
								))}
							</ol>
						</section>
					)}

					{exhibit.photos.length > 0 && (
						<section className="museum-photos">
							<span className="panel-label">On the wall · tap to change backdrop</span>
							<div className="museum-photo-grid">
								{exhibit.photos.map((photo) => (
									<figure key={photo.src + photo.caption}>
										<button
											type="button"
											className={`museum-photo-hit${backdrop === photo.src ? ' is-active' : ''}`}
											onClick={() => setBackdropOverride(photo.src)}
											aria-label={`Use as backdrop: ${photo.caption}`}
										>
											<img src={photo.src} alt="" loading="lazy" />
										</button>
										<figcaption>{photo.caption}</figcaption>
									</figure>
								))}
							</div>
						</section>
					)}

					{exhibit.sourceNote && <p className="museum-source muted">{exhibit.sourceNote}</p>}
					<p className="museum-hint muted">← → to walk rooms · Esc exits full screen</p>
				</article>
			</div>
		</div>
	);
}
