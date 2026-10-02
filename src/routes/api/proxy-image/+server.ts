import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url');
	if (!targetUrl) throw error(400, 'URL required');

	try {
		const response = await fetch(targetUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});
		
		if (!response.ok) {
			throw error(response.status, 'Upstream error');
		}

		const buffer = await response.arrayBuffer();
		
		return new Response(buffer, {
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
				'Cache-Control': 'public, max-age=31536000',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS'
			}
		});
	} catch (e) {
		console.error('Proxy fetch failed:', e);
		throw error(500, 'Failed to fetch image');
	}
};
