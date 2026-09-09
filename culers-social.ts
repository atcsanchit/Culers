import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTwitterProfile, fetchTwitterTimeline } from './culers-twitter.ts';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(ROOT, '.venv-sofascore', 'bin', 'python');
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
	if (IS_SERVERLESS) return null;

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
		note: instagram ? undefined : 'Instagram stats loaded with fallback — run npm run setup:sofascore for live scrape.',
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

	return {
		username,
		profileUrl: `https://www.instagram.com/${username}/`,
		profileImage,
		followersLabel: data?.followersLabel ?? (data ? undefined : fallbackFollowers),
		postsLabel: data?.postsLabel,
		posts: (data?.posts ?? [])
			.filter((post) => post.cached !== false)
			.map((post) => ({
				id: post.id,
				url: post.url,
				caption: post.caption,
				image: proxyInstagramImage(post.id, username),
			})),
		fetchedAt: new Date().toISOString(),
		source: `Instagram — @${username} (public previews)`,
	};
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
