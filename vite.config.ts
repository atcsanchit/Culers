import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { culersFetch } from './culers-fetch.ts';
import { homeBackgroundsPlugin } from './culers-home-backgrounds.ts';
import { stadiumBackgroundsPlugin } from './culers-stadium-plugin.ts';

export default defineConfig({
	plugins: [react(), homeBackgroundsPlugin(), stadiumBackgroundsPlugin(), culersFetch()],
	server: {
		port: 5175,
		strictPort: true,
	},
});
