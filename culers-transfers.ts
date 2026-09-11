import { fetchFabrizioRomanoNews, fetchReshadRahmanNews } from './culers-twitter.ts';
import { ESPN_BARCA_TEAM_ID, fetchEspnTeamPlayers } from './culers-espn.ts';
import {
	fetchTransferRoomIntel,
	fetchTransferRoomWindowNote,
	transferRoomLinks,
	type TransferRoomIntel,
} from './culers-transferroom.ts';

const UA = 'Culers/1.0 (local Barcelona fan app)';
const RECORDS_PAGE = 'List of FC Barcelona records and statistics';

export type TransferRumorHeat = 'here-we-go' | 'hot' | 'watch' | 'denied';
export type TransferRumorLean = 'in' | 'out' | 'other';

export type TransferRumor = {
	title: string;
	url: string;
	text: string;
	pubDate?: string;
	source: string;
	handle?: string;
	heat: TransferRumorHeat;
	heatLabel: string;
	lean: TransferRumorLean;
	media?: Array<{ type: 'photo' | 'video'; url: string; previewUrl: string }>;
};

export type TransferDeal = {
	player: string;
	position: string;
	club: string;
	type: string;
	fee: string;
	date: string;
	window: 'summer' | 'winter' | 'unknown';
	direction: 'in' | 'out';
};

export type TransferRecord = {
	player: string;
	club: string;
	fee: string;
	year: string;
	direction: 'in' | 'out';
};

export type SquadMarketValue = {
	name: string;
	position: string;
	number: string;
	nationality: string;
	valueEur: number;
	valueLabel: string;
	sofaId: number;
};

export type TransfersHub = {
	season: string;
	seasonPage: string;
	windowNote: string;
	arrivals: TransferDeal[];
	departures: TransferDeal[];
	intel: TransferRoomIntel[];
	rumors: TransferRumor[];
	recordsIn: TransferRecord[];
	recordsOut: TransferRecord[];
	values: SquadMarketValue[];
	squadValueTotalEur: number;
	squadValueTotalLabel: string;
	links: ReturnType<typeof transferRoomLinks>;
	sources: string[];
	fetchedAt: string;
	note: string;
};

