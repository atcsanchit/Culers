/**
 * Culers Museum — curated Barça history + local photo inventory.
 * History draws from club lore already in the app (On This Day, rivalries, La Masia)
 * plus publicly documented foundation milestones. Photos prefer bundled stadium/home
 * assets, then Wikimedia Commons links already used elsewhere in the project.
 */
import homeManifest from '../../public/backgrounds/home/manifest.json' with { type: 'json' };
import stadiumManifest from '../../public/backgrounds/stadium/manifest.json' with { type: 'json' };
import { LA_MASIA_HEART, LA_MASIA_ORIGIN, LA_MASIA_PLACE } from './laMasiaCulture.ts';
import { ON_THIS_DAY, type OnThisDayEvent, type OnThisDayPhoto } from './onThisDay.ts';
import { RIVALRIES } from './rivalries.ts';

export type MuseumWingId = 'origins' | 'camp-nou' | 'europe' | 'rivalries' | 'masia' | 'gallery';

export type MuseumPhoto = {
	src: string;
	caption: string;
	/** Optional deep link to Instagram post or X status */
	href?: string;
	platform?: 'instagram' | 'x' | 'local';
};

export type MuseumExhibit = {
	id: string;
	wing: MuseumWingId;
	year?: number;
	era: string;
	title: string;
	subtitle: string;
	body: string;
	timeline?: Array<{ time: string; text: string }>;
	photos: MuseumPhoto[];
	/** Full-bleed backdrop for this room */
	background: string;
	sourceNote?: string;
};

export type MuseumWing = {
	id: MuseumWingId;
	label: string;
	tagline: string;
};

export const MUSEUM_WINGS: MuseumWing[] = [
	{ id: 'origins', label: 'Origins', tagline: 'From Swiss founding to Catalan identity' },
	{ id: 'camp-nou', label: 'Camp Nou', tagline: 'The cathedral and the nights that filled it' },
	{ id: 'europe', label: 'Europe', tagline: 'Cups, comebacks, and continental destiny' },
	{ id: 'rivalries', label: 'Rivalries', tagline: 'Clásico, derbi, and the fixtures that burn' },
	{ id: 'masia', label: 'La Masia', tagline: 'The farmhouse that taught a language' },
	{ id: 'gallery', label: 'Gallery', tagline: 'Live walls from Instagram & X' },
];

const CAMP_NOU = '/backgrounds/stadium/camp-nou.jpg';
const CAMP_NOU_GRASS = '/backgrounds/player/camp-nou-grass.jpg';

/**
 * Historic photos: prefer files in public/backgrounds/museum/, else Commons URLs
 * (see that folder’s README for manual download links).
 */
const M = {
	founding1910: '/backgrounds/museum/founding-1910.jpg',
	founding1910Nov: '/backgrounds/museum/founding-1910-nov.jpg',
	gamper: '/backgrounds/museum/gamper.jpg',
	hansGamper: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Hans_Gamper_1896.jpg',
	crest1899:
		'https://upload.wikimedia.org/wikipedia/commons/6/6b/FC_Barcelona_original_crest_%281899%E2%80%931910%29.png',
	lesCorts: '/backgrounds/museum/les-corts-camp-vell.jpg',
	campNouInterior:
		'https://upload.wikimedia.org/wikipedia/commons/1/12/Camp_Nou_-_Interior_%282005%29.jpg',
	cruyff: '/backgrounds/museum/cruyff-1974.jpg',
	cruyffHomage: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Homenatge_Camp_Nou_Johan_Cruyff.jpeg',
	guardiola: '/backgrounds/museum/guardiola-2009.jpg',
	messi: '/backgrounds/museum/messi.jpg',
	masia:
		'https://upload.wikimedia.org/wikipedia/commons/4/41/La_Masia_-_Centre_de_Formaci%C3%B3_Oriol_Tort_01.jpg',
} as const;

function photos(...items: MuseumPhoto[]): MuseumPhoto[] {
	return items.filter((p) => Boolean(p.src));
}

function firstPhoto(list: MuseumPhoto[], fallback = CAMP_NOU) {
	return list[0]?.src ?? fallback;
}

