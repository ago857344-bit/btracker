import { browser } from '$app/environment';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.PUBLIC_SUPABASE_URL ?? '').trim();
const anonKey = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

/** True when both Supabase env vars are present, i.e. cloud auth/sync is enabled. */
export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Lazily create the browser Supabase client. Returns null in local-only mode or on the server. */
export function getSupabase(): SupabaseClient | null {
	if (!browser || !supabaseConfigured) return null;
	if (!client) {
		client = createClient(url, anonKey, {
			auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
		});
	}
	return client;
}
