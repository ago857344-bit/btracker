import { browser } from '$app/environment';
import type { GoogleUser } from './google-oauth';

export interface UserSession {
	user: GoogleUser;
	expiresAt: number;
}

const SESSION_KEY = 'btracker_user_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let currentSession: UserSession | null = null;

export function getSession(): UserSession | null {
	if (!browser) return null;
	if (currentSession) return currentSession;

	const sessionStr = localStorage.getItem(SESSION_KEY);
	if (!sessionStr) return null;

	try {
		const parsed = JSON.parse(sessionStr) as UserSession;
		if (!parsed?.user?.id || Date.now() >= parsed.expiresAt) {
			clearSession();
			return null;
		}
		currentSession = parsed;
		return currentSession;
	} catch {
		clearSession();
		return null;
	}
}

export function setSession(user: GoogleUser): void {
	if (!browser) return;
	currentSession = { user, expiresAt: Date.now() + SESSION_TTL_MS };
	localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
}

export function clearSession(): void {
	if (!browser) return;
	currentSession = null;
	localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): GoogleUser | null {
	return getSession()?.user ?? null;
}
