import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { culersFetch } from './culers-fetch.ts';
import { homeBackgroundsPlugin } from './culers-home-backgrounds.ts';
import { stadiumBackgroundsPlugin } from './culers-stadium-plugin.ts';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react(), homeBackgroundsPlugin(), stadiumBackgroundsPlugin(), culersFetch()],
	server: {
		port: 5175,
		strictPort: true,
	},
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(root, 'index.html'),
				museum: path.resolve(root, 'museum.html'),
			},
		},
	},
});
