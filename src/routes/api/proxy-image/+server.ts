import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function isPrivateIpOrHost(hostname: string): boolean {
	const raw = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
	if (!raw) return true;

	if (
		raw === 'localhost' ||
		raw === '127.0.0.1' ||
		raw === '::1' ||
		raw === '0:0:0:0:0:0:0:1' ||
		raw === '::' ||
		raw === '0.0.0.0' ||
		raw === 'metadata.google.internal' ||
		raw === 'metadata'
	) {
		return true;
	}
	if (raw.endsWith('.local') || raw.endsWith('.internal') || raw.endsWith('.localhost') || raw.endsWith('.lan')) {
		return true;
	}

	// Block IPv6 private/local ranges: loopback, unique local (fc00::/7 -> fc.. or fd..), link-local (fe80::/10), IPv4-mapped (::ffff:...)
	if (raw.includes(':')) {
		if (
			raw.startsWith('fc') ||
			raw.startsWith('fd') ||
			raw.startsWith('fe8') ||
			raw.startsWith('fe9') ||
			raw.startsWith('fea') ||
			raw.startsWith('feb') ||
			raw.startsWith('::ffff:') ||
			raw.startsWith('0:0:0:0:0:ffff:')
		) {
			return true;
		}
		return true; // Disallow raw IPv6 literals on image proxy
	}

	// Reject single-integer (dword), hex (0x...), or octal (0177...) IPv4 encodings
	if (/^\d+$/.test(raw) || /(?:^|\.)0x[0-9a-f]+/i.test(raw) || /(?:^|\.)0\d+/.test(raw)) {
		return true;
	}

	// Check standard dotted IPv4 private/reserved ranges
	const parts = raw.split('.');
	if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
		const nums = parts.map(Number);
		if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return true;
		const [a, b] = nums;
		if (a === 0) return true; // 0.0.0.0/8
		if (a === 10) return true; // 10.0.0.0/8
		if (a === 127) return true; // 127.0.0.0/8
		if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
		if (a === 192 && b === 168) return true; // 192.168.0.0/16
		if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
		if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
		if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
		if (a >= 224) return true; // Multicast & reserved
	}

	return false;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_REDIRECTS = 3;

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url');
	if (!targetUrl) throw error(400, 'URL parameter is required');

	let currentUrl: URL;
	try {
		currentUrl = new URL(targetUrl);
	} catch {
		throw error(400, 'Invalid URL format');
	}

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15_000);

		let response: Response | null = null;
		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			// 1. Enforce HTTPS only on every hop
			if (currentUrl.protocol !== 'https:') {
				clearTimeout(timeout);
				throw error(400, 'Only secure HTTPS image URLs are supported');
			}

			// 2. Block private/internal addresses on every hop
			if (isPrivateIpOrHost(currentUrl.hostname)) {
				clearTimeout(timeout);
				throw error(403, 'Access to private or local network resources is forbidden');
			}

			response = await fetch(currentUrl.toString(), {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
				},
				redirect: 'manual',
				signal: controller.signal
			});

			if (response.status >= 300 && response.status < 400) {
				const location = response.headers.get('location');
				if (!location) {
					clearTimeout(timeout);
					throw error(502, 'Upstream redirect missing Location header');
				}
				if (hop === MAX_REDIRECTS) {
					clearTimeout(timeout);
					throw error(502, 'Too many redirects');
				}
				currentUrl = new URL(location, currentUrl);
				continue;
			}
			break;
		}

		clearTimeout(timeout);

		if (!response || !response.ok) {
			const status = response?.status || 502;
			throw error(status, `Upstream image server returned HTTP ${status}`);
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

		// 5. Stream body with strict byte cap so an omitted/spoofed Content-Length cannot exhaust memory
		const reader = response.body?.getReader();
		if (!reader) {
			throw error(502, 'Upstream image body is empty');
		}
		const chunks: Uint8Array[] = [];
		let totalBytes = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				totalBytes += value.byteLength;
				if (totalBytes > MAX_IMAGE_BYTES) {
					await reader.cancel();
					throw error(413, 'Image size exceeds maximum allowed limit (15MB)');
				}
				chunks.push(value);
			}
		}

		const combined = new Uint8Array(totalBytes);
		let offset = 0;
		for (const chunk of chunks) {
			combined.set(chunk, offset);
			offset += chunk.byteLength;
		}

		const responseHeaders: Record<string, string> = {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'X-Content-Type-Options': 'nosniff'
		};

		// Prevent stored/reflected XSS execution on the primary app origin if an SVG or XML media is proxied
		if (contentType.includes('svg') || contentType.includes('xml')) {
			responseHeaders['Content-Security-Policy'] = "default-src 'none'; sandbox";
			responseHeaders['Content-Disposition'] = 'inline; filename="image.svg"';
		}

		return new Response(combined, {
			headers: responseHeaders
		});
	} catch (e: any) {
		if (e?.status) throw e;
		console.error('Proxy fetch failed:', e);
		throw error(500, `Failed to proxy image: ${e?.message || 'Network error'}`);
	}
};
