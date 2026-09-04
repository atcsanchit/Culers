import { syncStadiumPhotos } from '../culers-stadium-sync.ts';

const manifest = await syncStadiumPhotos(process.cwd());
console.log(
	`Stadium sync done — ${Object.keys(manifest.venues).length} venues, ${Object.keys(manifest.fixtures).length} fixture overrides.`,
);
