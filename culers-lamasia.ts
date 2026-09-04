import { sofaFetchTeamPlayers } from './culers-sofascore.ts';
import atleticFallback from './culers-lamasia-atletic-fallback.json' with { type: 'json' };

export type LaMasiaPlayer = {
	id: string;
	fcbId?: number;
	sofaId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
	/** first-team academy product vs Barça Atlètic */
	group: 'first-team' | 'atletic';
	/** Can open Opta/FCB player stats */
	statsAvailable: boolean;
};

export type LaMasiaHub = {
	firstTeam: LaMasiaPlayer[];
	atletic: LaMasiaPlayer[];
	fetchedAt: string;
	source: string;
	note?: string;
};

type SquadPlayer = {
	id: string;
	fcbId?: number;
	name: string;
	position: string;
	number: string;
	nationality: string;
	photo: string;
	birthDate: string;
};

/** Loose name keys for current first-team La Masia products. */
const FIRST_TEAM_ACADEMY_KEYS = [
	'lamine yamal',
	'yamal',
	'pau cubarsi',
	'cubarsi',
	'gavi',
	'paez gavira',
	'pedri',
	'pedro gonzalez',
	'alejandro balde',
	'balde',
	'fermin',
	'fermin lopez',
	'marc bernal',
	'bernal',
	'eric garcia',
	'gerard martin',
	'xavi espart',
	'espart',
	'brian farinas',
	'farinas',
	'hamza abdelkarim',
	'abdelkarim',
	'jesse bisiwu',
	'bisiwu',
	'eder aller',
	'aller',
];

function normalizeNameKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function isFirstTeamAcademy(name: string) {
	const n = normalizeNameKey(name);
	return FIRST_TEAM_ACADEMY_KEYS.some((k) => n === k || n.includes(k) || k.includes(n));
}

function mapSofaPos(code: string) {
	switch (code.toUpperCase()) {
		case 'G':
			return 'Goalkeeper';
		case 'D':
			return 'Defender';
		case 'M':
			return 'Midfielder';
		case 'F':
			return 'Forward';
		default:
			return code || 'Unknown';
	}
}

function sortLaMasia(players: LaMasiaPlayer[]) {
	return [...players].sort((a, b) => {
		const an = Number(a.number) || 999;
		const bn = Number(b.number) || 999;
		if (an !== bn) return an - bn;
		return a.name.localeCompare(b.name);
	});
}

function fromFallback(): LaMasiaPlayer[] {
	return (atleticFallback as Array<Omit<LaMasiaPlayer, 'statsAvailable' | 'group'> & { group?: string }>).map((p) => ({
		id: `atletic-${p.id}`,
		sofaId: p.sofaId,
		name: p.name,
		position: p.position,
		number: p.number,
		nationality: p.nationality,
		photo: p.photo,
		birthDate: p.birthDate || '',
		group: 'atletic' as const,
		statsAvailable: false,
	}));
}

async function fetchAtleticLive(): Promise<LaMasiaPlayer[] | null> {
	const rows = await sofaFetchTeamPlayers(24343);
	if (!rows?.length) return null;
	return sortLaMasia(
		rows.map((p) => ({
			id: `atletic-${p.id}`,
			sofaId: p.id,
			name: p.name,
			position: mapSofaPos(p.position),
			number: p.number,
			nationality: p.nationality,
			photo: p.id ? `https://img.sofascore.com/api/v1/player/${p.id}/image` : '',
			birthDate: p.birthDate,
			group: 'atletic' as const,
			statsAvailable: false,
		})),
	);
}

export function filterFirstTeamAcademy(squad: SquadPlayer[]): LaMasiaPlayer[] {
	return sortLaMasia(
		squad
			.filter((p) => isFirstTeamAcademy(p.name))
			.map((p) => ({
				id: p.id,
				fcbId: p.fcbId,
				name: p.name,
				position: p.position,
				number: p.number,
				nationality: p.nationality,
				photo: p.photo,
				birthDate: p.birthDate,
				group: 'first-team' as const,
				statsAvailable: Boolean(p.fcbId),
			})),
	);
}

export async function fetchLaMasiaHub(firstTeamSquad: SquadPlayer[]): Promise<LaMasiaHub> {
	const firstTeam = filterFirstTeamAcademy(firstTeamSquad);
	const live = await fetchAtleticLive().catch(() => null);
	const atletic = live?.length ? live : fromFallback();

	return {
		firstTeam,
		atletic,
		fetchedAt: new Date().toISOString(),
		source: live?.length
			? 'La Masia — first-team academy filter + Barcelona Atlètic (SofaScore)'
			: 'La Masia — first-team academy filter + Barcelona Atlètic snapshot fallback',
		note: live?.length
			? undefined
			: 'Live Atlètic feed unavailable here — showing the latest cached Barça Atlètic snapshot.',
	};
}
