import { useBarca } from '../store/BarcaState';
import { FABRIZIO_AVATAR_FALLBACK } from '../lib/avatars';
import { TwitterFeedEmpty, TwitterFeedPage } from './TwitterFeedPage';

export function FootballNewsPage() {
	const { data } = useBarca();

	if (!data) {
		return <TwitterFeedEmpty handle="FabrizioRomano" />;
	}

	return (
		<TwitterFeedPage
			label="Global football transfers"
			title="Fabrizio Romano"
			handle="FabrizioRomano"
			profileUrl="https://x.com/FabrizioRomano"
			description="Here we go! Transfer news from the world's most followed football journalist."
			avatarFallback={FABRIZIO_AVATAR_FALLBACK}
			initials="FR"
			news={data.footballNews ?? []}
			note={data.footballNewsNote}
			profile={data.footballNewsProfile}
			showCrest={false}
		/>
	);
}
