export const DATA_SOURCES = {
	fixtures: [
		{ id: 'fcb-pulselive', label: 'FC Barcelona official — La Liga & UCL (api-fcb.pulselive.com)', endpoint: '/api/fixtures' },
	],
	news: [
		{ id: 'reshad-x', label: '@ReshadRahman on X (api.fxtwitter.com)', url: 'https://x.com/ReshadRahman' },
		{ id: 'fabrizio-x', label: '@FabrizioRomano on X (api.fxtwitter.com)', url: 'https://x.com/FabrizioRomano' },
	],
	live: [
		{ id: 'thesportsdb-live', label: 'TheSportsDB live scores', endpoint: '/api/live' },
	],
	lineup: [
		{ id: 'sofascore-lineup', label: 'SofaScore — confirmed lineups', url: 'https://www.sofascore.com/team/football/fc-barcelona/2817' },
		{ id: 'fcb-lineup', label: 'FC Barcelona official lineups (PulseLive)', endpoint: '/api/lineup' },
	],
	squad: [
		{ id: 'fcb-official-squad', label: 'FC Barcelona official squad (PulseLive)', endpoint: '/api/squad' },
	],
	social: [
		{ id: 'sofascore-lineup', label: 'SofaScore — confirmed lineups', url: 'https://www.sofascore.com/team/football/fc-barcelona/2817' },
		{ id: 'fcb-instagram', label: '@fcbarcelona on Instagram', endpoint: '/api/social/instagram' },
		{ id: 'fcb-x', label: '@FCBarcelona on X', endpoint: '/api/social/x' },
	],
	playerStats: [
		{ id: 'fcb-official-stats', label: 'FC Barcelona official player stats (Opta)', endpoint: '/api/player-stats' },
		{ id: 'fcb-live-match-stats', label: 'FC Barcelona live match player stats', endpoint: '/api/player-match-stats' },
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
