const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';

/** TheSportsDB team IDs — La Liga + UCL opponents on Barça's calendar. */
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
	// UEFA Champions League
	feyenoord: '133758',
	'manchester city': '133613',
	'man city': '133613',
	'paris saint-germain': '133714',
	'paris saint germain': '133714',
	psg: '133714',
	'aston villa': '133601',
	galatasaray: '133804',
	'sporting cp': '135708',
	'sporting lisbon': '135708',
	sporting: '135708',
	como: '134243',
	'como 1907': '134243',
	sabah: '138341',
	'sabah fk': '138341',
	'sabah baku': '138341',
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
	psg: 'Paris Saint-Germain',
	sporting: 'Sporting CP',
	'como 1907': 'Como',
	racing: 'Racing de Santander',
	sabah: 'Sabah Baku',
};

const BLOCKED_LEAGUE_HINTS = ['thai', 'league of legends', ' women', 'malaysian', 'esports', 'fantasy'];

function normalizeTeamKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/^fc\s+/i, '')
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
	const compHint = competition?.toLowerCase() ?? '';

	try {
		const res = await fetch(`${TSDB}/searchteams.php?t=${encodeURIComponent(searchTerm)}`, {
			headers: { 'User-Agent': 'Culers/1.0' },
		});
		if (!res.ok) return '';
		const data = (await res.json()) as {
			teams?: Array<{ strTeam?: string; strLeague?: string; strBadge?: string }>;
		};
		const teams = (data.teams ?? []).filter((t) => !isBlockedSearchResult(String(t.strLeague ?? '')));
		const pick =
			(compHint.includes('champions')
				? teams.find((t) => String(t.strLeague ?? '').toLowerCase().includes('champions'))
				: null) ??
			teams.find((t) => String(t.strLeague ?? '').includes('La Liga')) ??
			teams.find((t) => normalizeTeamKey(String(t.strTeam ?? '')) === normalizeTeamKey(searchTerm)) ??
			teams[0];
		return String(pick?.strBadge ?? '');
	} catch {
		return '';
	}
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
