import type { NewsItem } from '../types';
import { formatDateTime } from '../lib/api';
import { FetchButton } from './FetchButton';
import { TweetMedia } from './TweetMedia';
import { TweetQuoteHero } from './TweetQuoteHero';
import { ProfileAvatar } from './ProfileAvatar';
import { BARCA_CREST } from '../lib/photos';

export type TwitterFeedConfig = {
	label: string;
	title: string;
	handle: string;
	profileUrl: string;
	description: string;
	avatarFallback: string;
	initials: string;
	news: NewsItem[];
	note?: string;
	profile?: {
		name?: string;
		description?: string;
		followers?: number;
		avatarUrl?: string;
	} | null;
	showCrest?: boolean;
};

export function TwitterFeedPage({
	label,
	title,
	handle,
	profileUrl,
	description,
	avatarFallback,
	initials,
	news,
	note,
	profile,
	showCrest = true,
}: TwitterFeedConfig) {
	const hasMedia = (item: NewsItem) => Boolean(item.media?.length);
	const displayName = profile?.name ?? title;

	return (
		<section className="news-page compact-news">
			<div className="news-profile-banner glass-panel">
				<ProfileAvatar
					url={profile?.avatarUrl}
					fallback={initials}
					fallbackAvatar={avatarFallback}
					className="news-profile-avatar"
					fallbackClassName="news-profile-avatar-fallback"
				/>
				<div className="news-profile-copy">
					<span className="panel-label">{label}</span>
					<h2>{displayName}</h2>
					<p className="muted">{profile?.description ?? description}</p>
					<div className="news-profile-meta">
						{profile?.followers != null && <span>{profile.followers.toLocaleString()} followers</span>}
						<a href={profileUrl} target="_blank" rel="noreferrer">
							@{handle} →
						</a>
					</div>
				</div>
			</div>

			{note && (
				<div className="news-note">
					<p>{note}</p>
					<a href={profileUrl} target="_blank" rel="noreferrer" className="btn-ghost">
						Open on X →
					</a>
				</div>
			)}

			{news.length === 0 ? (
				<div className="empty-state glass-panel">
					<p>No tweets loaded — hit Fetch latest to pull from @{handle}.</p>
					<a href={profileUrl} target="_blank" rel="noreferrer">
						{profileUrl}
					</a>
				</div>
			) : (
				<div className="news-grid twitter-grid news-feed-grid">
					{news.map((item, i) => (
						<article key={`${item.link}-${i}`} className="news-card twitter-card glass-panel">
							<header className="tweet-card-head">
								<ProfileAvatar
									url={profile?.avatarUrl}
									fallback={initials}
									fallbackAvatar={avatarFallback}
									className="tweet-card-avatar"
									fallbackClassName="tweet-card-avatar-fallback"
								/>
								<div>
									<strong>{displayName}</strong>
									<span>@{handle}</span>
								</div>
								{item.pubDate && (
									<time dateTime={item.pubDate}>{formatDateTime(item.pubDate)} IST</time>
								)}
							</header>
							{hasMedia(item) ? (
								<>
									<p className="tweet-text">{item.text ?? item.title}</p>
									<TweetMedia media={item.media!} link={item.link} />
								</>
							) : (
								<TweetQuoteHero text={item.text ?? item.title} variant="compact" />
							)}
							<div className="tweet-card-foot">
								<a href={item.link} target="_blank" rel="noreferrer" className="tweet-link">
									View on X →
								</a>
								{showCrest && <img src={BARCA_CREST} alt="" className="tweet-card-crest" aria-hidden />}
							</div>
						</article>
					))}
				</div>
			)}
		</section>
	);
}

export function TwitterFeedEmpty({ handle }: { handle: string }) {
	return (
		<div className="empty-state glass-panel">
			<p>Hit Fetch latest to pull tweets from @{handle} on X.</p>
			<FetchButton />
		</div>
	);
}
