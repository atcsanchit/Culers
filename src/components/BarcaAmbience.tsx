import { useEffect } from 'react';
import { bindAnthemUnlockOnGesture, initBarcaAnthem } from '../lib/barcaAnthem';

/** Background Cant del Barça (YouTube) at 30% — fetch sounds are separate. */
export function BarcaAmbience() {
	useEffect(() => {
		bindAnthemUnlockOnGesture();
		void initBarcaAnthem();
	}, []);

	return null;
}
