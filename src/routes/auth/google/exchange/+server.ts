import { error, json } from '@sveltejs/kit';
import { GOOGLE_CLIENT_SECRET, VITE_GOOGLE_CLIENT_ID } from '$env/static/private';
import type { RequestHandler } from './$types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface GoogleTokenResponse {
	access_token: string;
	expires_in: number;
	[key: string]: unknown;
}

interface GoogleUser {
	id: string;
	email: string;
	name: string;
	picture: string | null;
	given_name: string;
	family_name: string;
}

/** Exchanges a Google OAuth code for the user's profile. The secret stays server-side. */
export const POST: RequestHandler = async ({ request }) => {
	const clientId = (VITE_GOOGLE_CLIENT_ID ?? '').trim();
	const clientSecret = (GOOGLE_CLIENT_SECRET ?? '').trim();
	if (!clientId || !clientSecret) {
		error(503, 'Google sign-in is not configured on the server. Add VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.');
	}

	let body: { code?: unknown; redirect_uri?: unknown };
	try {
		body = await request.json() as typeof body;
	} catch {
		error(400, 'Invalid request body.');
	}
	const code = typeof body.code === 'string' ? body.code : '';
	const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : '';
	if (!code || !redirectUri) error(400, 'Missing code or redirect_uri.');

	const tokenResponse = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});
	if (!tokenResponse.ok) {
		const detail = await tokenResponse.text().catch(() => '');
		console.error(`Google token exchange failed (${tokenResponse.status}): ${detail}`);
		error(502, 'Could not complete Google sign-in. Please try again.');
	}
	const tokens = await tokenResponse.json() as GoogleTokenResponse;

	const userResponse = await fetch(USERINFO_URL, {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});
	if (!userResponse.ok) {
		console.error(`Google userinfo failed (${userResponse.status}).`);
		error(502, 'Could not fetch your Google profile. Please try again.');
	}
	const user = await userResponse.json() as GoogleUser;

	return json({ user });
};
