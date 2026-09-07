const HUBSPOT_PORTAL = '6939831';
const BLOG_RSS = 'https://blog.transferroom.com/rss.xml';
const TRACKER_URL = 'https://www.transferroom.com/transfer-tracker';
const XTV_URL = 'https://www.transferroom.com/webinars/expected-transfer-value-xtv';

const UA = 'Culers/1.0 (local Barcelona fan app)';

export type TransferRoomIntel = {
	id: string;
	title: string;
	url: string;
	snippet: string;
	pubDate?: string;
	image?: string;
	tags?: string[];
	source: string;
};

function stripHtml(s: string) {
	return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchText(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	}
}

async function fetchJson<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

function isBarcaHit(title: string, snippet: string, url: string) {
	const blob = `${title} ${snippet} ${url}`.toLowerCase();
	return /barcelona|barça|barca|blaugrana|camp nou/.test(blob);
}

type HubSpotResult = {
	id?: string | number;
	url?: string;
	title?: string;
	description?: string;
	featuredImageUrl?: string;
	publishedDate?: number;
	tags?: string[];
	type?: string;
	isPrivate?: boolean;
};

async function hubspotSearch(term: string, limit = 18): Promise<TransferRoomIntel[]> {
	const url = `https://api.hubapi.com/contentsearch/v2/search?portalId=${HUBSPOT_PORTAL}&term=${encodeURIComponent(term)}&limit=${limit}`;
	const data = await fetchJson<{ results?: HubSpotResult[] }>(url);
	const out: TransferRoomIntel[] = [];
	for (const row of data?.results ?? []) {
		const title = stripHtml(String(row.title ?? ''));
		const snippet = stripHtml(String(row.description ?? ''));
		const link = String(row.url ?? '');
		if (!title || !link) continue;
		if (row.isPrivate) continue;
		out.push({
			id: String(row.id ?? link),
			title,
			url: link,
			snippet,
			pubDate: row.publishedDate ? new Date(row.publishedDate).toISOString() : undefined,
			image: row.featuredImageUrl || undefined,
			tags: row.tags,
			source: 'TransferRoom',
		});
	}
	return out;
}

function parseRss(xml: string): TransferRoomIntel[] {
	const items = xml.split(/<item[\s>]/i).slice(1);
	const out: TransferRoomIntel[] = [];
	for (const chunk of items) {
		const title = stripHtml((chunk.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, ''));
		const link = (chunk.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim();
		const desc = stripHtml(
			(chunk.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, ''),
		);
		const date = (chunk.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '').trim();
		if (!title || !link) continue;
		out.push({
			id: link,
			title,
			url: link,
			snippet: desc,
			pubDate: date ? new Date(date).toISOString() : undefined,
			source: 'TransferRoom blog',
		});
	}
	return out;
}

export async function fetchTransferRoomIntel(): Promise<TransferRoomIntel[]> {
	const [barca, fc, rssXml] = await Promise.all([
		hubspotSearch('Barcelona'),
		hubspotSearch('FC Barcelona'),
		fetchText(BLOG_RSS),
	]);
	const rss = rssXml ? parseRss(rssXml) : [];
	const merged = new Map<string, TransferRoomIntel>();
	for (const item of [...barca, ...fc, ...rss]) {
		const key = item.url.replace(/\/$/, '').toLowerCase();
		if (!merged.has(key)) merged.set(key, item);
	}
	const preferred = [...merged.values()].filter((i) => isBarcaHit(i.title, i.snippet, i.url));
	const rest = [...merged.values()].filter((i) => !preferred.includes(i));
	return [...preferred, ...rest].slice(0, 24);
}

export async function fetchTransferRoomWindowNote(): Promise<string> {
	const html = await fetchText(TRACKER_URL);
	if (!html) {
		return `Live TransferRoom window tracker: ${TRACKER_URL} — deal boards need a club login.`;
	}
	const text = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	const spain = text.match(/Spain.{0,160}/i)?.[0];
	const liga = text.match(/La\s*Liga.{0,160}/i)?.[0];
	const extra = [spain, liga].filter(Boolean).join(' · ');
	return extra
		? `TransferRoom tracker: ${extra}`
		: `TransferRoom Transfer Window Tracker is live at ${TRACKER_URL}. Spain / La Liga dates load in their club dashboard; public page is a world map of windows.`;
}

export function transferRoomLinks() {
	return {
		home: 'https://www.transferroom.com/',
		tracker: TRACKER_URL,
		blog: 'https://blog.transferroom.com/',
		xtv: XTV_URL,
		api: 'https://www.transferroom.com/api-docs',
	};
}
