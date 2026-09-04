import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function homeBackgroundsDir(root: string) {
	return path.join(root, 'public/backgrounds/home');
}

export function syncHomeBackgroundManifest(root: string): string[] {
	const dir = homeBackgroundsDir(root);
	fs.mkdirSync(dir, { recursive: true });

	const images = fs
		.readdirSync(dir)
		.filter((file) => IMAGE_EXT.has(path.extname(file).toLowerCase()))
		.sort((a, b) => a.localeCompare(b))
		.map((file) => `/backgrounds/home/${file}`);

	const manifestPath = path.join(dir, 'manifest.json');
	fs.writeFileSync(
		manifestPath,
		JSON.stringify({ images, updatedAt: new Date().toISOString() }, null, 2),
	);

	return images;
}

/** Scan public/backgrounds/home and write manifest.json for the slideshow. */
export function homeBackgroundsPlugin(): Plugin {
	let root = process.cwd();

	return {
		name: 'culers-home-backgrounds',
		configResolved(config) {
			root = config.root;
		},
		buildStart() {
			syncHomeBackgroundManifest(root);
		},
		configureServer(server) {
			const dir = homeBackgroundsDir(root);
			syncHomeBackgroundManifest(root);

			const refresh = () => {
				syncHomeBackgroundManifest(root);
				server.ws.send({ type: 'full-reload' });
			};

			server.watcher.add(dir);
			server.watcher.on('add', (file) => {
				if (file.startsWith(dir)) refresh();
			});
			server.watcher.on('unlink', (file) => {
				if (file.startsWith(dir)) refresh();
			});
		},
	};
}
