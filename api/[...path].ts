import { dispatchCulersApi } from '../culers-api-handlers.ts';

export const config = {
	runtime: 'nodejs',
	maxDuration: 60,
	memory: 1024,
};

/**
 * Vercel catch-all for /api/* — reuses the same dispatcher as local Vite middleware.
 */
export default async function handler(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const result = await dispatchCulersApi(url, { projectRoot: process.cwd() });

	if (!result) {
		return Response.json({ error: 'Not found' }, { status: 404 });
	}

	return new Response(result.body, {
		status: result.status,
		headers: result.headers,
	});
}
