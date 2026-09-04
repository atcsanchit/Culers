import { useMemo } from 'react';
import type { Fixture } from '../types';
import {
	findNextRivalryFixture,
	resolveActiveRivalry,
	shouldApplyRivalryTheme,
	type RivalryContext,
} from '../lib/rivalry';

export function useRivalryMode(fixtures: Fixture[] | undefined, liveMatch: Fixture | null) {
	return useMemo(() => {
		if (!fixtures?.length) {
			return {
				active: null as RivalryContext | null,
				themeOn: false,
				themeId: null as string | null,
			};
		}
		const active = resolveActiveRivalry(fixtures, liveMatch) ?? findNextRivalryFixture(fixtures);
		const themeOn = shouldApplyRivalryTheme(active);
		return {
			active,
			themeOn,
			themeId: themeOn && active ? active.rivalry.id : null,
		};
	}, [fixtures, liveMatch]);
}
