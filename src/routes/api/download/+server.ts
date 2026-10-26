import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';

export const GET: RequestHandler = async ({ url, request }) => {
	const osParam = url.searchParams.get('os')?.toLowerCase();
	const ua = request.headers.get('user-agent')?.toLowerCase() || '';

	let targetFile = 'BTracker-macOS.zip';
	let downloadName = 'BTracker-macOS.zip';

	if (osParam === 'win' || osParam === 'windows' || (!osParam && ua.includes('win'))) {
		targetFile = 'BTracker-Windows.zip';
		downloadName = 'BTracker-Windows.zip';
	} else {
		targetFile = 'BTracker-macOS.zip';
		downloadName = 'BTracker-macOS.zip';
	}

	const filePath = path.resolve('static/downloads', targetFile);
	if (!fs.existsSync(filePath)) {
		return new Response('Download file not found', { status: 404 });
	}

	const fileBuffer = fs.readFileSync(filePath);
	return new Response(fileBuffer, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${downloadName}"`,
			'Content-Length': fileBuffer.length.toString(),
			'Cache-Control': 'no-cache'
		}
	});
};
