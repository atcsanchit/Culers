import type { Plugin } from 'vite';

/** Thin Vite plugin — API handlers are dynamically imported so backend edits don't restart Vite. */
export function culersFetch(): Plugin {
	return {
		name: 'culers-fetch',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith('/api/')) return next();
				const { handleCulersApiRequest } = await import('./culers-api-handlers.ts');
				const handled = await handleCulersApiRequest(req, res, server);
				if (!handled) next();
			});
		},
	};
}
