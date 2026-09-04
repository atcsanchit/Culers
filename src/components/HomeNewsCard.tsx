import type { NewsItem } from '../types';
import { formatDateTime } from '../lib/api';
import { ProfileAvatar } from './ProfileAvatar';
import { TweetQuoteHero } from './TweetQuoteHero';
import { BARCA_CREST } from '../lib/photos';

function formatTweetTime(pubDate: string) {
	if (!pubDate) return '';
	try {
		const d = new Date(pubDate);
		const now = new Date();
		const diffH = (now.getTime() - d.getTime()) / 3_600_000;
		if (diffH < 1) return `${Math.max(1, Math.round(diffH * 60))}m ago`;
		if (diffH < 48) return `${Math.round(diffH)}h ago`;
		return formatDateTime(pubDate).split(',')[0] ?? '';
	} catch {
		return '';
	}
}

export function HomeNewsCard({
	item,
	avatarUrl,
	authorName,
}: {
	item: NewsItem;
	avatarUrl?: string;
	authorName?: string;
}) {
	const preview = item.media?.[0]?.previewUrl;
	const isVideo = item.media?.[0]?.type === 'video';
	const when = formatTweetTime(item.pubDate);
	const text = item.text ?? item.title;

	return (
		<a href={item.link} target="_blank" rel="noreferrer" className="home-news-card">
			{preview ? (
				<div className="home-news-media">
					<img src={preview} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
					{isVideo && <span className="home-news-video">▶</span>}
					<div className="home-news-media-shade" />
				</div>
			) : (
				<TweetQuoteHero text={text} variant="hero" />
			)}
			<div className="home-news-body">
				<div className="home-news-author">
					<ProfileAvatar url={avatarUrl} className="home-news-avatar" fallbackClassName="home-news-avatar-fallback" />
					<div>
						<strong>{authorName ?? 'Reshad Rahman'}</strong>
						<span>@ReshadRahman</span>
					</div>
					{when && <time dateTime={item.pubDate}>{when}</time>}
				</div>
				<p className="home-news-text">{text}</p>
				<span className="home-news-cta">Open on X →</span>
				<img src={BARCA_CREST} alt="" className="home-news-crest" aria-hidden />
			</div>
		</a>
	);
}
