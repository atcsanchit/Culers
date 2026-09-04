import { useSyncExternalStore } from 'react';
import { isAnthemMuted, subscribeAnthemMute, toggleAnthemMute } from '../lib/barcaAnthem';

export function useAnthemMute() {
	const muted = useSyncExternalStore(subscribeAnthemMute, isAnthemMuted, () => false);
	return { muted, toggleMute: toggleAnthemMute };
}
