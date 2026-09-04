import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { syncStadiumPhotos } from './culers-stadium-sync.ts';

/** Download / refresh stadium photos under public/backgrounds/stadium/ on dev & build. */
export function stadiumBackgroundsPlugin(): Plugin {
	let root = process.cwd();

	return {
		name: 'culers-stadium-backgrounds',
		configResolved(config) {
			root = config.root;
		},
		async buildStart() {
			await syncStadiumPhotos(root);
		},
		configureServer(server) {
			const dir = path.join(root, 'public/backgrounds/stadium');
			fs.mkdirSync(dir, { recursive: true });

			const refresh = () => {
				void syncStadiumPhotos(root).then(() => {
					server.ws.send({ type: 'full-reload' });
				});
			};

			void syncStadiumPhotos(root);
			server.watcher.add(path.join(dir, 'venues'));
			server.watcher.add(path.join(dir, 'fixtures'));
			server.watcher.on('add', (file) => {
				if (file.includes('/backgrounds/stadium/')) refresh();
			});
			server.watcher.on('unlink', (file) => {
				if (file.includes('/backgrounds/stadium/')) refresh();
			});
		},
	};
}
