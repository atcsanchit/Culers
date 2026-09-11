export const DATA_SOURCES = {
	fixtures: [
		{ id: 'fcb-pulselive', label: 'FC Barcelona official — La Liga & UCL (api-fcb.pulselive.com)', endpoint: '/api/fixtures' },
	],
	news: [
		{ id: 'reshad-x', label: '@ReshadRahman on X (api.fxtwitter.com)', url: 'https://x.com/ReshadRahman' },
		{ id: 'fabrizio-x', label: '@FabrizioRomano on X (api.fxtwitter.com)', url: 'https://x.com/FabrizioRomano' },
	],
	live: [
		{ id: 'thesportsdb-live', label: 'TheSportsDB live scores (fallback)', endpoint: '/api/live' },
		{ id: 'espn-live-board', label: 'ESPN / Google Sports live board — Europe, MLS, UCL, UEL, internationals', endpoint: '/api/live-board' },
	],
	lineup: [
		{ id: 'espn-lineup', label: 'ESPN / Google Sports — confirmed lineups', endpoint: '/api/lineup' },
		{ id: 'fcb-lineup', label: 'FC Barcelona official lineups (PulseLive)', endpoint: '/api/lineup' },
	],
	squad: [
		{ id: 'fcb-official-squad', label: 'FC Barcelona official squad (PulseLive)', endpoint: '/api/squad' },
	],
	transfers: [
		{ id: 'transferroom', label: 'TransferRoom — intel, blog, window tracker, xTV', url: 'https://www.transferroom.com/' },
		{ id: 'wiki-season', label: 'Wikipedia — current Barça season transfers', url: 'https://en.wikipedia.org/wiki/2026–27_FC_Barcelona_season' },
		{ id: 'espn-roster', label: 'ESPN first-team roster (no public market values)', endpoint: '/api/transfers' },
	],
	social: [
		{ id: 'fcb-instagram', label: '@fcbarcelona on Instagram', endpoint: '/api/social/instagram' },
		{ id: 'fcb-masia-instagram', label: '@fcbmasia on Instagram', endpoint: '/api/social/instagram?user=fcbmasia' },
		{ id: 'fcb-x', label: '@FCBarcelona on X', endpoint: '/api/social/x' },
	],
	playerStats: [
		{ id: 'club-home-ground', label: 'TheSportsDB club home grounds (player stats wallpaper)', endpoint: '/api/club-ground' },
		{ id: 'fcb-official-stats', label: 'FC Barcelona official player stats (Opta)', endpoint: '/api/player-stats' },
		{ id: 'fcb-live-match-stats', label: 'FC Barcelona live match player stats', endpoint: '/api/player-match-stats' },
	],
	museum: [
		{ id: 'culers-museum', label: 'Culers Museum — On This Day, rivalries, La Masia, bundled stadium/home photos', url: '/museum.html' },
		{ id: 'wikimedia-archive', label: 'Wikimedia Commons — historic match photos linked from On This Day', url: 'https://commons.wikimedia.org/' },
	],
} as const;

export const BARCA = {
	name: 'FC Barcelona',
	nickname: 'Barça',
	motto: 'Més que un club',
	colors: {
		grana: '#A50044',
		blau: '#004D98',
		gold: '#EDBB00',
	},
};
