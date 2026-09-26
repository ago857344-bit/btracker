import { getSupabase } from '$lib/services/supabase';
import type { TrackerState } from '$lib/types/tracker';

/** Fetch the signed-in user's saved state, or null when they have none yet. */
export async function pullState(userId: string): Promise<TrackerState | null> {
	const sb = getSupabase();
	if (!sb) return null;
	const { data, error } = await sb.from('tracker_state').select('data').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	return (data?.data as TrackerState | undefined) ?? null;
}

/** Upsert the user's state to the cloud. */
export async function pushState(userId: string, state: TrackerState): Promise<void> {
	const sb = getSupabase();
	if (!sb) return;
	const { error } = await sb.from('tracker_state').upsert(
		{ user_id: userId, data: state, updated_at: new Date().toISOString() },
		{ onConflict: 'user_id' }
	);
	if (error) throw error;
}
