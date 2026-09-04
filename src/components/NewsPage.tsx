import { useBarca } from '../store/BarcaState';
import { RESHAD_AVATAR_FALLBACK } from '../lib/avatars';
import { TwitterFeedEmpty, TwitterFeedPage } from './TwitterFeedPage';

export function NewsPage() {
	const { data } = useBarca();

	if (!data) {
		return <TwitterFeedEmpty handle="ReshadRahman" />;
	}

	return (
		<TwitterFeedPage
			label="Barça news on X"
			title="Reshad Rahman"
			handle="ReshadRahman"
			profileUrl="https://x.com/ReshadRahman"
			description="Transfers, lineups & breaking Barça news."
			avatarFallback={RESHAD_AVATAR_FALLBACK}
			initials="RR"
			news={data.news}
			note={data.newsNote}
			profile={data.newsProfile}
			showCrest
		/>
	);
}