const ORIGIN_EXHIBITS: MuseumExhibit[] = [
	{
		id: 'founding-1899',
		wing: 'origins',
		year: 1899,
		era: '1899',
		title: 'Joan Gamper founds FC Barcelona',
		subtitle: 'A Swiss footballer, a Catalan city, a club that would outgrow both.',
		body: 'On 29 November 1899, Hans Gamper — later Joan Gamper — placed an advert in Los Deportes seeking players for a football club. Twelve pioneers answered. The new side wore the famous blaugrana from early on and planted itself in Barcelona’s civic life. Public club histories still mark that meeting as year zero: not just a team, but an identity that would bind sport to Catalonia.',
		timeline: [
			{ time: '22 Oct 1899', text: 'Gamper’s advert appears — “Anyone wanting to play football, contact…”' },
			{ time: '29 Nov 1899', text: 'Founding assembly — FC Barcelona is born with twelve members.' },
			{ time: '1900s', text: 'Early grounds and cups — the badge begins to mean more than results.' },
		],
		photos: photos(
			{ src: M.hansGamper, caption: 'Hans Gamper (Joan Gamper) — founder, photographed in 1896.' },
			{ src: M.gamper, caption: 'Gamper — the Swiss who became Catalan club legend.' },
			{ src: M.founding1910, caption: 'FC Barcelona squad, 1910 — early blaugrana identity on film.' },
			{ src: M.founding1910Nov, caption: 'November 1910 — Barça in the Catalan illustrated press.' },
			{ src: M.crest1899, caption: 'Original crest era (1899–1910).' },
		),
		background: M.hansGamper,
		sourceNote: 'Public club foundation narrative + Wikimedia Commons historic photos.',
	},
	{
		id: 'les-corts',
		wing: 'origins',
		year: 1922,
		era: '1922–1957',
		title: 'Les Corts — the first cathedral',
		subtitle: 'Before Camp Nou, Culés packed a ground that already felt like destiny.',
		body: 'Camp de Les Corts opened in 1922 and hosted Barça’s rise through the Republic, Civil War trauma, and the post-war rebuild. Crowds outgrew the stands; the club dreamed of a larger bowl. When Camp Nou opened in 1957, Les Corts became memory — but every museum still starts here: the proof that Barcelona needed a house as ambitious as its football.',
		timeline: [
			{ time: '1922', text: 'Les Corts opens — capacity grows with the club’s popularity.' },
			{ time: '1930s–40s', text: 'War and repression — the club survives as more than a results sheet.' },
			{ time: '1957', text: 'Move to Camp Nou — Les Corts closes a chapter, not the story.' },
		],
		photos: photos(
			{ src: M.lesCorts, caption: 'Camp Vell / Les Corts — the ground demolished after the move to Camp Nou.' },
			{ src: M.campNouInterior, caption: 'Camp Nou interior — the bowl that replaced Les Corts.' },
			{ src: CAMP_NOU, caption: 'Night at the modern cathedral — same club, larger stage.' },
		),
		background: M.lesCorts,
		sourceNote: 'Public stadium chronology (Les Corts → Camp Nou, 1957) + Commons photos.',
	},
	{
		id: 'camp-nou-1957',
		wing: 'camp-nou',
		year: 1957,
		era: '24 Sep 1957',
		title: 'Camp Nou opens',
		subtitle: 'A concrete amphitheatre that became football’s loudest argument.',
		body: 'On 24 September 1957, FC Barcelona inaugurated the Camp Nou with a friendly against Warsaw. Designed to hold the city’s ambition, it grew into one of the world’s great stadiums — later renovated, renamed Spotify Camp Nou in the sponsorship era, and still the emotional centre of Culé life. Every Remontada, title parade, and academy debut borrows its echo.',
		timeline: [
			{ time: '1954–57', text: 'Construction under Francesc Mitjans and colleagues — a bowl for the masses.' },
			{ time: '24 Sep 1957', text: 'Inauguration vs Warsaw — a new house for Blaugrana football.' },
			{ time: 'Today', text: 'Espai Barça works reshape the bowl; the myth stays continuous.' },
		],
		photos: photos(
			{ src: M.campNouInterior, caption: 'Camp Nou interior (2005) — the amphitheatre filled.' },
			{ src: '/backgrounds/stadium/venues/3924-spotify-camp-nou.jpg', caption: 'Spotify Camp Nou — modern face of the 1957 cathedral.' },
			{ src: CAMP_NOU, caption: 'Camp Nou night — default wallpaper of Culé memory.' },
			{ src: CAMP_NOU_GRASS, caption: 'The pitch that Guardiola, Cruyff, and Messi all spoke through.' },
		),
		background: M.campNouInterior,
		sourceNote: 'Public stadium opening date and Espai Barça context + Commons / local photos.',
	},
	{
		id: 'cruyff-dream-team',
		wing: 'origins',
		year: 1992,
		era: '1988–1996',
		title: 'Cruyff’s Dream Team',
		subtitle: 'One language from the academy to Wembley.',
		body: 'Johan Cruyff returned as coach and rewired the club: possession as ideology, La Masia as factory, and a Dream Team that won Barcelona’s first European Cup at Wembley in 1992. Public histories still treat that era as the philosophical reboot — everything later called “Barça DNA” traces a line through Cruyff’s blackboard.',
		timeline: [
			{ time: '1988', text: 'Cruyff takes the bench — total football in blaugrana.' },
			{ time: '20 May 1992', text: 'Wembley: Barça 1–0 Sampdoria — first European Cup, Koeman’s free-kick.' },
			{ time: 'Legacy', text: 'Guardiola the player becomes Guardiola the heir — same language, new decade.' },
		],
		photos: photos(
			{ src: M.cruyff, caption: 'Johan Cruyff, 1974 — the player who would later rewrite the club as coach.' },
			{ src: M.cruyffHomage, caption: 'Camp Nou homage to Cruyff — the language still spoken.' },
			{ src: CAMP_NOU, caption: 'Camp Nou under Cruyff’s shadow — classroom of modern Barça.' },
		),
		background: M.cruyff,
		sourceNote: 'Public European Cup / Dream Team chronology + Wikimedia Commons.',
	},
	{
		id: 'guardiola-sextuple',
		wing: 'europe',
		year: 2009,
		era: '2008–2012',
		title: 'Guardiola and the sextuple year',
		subtitle: 'Six trophies, one idea of football, a generation that redefined the sport.',
		body: 'Pep Guardiola’s first seasons as head coach produced the 2009 sextuple and a Champions League final at Wembley in 2011. Messi, Xavi, and Iniesta became the grammar of world football. Museum walls treat this not as nostalgia alone — it is the proof that Cruyff’s language could conquer every competition on the calendar.',
		timeline: [
			{ time: '2009', text: 'Sextuple — Liga, Copa, Supercopa, UCL, UEFA Super Cup, Club World Cup.' },
			{ time: '2011', text: 'Wembley again — Man United beaten, tiki-taka at its peak.' },
			{ time: '2012', text: 'Pep departs; the idea remains the club’s measuring stick.' },
		],
		photos: photos(
			{ src: M.guardiola, caption: 'Pep Guardiola — 2009 UEFA Champions League Final.' },
			{ src: M.messi, caption: 'Messi — the player who made Guardiola’s geometry look inevitable.' },
			{ src: CAMP_NOU, caption: 'Camp Nou — home of the idea that conquered Europe twice under Pep.' },
		),
		background: M.guardiola,
		sourceNote: 'Public trophy chronology (2009 sextuple, 2011 UCL) + Wikimedia Commons.',
	},
];

