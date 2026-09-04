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

function proxyInstagramImage(id: string) {
	return `/api/social/instagram/image?id=${encodeURIComponent(id)}`;
}

async function runInstagramScraper(): Promise<{
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
		const child = spawn(PYTHON, [INSTAGRAM_SCRIPT, BARCA_INSTAGRAM_USER], { cwd: ROOT });
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
	const data = await runInstagramScraper();
	const profilePath = path.join(CACHE_DIR, 'profile.jpg');
	let profileImage = '';
	try {
		await readFile(profilePath);
		profileImage = proxyInstagramImage('profile');
	} catch {
		profileImage = '';
	}

	return {
		username: BARCA_INSTAGRAM_USER,
		profileUrl: `https://www.instagram.com/${BARCA_INSTAGRAM_USER}/`,
		profileImage,
		followersLabel: data?.followersLabel ?? '148M',
		postsLabel: data?.postsLabel,
		posts: (data?.posts ?? [])
			.filter((post) => post.cached !== false)
			.map((post) => ({
				id: post.id,
				url: post.url,
				caption: post.caption,
				image: proxyInstagramImage(post.id),
			})),
		fetchedAt: new Date().toISOString(),
		source: 'Instagram — @fcbarcelona (public previews)',
	};
}

export async function streamInstagramImage(id: string): Promise<{ body: Buffer; contentType: string } | null> {
	const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
	const filePath = path.join(CACHE_DIR, `${safeId}.jpg`);
	try {
		const body = await readFile(filePath);
		return { body, contentType: 'image/jpeg' };
	} catch {
		return null;
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
