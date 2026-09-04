export type TwitterProfile = {
	handle: string;
	name?: string;
	description?: string;
	followers?: number;
	avatarUrl?: string;
};

export type TwitterMedia = {
	type: 'photo' | 'video';
	url: string;
	previewUrl: string;
};

export type TwitterItem = {
	title: string;
	link: string;
	pubDate: string;
	source: string;
	text: string;
	media?: TwitterMedia[];
};

type FxMediaItem = {
	type?: string;
	url?: string;
	thumbnail_url?: string;
};

type FxMedia = {
	photos?: FxMediaItem[];
	all?: FxMediaItem[];
};

type FxStatus = {
	type?: string;
	id?: string;
	url?: string;
	text?: string;
	created_at?: string;
	media?: FxMedia;
};

function decodeHtml(s: string) {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

function toTwitterItem(
	handle: string,
	text: string,
	link: string,
	pubDate: string,
	media?: TwitterMedia[],
): TwitterItem {
	const clean = text.replace(/\s+/g, ' ').trim();
	return {
		title: clean.length > 140 ? `${clean.slice(0, 137)}…` : clean,
		text: clean,
		link,
		pubDate,
		source: `@${handle} (X)`,
		...(media?.length ? { media } : {}),
	};
}

function extractMedia(media?: FxMedia): TwitterMedia[] {
	if (!media) return [];

	const out: TwitterMedia[] = [];

	for (const photo of media.photos ?? []) {
		if (!photo.url) continue;
		out.push({ type: 'photo', url: photo.url, previewUrl: photo.url });
	}

	for (const item of media.all ?? []) {
		if (item.type !== 'video' || !item.thumbnail_url) continue;
		out.push({
			type: 'video',
			url: item.url ?? item.thumbnail_url,
			previewUrl: item.thumbnail_url,
		});
	}

	return out;
}

function upsizeAvatar(url?: string) {
	if (!url) return undefined;
	return url.replace(/_(normal|bigger|mini)\.(jpg|jpeg|png|webp)$/i, '_400x400.$2');
}

async function fetchFromFxTwitter(handle: string): Promise<{ items: TwitterItem[]; note?: string }> {
	const res = await fetch(`https://api.fxtwitter.com/2/profile/${handle}/statuses?count=20`, {
		headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
	});

	if (!res.ok) {
		return { items: [], note: `FxTwitter returned HTTP ${res.status} for @${handle}.` };
	}

	const data = (await res.json()) as { code?: number; results?: FxStatus[]; message?: string };
	const rows = (data.results ?? []).filter((row) => row.type === 'status' && row.text?.trim());

	const items = rows.map((row) =>
		toTwitterItem(
			handle,
			row.text!,
			row.url ?? `https://x.com/${handle}/status/${row.id}`,
			row.created_at ?? '',
			extractMedia(row.media),
		),
	);

	if (!items.length) {
		return { items: [], note: data.message ?? `No tweets returned for @${handle}.` };
	}

	return { items };
}

function parseSyndicationHtml(handle: string, html: string): TwitterItem[] {
	const items: TwitterItem[] = [];
	const blocks = html.match(/data-tweet-id="(\d+)"[\s\S]*?<\/li>/gi) ?? [];

	for (const block of blocks) {
		const id = block.match(/data-tweet-id="(\d+)"/)?.[1];
		const text =
			block.match(/class="[^"]*timeline-Tweet-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
			block.match(/<p[^>]*class="[^"]*tweet-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
			'';
		const time = block.match(/datetime="([^"]+)"/)?.[1] ?? '';
		const clean = decodeHtml(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
		if (!id || !clean) continue;
		items.push(toTwitterItem(handle, clean, `https://x.com/${handle}/status/${id}`, time));
	}

	return items;
}

async function fetchFromSyndication(handle: string): Promise<{ items: TwitterItem[]; note?: string }> {
	const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?limit=20&showReplies=false`;
	const res = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'text/html,application/xhtml+xml',
			Referer: 'https://publish.twitter.com/',
		},
	});

	const body = await res.text();

	if (!res.ok || body.includes('Rate limit exceeded')) {
		return {
			items: [],
			note: `X syndication rate-limited for @${handle} — retry Fetch latest shortly.`,
		};
	}

	const items = parseSyndicationHtml(handle, body);
	if (!items.length) {
		return { items: [], note: `No tweets parsed from @${handle} timeline.` };
	}

	return { items };
}

export async function fetchTwitterTimeline(handle: string): Promise<{ items: TwitterItem[]; note?: string }> {
	try {
		const primary = await fetchFromFxTwitter(handle);
		if (primary.items.length) return primary;
	} catch {
		// fall through
	}

	try {
		const fallback = await fetchFromSyndication(handle);
		if (fallback.items.length) return fallback;
		return fallback;
	} catch {
		return {
			items: [],
			note: `Could not load tweets from @${handle}.`,
		};
	}
}

export async function fetchTwitterProfile(handle: string): Promise<TwitterProfile | null> {
	try {
		const res = await fetch(`https://api.fxtwitter.com/2/profile/${handle}`, {
			headers: { 'User-Agent': 'Culers/1.0 (local Barcelona fan app)' },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			user?: { name?: string; description?: string; followers?: number; avatar_url?: string };
		};
		const user = data.user;
		if (!user) return null;
		return {
			handle,
			name: user.name,
			description: user.description,
			followers: user.followers,
			avatarUrl: upsizeAvatar(user.avatar_url),
		};
	} catch {
		return null;
	}
}

export const RESHAD_HANDLE = 'ReshadRahman';
export const FABRIZIO_HANDLE = 'FabrizioRomano';

export async function fetchReshadRahmanNews() {
	return fetchTwitterTimeline(RESHAD_HANDLE);
}

export async function fetchFabrizioRomanoNews() {
	return fetchTwitterTimeline(FABRIZIO_HANDLE);
}

export async function fetchReshadProfile() {
	return fetchTwitterProfile(RESHAD_HANDLE);
}

export async function fetchFabrizioProfile() {
	return fetchTwitterProfile(FABRIZIO_HANDLE);
}
