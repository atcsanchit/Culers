import { useSyncExternalStore } from 'react';
import { isFetchSfxMuted, subscribeFetchSfxMute, toggleFetchSfxMute } from '../lib/fetchSfx';

export function useFetchSfxMute() {
	const muted = useSyncExternalStore(subscribeFetchSfxMute, isFetchSfxMuted, () => false);
	return { muted, toggleMute: toggleFetchSfxMute };
}
