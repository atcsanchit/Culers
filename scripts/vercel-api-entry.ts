import { dispatchCulersApi } from '../culers-api-handlers.ts';

export const config = {
	runtime: 'nodejs',
	maxDuration: 60,
	memory: 1024,
};

/**
 * Source entry for the Vercel /api catch-all.
 * Bundled to api/[...path].js so Node does not try to import raw .ts files.
 */
export default async function handler(req: Request): Promise<Response> {
	try {
		const url = new URL(req.url);
		const result = await dispatchCulersApi(url, { projectRoot: process.cwd() });

		if (!result) {
			return Response.json({ error: 'Not found' }, { status: 404 });
		}

		return new Response(result.body, {
			status: result.status,
			headers: result.headers,
		});
	} catch (err) {
		return Response.json({ error: String(err) }, { status: 500 });
	}
}
