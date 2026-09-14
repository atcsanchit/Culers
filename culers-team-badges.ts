const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';

/**
 * TheSportsDB team IDs for major European leagues.
 * Used for crisp crest URLs; ESPN CDN is the fallback for any other club.
 */
const TEAM_IDS: Record<string, string> = {
	// La Liga
	'fc barcelona': '133739',
	barcelona: '133739',
	barça: '133739',
	barca: '133739',
	elche: '134384',
	'athletic club': '133727',
	'athletic bilbao': '133727',
	athletic: '133727',
	'real madrid': '133738',
	'r. madrid': '133738',
	'atletico madrid': '133729',
	'atlético madrid': '133729',
	atletico: '133729',
	'atlético': '133729',
	'rayo vallecano': '133728',
	rayo: '133728',
	sevilla: '133735',
	'real sociedad': '133724',
	villarreal: '133740',
	valencia: '133725',
	'valencia cf': '133725',
	'real betis': '133722',
	betis: '133722',
	'celta vigo': '133937',
	'celta de vigo': '133937',
	celta: '133937',
	getafe: '133731',
	girona: '134700',
	mallorca: '133733',
	osasuna: '133730',
	alaves: '133721',
	alavés: '133721',
	'las palmas': '134259',
	leganes: '133936',
	leganés: '133936',
	espanyol: '133734',
	valladolid: '133841',
	levante: '133732',
	'málaga': '133842',
	malaga: '133842',
	'racing de santander': '133726',
	'real racing club': '133726',
	racing: '133726',
	'deportivo de la coruña': '133720',
	'deportivo la coruna': '133720',
	deportivo: '133720',
	// Ligue 1
	'paris saint-germain': '133714',
	'paris saint germain': '133714',
	'paris sg': '133714',
	psg: '133714',
	brest: '133704',
	'stade brestois': '133704',
	'stade brestois 29': '133704',
	marseille: '133710',
	'olympique marseille': '133710',
	om: '133710',
	lyon: '133709',
	'olympique lyonnais': '133709',
	ol: '133709',
	monaco: '133712',
	'as monaco': '133712',
	lille: '133708',
	'losc lille': '133708',
	nice: '133713',
	'ogc nice': '133713',
	rennes: '133716',
	'stade rennais': '133716',
	lens: '133707',
	'rc lens': '133707',
	nantes: '133715',
	'toulouse': '134321',
	strasbourg: '133718',
	'reims': '133717',
	'montpellier': '133711',
	'le havre': '134322',
	auxerre: '133701',
	angers: '133700',
	// Bundesliga
	'bayern munich': '133664',
	'bayern munchen': '133664',
	'fc bayern': '133664',
	bayern: '133664',
	dortmund: '133650',
	'borussia dortmund': '133650',
	bvb: '133650',
	'rb leipzig': '134695',
	leipzig: '134695',
	'bayer leverkusen': '133666',
	leverkusen: '133666',
	'eintracht frankfurt': '133653',
	frankfurt: '133653',
	'borussia monchengladbach': '133662',
	gladbach: '133662',
	'union berlin': '134690',
	'mainz': '133658',
	'mainz 05': '133658',
	hoffenheim: '133656',
	augsburg: '133663',
	'werder bremen': '133659',
	bremen: '133659',
	stuttgart: '133661',
	'vfb stuttgart': '133661',
	'fc koln': '133654',
	koln: '133654',
	cologne: '133654',
	'köln': '133654',
	'heidenheim': '134696',
	'st pauli': '133813',
	// Premier League
	'manchester city': '133613',
	'man city': '133613',
	'manchester united': '133612',
	'man united': '133612',
	'man utd': '133612',
	liverpool: '133602',
	arsenal: '133604',
	chelsea: '133610',
	tottenham: '133616',
	spurs: '133616',
	newcastle: '133615',
	'newcastle united': '133615',
	'aston villa': '133601',
	'west ham': '133619',
	'west ham united': '133619',
	brighton: '133628',
	'brighton and hove albion': '133628',
	'crystal palace': '133632',
	fulham: '133600',
	brentford: '134777',
	wolves: '133618',
	wolverhampton: '133618',
	everton: '133611',
	bournemouth: '134301',
	'afc bournemouth': '134301',
	'nottingham forest': '133623',
	forest: '133623',
	leicester: '133626',
	'leicester city': '133626',
	southampton: '133617',
	ipswich: '134778',
	'ipswich town': '134778',
	// Serie A
	juventus: '133676',
	inter: '133681',
	'inter milan': '133681',
	milan: '133667',
	'ac milan': '133667',
	napoli: '133678',
	roma: '133679',
	'as roma': '133679',
	lazio: '133680',
	atalanta: '133682',
	fiorentina: '133683',
	bologna: '133684',
	torino: '133685',
	udinese: '133686',
	genoa: '133675',
	cagliari: '133688',
	empoli: '134290',
	monza: '135182',
	lecce: '134291',
	como: '134243',
	'como 1907': '134243',
	// Eredivisie / UCL
	feyenoord: '133758',
	ajax: '133772',
	psv: '133768',
	'psv eindhoven': '133768',
	'az alkmaar': '133756',
	galatasaray: '133804',
	'sporting cp': '135708',
	'sporting lisbon': '135708',
	sporting: '135708',
	benfica: '134108',
	porto: '133819',
	sabah: '138341',
	'sabah fk': '138341',
	'sabah baku': '138341',
	// MLS / other common
	'inter miami': '137722',
	'la galaxy': '134147',
};

