import { useEffect, useState } from 'react';
import { fetchSocialHub } from '../lib/api';
import type { SocialHubData, SocialPlatformId } from '../types';

type Props = {
	onOpenFeed: (platform: SocialPlatformId) => void;
};

export function SocialDock({ onOpenFeed }: Props) {
	const [hub, setHub] = useState<SocialHubData | null>(null);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		void fetchSocialHub()
			.then(setHub)
			.catch(() => setHub(null));
	}, []);

	return (
		<aside className={`social-dock ${expanded ? 'is-expanded' : ''}`}>
			<button
				type="button"
				className="social-dock-toggle"
				onClick={() => setExpanded((v) => !v)}
				aria-expanded={expanded}
			>
				<span className="social-dock-stripe" aria-hidden />
				<span className="social-dock-toggle-label">Barça Social</span>
			</button>

			{expanded && (
				<div className="social-dock-panel glass-panel">
					<div className="social-dock-head">
						<span className="panel-label">Official channels</span>
						<h3>Follow Barça</h3>
					</div>
					<div className="social-platform-grid">
						{(hub?.platforms ?? defaultPlatforms()).map((platform) => (
							<button
								key={platform.id}
								type="button"
								className={`social-platform-card social-platform-${platform.id}`}
								onClick={() => onOpenFeed(platform.id)}
							>
								<span className="social-platform-icon" aria-hidden>
									{platform.id === 'instagram' ? 'IG' : '𝕏'}
								</span>
								<span className="social-platform-name">{platform.label}</span>
								<strong className="social-platform-followers">
									{platform.followersLabel ??
										(platform.followers != null ? platform.followers.toLocaleString() : '—')}
								</strong>
								<span className="social-platform-handle">@{platform.handle}</span>
							</button>
						))}
					</div>
					{hub?.note && <p className="muted social-dock-note">{hub.note}</p>}
				</div>
			)}
		</aside>
	);
}

function defaultPlatforms(): SocialHubData['platforms'] {
	return [
		{
			id: 'instagram',
			label: 'Instagram',
			handle: 'fcbarcelona',
			profileUrl: 'https://www.instagram.com/fcbarcelona/',
			followersLabel: '148M',
		},
		{
			id: 'x',
			label: 'X',
			handle: 'FCBarcelona',
			profileUrl: 'https://x.com/FCBarcelona',
			followersLabel: '46.8M',
		},
	];
}
