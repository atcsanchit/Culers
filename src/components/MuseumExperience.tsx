import { useEffect, useMemo, useState } from 'react';
import {
	GALLERY_LOADING_EXHIBIT,
	MUSEUM_EXHIBITS,
	MUSEUM_META,
	MUSEUM_WINGS,
	buildSocialGalleryExhibits,
	exhibitsForWing,
	type MuseumExhibit,
	type MuseumPhoto,
	type MuseumWingId,
} from '../data/museum';
import { fetchInstagramFeed, fetchXFeed } from '../lib/api';

function preferFullscreen(el: HTMLElement) {
	const req =
		el.requestFullscreen?.bind(el) ??
		(el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(el);
	if (!req) return;
	void Promise.resolve(req()).catch(() => {
		/* popup blockers / gesture — stay windowed */
	});
}

function truncateCaption(text: string, max = 110) {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	return `${clean.slice(0, max - 1)}…`;
}

export function MuseumExperience() {
	const [wing, setWing] = useState<MuseumWingId>('origins');
	const [galleryRooms, setGalleryRooms] = useState<MuseumExhibit[] | null>(null);
	const [galleryLoading, setGalleryLoading] = useState(false);
	const [shuffleKey, setShuffleKey] = useState(() => Date.now());
	const [exhibitId, setExhibitId] = useState(MUSEUM_EXHIBITS[0]!.id);
	const [backdropOverride, setBackdropOverride] = useState<string | null>(null);
	const [bgReady, setBgReady] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const rooms = useMemo(() => {
		if (wing === 'gallery') {
			return galleryRooms ?? [GALLERY_LOADING_EXHIBIT, ...exhibitsForWing('gallery').filter((r) => r.id === 'gallery-atmosphere')];
		}
		return exhibitsForWing(wing);
	}, [wing, galleryRooms]);

	useEffect(() => {
		if (wing !== 'gallery') return;
		let cancelled = false;
		setGalleryLoading(true);

		void Promise.allSettled([fetchInstagramFeed('fcbarcelona'), fetchXFeed()]).then((results) => {
			if (cancelled) return;
			const ig = results[0].status === 'fulfilled' ? results[0].value : null;
			const x = results[1].status === 'fulfilled' ? results[1].value : null;

			const instagram: MuseumPhoto[] = (ig?.posts ?? [])
				.filter((p) => Boolean(p.image))
				.map((p) => ({
					src: p.image,
					caption: truncateCaption(p.caption || 'Instagram · @fcbarcelona'),
					href: p.url,
					platform: 'instagram' as const,
				}));

			const xPhotos: MuseumPhoto[] = [];
			for (const item of x?.items ?? []) {
				for (const media of item.media ?? []) {
					const src = media.type === 'photo' ? media.url || media.previewUrl : media.previewUrl;
					if (!src) continue;
					xPhotos.push({
						src,
						caption: truncateCaption(item.text || item.title || 'X · @FCBarcelona'),
						href: item.link,
						platform: 'x',
					});
				}
			}

			const notes = [ig?.source, x?.source, x?.note].filter(Boolean).join(' · ');
			setGalleryRooms(
				buildSocialGalleryExhibits({
					instagram,
					x: xPhotos,
					shuffleKey,
					note: notes || undefined,
				}),
			);
			setGalleryLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [wing, shuffleKey]);

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
				const idx = rooms.findIndex((r) => r.id === exhibit.id);
				if (idx < 0) return;
				const next =
					e.key === 'ArrowRight'
						? rooms[(idx + 1) % rooms.length]
						: rooms[(idx - 1 + rooms.length) % rooms.length];
				if (next) setExhibitId(next.id);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			document.removeEventListener('fullscreenchange', syncFs);
		};
	}, [rooms, exhibit.id]);

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
					{wing === 'gallery' && (
						<button
							type="button"
							className="btn-ghost museum-shuffle-btn"
							disabled={galleryLoading}
							onClick={() => setShuffleKey(Date.now())}
						>
							{galleryLoading ? 'Shuffling…' : 'Shuffle walls'}
						</button>
					)}
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
					{wing === 'gallery' && (
						<div className="museum-gallery-links">
							<a href="https://www.instagram.com/fcbarcelona/" target="_blank" rel="noreferrer">
								Instagram
							</a>
							<a href="https://x.com/FCBarcelona" target="_blank" rel="noreferrer">
								X
							</a>
						</div>
					)}
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
									<figure key={`${photo.platform ?? 'p'}-${photo.src}-${photo.caption.slice(0, 24)}`}>
										<button
											type="button"
											className={`museum-photo-hit${backdrop === photo.src ? ' is-active' : ''}`}
											onClick={() => setBackdropOverride(photo.src)}
											aria-label={`Use as backdrop: ${photo.caption}`}
										>
											<img src={photo.src} alt="" loading="lazy" />
											{photo.platform && photo.platform !== 'local' && (
												<span className="museum-photo-badge">{photo.platform === 'x' ? 'X' : 'IG'}</span>
											)}
										</button>
										<figcaption>
											{photo.href ? (
												<a href={photo.href} target="_blank" rel="noreferrer">
													{photo.caption}
												</a>
											) : (
												photo.caption
											)}
										</figcaption>
									</figure>
								))}
							</div>
						</section>
					)}

					{galleryLoading && wing === 'gallery' && exhibit.photos.length === 0 && (
						<p className="muted museum-gallery-status">Fetching Instagram and X photos…</p>
					)}

					{exhibit.sourceNote && <p className="museum-source muted">{exhibit.sourceNote}</p>}
					<p className="museum-hint muted">← → to walk rooms · Esc exits full screen</p>
				</article>
			</div>
		</div>
	);
}
