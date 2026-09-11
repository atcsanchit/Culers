import type { Player } from '../types';

/** Local bundled crest — avoids hotlink/CORS issues with fcbarcelona.com */
export const BARCA_CREST = '/barca-crest.svg';

/** Camp Nou grass — default player-stats wallpaper for Barça. */
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
	feyenoord: 'https://r2.thesportsdb.com/images/media/team/badge/uturtx1473534803.png',
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
	// Prefer known CDN badges — API remotes often fail hotlink / CORS in the browser.
	const known = knownTeamCrest(teamName);
	if (known) return known;
	return remoteUrl?.trim() || '';
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

export function findSquadPlayer(player: Player, squad: readonly Player[]): Player | undefined {
	const key = normalizePlayerKey(player.name);
	const last = key.split(' ').pop() ?? key;
	const sofaId = player.sofaId ?? (Number(/^(?:sofa|espn)-(\d+)$/i.exec(player.id)?.[1] || 0) || undefined);
	return (
		squad.find((s) => player.fcbId && s.fcbId === player.fcbId) ??
		squad.find((s) => sofaId && s.sofaId === sofaId) ??
		squad.find((s) => s.id === player.id) ??
		squad.find((s) => normalizePlayerKey(s.name) === key) ??
		(player.number
			? squad.find((s) => s.number === player.number && normalizePlayerKey(s.name).includes(last))
			: undefined) ??
		(last.length > 3 ? squad.find((s) => normalizePlayerKey(s.name).endsWith(last)) : undefined)
	);
}

/** Copy photo plus official ids from Squad Hub onto a lineup / ratings player. */
export function attachSquadIdentity(player: Player, squad: readonly Player[]): Player {
	const hit = findSquadPlayer(player, squad);
	if (!hit) return player;
	return {
		...hit,
		...player,
		fcbId: player.fcbId ?? hit.fcbId,
		sofaId: player.sofaId ?? hit.sofaId,
		photo: playerPhotoSrc(player) ? player.photo : hit.photo,
		nationality: player.nationality || hit.nationality,
		birthDate: player.birthDate || hit.birthDate,
		position: player.position || hit.position,
		number: player.number || hit.number,
		club: player.club || hit.club,
	};
}

/** Prefer a photo from Squad Hub when the lineup photo is missing. */
export function enrichPlayerPhoto(player: Player, squad: readonly Player[]): Player {
	return attachSquadIdentity(player, squad);
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
