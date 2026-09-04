import { useCallback, useLayoutEffect, useState } from 'react';

export type ProfileMotion = 'pre' | 'enter' | 'idle' | 'exit';

export const PROFILE_MOTION_MS = 480;

/** Mount hidden (pre), then enter on next frame — useLayoutEffect avoids open flash. */
export function useProfileMotion(depsKey: string | number | null | undefined, onClose: () => void) {
	const [motion, setMotion] = useState<ProfileMotion>('pre');

	useLayoutEffect(() => {
		if (depsKey == null || depsKey === '') return;
		setMotion('pre');
		const raf = window.requestAnimationFrame(() => setMotion('enter'));
		const timer = window.setTimeout(() => setMotion('idle'), PROFILE_MOTION_MS);
		return () => {
			window.cancelAnimationFrame(raf);
			window.clearTimeout(timer);
		};
	}, [depsKey]);

	const requestClose = useCallback(() => {
		setMotion((m) => {
			if (m === 'exit') return m;
			window.setTimeout(onClose, PROFILE_MOTION_MS);
			return 'exit';
		});
	}, [onClose]);

	return { motion, requestClose };
}