const SEARCH_ALIASES: Record<string, string> = {
	'athletic club': 'Athletic Bilbao',
	athletic: 'Athletic Bilbao',
	barça: 'Barcelona',
	barca: 'Barcelona',
	'fc barcelona': 'Barcelona',
	'r. madrid': 'Real Madrid',
	atletico: 'Atletico Madrid',
	'atlético': 'Atletico Madrid',
	rayo: 'Rayo Vallecano',
	betis: 'Real Betis',
	'celta de vigo': 'Celta Vigo',
	'valencia cf': 'Valencia',
	'man city': 'Manchester City',
	'man united': 'Manchester United',
	'man utd': 'Manchester United',
	psg: 'Paris Saint-Germain',
	'paris sg': 'Paris Saint-Germain',
	'stade brestois': 'Brest',
	'stade brestois 29': 'Brest',
	sporting: 'Sporting CP',
	'como 1907': 'Como',
	racing: 'Racing de Santander',
	sabah: 'Sabah Baku',
	bvb: 'Borussia Dortmund',
	bayern: 'Bayern Munich',
	leipzig: 'RB Leipzig',
	hsv: 'Hamburger SV',
	hamburg: 'Hamburger SV',
	gladbach: 'Borussia Monchengladbach',
	spurs: 'Tottenham',
	om: 'Marseille',
	ol: 'Lyon',
	deportivo: 'Deportivo La Coruna',
};

const BLOCKED_LEAGUE_HINTS = ['thai', 'league of legends', ' women', 'malaysian', 'esports', 'fantasy'];

const LEAGUE_HINT_MATCHERS: Array<{ test: RegExp; prefer: string[] }> = [
	{ test: /la\s*liga|spain/i, prefer: ['La Liga', 'Spanish'] },
	{ test: /premier|epl|england/i, prefer: ['English Premier', 'Premier League'] },
	{ test: /bundesliga|germany/i, prefer: ['German Bundesliga', 'Bundesliga'] },
	{ test: /serie\s*a|italy/i, prefer: ['Italian Serie', 'Serie A'] },
	{ test: /ligue\s*1|france/i, prefer: ['French Ligue', 'Ligue 1'] },
	{ test: /eredivisie|netherlands/i, prefer: ['Dutch Eredivisie', 'Eredivisie'] },
	{ test: /champions|ucl/i, prefer: ['UEFA Champions'] },
	{ test: /europa|uel/i, prefer: ['UEFA Europa'] },
	{ test: /mls|major league/i, prefer: ['American Major League', 'MLS'] },
];

function normalizeTeamKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/^fc\s+/i, '')
		.replace(/^ac\s+/i, '')
		.replace(/^as\s+/i, '')
		.replace(/^rc\s+/i, '')
		.trim();
}

