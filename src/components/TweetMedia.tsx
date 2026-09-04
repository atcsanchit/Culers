import type { NewsMedia } from '../types';

export function TweetMedia({ media, link }: { media: NewsMedia[]; link: string }) {
	if (!media.length) return null;

	const shown = media.slice(0, 4);
	const layout =
		shown.length === 1 ? 'single' : shown.length === 2 ? 'duo' : shown.length === 3 ? 'trio' : 'quad';

	return (
		<div className={`tweet-media tweet-media-${layout}`}>
			{shown.map((item, i) => (
				<a
					key={`${item.previewUrl}-${i}`}
					href={link}
					target="_blank"
					rel="noreferrer"
					className={`tweet-media-item tweet-media-${item.type}`}
				>
					<img src={item.previewUrl} alt="" loading="lazy" decoding="async" />
					{item.type === 'video' && <span className="tweet-video-badge" aria-hidden>▶</span>}
				</a>
			))}
		</div>
	);
}