function wingForOnThisDay(event: OnThisDayEvent): MuseumWingId {
	const tag = event.tag.toLowerCase();
	if (tag.includes('masia')) return 'masia';
	if (tag.includes('clásico') || tag.includes('clasico')) return 'rivalries';
	if (tag.includes('ucl') || tag.includes('europe') || tag.includes('club')) return 'europe';
	if (tag.includes('liga') || tag.includes('domestic') || /camp nou/i.test(event.venue ?? '')) return 'camp-nou';
	return 'camp-nou';
}

function exhibitFromOnThisDay(event: OnThisDayEvent): MuseumExhibit {
	const pics = event.photos as MuseumPhoto[];
	return {
		id: `otd-${event.md}-${event.year}`,
		wing: wingForOnThisDay(event),
		year: event.year,
		era: `${event.md.replace('-', '/')} · ${event.year}`,
		title: event.title,
		subtitle: event.blurb,
		body: [event.incident, event.context, event.whyItMatters, event.aftermath].filter(Boolean).join('\n\n'),
		timeline: event.timeline,
		photos: pics,
		background: firstPhoto(pics, CAMP_NOU),
		sourceNote: event.competition
			? `On This Day archive · ${event.competition}${event.scoreline ? ` · ${event.scoreline}` : ''}`
			: 'On This Day archive — curated club lore in Culers.',
	};
}

function exhibitsFromRivalries(): MuseumExhibit[] {
	return RIVALRIES.map((r) => ({
		id: `rivalry-${r.id}`,
		wing: 'rivalries' as const,
		era: r.shortLabel,
		title: r.name,
		subtitle: r.tagline,
		body: r.history,
		timeline: r.lore.map((l) => ({ time: String(l.year), text: `${l.score} — ${l.note}` })),
		photos: photos(
			{ src: r.backgroundUrl, caption: `${r.name} atmosphere` },
			{ src: CAMP_NOU, caption: 'Camp Nou — stage for so many of these nights.' },
		),
		background: r.backgroundUrl || CAMP_NOU,
		sourceNote: 'Culers rivalry dossiers (public club lore).',
	}));
}