function resolveTeamId(name: string): string | undefined {
	const key = normalizeTeamKey(name);
	if (TEAM_IDS[key]) return TEAM_IDS[key];
	const alias = SEARCH_ALIASES[key];
	if (alias) {
		const aliasKey = normalizeTeamKey(alias);
		if (TEAM_IDS[aliasKey]) return TEAM_IDS[aliasKey];
	}
	// Soft: "RB Leipzig" / "Paris Saint-Germain" already covered; try last meaningful tokens
	const parts = key.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		const lastTwo = parts.slice(-2).join(' ');
		if (TEAM_IDS[lastTwo]) return TEAM_IDS[lastTwo];
	}
	if (parts[0] && TEAM_IDS[parts[0]]) return TEAM_IDS[parts[0]];
	return undefined;
}

function isBarcaTeam(name: string) {
	const k = normalizeTeamKey(name);
	return k === 'barcelona' || k === 'barça' || k === 'barca';
}

function isBlockedSearchResult(league: string) {
	const l = league.toLowerCase();
	return BLOCKED_LEAGUE_HINTS.some((hint) => l.includes(hint));
}

function pickByCompetition(
	teams: Array<{ strTeam?: string; strLeague?: string; strBadge?: string }>,
	competition?: string,
	searchTerm?: string,
) {
	const compHint = competition ?? '';
	const prefer = LEAGUE_HINT_MATCHERS.find((m) => m.test.test(compHint))?.prefer ?? [];
	for (const needle of prefer) {
		const hit = teams.find((t) => String(t.strLeague ?? '').includes(needle));
		if (hit?.strBadge) return hit;
	}
	if (searchTerm) {
		const exact = teams.find((t) => normalizeTeamKey(String(t.strTeam ?? '')) === normalizeTeamKey(searchTerm));
		if (exact?.strBadge) return exact;
	}
	return (
		teams.find((t) => String(t.strLeague ?? '').includes('La Liga')) ??
		teams.find((t) => String(t.strLeague ?? '').includes('Premier')) ??
		teams.find((t) => String(t.strLeague ?? '').includes('Bundesliga')) ??
		teams.find((t) => String(t.strLeague ?? '').includes('Ligue')) ??
		teams.find((t) => String(t.strLeague ?? '').includes('Serie')) ??
		teams[0]
	);
}

/** ESPN soccer crest CDN — covers every team that appears on the live board. */
export function espnSoccerCrest(teamId: number | string | null | undefined): string {
	const id = Number(teamId);
	if (!Number.isFinite(id) || id <= 0) return '';
	return `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
}

export async function fetchTeamBadge(teamName: string, competition?: string): Promise<string> {
	const id = resolveTeamId(teamName);
	if (id) {
		const byId = await lookupTeamById(id);
		if (byId) return byId;
	}

	// Short ambiguous names (e.g. "Rayo") must not fall through to fuzzy search.
	const key = normalizeTeamKey(teamName);
	if (key.length <= 5 && !id) return '';

	const searchTerm = SEARCH_ALIASES[key] ?? teamName.replace(/^FC\s+/i, '').trim();

	try {
		const res = await fetch(`${TSDB}/searchteams.php?t=${encodeURIComponent(searchTerm)}`, {
			headers: { 'User-Agent': 'Culers/1.0' },
		});
		if (!res.ok) return '';
		const data = (await res.json()) as {
			teams?: Array<{ strTeam?: string; strLeague?: string; strBadge?: string }>;
		};
		const teams = (data.teams ?? []).filter((t) => !isBlockedSearchResult(String(t.strLeague ?? '')));
		const pick = pickByCompetition(teams, competition, searchTerm);
		return String(pick?.strBadge ?? '');
	} catch {
		return '';
	}
}

/** Prefer TheSportsDB badge; fall back to ESPN CDN by team id. */
export async function resolveTeamCrest(options: {
	teamName: string;
	teamId?: number;
	competition?: string;
}): Promise<string> {
	const badge = await fetchTeamBadge(options.teamName, options.competition);
	if (badge) return badge;
	return espnSoccerCrest(options.teamId);
}

async function lookupTeamById(id: string): Promise<string> {
	try {
		const res = await fetch(`${TSDB}/lookupteam.php?id=${id}`, {
			headers: { 'User-Agent': 'Culers/1.0' },
		});
		if (!res.ok) return '';
		const data = (await res.json()) as { teams?: Array<{ strBadge?: string }> };
		return String(data.teams?.[0]?.strBadge ?? '');
	} catch {
		return '';
	}
}

export { isBarcaTeam, normalizeTeamKey };
