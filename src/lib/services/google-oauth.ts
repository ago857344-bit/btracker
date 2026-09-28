import { browser } from '$app/environment';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_KEY = 'google_oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export interface GoogleUser {
	id: string;
	email: string;
	name: string;
	picture: string | null;
	given_name: string;
	family_name: string;
}

interface StoredState {
	state: string;
	timestamp: number;
}

/** True when the public client id is present. The client secret never reaches the browser. */
export function googleOAuthConfigured(): boolean {
	return GOOGLE_CLIENT_ID.length > 0;
}

export function initiateGoogleOAuth() {
	if (!browser || !googleOAuthConfigured()) {
		throw new Error('Google sign-in is not configured');
	}

	const state = generateRandomString();
	const stored: StoredState = { state, timestamp: Date.now() };
	sessionStorage.setItem(STATE_KEY, JSON.stringify(stored));

	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: `${window.location.origin}/auth/callback`,
		response_type: 'code',
		scope: 'openid email profile',
		state
	});

	window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Verify the OAuth state, then let the server exchange the code for the signed-in profile. */
export async function handleGoogleCallback(code: string, state: string): Promise<GoogleUser> {
	const storedRaw = sessionStorage.getItem(STATE_KEY);
	sessionStorage.removeItem(STATE_KEY);
	if (!storedRaw) throw new Error('Sign-in session not found. Please try signing in again.');

	let stored: StoredState;
	try {
		stored = JSON.parse(storedRaw) as StoredState;
	} catch {
		throw new Error('Sign-in session was corrupted. Please try signing in again.');
	}
	if (state !== stored.state || Date.now() - stored.timestamp > STATE_MAX_AGE_MS) {
		throw new Error('Sign-in verification failed. Please try signing in again.');
	}

	const response = await fetch('/auth/google/exchange', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/auth/callback` })
	});
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const detail = typeof payload === 'object' && payload !== null
			? (payload as { error?: unknown; message?: unknown })
			: null;
		const message = typeof detail?.error === 'string' ? detail.error
			: typeof detail?.message === 'string' ? detail.message
			: 'Sign-in failed. Please try again.';
		throw new Error(message);
	}
	if (typeof payload !== 'object' || payload === null || !('user' in payload)) {
		throw new Error('Sign-in failed. Please try again.');
	}
	return (payload as { user: GoogleUser }).user;
}

function generateRandomString(): string {
	const array = new Uint32Array(2);
	crypto.getRandomValues(array);
	return array.join('');
}