function exhibitsFromMasia(): MuseumExhibit[] {
	return [
		{
			id: 'masia-farmhouse',
			wing: 'masia',
			year: 1979,
			era: LA_MASIA_ORIGIN.founded,
			title: LA_MASIA_ORIGIN.title,
			subtitle: 'Boys lived together so the club could raise players, not just train them.',
			body: `${LA_MASIA_ORIGIN.body}\n\n${LA_MASIA_ORIGIN.cruyff}`,
			timeline: LA_MASIA_HEART.map((h) => ({ time: h.letter, text: `${h.word} — ${h.line}` })),
			photos: photos(
				{ src: M.masia, caption: 'La Masia — Centre de Formació Oriol Tort at Ciutat Esportiva Joan Gamper.' },
				{ src: CAMP_NOU, caption: 'The farmhouse stood in the shadow of Camp Nou.' },
			),
			background: M.masia,
			sourceNote: 'La Masia culture notes in Culers (public academy history).',
		},
		{
			id: 'masia-campus',
			wing: 'masia',
			era: 'Joan Gamper · Cruyff',
			title: LA_MASIA_PLACE.campus,
			subtitle: LA_MASIA_PLACE.stadium,
			body: `${LA_MASIA_PLACE.campusNote}\n\n${LA_MASIA_PLACE.stadium}: ${LA_MASIA_PLACE.stadiumNote}`,
			photos: photos(
				{ src: CAMP_NOU_GRASS, caption: 'Training grass — same language as the first team.' },
				{ src: CAMP_NOU, caption: 'From campus pitches to the Camp Nou tunnel.' },
			),
			background: CAMP_NOU_GRASS,
			sourceNote: 'Ciutat Esportiva Joan Gamper & Estadi Johan Cruyff — public campus facts.',
		},
	];
}

function galleryAtmosphereExhibits(): MuseumExhibit[] {
	const homeShots = (homeManifest.images as string[]).map((src, i) => ({
		src,
		caption: `Home atmosphere ${i + 1} — bundled Culé wallpaper.`,
		platform: 'local' as const,
	}));
	const venueShots = Object.values(stadiumManifest.venues as Record<string, { name: string; path: string }>).map(
		(v) => ({
			src: v.path,
			caption: v.name,
			platform: 'local' as const,
		}),
	);
	const stadiumRoots: MuseumPhoto[] = [
		{ src: CAMP_NOU, caption: 'Camp Nou', platform: 'local' },
		{ src: '/backgrounds/stadium/san-mames.jpg', caption: 'San Mamés', platform: 'local' },
		{ src: '/backgrounds/stadium/metropolitano.jpg', caption: 'Metropolitano', platform: 'local' },
		{ src: '/backgrounds/stadium/martinez-valero.jpg', caption: 'Martínez Valero', platform: 'local' },
		{ src: CAMP_NOU_GRASS, caption: 'Camp Nou grass', platform: 'local' },
	];

	const all = [...homeShots, ...venueShots, ...stadiumRoots];
	const slice = all.slice(0, 8);
	return [
		{
			id: 'gallery-atmosphere',
			wing: 'gallery',
			era: 'Archive',
			title: 'Atmosphere archive',
			subtitle: 'Bundled stadium and home scenes kept on Culers when the live feeds are quiet.',
			body: 'Local photo vault — Camp Nou nights, away grounds, and Culé wallpaper. The main Gallery walls above pull random posts from the official Instagram and X accounts.',
			photos: slice,
			background: slice[0]?.src ?? CAMP_NOU,
			sourceNote: 'Local assets under /public/backgrounds (home + stadium manifests).',
		},
	];
}

function mulberry32(seed: number) {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffleMuseumPhotos<T>(items: T[], seed: number): T[] {
	const out = [...items];
	const rand = mulberry32(seed || 1);
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		const tmp = out[i]!;
		out[i] = out[j]!;
		out[j] = tmp;
	}
	return out;
}

export const GALLERY_LOADING_EXHIBIT: MuseumExhibit = {
	id: 'gallery-loading',
	wing: 'gallery',
	era: 'Live',
	title: 'Loading official walls…',
	subtitle: 'Pulling random photos from @fcbarcelona and @FCBarcelona.',
	body: 'Hang on — the gallery is fetching the latest public previews from Instagram and X.',
	photos: [],
	background: CAMP_NOU,
	sourceNote: 'instagram.com/fcbarcelona · x.com/FCBarcelona',
};

