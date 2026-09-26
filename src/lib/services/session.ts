import { browser } from '$app/environment';
import type { GoogleUser, GoogleTokens } from './google-oauth';

export interface UserSession {
	user: GoogleUser;
	tokens: GoogleTokens;
	expiresAt: number;
}

const SESSION_KEY = 'btracker_user_session';
const SESSION_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

let currentSession: UserSession | null = null;

export function getSession(): UserSession | null {
	if (!browser) return null;
	
	if (currentSession) {
		return currentSession;
	}

	const sessionStr = localStorage.getItem(SESSION_KEY);
	if (!sessionStr) return null;

	try {
		currentSession = JSON.parse(sessionStr) as UserSession;
		
		// Check if session is expired
		if (Date.now() >= currentSession.expiresAt) {
			clearSession();
			return null;
		}
		
		return currentSession;
	} catch {
		clearSession();
		return null;
	}
}

export function setSession(user: GoogleUser, tokens: GoogleTokens): void {
	if (!browser) return;

	const expiresAt = Date.now() + (tokens.expires_in * 1000);
	
	currentSession = {
		user,
		tokens,
		expiresAt
	};

	localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
}

export function clearSession(): void {
	if (!browser) return;
	
	currentSession = null;
	localStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(): boolean {
	const session = getSession();
	if (!session) return true;
	
	return Date.now() >= session.expiresAt;
}

export function shouldRefreshSession(): boolean {
	const session = getSession();
	if (!session) return false;
	
	return Date.now() >= (session.expiresAt - SESSION_REFRESH_THRESHOLD);
}

export function getCurrentUser(): GoogleUser | null {
	const session = getSession();
	return session?.user || null;
}

export function isSessionConfigured(): boolean {
	return getSession() !== null;
}
