import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function isPrivateIpOrHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') return true;
	if (h.endsWith('.local') || h.endsWith('.internal')) return true;

	// Check IPv4 private ranges
	const parts = h.split('.').map(Number);
	if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
		if (parts[0] === 10) return true; // 10.0.0.0/8
		if (parts[0] === 127) return true; // 127.0.0.0/8
		if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
		if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
		if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
	}

	return false;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url');
	if (!targetUrl) throw error(400, 'URL parameter is required');

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(targetUrl);
	} catch {
		throw error(400, 'Invalid URL format');
	}

	// 1. Enforce HTTPS only
	if (parsedUrl.protocol !== 'https:') {
		throw error(400, 'Only secure HTTPS image URLs are supported');
	}

	// 2. Block private/internal addresses
	if (isPrivateIpOrHost(parsedUrl.hostname)) {
		throw error(403, 'Access to private or local network resources is forbidden');
	}

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15_000);

		const response = await fetch(parsedUrl.toString(), {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
			},
			signal: controller.signal
		});
		clearTimeout(timeout);

		if (!response.ok) {
			throw error(response.status, `Upstream image server returned HTTP ${response.status}`);
		}

		// 3. Verify Content-Type is an image
		const contentType = (response.headers.get('content-type') || '').toLowerCase().trim();
		if (!contentType.startsWith('image/')) {
			throw error(415, `Target URL returned non-image content type: ${contentType || 'unknown'}`);
		}

		// 4. Check Content-Length if present
		const contentLengthStr = response.headers.get('content-length');
		if (contentLengthStr) {
			const len = parseInt(contentLengthStr, 10);
			if (!isNaN(len) && len > MAX_IMAGE_BYTES) {
				throw error(413, 'Image size exceeds maximum allowed limit (15MB)');
			}
		}

		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > MAX_IMAGE_BYTES) {
			throw error(413, 'Image size exceeds maximum allowed limit (15MB)');
		}

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS'
			}
		});
	} catch (e: any) {
		if (e?.status) throw e;
		console.error('Proxy fetch failed:', e);
		throw error(500, `Failed to proxy image: ${e?.message || 'Network error'}`);
	}
};
