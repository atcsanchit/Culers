import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTwitterProfile, fetchTwitterTimeline } from './culers-twitter.ts';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(ROOT, '.venv-instagram', 'bin', 'python');
const INSTAGRAM_SCRIPT = path.join(ROOT, 'scripts', 'instagram-scrape.py');
const CACHE_DIR = path.join(ROOT, '.cache', 'instagram');
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const BARCA_X_HANDLE = 'FCBarcelona';
export const BARCA_INSTAGRAM_USER = 'fcbarcelona';
export const MASIA_INSTAGRAM_USER = 'fcbmasia';

const INSTAGRAM_USERS = new Set([BARCA_INSTAGRAM_USER, MASIA_INSTAGRAM_USER]);

export function sanitizeInstagramUser(raw: string | null | undefined) {
	const user = String(raw ?? BARCA_INSTAGRAM_USER)
		.toLowerCase()
		.replace(/[^a-z0-9._]/g, '');
	return INSTAGRAM_USERS.has(user) ? user : BARCA_INSTAGRAM_USER;
}

export type InstagramPost = {
	id: string;
	url: string;
	image: string;
	caption: string;
};

export type SocialPlatformStats = {
	id: 'instagram' | 'x';
	label: string;
	handle: string;
	profileUrl: string;
	followers?: number;
	followersLabel?: string;
	postsLabel?: string;
	avatarUrl?: string;
	description?: string;
};

export type SocialHubData = {
	platforms: SocialPlatformStats[];
	fetchedAt: string;
	note?: string;
};

function proxyInstagramImage(id: string, user = BARCA_INSTAGRAM_USER) {
	return `/api/social/instagram/image?user=${encodeURIComponent(user)}&id=${encodeURIComponent(id)}`;
}

function instagramCacheFile(user: string, id: string) {
	return path.join(CACHE_DIR, user, `${id}.jpg`);
}

async function runInstagramScraper(username = BARCA_INSTAGRAM_USER): Promise<{
	username: string;
	profileUrl: string;
	profileImage?: string;
	followersLabel: string;
	postsLabel: string;
	posts: Array<InstagramPost & { cached?: boolean }>;
} | null> {
	// Python + curl_cffi are local-only; on Vercel this would hang until function timeout.
	if (IS_SERVERLESS || process.env.VERCEL_ENV) return null;

	return new Promise((resolve) => {
		const child = spawn(PYTHON, [INSTAGRAM_SCRIPT, username], { cwd: ROOT });
		let stdout = '';
		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			resolve(null);
		}, 12_000);
		child.stdout.on('data', (chunk) => {
			stdout += String(chunk);
		});
		child.on('error', () => {
			clearTimeout(timer);
			resolve(null);
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			if (code !== 0) {
				resolve(null);
				return;
			}
			try {
				resolve(JSON.parse(stdout));
			} catch {
				resolve(null);
			}
		});
	});
}

export async function fetchBarcaSocialHub(): Promise<SocialHubData> {
	const [xProfile, instagram] = await Promise.all([
		fetchTwitterProfile(BARCA_X_HANDLE),
		runInstagramScraper(),
	]);

	const platforms: SocialPlatformStats[] = [
		{
			id: 'instagram',
			label: 'Instagram',
			handle: BARCA_INSTAGRAM_USER,
			profileUrl: `https://www.instagram.com/${BARCA_INSTAGRAM_USER}/`,
			followersLabel: instagram?.followersLabel ?? '148M',
			postsLabel: instagram?.postsLabel,
			description: 'Official FC Barcelona on Instagram',
		},
		{
			id: 'x',
			label: 'X',
			handle: BARCA_X_HANDLE,
			profileUrl: `https://x.com/${BARCA_X_HANDLE}`,
			followers: xProfile?.followers,
			followersLabel: xProfile?.followers ? formatFollowers(xProfile.followers) : undefined,
			avatarUrl: xProfile?.avatarUrl,
			description: xProfile?.description ?? 'Official FC Barcelona on X',
		},
	];

	return {
		platforms,
		fetchedAt: new Date().toISOString(),
		note: instagram ? undefined : 'Instagram stats loaded with fallback — run npm run setup:instagram for live scrape.',
	};
}

export async function fetchBarcaInstagramFeed() {
	return fetchInstagramFeedFor(BARCA_INSTAGRAM_USER);
}

export async function fetchInstagramFeedFor(rawUser: string) {
	const username = sanitizeInstagramUser(rawUser);
	const data = await runInstagramScraper(username);
	let profileImage = '';
	try {
		await readFile(instagramCacheFile(username, 'profile'));
		profileImage = proxyInstagramImage('profile', username);
	} catch {
		if (username === BARCA_INSTAGRAM_USER) {
			try {
				await readFile(path.join(CACHE_DIR, 'profile.jpg'));
				profileImage = proxyInstagramImage('profile', username);
			} catch {
				profileImage = '';
			}
		}
	}

	const fallbackFollowers = username === MASIA_INSTAGRAM_USER ? '6M+' : '148M';
	const cachedPosts = (data?.posts ?? [])
		.filter((post) => post.cached !== false)
		.map((post) => ({
			id: post.id,
			url: post.url,
			caption: post.caption,
			image: proxyInstagramImage(post.id, username),
		}));

	let posts = cachedPosts;
	let source = `Instagram — @${username} (public previews)`;
	let followersLabel = data?.followersLabel ?? (data ? undefined : fallbackFollowers);
	let postsLabel = data?.postsLabel;

	if (posts.length === 0) {
		const lite = await fetchInstagramLite(username);
		if (lite.posts.length > 0) {
			posts = lite.posts.map((post) => ({
				id: post.id,
				url: post.url,
				caption: post.caption,
				image: proxyInstagramRemote(post.image),
			}));
			source = `Instagram — @${username} (live public previews)`;
			followersLabel = lite.followersLabel || followersLabel;
			postsLabel = lite.postsLabel || postsLabel;
			if (!profileImage && lite.profileImage) {
				profileImage = proxyInstagramRemote(lite.profileImage);
			}
		}
	}

	return {
		username,
		profileUrl: `https://www.instagram.com/${username}/`,
		profileImage,
		followersLabel,
		postsLabel,
		posts,
		fetchedAt: new Date().toISOString(),
		source,
	};
}

