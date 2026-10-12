import { getSupabase } from '$lib/services/supabase';
import type { TrackerState } from '$lib/types/tracker';

/** Strip heavy base64 data URLs (wallpapers) so Supabase PostgREST payload limit is never exceeded */
function sanitizeForCloud(state: TrackerState): TrackerState {
	const clone = structuredClone(state);
	if (clone.ui?.wallpaper && clone.ui.wallpaper.startsWith('data:')) {
		delete clone.ui.wallpaper;
	}
	if (Array.isArray(clone.ui?.wallpaperHistory)) {
		clone.ui.wallpaperHistory = clone.ui.wallpaperHistory.filter((w) => !w.startsWith('data:'));
	}
	return clone;
}

/** Fetch the signed-in user's saved state, or null when they have none yet. */
export async function pullState(userId: string): Promise<TrackerState | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data, error } = await sb.from('tracker_state').select('data').eq('user_id', userId).maybeSingle();
	if (error) {
		console.error('Supabase pullState error:', error);
		throw error;
	}
	return (data?.data as TrackerState | undefined) ?? null;
}

/** Upsert the user's state to the cloud. */
export async function pushState(userId: string, state: TrackerState): Promise<void> {
	const sb = getSupabase();
	if (!sb) return;
	const sanitized = sanitizeForCloud(state);
	const { error } = await sb.from('tracker_state').upsert(
		{ user_id: userId, data: sanitized, updated_at: new Date().toISOString() },
		{ onConflict: 'user_id' }
	);
	if (error) {
		console.error('Supabase pushState error:', error);
		throw error;
	}
}