export function buildSocialGalleryExhibits(input: {
	instagram: MuseumPhoto[];
	x: MuseumPhoto[];
	shuffleKey: number;
	note?: string;
}): MuseumExhibit[] {
	const ig = input.instagram;
	const x = input.x;
	const mixed = shuffleMuseumPhotos([...ig, ...x], input.shuffleKey + 17);
	const rooms: MuseumExhibit[] = [];

	if (mixed.length > 0) {
		const wall = mixed.slice(0, 12);
		rooms.push({
			id: 'gallery-random',
			wing: 'gallery',
			era: 'Live · shuffled',
			title: 'Random walls',
			subtitle: 'A fresh mix from official Instagram and X — shuffle for a new hang.',
			body: 'These frames are pulled live from @fcbarcelona on Instagram and @FCBarcelona on X. Tap any photo to put it on the museum backdrop. Use Shuffle walls for another random set.',
			photos: wall,
			background: wall[0]!.src,
			sourceNote:
				input.note ??
				'Live feeds — https://www.instagram.com/fcbarcelona/ · https://x.com/FCBarcelona',
		});
	}

	if (ig.length > 0) {
		const wall = shuffleMuseumPhotos(ig, input.shuffleKey + 41).slice(0, 12);
		rooms.push({
			id: 'gallery-instagram',
			wing: 'gallery',
			era: '@fcbarcelona',
			title: 'Instagram wall',
			subtitle: 'Public previews from the club’s official Instagram.',
			body: 'Official Instagram moments — matchday, squad, Camp Nou atmosphere — as the club posts them.',
			photos: wall,
			background: wall[0]!.src,
			sourceNote: 'https://www.instagram.com/fcbarcelona/',
		});
	}

	if (x.length > 0) {
		const wall = shuffleMuseumPhotos(x, input.shuffleKey + 73).slice(0, 12);
		rooms.push({
			id: 'gallery-x',
			wing: 'gallery',
			era: '@FCBarcelona',
			title: 'X wall',
			subtitle: 'Photo posts from the club on X.',
			body: 'Images attached to recent @FCBarcelona posts — lineups, goals, and club announcements that carry a picture.',
			photos: wall,
			background: wall[0]!.src,
			sourceNote: 'https://x.com/FCBarcelona',
		});
	}

	rooms.push(...galleryAtmosphereExhibits());

	if (rooms.length === 1 && rooms[0]?.id === 'gallery-atmosphere') {
		rooms.unshift({
			id: 'gallery-social-empty',
			wing: 'gallery',
			era: 'Live',
			title: 'Official feeds quiet',
			subtitle: 'Could not load Instagram / X previews right now.',
			body: 'Open the club’s Instagram or X directly, then try Shuffle walls again. The atmosphere archive below still hangs local Camp Nou and stadium photos.',
			photos: [],
			background: CAMP_NOU,
			sourceNote:
				input.note ??
				'https://www.instagram.com/fcbarcelona/ · https://x.com/FCBarcelona',
		});
	}

	return rooms;
}

/** Static fallback until the Gallery wing loads live social rooms. */
function galleryExhibits(): MuseumExhibit[] {
	return [GALLERY_LOADING_EXHIBIT, ...galleryAtmosphereExhibits()];
}

function dedupeById(exhibits: MuseumExhibit[]) {
	const seen = new Set<string>();
	return exhibits.filter((e) => {
		if (seen.has(e.id)) return false;
		seen.add(e.id);
		return true;
	});
}

export const MUSEUM_EXHIBITS: MuseumExhibit[] = dedupeById([
	...ORIGIN_EXHIBITS,
	...ON_THIS_DAY.map(exhibitFromOnThisDay),
	...exhibitsFromRivalries(),
	...exhibitsFromMasia(),
	...galleryExhibits(),
]);

export function exhibitsForWing(wing: MuseumWingId) {
	return MUSEUM_EXHIBITS.filter((e) => e.wing === wing);
}

export function museumPhotoInventory(): OnThisDayPhoto[] {
	const map = new Map<string, OnThisDayPhoto>();
	for (const e of MUSEUM_EXHIBITS) {
		for (const p of e.photos) {
			if (!map.has(p.src)) map.set(p.src, p);
		}
	}
	return [...map.values()];
}

export const MUSEUM_META = {
	title: 'Culers Museum',
	tagline: 'Més que un club — history in rooms, photos on the walls.',
	intro:
		'Walk the wings: founding myths, Camp Nou nights, European miracles, rivalries, La Masia, and a live Gallery of random photos from Instagram and X.',
};
