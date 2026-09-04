/** Top-down pitch positions (left %, bottom %). */
export type PitchSpot = { left: number; bottom: number };

/** Ten outfield opponents (white kit). */
export const OPPONENT_SPOTS: readonly PitchSpot[] = [
	{ left: 36, bottom: 10 },
	{ left: 46, bottom: 24 },
	{ left: 54, bottom: 8 },
	{ left: 60, bottom: 30 },
	{ left: 68, bottom: 14 },
	{ left: 42, bottom: 38 },
	{ left: 56, bottom: 44 },
	{ left: 70, bottom: 26 },
	{ left: 48, bottom: 52 },
	{ left: 64, bottom: 40 },
];

/** Ten Barça outfield teammates — Messi kit, distinct shirt numbers (not 10). */
export const TEAMMATE_SPOTS: readonly (PitchSpot & { number: number })[] = [
	{ left: 14, bottom: 12, number: 1 },
	{ left: 22, bottom: 28, number: 3 },
	{ left: 18, bottom: 44, number: 5 },
	{ left: 30, bottom: 16, number: 6 },
	{ left: 10, bottom: 34, number: 8 },
	{ left: 26, bottom: 50, number: 9 },
	{ left: 34, bottom: 36, number: 11 },
	{ left: 12, bottom: 54, number: 14 },
	{ left: 38, bottom: 10, number: 16 },
	{ left: 24, bottom: 6, number: 18 },
];

export const PITCH_CHANTS = ['Visca el Barça', 'Visca Catalunya'] as const;
