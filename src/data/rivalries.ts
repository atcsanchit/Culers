export type RivalryId = 'clasico' | 'derbi' | 'atleti' | 'sevilla' | 'athletic';

export type RivalryLore = {
	year: number;
	score: string;
	note: string;
};

export type RivalryDef = {
	id: RivalryId;
	/** Display name, e.g. El Clásico */
	name: string;
	shortLabel: string;
	opponentLabel: string;
	/** Normalized substrings matched against opponent names */
	matchers: string[];
	tagline: string;
	/** One short paragraph — what this rivalry is */
	history: string;
	intensity: 'max' | 'high' | 'classic';
	/** TheSportsDB badge (stable CDN) */
	crestUrl: string;
	/** Atmosphere image for the rivalry panel */
	backgroundUrl: string;
	lore: RivalryLore[];
};

/**
 * Curated Barça rivalries — matched against fixture *opponent* names.
 * Not every fixture: only Real Madrid, Espanyol, Atlético, Sevilla, Athletic Club.
 */
export const RIVALRIES: RivalryDef[] = [
	{
		id: 'clasico',
		name: 'El Clásico',
		shortLabel: 'Clásico',
		opponentLabel: 'Real Madrid',
		matchers: ['real madrid', 'r madrid', 'madrid'],
		tagline: 'The biggest club fixture on earth — white shirts, Camp Nou roar, history every ninety minutes.',
		history:
			'Barça vs Real Madrid is football’s global derby: Catalan identity against the capital’s giant, tiki-taka against power, Camp Nou against the Bernabéu. Titles, Ballons d’Or, and European destinies have turned on Clásico nights for more than a century.',
		intensity: 'max',
		crestUrl: 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png',
		backgroundUrl: 'https://r2.thesportsdb.com/images/media/team/fanart/a5kit31731826485.jpg',
		lore: [
			{ year: 2009, score: '2–6', note: 'Bernabéu dismantling — Guardiola’s Barça in full flight.' },
			{ year: 2011, score: '5–0', note: 'Camp Nou masterclass — Xavi & Iniesta wrote poetry.' },
			{ year: 2017, score: '3–2', note: 'Messi’s late winner — Clásico nights never sleep.' },
		],
	},
	{
		id: 'derbi',
		name: 'Derbi Barceloní',
		shortLabel: 'Derbi',
		opponentLabel: 'Espanyol',
		matchers: ['espanyol', 'rcd espanyol', 'español'],
		tagline: 'City pride. Neighbourhood noise. Catalonia’s domestic derby.',
		history:
			'The Derbi Barceloní is the city’s own quarrel — Blaugrana vs blue-and-white, Camp Nou vs Cornellà. Less global than El Clásico, more local and raw: bragging rights for Barcelona’s streets, not just its league table.',
		intensity: 'high',
		crestUrl: 'https://r2.thesportsdb.com/images/media/team/badge/867nzz1681703222.png',
		backgroundUrl: 'https://r2.thesportsdb.com/images/media/team/fanart/tuvuss1424482964.jpg',
		lore: [
			{ year: 2009, score: '1–2', note: 'Away grit in a season of sextuple destiny.' },
			{ year: 2018, score: '5–0', note: 'Camp Nou derby — Espanyol left gasping.' },
			{ year: 2023, score: '2–1', note: 'Derbi nights still decide local bragging rights.' },
		],
	},
	{
		id: 'atleti',
		name: 'Barça vs Atlético',
		shortLabel: 'vs Atlético',
		opponentLabel: 'Atlético Madrid',
		matchers: ['atletico madrid', 'atlético madrid', 'atletico de madrid', 'atlético de madrid', 'atleti'],
		tagline: 'Steel vs silk — Simeone intensity meets Blaugrana control.',
		history:
			'Atlético bring the red-and-white wall: pressing, set pieces, and stubborn finals nights. From Lisbon heartbreak to title races decided by inches, Barça–Atleti is possession football colliding with organised fury.',
		intensity: 'high',
		crestUrl: 'https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png',
		backgroundUrl: 'https://r2.thesportsdb.com/images/media/team/fanart/qwpxxy1420327141.jpg',
		lore: [
			{ year: 2014, score: '1–1', note: 'Lisbon UCL final — football’s cruelest margins.' },
			{ year: 2016, score: '2–1', note: 'Camp Nou European nights vs the red-white wall.' },
			{ year: 2021, score: '0–0', note: 'Title races decided by midfield wars and inches.' },
		],
	},
	{
		id: 'sevilla',
		name: 'Barça vs Sevilla',
		shortLabel: 'vs Sevilla',
		opponentLabel: 'Sevilla',
		matchers: ['sevilla'],
		tagline: 'Andalusian fire — Copa nights and league bloodbaths.',
		history:
			'Sevilla are Spain’s European specialists — Europa League royalty — and a repeated Copa del Rey finalist against Barça. Sánchez-Pizjuán nights are loud and physical; Camp Nou replies have often been ruthless. Catalonia vs Andalusia, with silverware regularly on the line.',
		intensity: 'classic',
		crestUrl: 'https://r2.thesportsdb.com/images/media/team/badge/vpsqqx1473502977.png',
		backgroundUrl: 'https://r2.thesportsdb.com/images/media/team/fanart/vsqxtx1433183949.jpg',
		lore: [
			{ year: 2016, score: '2–0', note: 'Copa del Rey final — Luis Enrique’s Barça beat Sevilla for the cup.' },
			{ year: 2018, score: '4–2', note: 'Away statement at Sánchez-Pizjuán in a title-chasing autumn.' },
			{ year: 2015, score: '5–1', note: 'Camp Nou thrashing — MSN-era Barça at full volume.' },
		],
	},
	{
		id: 'athletic',
		name: 'Barça vs Athletic',
		shortLabel: 'vs Athletic',
		opponentLabel: 'Athletic Club',
		matchers: ['athletic club', 'athletic bilbao', 'bilbao'],
		tagline: 'Basque pride vs Catalan craft — Copa finals written in folklore.',
		history:
			'Athletic Club’s Basque-only tradition meets La Masia’s academy language. Multiple Copa del Rey finals (2009, 2015, 2021) made this fixture folklore — San Mamés intensity against Blaugrana control, often with a trophy waiting.',
		intensity: 'classic',
		crestUrl: 'https://r2.thesportsdb.com/images/media/team/badge/68w7fe1639408210.png',
		backgroundUrl: 'https://r2.thesportsdb.com/images/media/team/fanart/qysput1420368007.jpg',
		lore: [
			{ year: 2009, score: '4–1', note: 'Copa final — Guardiola’s first silverware as coach.' },
			{ year: 2015, score: '3–1', note: 'Copa final again — MSN era stamped authority.' },
			{ year: 2021, score: '4–0', note: 'Copa final — Athletic hunted, Barça clinical.' },
		],
	},
];

/** Prefer longer / more specific matchers first so "Real Madrid" beats bare "Madrid". */
export function rivalryMatchPriority(r: RivalryDef): number {
	return Math.max(...r.matchers.map((m) => m.length));
}