export function formatEur(n: number) {
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(2)}bn`;
	if (n >= 1_000_000) {
		const m = n / 1_000_000;
		return `€${m >= 10 ? Math.round(m) : m.toFixed(1)}m`;
	}
	if (n >= 1_000) return `€${Math.round(n / 1_000)}k`;
	return `€${Math.round(n)}`;
}

function currentSeasonLabel(now = new Date()) {
	const y = now.getUTCFullYear();
	const m = now.getUTCMonth() + 1;
	const start = m >= 7 ? y : y - 1;
	return `${start}–${String(start + 1).slice(2)}`;
}

function expandTemplate(raw: string): string {
	const inner = raw.slice(2, -2);
	const parts = inner.split('|').map((p) => p.trim());
	const name = (parts[0] ?? '').toLowerCase();
	if (name === 'sortname') return `${parts[1] ?? ''} ${parts[2] ?? ''}`.trim();
	if (name === 'nowrap') return parts[1] ?? '';
	if (name === 'nbsp') return ' ';
	if (name.startsWith('flag') || name.startsWith('fba') || name === 'bra' || name === 'esp' || name === 'arg') return '';
	if (name === 'efn' || name.startsWith('cite') || name === 'ref') return '';
	return '';
}

function stripWiki(raw: string) {
	let s = raw;
	s = s.replace(/<ref[\s\S]*?<\/ref>/gi, '');
	s = s.replace(/<ref[^>]*\/>/gi, '');
	for (let i = 0; i < 6; i++) {
		const next = s.replace(/\{\{[^{}]*\}\}/g, (m) => expandTemplate(m));
		if (next === s) break;
		s = next;
	}
	s = s.replace(/\{\{[\s\S]*?\}\}/g, ' ');
	s = s.replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, '$2');
	s = s.replace(/'{2,}/g, '');
	s = s.replace(/<br\s*\/?>/gi, ' ');
	s = s.replace(/<[^>]+>/g, '');
	s = s.replace(/&nbsp;/g, ' ');
	return s.replace(/\s+/g, ' ').trim();
}

function stripCellMeta(cell: string) {
	let s = cell.trim();
	while (/^(rowspan|colspan|style|align|width|scope|class|valign)\s*=/i.test(s)) {
		const pipe = s.indexOf('|');
		if (pipe < 0) break;
		s = s.slice(pipe + 1).trim();
	}
	return s;
}

function extractNamed(wikitext: string, heading: RegExp, stop: RegExp) {
	const m = wikitext.match(heading);
	if (!m || m.index == null) return '';
	const rest = wikitext.slice(m.index + m[0].length);
	const next = rest.search(stop);
	return next >= 0 ? rest.slice(0, next) : rest;
}

function extractTable(section: string) {
	const start = section.indexOf('{|');
	if (start < 0) return '';
	const end = section.indexOf('\n|}', start);
	return end >= 0 ? section.slice(start, end) : section.slice(start);
}

function parseWikiRows(tableWiki: string): string[][] {
	const rows = tableWiki.split(/\n\|-[^\n]*/).slice(1);
	const out: string[][] = [];
	for (const row of rows) {
		const cells: string[] = [];
		let buf = '';
		const flush = () => {
			const cleaned = stripWiki(stripCellMeta(buf));
			if (cleaned) cells.push(cleaned);
			buf = '';
		};
		for (const line of row.split('\n')) {
			if (/^\|\}/.test(line)) continue;
			if (/^[|!]/.test(line)) {
				const payload = line.replace(/^[|!]\s?/, '');
				const chunks = payload.split(/\s*\|\|\s*/);
				if (chunks.length > 1) {
					flush();
					for (const chunk of chunks) {
						const cleaned = stripWiki(stripCellMeta(chunk));
						if (cleaned) cells.push(cleaned);
					}
				} else {
					flush();
					buf = payload;
				}
			} else if (buf) {
				buf += ` ${line}`;
			}
		}
		flush();
		if (cells.length) out.push(cells);
	}
	return out;
}

function parseSeasonDeals(section: string, direction: 'in' | 'out'): TransferDeal[] {
	const table = extractTable(section);
	const rows = parseWikiRows(table);
	const deals: TransferDeal[] = [];
	let window: TransferDeal['window'] = 'unknown';
	for (const cells of rows) {
		const joined = cells.join(' ').toLowerCase();
		if (cells.length <= 2 && /summer|winter/.test(joined)) {
			window = /winter/.test(joined) ? 'winter' : 'summer';
			continue;
		}
		if (cells.length < 6) continue;
		const [num, pos, player, club, type, fee, date] = cells;
		if (!player || /player|transfer from|transfer to/i.test(player)) continue;
		deals.push({
			player,
			position: pos && !/^\d/.test(pos) ? pos : num && !/^\d|^—|^–/.test(num) ? num : pos,
			club: club ?? '',
			type: type ?? '',
			fee: fee ?? '',
			date: date ?? '',
			window,
			direction,
		});
	}
	return deals;
}

function playerKey(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function isLoanReturn(deal: TransferDeal) {
	return /loan\s*return/i.test(deal.type);
}

/** Wikipedia lists administrative returns (end of loan) plus the real transfer. Keep the real move. */
function netSeasonMoves(arrivals: TransferDeal[], departures: TransferDeal[]) {
	const names = new Set([...arrivals, ...departures].map((d) => playerKey(d.player)));
	const ins: TransferDeal[] = [];
	const outs: TransferDeal[] = [];
	for (const name of names) {
		const playerIns = arrivals.filter((d) => playerKey(d.player) === name);
		const playerOuts = departures.filter((d) => playerKey(d.player) === name);
		const realIn = playerIns.filter((d) => !isLoanReturn(d));
		const realOut = playerOuts.filter((d) => !isLoanReturn(d));
		if (realIn.length || realOut.length) {
			ins.push(...realIn);
			outs.push(...realOut);
		} else {
			ins.push(...playerIns);
			outs.push(...playerOuts);
		}
	}
	const byDate = (a: TransferDeal, b: TransferDeal) =>
		new Date(a.date).getTime() - new Date(b.date).getTime() || a.player.localeCompare(b.player);
	return { arrivals: ins.sort(byDate), departures: outs.sort(byDate) };
}

function parseFeeRecords(section: string, direction: 'in' | 'out'): TransferRecord[] {
	const table = extractTable(section);
	const rows = parseWikiRows(table);
	const out: TransferRecord[] = [];
	for (const cells of rows) {
		if (cells.length < 3) continue;
		if (/^rank$/i.test(cells[0] ?? '') || /^player$/i.test(cells[1] ?? '')) continue;
		const names = cells.filter((c) => !/^\d+$/.test(c) && !/[£€]/.test(c) && !/^(?:19|20)\d{2}/.test(c.trim()));
		const player = names[0];
		const club = names[1] ?? '';
		if (!player || /nationality|transfer fee|player/i.test(player)) continue;
		const euroCell = cells.find((c) => /€/.test(c)) ?? '';
		const yearCell = [...cells].reverse().find((c) => /(?:19|20)\d{2}/.test(c)) ?? '';
		const fee = euroCell.replace(/\[.*?\]/g, '').replace(/million/gi, 'm').trim();
		out.push({
			player,
			club,
			fee: /€\s*\d/.test(fee) && !/[mb]/i.test(fee) ? `${fee}m` : fee,
			year: (yearCell.match(/(?:19|20)\d{2}/) ?? [yearCell])[0] ?? '',
			direction,
		});
		if (out.length >= 10) break;
	}
	return out;
}

async function wikiWikitext(page: string): Promise<string | null> {
	const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': UA } });
		if (!res.ok) return null;
		const data = (await res.json()) as { parse?: { wikitext?: { '*'?: string } }; error?: unknown };
		return data.parse?.wikitext?.['*'] ?? null;
	} catch {
		return null;
	}
}

function rumorBody(title: string, text: string) {
	const a = title.trim();
	const b = text.trim();
	if (!b) return a;
	if (!a) return b;
	if (a === b) return b;
	if (b.startsWith(a.replace(/…|\.\.\.$/, '').trim()) || b.includes(a.replace(/…|\.\.\.$/, '').trim())) return b;
	if (a.startsWith(b.replace(/…|\.\.\.$/, '').trim())) return a;
	return b.length >= a.length ? b : a;
}

const TRANSFER_TALK =
	/here we go|transfer|sign(?:ed|ing|s)?\b|loan|release clause|personal terms|agrees|agreement|bid|offer|medical|join(?:s|ed)?\b|\bdeal\b|\bfee\b|rejected|close to|set to|on the verge|target|linked|interest|wanted|contract|clause/;

function isBarcaTalk(blob: string) {
	return /barcelona|barça|barca|blaugrana|culers/.test(blob);
}

function isQuoteNoise(blob: string) {
	return (
		/\bi love (football and i love )?barcelona\b|more than a club|més que un club/.test(blob) &&
		!/here we go|transfer|signed|bid|deal|loan/.test(blob)
	);
}

function rumorHeat(blob: string): { heat: TransferRumorHeat; heatLabel: string } {
	if (/here we go|deal done|has signed|signed for|completed the signing|it's done|its done/.test(blob)) {
		return { heat: 'here-we-go', heatLabel: 'Here we go' };
	}
	if (/rejected|not happening|no deal|won'?t join|will not join|denied|off the table/.test(blob)) {
		return { heat: 'denied', heatLabel: 'Off' };
	}
	if (/medical|personal terms|verbal agreement|agreement reached|exclusive|done deal/.test(blob)) {
		return { heat: 'hot', heatLabel: 'Close' };
	}
	return { heat: 'watch', heatLabel: 'Watch' };
}

function rumorLean(blob: string): TransferRumorLean {
	const comingIn =
		/(?:join(?:s|ed)?|to|towards|signing for|signs for|headed to)\s+(?:fc\s+)?(?:barcelona|barça|barca)/.test(blob) ||
		/(?:barcelona|barça|barca)\s+(?:have\s+|has\s+)?(?:sign|signed|agree|agrees|close|bid|offer|want|wanted|target)/.test(
			blob,
		);
	const goingOut =
		/(?:leave|leaves|leaving|exit|exits|depart|departs|sold by|from)\s+(?:fc\s+)?(?:barcelona|barça|barca)/.test(blob) ||
		/(?:barcelona|barça|barca)\s+(?:sell|sold|loan out|let go|release)/.test(blob);
	if (comingIn && !goingOut) return 'in';
	if (goingOut && !comingIn) return 'out';
	return 'other';
}

function sourceHandle(source: string) {
	if (/fabrizio/i.test(source)) return 'FabrizioRomano';
	if (/reshad/i.test(source)) return 'ReshadRahman';
	return undefined;
}

export type RumorSeed = {
	title: string;
	url?: string;
	link?: string;
	text?: string;
	snippet?: string;
	pubDate?: string;
	source: string;
	media?: TransferRumor['media'];
};

export function collectTransferRumors(seeds: RumorSeed[]): TransferRumor[] {
	const byUrl = new Map<string, TransferRumor>();
	for (const seed of seeds) {
		const url = String(seed.url || seed.link || '').trim();
		const text = rumorBody(seed.title, seed.text || seed.snippet || '');
		if (!url || !text) continue;
		const blob = text.toLowerCase();
		if (isQuoteNoise(blob)) continue;
		if (!TRANSFER_TALK.test(blob)) continue;
		const handle = sourceHandle(seed.source);
		const barcaBeat = handle === 'ReshadRahman' || isBarcaTalk(blob);
		if (!barcaBeat) continue;
		const { heat, heatLabel } = rumorHeat(blob);
		byUrl.set(url, {
			title: text,
			url,
			text,
			pubDate: seed.pubDate,
			source: seed.source,
			handle,
			heat,
			heatLabel,
			lean: rumorLean(blob),
			media: seed.media,
		});
	}
	const rank = { 'here-we-go': 0, hot: 1, watch: 2, denied: 3 };
	const byBody = new Map<string, TransferRumor>();
	for (const rumor of byUrl.values()) {
		const key = rumor.text.replace(/\s+/g, ' ').trim().toLowerCase();
		const prev = byBody.get(key);
		if (!prev) {
			byBody.set(key, rumor);
			continue;
		}
		const hotter = rank[rumor.heat] < rank[prev.heat];
		const longer = rumor.text.length > prev.text.length;
		const newer = new Date(rumor.pubDate ?? 0).getTime() > new Date(prev.pubDate ?? 0).getTime();
		if (hotter || longer || (rank[rumor.heat] === rank[prev.heat] && !longer && newer)) {
			byBody.set(key, {
				...rumor,
				text: longer ? rumor.text : prev.text,
				title: longer ? rumor.title : prev.title,
				media: rumor.media?.length ? rumor.media : prev.media,
			});
		}
	}
	return [...byBody.values()].sort((a, b) => {
		const heat = rank[a.heat] - rank[b.heat];
		if (heat) return heat;
		return new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime();
	});
}

export function attachNewsToTransferRumors(hub: TransfersHub, extra: RumorSeed[]): TransfersHub {
	return {
		...hub,
		rumors: collectTransferRumors([
			...hub.rumors.map((r) => ({
				title: r.text,
				url: r.url,
				text: r.text,
				pubDate: r.pubDate,
				source: r.source,
				media: r.media,
			})),
			...extra,
		]),
	};
}

export async function fetchTransfersHub(): Promise<TransfersHub> {
	const season = currentSeasonLabel();
	const seasonPage = `${season} FC Barcelona season`;
	const links = transferRoomLinks();

	const [intel, windowNote, seasonWiki, recordsWiki, sofaPlayers, fabrizio, reshad] = await Promise.all([
		fetchTransferRoomIntel(),
		fetchTransferRoomWindowNote(),
		wikiWikitext(seasonPage),
		wikiWikitext(RECORDS_PAGE),
		fetchEspnTeamPlayers(ESPN_BARCA_TEAM_ID).catch(() => []),
		fetchFabrizioRomanoNews().catch(() => ({ items: [] as Array<{ title: string; link: string; text?: string; pubDate: string; source: string; media?: TransferRumor['media'] }> })),
		fetchReshadRahmanNews().catch(() => ({ items: [] as Array<{ title: string; link: string; text?: string; pubDate: string; source: string; media?: TransferRumor['media'] }> })),
	]);

	const transfersSec = seasonWiki ? extractNamed(`\n${seasonWiki}`, /\n==Transfers==/, /\n==[^=]/) : '';
	const rawArrivals = parseSeasonDeals(extractNamed(transfersSec, /===In\b/, /\n===/), 'in');
	const rawDepartures = parseSeasonDeals(extractNamed(transfersSec, /===Out\b/, /\n===/), 'out');
	const { arrivals, departures } = netSeasonMoves(rawArrivals, rawDepartures);

	const recordsIn = recordsWiki
		? parseFeeRecords(extractNamed(recordsWiki, /=== Transfer fee paid ===/, /\n===/), 'in')
		: [];
	const recordsOut = recordsWiki
		? parseFeeRecords(extractNamed(recordsWiki, /=== Transfer fee received ===/, /\n===/), 'out')
		: [];

	const values: SquadMarketValue[] = sofaPlayers
		.filter((p) => p.marketValueEur && p.marketValueEur > 0)
		.sort((a, b) => (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0))
		.map((p) => ({
			name: p.name,
			position: p.position,
			number: p.number,
			nationality: p.nationality,
			valueEur: p.marketValueEur ?? 0,
			valueLabel: formatEur(p.marketValueEur ?? 0),
			sofaId: p.id,
		}));
	const squadValueTotalEur = values.reduce((sum, p) => sum + p.valueEur, 0);

	const rumors = collectTransferRumors(
		[...fabrizio.items, ...reshad.items].map((item) => ({
			title: item.title,
			link: item.link,
			text: item.text,
			pubDate: item.pubDate,
			source: item.source,
			media: item.media,
		})),
	);

	const sources = [
		'TransferRoom HubSpot search + blog RSS',
		'TransferRoom Transfer Window Tracker',
		`Wikipedia — ${seasonPage}`,
		`Wikipedia — ${RECORDS_PAGE}`,
		'ESPN roster (market values are not published on that feed)',
		'Fabrizio Romano + Reshad Rahman (Barça transfer talk)',
	];

	return {
		season,
		seasonPage: `https://en.wikipedia.org/wiki/${encodeURIComponent(seasonPage.replace(/ /g, '_'))}`,
		windowNote,
		arrivals,
		departures,
		intel,
		rumors,
		recordsIn,
		recordsOut,
		values,
		squadValueTotalEur,
		squadValueTotalLabel: formatEur(squadValueTotalEur),
		links,
		sources,
		fetchedAt: new Date().toISOString(),
		note: `TransferRoom’s club API / xTV board is login-only. Public TransferRoom intel is wired in full (search, blog, tracker, xTV). Completed deals come from the ${season} Wikipedia season page. Public ESPN / Google Sports feeds do not include transfer market values.`,
	};
}
