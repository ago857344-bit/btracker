import { browser } from '$app/environment';
import { googleOAuthConfigured, initiateGoogleOAuth, handleGoogleCallback, type GoogleUser, type GoogleTokens } from '$lib/services/google-oauth';
import { getSession, setSession, clearSession, getCurrentUser, isSessionConfigured } from '$lib/services/session';
import { derived, get, writable } from 'svelte/store';

export interface AuthUser { id: string; email: string; name: string; avatar: string | null }
export type SyncStatus = 'off' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';

export const authConfigured = writable(googleOAuthConfigured());
export const authReady = writable(false);
export const currentUser = writable<AuthUser | null>(null);
export const syncStatus = writable<SyncStatus>(googleOAuthConfigured() ? 'idle' : 'off');

// Load user from session on initialization
if (browser) {
	const sessionUser = getCurrentUser();
	if (sessionUser) {
		currentUser.set({
			id: sessionUser.id,
			email: sessionUser.email,
			name: sessionUser.name,
			avatar: sessionUser.picture
		});
	}
	authReady.set(true);
}

export const initials = derived(currentUser, ($user) =>
	$user ? $user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''
);

let handledUserId: string | null = null;

/**
 * Begin listening for auth changes. `onSignIn` runs once per distinct user (pull/migrate),
 * `onSignOut` runs when a session ends. No-ops in local-only mode.
 */
export function initAuth(onSignIn: (userId: string) => Promise<void>, onSignOut: () => void) {
	if (!browser) return;
	
	// Check for existing session
	const sessionUser = getCurrentUser();
	if (sessionUser) {
		const id = sessionUser.id;
		if (id && id !== handledUserId) { 
			handledUserId = id; 
			void onSignIn(id); 
		}
	}
	
	authReady.set(true);
}

export function teardownAuth() { 
	handledUserId = null; 
}

export async function signInWithGoogle() {
	if (!browser || !googleOAuthConfigured()) {
		throw new Error('Google OAuth is not configured');
	}
	
	try {
		initiateGoogleOAuth();
	} catch (error) {
		console.error('Google sign-in error:', error);
		throw error;
	}
}

/** Handle Google OAuth callback - call this from the callback route */
export async function handleAuthCallback(code: string, state: string): Promise<void> {
	if (!browser) return;
	
	try {
		const { user, tokens } = await handleGoogleCallback(code, state);
		
		// Store session
		setSession(user, tokens);
		
		// Update auth store
		currentUser.set({
			id: user.id,
			email: user.email,
			name: user.name,
			avatar: user.picture
		});
		
		// Trigger sign-in callback
		if (typeof handledUserId === 'string' && handledUserId !== user.id) {
			handledUserId = user.id;
		}
	} catch (error) {
		console.error('Auth callback error:', error);
		throw error;
	}
}

/** Password sign-in - Not implemented with direct Google OAuth */
export async function signInWithEmail(email: string, password: string) {
	throw new Error('Email/password sign-in is not available with direct Google OAuth. Use Google sign-in instead.');
}

/**
 * Password sign-up - Not implemented with direct Google OAuth
 */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<'confirmed' | 'confirm-email'> {
	throw new Error('Email/password sign-up is not available with direct Google OAuth. Use Google sign-in instead.');
}

export async function signOut() {
	if (!browser) return;
	
	clearSession();
	currentUser.set(null);
	handledUserId = null;
}

export const currentUserId = () => get(currentUser)?.id ?? null;