const IG_CDN_HOST_RE = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com)$/i;

function isAllowedInstagramCdn(urlStr: string) {
	try {
		const u = new URL(urlStr);
		return u.protocol === 'https:' && IG_CDN_HOST_RE.test(u.hostname);
	} catch {
		return false;
	}
}

function proxyInstagramRemote(imageUrl: string) {
	return `/api/social/instagram/remote?url=${encodeURIComponent(imageUrl)}`;
}

async function fetchTextWithTimeout(url: string, timeoutMs = 8_000): Promise<string | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml',
				'Accept-Language': 'en-US,en;q=0.9',
			},
		});
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** Serverless-friendly Instagram previews via public OG tags (no Python). */
async function fetchInstagramLite(username: string): Promise<{
	followersLabel: string;
	postsLabel: string;
	profileImage: string;
	posts: Array<{ id: string; url: string; caption: string; image: string }>;
}> {
	const empty = { followersLabel: '', postsLabel: '', profileImage: '', posts: [] as Array<{ id: string; url: string; caption: string; image: string }> };
	const profileHtml = await fetchTextWithTimeout(`https://www.instagram.com/${username}/`);
	if (!profileHtml) return empty;

	const ogDesc = profileHtml.match(/property="og:description" content="([^"]+)"/i)?.[1] ?? '';
	const desc = ogDesc.replace(/&#064;/g, '@');
	const followersLabel = desc.match(/([\d,.]+[KMB]?)\s+Followers/i)?.[1] ?? '';
	const postsLabel = desc.match(/([\d,.]+[KMB]?)\s+Posts/i)?.[1] ?? '';
	const profileImage = profileHtml.match(/property="og:image" content="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&') ?? '';

	const codes = [...new Set([...profileHtml.matchAll(/\/p\/([A-Za-z0-9_-]{11})/g)].map((m) => m[1]!))].slice(0, 9);
	const posts: Array<{ id: string; url: string; caption: string; image: string }> = [];

	for (const code of codes) {
		const html = await fetchTextWithTimeout(`https://www.instagram.com/p/${code}/`, 6_000);
		if (!html) continue;
		const image = html.match(/property="og:image" content="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&');
		if (!image || !isAllowedInstagramCdn(image)) continue;
		let caption = html.match(/property="og:description" content="([^"]+)"/i)?.[1] ?? '';
		caption = caption
			.replace(/&#064;/g, '@')
			.replace(/^[\d,.]+[KMB]?\s+likes,\s+[\d,.]+[KMB]?\s+comments\s+-\s+[^:]+:\s*/i, '')
			.trim();
		posts.push({
			id: code,
			url: `https://www.instagram.com/p/${code}/`,
			caption: caption.slice(0, 160),
			image,
		});
	}

	return { followersLabel, postsLabel, profileImage, posts };
}

export async function streamInstagramImage(
	id: string,
	rawUser?: string | null,
): Promise<{ body: Buffer; contentType: string } | null> {
	const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
	const username = sanitizeInstagramUser(rawUser);
	const paths = [instagramCacheFile(username, safeId)];
	if (username === BARCA_INSTAGRAM_USER) {
		paths.push(path.join(CACHE_DIR, `${safeId}.jpg`));
	}
	for (const filePath of paths) {
		try {
			const body = await readFile(filePath);
			return { body, contentType: 'image/jpeg' };
		} catch {
			/* try next path */
		}
	}
	return null;
}

export async function streamInstagramRemote(
	rawUrl: string | null,
): Promise<{ body: Buffer; contentType: string } | null> {
	if (!rawUrl || !isAllowedInstagramCdn(rawUrl)) return null;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const res = await fetch(rawUrl, {
			signal: controller.signal,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
				Referer: 'https://www.instagram.com/',
				Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
			},
		});
		if (!res.ok) return null;
		const contentType = res.headers.get('content-type') || 'image/jpeg';
		if (!contentType.startsWith('image/')) return null;
		const body = Buffer.from(await res.arrayBuffer());
		if (body.length < 512) return null;
		return { body, contentType };
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

export async function fetchBarcaXFeed() {
	const [timeline, profile] = await Promise.all([
		fetchTwitterTimeline(BARCA_X_HANDLE),
		fetchTwitterProfile(BARCA_X_HANDLE),
	]);

	return {
		handle: BARCA_X_HANDLE,
		profileUrl: `https://x.com/${BARCA_X_HANDLE}`,
		profile,
		items: timeline.items.map((item) => ({
			title: item.title,
			link: item.link,
			pubDate: item.pubDate,
			source: item.source,
			text: item.text,
			media: item.media,
		})),
		note: timeline.note,
		fetchedAt: new Date().toISOString(),
		source: `@${BARCA_X_HANDLE} on X — api.fxtwitter.com`,
	};
}

function formatFollowers(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
	return String(n);
}
