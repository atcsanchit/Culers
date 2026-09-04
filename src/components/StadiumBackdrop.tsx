import { useEffect, useState } from 'react';
import { HOME_BACKGROUNDS_MANIFEST } from '../lib/photos';

const SLIDE_MS = 9000;

type HomeBackgroundManifest = {
	images?: string[];
};

async function loadHomeBackgrounds(): Promise<string[]> {
	// Dev: read folder live via Vite middleware (no restart needed after adding photos).
	if (import.meta.env.DEV) {
		try {
			const res = await fetch('/api/home-backgrounds', { cache: 'no-store' });
			if (res.ok) {
				const data = (await res.json()) as HomeBackgroundManifest;
				return (data.images ?? []).filter(Boolean);
			}
		} catch {
			/* fall through */
		}
	}

	try {
		const res = await fetch(HOME_BACKGROUNDS_MANIFEST, { cache: 'no-store' });
		if (!res.ok) return [];
		const data = (await res.json()) as HomeBackgroundManifest;
		return (data.images ?? []).filter(Boolean);
	} catch {
		return [];
	}
}

export function StadiumBackdrop() {
	const [images, setImages] = useState<string[]>([]);
	const [active, setActive] = useState(0);

	useEffect(() => {
		let cancelled = false;

		void loadHomeBackgrounds().then((list) => {
			if (cancelled) return;
			setImages(list);
			setActive(0);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (images.length < 2) return;
		const timer = window.setInterval(() => {
			setActive((i) => (i + 1) % images.length);
		}, SLIDE_MS);
		return () => window.clearInterval(timer);
	}, [images]);

	return (
		<div className="stadium-backdrop" aria-hidden>
			{images.map((url, i) => (
				<div
					key={url}
					className={`stadium-slide ${i === active || images.length === 1 ? 'is-active' : ''}`}
					style={{ backgroundImage: `url("${url}")` }}
				/>
			))}
			<div className="stadium-overlay" />
		</div>
	);
}
