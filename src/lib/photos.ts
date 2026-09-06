import type { Player } from '../types';

/** Local bundled crest — avoids hotlink/CORS issues with fcbarcelona.com */
export const BARCA_CREST = '/barca-crest.svg';

/** Camp Nou grass — fixed player stats modal background. */
export const CAMP_NOU_BG = '/backgrounds/player/camp-nou-grass.jpg';

/** Home slideshow reads public/backgrounds/home/manifest.json (auto-generated from any images in that folder). */
export const HOME_BACKGROUNDS_MANIFEST = '/backgrounds/home/manifest.json';

/** Stable TheSportsDB badge URLs for frequent opponents (img hotlink OK). */
const KNOWN_TEAM_CRESTS: Record<string, string> = {
	valencia: 'https://r2.thesportsdb.com/images/media/team/badge/dm8l6o1655594864.png',
	'valencia cf': 'https://r2.thesportsdb.com/images/media/team/badge/dm8l6o1655594864.png',
	sevilla: 'https://r2.thesportsdb.com/images/media/team/badge/vpsqqx1473502977.png',
	'real madrid': 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png',
	'atletico madrid': 'https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png',
	'atlético madrid': 'https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png',
	espanyol: 'https://r2.thesportsdb.com/images/media/team/badge/867nzz1681703222.png',
	'athletic club': 'https://r2.thesportsdb.com/images/media/team/badge/68w7fe1639408210.png',
	'athletic bilbao': 'https://r2.thesportsdb.com/images/media/team/badge/68w7fe1639408210.png',
};

function normalizeTeamCrestKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/^fc\s+/i, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function isBarcaTeamName(name: string) {
	const k = normalizeTeamCrestKey(name);
	return k === 'barcelona' || k === 'barça' || k === 'barca';
}

export function knownTeamCrest(teamName: string): string {
	const key = normalizeTeamCrestKey(teamName);
	if (KNOWN_TEAM_CRESTS[key]) return KNOWN_TEAM_CRESTS[key]!;
	// Soft match: "Valencia CF" already normalized; also try first token for "Valencia ..."
	const first = key.split(' ')[0] ?? '';
	if (first && KNOWN_TEAM_CRESTS[first]) return KNOWN_TEAM_CRESTS[first]!;
	return '';
}

export function teamCrestSrc(teamName: string, remoteUrl: string) {
	if (isBarcaTeamName(teamName)) return BARCA_CREST;
	const remote = remoteUrl?.trim() || '';
	if (remote) return remote;
	return knownTeamCrest(teamName);
}

/** Only return a verified photo URL — never invent or substitute another person. */
export function playerPhotoSrc(player: { photo?: string }) {
	return player.photo?.trim() || '';
}

export function playerInitials(name: string) {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

function normalizePlayerKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Prefer a photo from Squad Hub when SofaScore / lineup photo is missing. */
export function enrichPlayerPhoto(player: Player, squad: readonly Player[]): Player {
	if (playerPhotoSrc(player)) return player;
	const key = normalizePlayerKey(player.name);
	const last = key.split(' ').pop() ?? key;
	const byId = squad.find((s) => s.id === player.id && playerPhotoSrc(s));
	if (byId) return { ...player, photo: byId.photo };
	const byName = squad.find((s) => normalizePlayerKey(s.name) === key && playerPhotoSrc(s));
	if (byName) return { ...player, photo: byName.photo };
	const byNumber =
		player.number &&
		squad.find((s) => s.number === player.number && playerPhotoSrc(s) && normalizePlayerKey(s.name).includes(last));
	if (byNumber) return { ...player, photo: byNumber.photo };
	const byLast = squad.find((s) => normalizePlayerKey(s.name).endsWith(last) && playerPhotoSrc(s));
	if (byLast) return { ...player, photo: byLast.photo };
	return player;
}

export function enrichPlayersPhotos(players: Player[], squad: readonly Player[]): Player[] {
	if (!squad.length) return players;
	return players.map((p) => enrichPlayerPhoto(p, squad));
}

export function teamInitials(name: string) {
	const parts = name.replace(/^FC\s+/i, '').trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}
