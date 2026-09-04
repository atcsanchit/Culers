import type { Player } from '../types';

export type BarcaClubStat = {
	label: string;
	value: string;
};

export type BarcaClubRecord = {
	/** e.g. 2004–2021 */
	years: string;
	stats: BarcaClubStat[];
	/** Short line under the numbers */
	legacy: string;
};

export type LaMasiaSpotlight = {
	id: string;
	name: string;
	/** Loose match against squad names */
	matchNames: string[];
	position: string;
	generation: string;
	bio: string;
	debutNote: string;
	status: 'current' | 'alumni';
	/** Portrait for alumni who are no longer on the squad feed */
	photoUrl?: string;
	/** Club records for players who left (or full career legends) */
	barcaRecord?: BarcaClubRecord;
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
		status: 'current',
		barcaRecord: {
			years: '2023–present',
			stats: [
				{ label: 'Apps', value: '110+' },
				{ label: 'Goals', value: '25+' },
				{ label: 'Assists', value: '30+' },
				{ label: 'Titles', value: '2+' },
			],
			legacy: 'Already a first-team pillar in his teens — Barça career still writing itself every matchday.',
		},
	},
	{
		id: 'cubarsi',
		name: 'Pau Cubarsí',
		matchNames: ['pau cubarsi', 'cubarsi', 'cubarsí'],
		position: 'Centre-back',
		generation: 'La Masia · Ball-playing CB',
		bio: 'Calm on the ball, brave between the lines. Reads danger early and builds like a midfielder in a defender’s shirt.',
		debutNote: 'Trusted in big games before most keepers trust their own box.',
		status: 'current',
		barcaRecord: {
			years: '2024–present',
			stats: [
				{ label: 'Apps', value: '70+' },
				{ label: 'Goals', value: '1+' },
				{ label: 'Starts', value: '60+' },
				{ label: 'Titles', value: '1+' },
			],
			legacy: 'Teen centre-back trusted in Europe — progressive minutes climbing every season.',
		},
	},
	{
		id: 'gavi',
		name: 'Gavi',
		matchNames: ['gavi', 'pablo gavi', 'paez gavira', 'páez gavira'],
		position: 'Central midfielder',
		generation: 'La Masia · Pressure cook',
		bio: 'Press, tackle, receive, repeat. Carries Barça’s intensity with a teenager’s fearlessness and a veteran’s timing.',
		debutNote: 'First touch under pressure — never hid from the shirt.',
		status: 'current',
		barcaRecord: {
			years: '2021–present',
			stats: [
				{ label: 'Apps', value: '140+' },
				{ label: 'Goals', value: '10+' },
				{ label: 'Assists', value: '15+' },
				{ label: 'Titles', value: '2+' },
			],
			legacy: 'Intensity as identity — already hundreds of high-press minutes in the Blaugrana shirt.',
		},
	},
	{
		id: 'pedri',
		name: 'Pedri',
		matchNames: ['pedri', 'pedro gonzalez', 'pedro gonzález'],
		position: 'Attacking midfielder',
		generation: 'La Masia-adjacent · Orchestra',
		bio: 'The metronome. Finds the free man before opponents notice the space exists.',
		debutNote: 'Looked born for the Blaugrana midfield from day one.',
		status: 'current',
		barcaRecord: {
			years: '2020–present',
			stats: [
				{ label: 'Apps', value: '200+' },
				{ label: 'Goals', value: '25+' },
				{ label: 'Assists', value: '30+' },
				{ label: 'Titles', value: '3+' },
			],
			legacy: 'Orchestra conductor in midfield — Barça career already into triple-digit appearances.',
		},
	},
	{
		id: 'balde',
		name: 'Alejandro Balde',
		matchNames: ['alejandro balde', 'balde'],
		position: 'Left-back',
		generation: 'La Masia · Jet engine',
		bio: 'Recovery pace that erases mistakes and overlapping runs that stretch full-backs into panic.',
		debutNote: 'Turned the left flank into a vertical highway.',
		status: 'current',
		barcaRecord: {
			years: '2022–present',
			stats: [
				{ label: 'Apps', value: '120+' },
				{ label: 'Goals', value: '2+' },
				{ label: 'Assists', value: '15+' },
				{ label: 'Titles', value: '2+' },
			],
			legacy: 'Left-flank jet engine — first-team regular with overlapping numbers that keep climbing.',
		},
	},
	{
		id: 'fermin',
		name: 'Fermín López',
		matchNames: ['fermin', 'fermín', 'fermin lopez', 'fermín lópez'],
		position: 'Midfielder',
		generation: 'La Masia · Box runner',
		bio: 'Arrives late in the box, presses early in midfield — a modern interior with teeth.',
		debutNote: 'Goals that feel stolen from a nine’s job description.',
		status: 'current',
		barcaRecord: {
			years: '2023–present',
			stats: [
				{ label: 'Apps', value: '80+' },
				{ label: 'Goals', value: '20+' },
				{ label: 'Assists', value: '10+' },
				{ label: 'Titles', value: '2+' },
			],
			legacy: 'Box-crashing interior — goals-per-minute that punch above his squad role.',
		},
	},
	{
		id: 'bernal',
		name: 'Marc Bernal',
		matchNames: ['marc bernal', 'bernal'],
		position: 'Defensive midfielder',
		generation: 'La Masia · Pivot',
		bio: 'Shields the back line and keeps circulation alive — Busquets DNA in a new body.',
		debutNote: 'Trusted to sit when the midfield needed oxygen.',
		status: 'current',
		barcaRecord: {
			years: '2024–present',
			stats: [
				{ label: 'Apps', value: '15+' },
				{ label: 'Starts', value: '10+' },
				{ label: 'Mins', value: '1k+' },
				{ label: 'Titles', value: '1+' },
			],
			legacy: 'Early first-team trust at pivot — career minutes paused by injury, still La Masia’s long game.',
		},
	},
	{
		id: 'messi',
		name: 'Lionel Messi',
		matchNames: ['lionel messi', 'messi'],
		position: 'Forward',
		generation: 'La Masia · Eternal',
		bio: 'The boy from Rosario who became the language of Camp Nou. Every generation still measures genius against him.',
		debutNote: 'Debuted young. Redefined forever.',
		status: 'alumni',
		photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lionel_Messi_in_a_La_Liga_match_at_Camp_Nou%2C_Barcelona_%28_Ank_Kumar%2C_Infosys_Limited%29_02.jpg/960px-Lionel_Messi_in_a_La_Liga_match_at_Camp_Nou%2C_Barcelona_%28_Ank_Kumar%2C_Infosys_Limited%29_02.jpg',
		barcaRecord: {
			years: '2004–2021',
			stats: [
				{ label: 'Apps', value: '778' },
				{ label: 'Goals', value: '672' },
				{ label: 'Assists', value: '303' },
				{ label: 'Titles', value: '35' },
			],
			legacy: 'All-time top scorer and appearance leader — the standard every Culer still points to.',
		},
	},
	{
		id: 'xavi',
		name: 'Xavi Hernández',
		matchNames: ['xavi hernandez', 'xavi hernández'],
		position: 'Midfielder',
		generation: 'La Masia · Architect',
		bio: 'Passed teams into submission. Taught Europe that patience could be violence.',
		debutNote: 'The brain of Guardiola’s masterpiece.',
		status: 'alumni',
		photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/2012_2013_-_06_Xavi_Hern%C3%A1ndez.jpg/960px-2012_2013_-_06_Xavi_Hern%C3%A1ndez.jpg',
		barcaRecord: {
			years: '1998–2015',
			stats: [
				{ label: 'Apps', value: '767' },
				{ label: 'Goals', value: '85' },
				{ label: 'Assists', value: '184' },
				{ label: 'Titles', value: '25' },
			],
			legacy: 'The pass that organised an era — midfield as philosophy, not just position.',
		},
	},
	{
		id: 'iniesta',
		name: 'Andrés Iniesta',
		matchNames: ['andres iniesta', 'andrés iniesta', 'iniesta'],
		position: 'Midfielder',
		generation: 'La Masia · Magician',
		bio: 'Ghosted between lines, scored immortal goals, never needed the loudest shirt.',
		debutNote: 'Stamford Bridge 2009 still belongs to him.',
		status: 'alumni',
		photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Bar%C3%A7a_-_Napoli_-_20140806_-_Andres_Iniesta.jpg/960px-Bar%C3%A7a_-_Napoli_-_20140806_-_Andres_Iniesta.jpg',
		barcaRecord: {
			years: '2002–2018',
			stats: [
				{ label: 'Apps', value: '674' },
				{ label: 'Goals', value: '57' },
				{ label: 'Assists', value: '136' },
				{ label: 'Titles', value: '32' },
			],
			legacy: 'Quiet genius — Stamford Bridge, Rome, Berlin, and a World Cup final stamped in Blaugrana ink.',
		},
	},
	{
		id: 'busquets',
		name: 'Sergio Busquets',
		matchNames: ['sergio busquets', 'busquets'],
		position: 'Defensive midfielder',
		generation: 'La Masia · Pivot king',
		bio: 'One touch to kill a counter. The invisible scaffolding of an era.',
		debutNote: 'Made the No. 5 look like a conductor’s baton.',
		status: 'alumni',
		photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Sergio_Busquest_2019_03_17_1.jpg/960px-Sergio_Busquest_2019_03_17_1.jpg',
		barcaRecord: {
			years: '2008–2023',
			stats: [
				{ label: 'Apps', value: '722' },
				{ label: 'Goals', value: '18' },
				{ label: 'Assists', value: '41' },
				{ label: 'Titles', value: '32' },
			],
			legacy: 'The pivot who made chaos look simple — defensive midfield as art.',
		},
	},
	{
		id: 'puyol',
		name: 'Carles Puyol',
		matchNames: ['carles puyol', 'puyol'],
		position: 'Centre-back / captain',
		generation: 'La Masia · Captain',
		bio: 'Heart on the sleeve, hair in the wind, standards non-negotiable.',
		debutNote: 'Lifted Europe with a warrior’s grin.',
		status: 'alumni',
		photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Carles_Puyol_-_FC_Barcelona.jpg/960px-Carles_Puyol_-_FC_Barcelona.jpg',
		barcaRecord: {
			years: '1999–2014',
			stats: [
				{ label: 'Apps', value: '593' },
				{ label: 'Goals', value: '18' },
				{ label: 'Caps*', value: '100+' },
				{ label: 'Titles', value: '21' },
			],
			legacy: 'Captain of captains — leadership you could see from the third tier. *Spain caps while a Barça man.',
		},
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
	// Alumni left the club — never bind to a current squad namesake (e.g. Xavi Espart).
	if (spotlight.status === 'alumni') return null;

	const keys = spotlight.matchNames.map(normalizeNameKey);
	return (
		squad.find((p) => {
			const n = normalizeNameKey(p.name);
			const tokens = n.split(' ');
			return keys.some((k) => {
				if (!k) return false;
				if (n === k || k.includes(n)) return true;
				// Prefer whole-token hits so short keys like "xavi" don't match "xavi espart".
				if (tokens.includes(k)) return true;
				// Multi-word keys may be substrings of the full name ("lamine yamal").
				if (k.includes(' ') && n.includes(k)) return true;
				return false;
			});
		}) ?? null
	);
}

/** Synthetic player for alumni legend profile cards. */
export function alumniSpotlightToPlayer(spotlight: LaMasiaSpotlight): Player {
	return {
		id: `alumni-${spotlight.id}`,
		name: spotlight.name,
		position: spotlight.position,
		number: '',
		nationality: 'Spain',
		photo: spotlight.photoUrl?.trim() || '',
		birthDate: '',
	};
}

/** Stable daily index so the Success page doesn’t jump on every render. */
export function laMasiaIndexForDate(now = new Date(), length = LA_MASIA_SPOTLIGHTS.length) {
	if (length <= 0) return 0;
	const seed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 40 + now.getDate();
	return seed % length;
}
