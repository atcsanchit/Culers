import { dispatchCulersApi } from '../culers-api-handlers.ts';

export const config = {
	runtime: 'nodejs',
	maxDuration: 60,
	memory: 1024,
};

/**
 * Vercel Web Handler (`fetch`-style).
 * A bare `export default async (req) => Response` is treated as the Node
 * `(req, res) => void` signature — returned Responses are ignored (→ 500).
 */
export default {
	async fetch(request: Request): Promise<Response> {
		try {
			const url = new URL(request.url);
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
	},
};
