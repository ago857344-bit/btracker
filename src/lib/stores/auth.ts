import { browser } from '$app/environment';
import {
	googleOAuthConfigured, initiateGoogleOAuth, handleGoogleCallback, type GoogleUser
} from '$lib/services/google-oauth';
import { clearSession, getCurrentUser, setSession } from '$lib/services/session';
import { derived, writable } from 'svelte/store';

export interface AuthUser { id: string; email: string; name: string; avatar: string | null }
export type SyncStatus = 'off' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';

export const authConfigured = writable(false);
export const authReady = writable(false);
export const currentUser = writable<AuthUser | null>(null);
export const syncStatus = writable<SyncStatus>('off');
export const hasSkippedLogin = writable(false);

type SignInHandler = (userId: string) => Promise<void> | void;

let onSignIn: SignInHandler | null = null;
let onSignOut: (() => void) | null = null;

function adoptUser(user: GoogleUser) {
	currentUser.set({ id: user.id, email: user.email, name: user.name, avatar: user.picture });
}

if (browser) {
	const configured = googleOAuthConfigured();
	authConfigured.set(configured);
	syncStatus.set(configured ? 'idle' : 'off');
	const sessionUser = getCurrentUser();
	if (sessionUser) adoptUser(sessionUser);
	authReady.set(true);
}

export const initials = derived(currentUser, ($user) =>
	$user ? $user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''
);

/**
 * Register the sync hooks. `signIn` runs for a session restored at boot so cloud
 * data can be pulled; it also runs after a fresh Google callback.
 */
export function initAuth(signIn: SignInHandler, signOut: () => void) {
	if (!browser) return;
	onSignIn = signIn;
	onSignOut = signOut;
	const sessionUser = getCurrentUser();
	if (sessionUser) void signIn(sessionUser.id);
}

export function teardownAuth() {
	onSignIn = null;
	onSignOut = null;
}

export async function signInWithGoogle() {
	if (!browser || !googleOAuthConfigured()) {
		throw new Error('Google sign-in is not configured');
	}
	initiateGoogleOAuth();
}

/** Runs on /auth/callback after Google redirects back with a valid code + state. */
export async function handleAuthCallback(code: string, state: string): Promise<void> {
	if (!browser) return;
	const user = await handleGoogleCallback(code, state);
	setSession(user);
	adoptUser(user);
	void onSignIn?.(user.id);
}

export async function signOut() {
	if (!browser) return;
	clearSession();
	currentUser.set(null);
	onSignOut?.();
}
