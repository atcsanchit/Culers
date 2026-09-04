import { FetchButton } from './FetchButton';
import { FetchHeaderStatus } from './FetchHeroBackdrop';
import { AnthemMuteButton } from './AnthemMuteButton';
import { FetchSfxMuteButton } from './FetchSfxMuteButton';
import { useAnthemMute } from '../hooks/useBarcaAnthem';
import { useFetchSfxMute } from '../hooks/useFetchSfxMute';
import { BARCA } from '../lib/sources';
import { BARCA_CREST } from '../lib/photos';

export function Header() {
	const { muted: anthemMuted, toggleMute: toggleAnthem } = useAnthemMute();
	const { muted: fetchSfxMuted, toggleMute: toggleFetchSfx } = useFetchSfxMute();

	return (
		<header className="app-header">
			<div className="header-brand">
				<div className="crest crest-img" aria-hidden>
					<img src={BARCA_CREST} alt="" width={56} height={56} />
				</div>
				<div>
					<h1>Culers</h1>
					<p>
						{BARCA.name} · {BARCA.motto}
					</p>
				</div>
			</div>
			<FetchHeaderStatus />
			<div className="header-actions">
				<AnthemMuteButton muted={anthemMuted} onToggle={toggleAnthem} />
				<FetchSfxMuteButton muted={fetchSfxMuted} onToggle={toggleFetchSfx} />
				<FetchButton compact />
			</div>
		</header>
	);
}
