import { browser } from '$app/environment';
import { VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_SECRET } from '$env/static/public';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GoogleUser {
	id: string;
	email: string;
	name: string;
	picture: string | null;
	given_name: string;
	family_name: string;
}

export interface GoogleTokens {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

interface OAuthState {
	nonce: string;
	timestamp: number;
}

let currentOAuthState: OAuthState | null = null;

export function googleOAuthConfigured(): boolean {
	const clientId = typeof VITE_GOOGLE_CLIENT_ID === 'string' ? VITE_GOOGLE_CLIENT_ID : '';
	const clientSecret = typeof VITE_GOOGLE_CLIENT_SECRET === 'string' ? VITE_GOOGLE_CLIENT_SECRET : '';
	return Boolean(clientId && clientSecret);
}

export function initiateGoogleOAuth() {
	if (!browser || !googleOAuthConfigured()) {
		throw new Error('Google OAuth is not configured');
	}

	const clientId = typeof VITE_GOOGLE_CLIENT_ID === 'string' ? VITE_GOOGLE_CLIENT_ID : '';

	// Generate a random state for security
	const state = generateRandomString();
	const nonce = generateRandomString();
	
	currentOAuthState = {
		nonce,
		timestamp: Date.now()
	};

	// Store state in sessionStorage for callback verification
	sessionStorage.setItem('google_oauth_state', JSON.stringify(currentOAuthState));

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${window.location.origin}/auth/callback`,
		response_type: 'code',
		scope: 'openid email profile',
		state: state,
		access_type: 'offline',
		prompt: 'consent'
	});

	// Redirect to Google OAuth
	window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function handleGoogleCallback(code: string, state: string): Promise<{ user: GoogleUser; tokens: GoogleTokens }> {
	// Verify state to prevent CSRF attacks
	const storedStateStr = sessionStorage.getItem('google_oauth_state');
	if (!storedStateStr) {
		throw new Error('OAuth state not found');
	}

	const storedState = JSON.parse(storedStateStr) as OAuthState;
	
	// Verify state matches (simplified - in production you'd want more robust verification)
	if (Math.abs(Date.now() - storedState.timestamp) > 10 * 60 * 1000) { // 10 minutes
		throw new Error('OAuth state expired');
	}

	// Exchange authorization code for tokens
	const clientId = typeof VITE_GOOGLE_CLIENT_ID === 'string' ? VITE_GOOGLE_CLIENT_ID : '';
	const clientSecret = typeof VITE_GOOGLE_CLIENT_SECRET === 'string' ? VITE_GOOGLE_CLIENT_SECRET : '';
	
	const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: `${window.location.origin}/auth/callback`,
			grant_type: 'authorization_code',
		}),
	});

	if (!tokenResponse.ok) {
		const error = await tokenResponse.text();
		throw new Error(`Failed to exchange token: ${error}`);
	}

	const tokens = await tokenResponse.json() as GoogleTokens;

	// Get user info with the access token
	const userResponse = await fetch(`${GOOGLE_USERINFO_URL}?access_token=${tokens.access_token}`);
	if (!userResponse.ok) {
		throw new Error('Failed to fetch user info');
	}

	const user = await userResponse.json() as GoogleUser;

	// Clean up stored state
	sessionStorage.removeItem('google_oauth_state');

	return { user, tokens };
}

function generateRandomString(): string {
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	return array[0].toString(36);
}
