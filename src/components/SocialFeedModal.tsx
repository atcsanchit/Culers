import { useEffect, useState } from 'react';
import { fetchInstagramFeed, fetchXFeed, formatDateTime } from '../lib/api';
import type { InstagramFeed, SocialPlatformId, XFeed } from '../types';
import { TweetMedia } from './TweetMedia';
import { ProfileAvatar } from './ProfileAvatar';
import { InstagramIcon } from './InstagramIcon';
import { BARCA_CREST } from '../lib/photos';
import { useProfileMotion } from '../lib/motion';

type Props = {
	platform: SocialPlatformId | null;
	onClose: () => void;
};

export function SocialFeedModal({ platform, onClose }: Props) {
	const [xFeed, setXFeed] = useState<XFeed | null>(null);
	const [igFeed, setIgFeed] = useState<InstagramFeed | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { motion, requestClose } = useProfileMotion(platform, onClose);

	useEffect(() => {
		if (!platform) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [platform, requestClose]);

	useEffect(() => {
		if (!platform) {
			setXFeed(null);
			setIgFeed(null);
			return;
		}
		setLoading(true);
		setError(null);
		const load =
			platform === 'x'
				? fetchXFeed().then(setXFeed)
				: fetchInstagramFeed().then(setIgFeed);
		void load
			.catch(() => setError('Could not load social feed.'))
			.finally(() => setLoading(false));
	}, [platform]);

	if (!platform) return null;

	const title = platform === 'x' ? 'FC Barcelona on X' : 'FC Barcelona on Instagram';
	const profileUrl =
		platform === 'x' ? 'https://x.com/FCBarcelona' : 'https://www.instagram.com/fcbarcelona/';

	return (
		<div
			className={`modal-backdrop social-feed-backdrop profile-backdrop profile-motion-${motion}`}
			role="presentation"
			onClick={requestClose}
		>
			<div
				className={`social-feed-modal glass-panel profile-motion-${motion} social-feed-modal-${platform}`}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				onClick={(e) => e.stopPropagation()}
			>
				<button type="button" className="modal-close" onClick={requestClose} aria-label="Close">
					×
				</button>

				{platform === 'instagram' && igFeed && !loading && (
					<div className="social-ig-hero-banner" aria-hidden />
				)}

				<header className={`social-feed-head social-feed-head-${platform}`}>
					{platform === 'x' && xFeed?.profile?.avatarUrl ? (
						<ProfileAvatar
							url={xFeed.profile.avatarUrl}
							fallback="FCB"
							fallbackAvatar={BARCA_CREST}
							className="social-feed-avatar"
						/>
					) : (
						<div className="social-ig-avatar-ring">
							<InstagramIcon className="social-ig-brand-icon" />
							{igFeed?.profileImage ? (
								<img src={igFeed.profileImage} alt="" className="social-ig-profile-photo" />
							) : (
								<img src={BARCA_CREST} alt="" className="social-ig-profile-photo" />
							)}
						</div>
					)}
					<div>
						<span className="panel-label">{platform === 'x' ? 'X / Twitter' : 'Instagram'}</span>
						<h2>{title}</h2>
						<p className="muted">
							{platform === 'x'
								? `@${xFeed?.handle ?? 'FCBarcelona'} · ${xFeed?.profile?.followers?.toLocaleString() ?? '—'} followers`
								: `@fcbarcelona · ${igFeed?.followersLabel ?? '—'} followers${igFeed?.postsLabel ? ` · ${igFeed.postsLabel} posts` : ''}`}
						</p>
					</div>
					<a href={profileUrl} target="_blank" rel="noreferrer" className="btn-ghost social-feed-open">
						Open official →
					</a>
				</header>

				{loading && <p className="muted loading-msg social-feed-loading">Loading latest posts…</p>}
				{error && <p className="fetch-error">{error}</p>}

				{!loading && platform === 'x' && xFeed && (
					<div className="social-feed-scroll">
						{xFeed.note && <p className="news-note">{xFeed.note}</p>}
						<ul className="social-x-list">
							{xFeed.items.map((item) => (
								<li key={item.link} className="social-x-item glass-panel">
									<p>{item.text}</p>
									{item.media?.length ? <TweetMedia media={item.media} link={item.link} /> : null}
									<div className="social-x-meta">
										<span>{item.pubDate ? formatDateTime(item.pubDate) : ''}</span>
										<a href={item.link} target="_blank" rel="noreferrer">
											View on X →
										</a>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}

				{!loading && platform === 'instagram' && igFeed && (
					<div className="social-feed-scroll social-ig-feed">
						{igFeed.posts.length > 0 && (
							<a
								href={igFeed.posts[0].url}
								target="_blank"
								rel="noreferrer"
								className="social-ig-featured"
							>
								<img src={igFeed.posts[0].image} alt="" />
								<div className="social-ig-featured-overlay">
									<InstagramIcon className="social-ig-featured-icon" />
									<p>{igFeed.posts[0].caption || 'Latest from Camp Nou'}</p>
								</div>
							</a>
						)}
						<div className="social-ig-masonry">
							{igFeed.posts.slice(1).map((post) => (
								<a
									key={post.id}
									href={post.url}
									target="_blank"
									rel="noreferrer"
									className="social-ig-tile"
								>
									<img src={post.image} alt="" loading="lazy" />
									<div className="social-ig-tile-overlay">
										<p>{post.caption}</p>
										<span>Open on Instagram →</span>
									</div>
								</a>
							))}
						</div>
						{!igFeed.posts.length && (
							<p className="muted">No posts loaded — open Instagram directly.</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
