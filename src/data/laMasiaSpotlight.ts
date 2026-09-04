export type LaMasiaSpotlight = {
	id: string;
	name: string;
	/** Loose match against squad names */
	matchNames: string[];
	position: string;
	generation: string;
	bio: string;
	debutNote: string;
};

/** Rotating La Masia graduates — current stars + eternal alumni. */
export const LA_MASIA_SPOTLIGHTS: LaMasiaSpotlight[] = [
	{
		id: 'yamal',
		name: 'Lamine Yamal',
		matchNames: ['lamine yamal', 'yamal'],
		position: 'Right winger',
		generation: 'La Masia · Gen Z',
		bio: 'Left foot from another planet. Broke into the first team as a teenager and made Camp Nou expect miracles every week.',
		debutNote: 'First-team breakout that felt inevitable from the first touch.',
	},
	{
		id: 'cubarsi',
		name: 'Pau Cubarsí',
		matchNames: ['pau cubarsi', 'cubarsi', 'cubarsí'],
		position: 'Centre-back',
		generation: 'La Masia · Ball-playing CB',
		bio: 'Calm on the ball, brave between the lines. Reads danger early and builds like a midfielder in a defender’s shirt.',
		debutNote: 'Trusted in big games before most keepers trust their own box.',
	},
	{
		id: 'gavi',
		name: 'Gavi',
		matchNames: ['gavi', 'pablo gavi', 'paez gavira', 'páez gavira'],
		position: 'Central midfielder',
		generation: 'La Masia · Pressure cook',
		bio: 'Press, tackle, receive, repeat. Carries Barça’s intensity with a teenager’s fearlessness and a veteran’s timing.',
		debutNote: 'First touch under pressure — never hid from the shirt.',
	},
	{
		id: 'pedri',
		name: 'Pedri',
		matchNames: ['pedri', 'pedro gonzalez', 'pedro gonzález'],
		position: 'Attacking midfielder',
		generation: 'La Masia-adjacent · Orchestra',
		bio: 'The metronome. Finds the free man before opponents notice the space exists.',
		debutNote: 'Looked born for the Blaugrana midfield from day one.',
	},
	{
		id: 'balde',
		name: 'Alejandro Balde',
		matchNames: ['alejandro balde', 'balde'],
		position: 'Left-back',
		generation: 'La Masia · Jet engine',
		bio: 'Recovery pace that erases mistakes and overlapping runs that stretch full-backs into panic.',
		debutNote: 'Turned the left flank into a vertical highway.',
	},
	{
		id: 'fermin',
		name: 'Fermín López',
		matchNames: ['fermin', 'fermín', 'fermin lopez', 'fermín lópez'],
		position: 'Midfielder',
		generation: 'La Masia · Box runner',
		bio: 'Arrives late in the box, presses early in midfield — a modern interior with teeth.',
		debutNote: 'Goals that feel stolen from a nine’s job description.',
	},
	{
		id: 'bernal',
		name: 'Marc Bernal',
		matchNames: ['marc bernal', 'bernal'],
		position: 'Defensive midfielder',
		generation: 'La Masia · Pivot',
		bio: 'Shields the back line and keeps circulation alive — Busquets DNA in a new body.',
		debutNote: 'Trusted to sit when the midfield needed oxygen.',
	},
	{
		id: 'messi',
		name: 'Lionel Messi',
		matchNames: ['lionel messi', 'messi'],
		position: 'Forward',
		generation: 'La Masia · Eternal',
		bio: 'The boy from Rosario who became the language of Camp Nou. Every generation still measures genius against him.',
		debutNote: 'Debuted young. Redefined forever.',
	},
	{
		id: 'xavi',
		name: 'Xavi Hernández',
		matchNames: ['xavi'],
		position: 'Midfielder',
		generation: 'La Masia · Architect',
		bio: 'Passed teams into submission. Taught Europe that patience could be violence.',
		debutNote: 'The brain of Guardiola’s masterpiece.',
	},
	{
		id: 'iniesta',
		name: 'Andrés Iniesta',
		matchNames: ['andres iniesta', 'andrés iniesta', 'iniesta'],
		position: 'Midfielder',
		generation: 'La Masia · Magician',
		bio: 'Ghosted between lines, scored immortal goals, never needed the loudest shirt.',
		debutNote: 'Stamford Bridge 2009 still belongs to him.',
	},
	{
		id: 'busquets',
		name: 'Sergio Busquets',
		matchNames: ['sergio busquets', 'busquets'],
		position: 'Defensive midfielder',
		generation: 'La Masia · Pivot king',
		bio: 'One touch to kill a counter. The invisible scaffolding of an era.',
		debutNote: 'Made the No. 5 look like a conductor’s baton.',
	},
	{
		id: 'puyol',
		name: 'Carles Puyol',
		matchNames: ['carles puyol', 'puyol'],
		position: 'Centre-back / captain',
		generation: 'La Masia · Captain',
		bio: 'Heart on the sleeve, hair in the wind, standards non-negotiable.',
		debutNote: 'Lifted Europe with a warrior’s grin.',
	},
];

export function normalizeNameKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function findSquadMatch<T extends { name: string; photo?: string; number?: string; position?: string }>(
	spotlight: LaMasiaSpotlight,
	squad: T[],
): T | null {
	const keys = spotlight.matchNames.map(normalizeNameKey);
	return (
		squad.find((p) => {
			const n = normalizeNameKey(p.name);
			return keys.some((k) => n === k || n.includes(k) || k.includes(n));
		}) ?? null
	);
}

/** Stable daily index so the Success page doesn’t jump on every render. */
export function laMasiaIndexForDate(now = new Date(), length = LA_MASIA_SPOTLIGHTS.length) {
	if (length <= 0) return 0;
	const seed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 40 + now.getDate();
	return seed % length;
}
