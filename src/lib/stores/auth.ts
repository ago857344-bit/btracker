import { browser } from '$app/environment';
import { getSupabase, supabaseConfigured } from '$lib/services/supabase';
import type { Session } from '@supabase/supabase-js';
import { derived, get, writable } from 'svelte/store';

export interface AuthUser { id: string; email: string; name: string; avatar: string | null }
export type SyncStatus = 'off' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';

export const authConfigured = writable(false);
export const authReady = writable(false);
/** True once supabase-js has restored (or ruled out) a persisted session. */
export const sessionResolved = writable(false);
export const currentUser = writable<AuthUser | null>(null);
export const syncStatus = writable<SyncStatus>('off');
export const hasSkippedLogin = writable(false);

const SKIP_LOGIN_KEY = 'btracker:skip-login';

type SignInHandler = (userId: string) => Promise<void> | void;

let onSignIn: SignInHandler | null = null;
let onSignOut: (() => void) | null = null;
let unsubscribeAuthState: (() => void) | null = null;

/** Map a Supabase session onto the app's user shape (profile lives in user_metadata for Google). */
function userFromSession(session: Session | null): AuthUser | null {
	const user = session?.user;
	if (!user) return null;
	const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
	const email = typeof user.email === 'string' ? user.email : '';
	const name =
		(typeof meta.full_name === 'string' && meta.full_name) ||
		(typeof meta.name === 'string' && meta.name) ||
		email.split('@')[0] ||
		'Student';
	const avatar =
		(typeof meta.avatar_url === 'string' && meta.avatar_url) ||
		(typeof meta.picture === 'string' && meta.picture) ||
		null;
	return { id: user.id, email, name, avatar };
}

if (browser) {
	authConfigured.set(supabaseConfigured);
	syncStatus.set(supabaseConfigured ? 'idle' : 'off');
	authReady.set(true);
	if (!supabaseConfigured) sessionResolved.set(true);

	// Guests should survive a reload without re-skipping, but only for this tab session.
	try {
		hasSkippedLogin.set(sessionStorage.getItem(SKIP_LOGIN_KEY) === '1');
	} catch {}
	hasSkippedLogin.subscribe((skipped) => {
		try {
			if (skipped) sessionStorage.setItem(SKIP_LOGIN_KEY, '1');
			else sessionStorage.removeItem(SKIP_LOGIN_KEY);
		} catch {}
	});
}

export const initials = derived(currentUser, ($user) =>
	$user ? $user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''
);

export function initAuth(signIn: SignInHandler, signOut: () => void) {
	if (!browser) return;
	const sb = getSupabase();
	if (!sb) return;
	onSignIn = signIn;
	onSignOut = signOut;

	// Restore a persisted session with safety timeout so page never hangs on slow network
	const sessionPromise = sb.auth.getSession();
	const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
		setTimeout(() => resolve({ data: { session: null } }), 1000)
	);

	void Promise.race([sessionPromise, timeoutPromise])
		.then(({ data }) => {
			const user = userFromSession(data?.session);
			if (user) {
				hasSkippedLogin.set(false);
				currentUser.set(user);
				void signIn(user.id);
			}
		})
		.catch(() => {})
		.finally(() => sessionResolved.set(true));

	if (!unsubscribeAuthState) {
		const { data } = sb.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_OUT') {
				hasSkippedLogin.set(false);
				currentUser.set(null);
				signOut();
				return;
			}
			if (!session) return;
			const user = userFromSession(session);
			if (!user) return;
			hasSkippedLogin.set(false);
			const isNewUser = get(currentUser)?.id !== user.id;
			currentUser.set(user);
			// Only notify the sync layer for genuine sign-ins, not background token refreshes.
			if (isNewUser && event !== 'TOKEN_REFRESHED') void signIn(user.id);
		});
		unsubscribeAuthState = () => data.subscription.unsubscribe();
	}
}

export function teardownAuth() {
	onSignIn = null;
	onSignOut = null;
	unsubscribeAuthState?.();
	unsubscribeAuthState = null;
}

export async function signInWithGoogle() {
	const sb = getSupabase();
	if (!sb) throw new Error('Google sign-in is not configured');
	const { error } = await sb.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo: `${window.location.origin}/auth/callback` }
	});
	if (error) throw new Error(error.message);
}

/** Runs on /auth/callback: exchanges the PKCE code for a Supabase session. */
export async function handleAuthCallback(code: string): Promise<void> {
	if (!browser) return;
	const sb = getSupabase();
	if (!sb) throw new Error('Sign-in is not configured');
	const { data, error } = await sb.auth.exchangeCodeForSession(code);
	if (error) throw new Error(error.message);
	hasSkippedLogin.set(false);
	currentUser.set(userFromSession(data.session));
}

export async function signOut() {
	if (!browser) return;
	const sb = getSupabase();
	if (sb) await sb.auth.signOut();
	hasSkippedLogin.set(false);
	currentUser.set(null);
	onSignOut?.();
}
