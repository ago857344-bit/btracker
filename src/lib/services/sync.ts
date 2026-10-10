import { get } from 'svelte/store';
import { pullState, pushState } from '$lib/services/cloud';
import { normalizeState } from '$lib/services/hydrate';
import { supabaseConfigured } from '$lib/services/supabase';
import { authReady, initAuth, syncStatus, teardownAuth } from '$lib/stores/auth';
import { replaceTracker, setCloudSink, tracker } from '$lib/stores/tracker';
import type { TrackerState } from '$lib/types/tracker';

let activeUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

/** Debounced mirror of a local save up to the cloud, only while signed in. */
function schedulePush(state: TrackerState) {
	if (!activeUserId) return;
	clearTimeout(pushTimer);
	pushTimer = setTimeout(async () => {
		const userId = activeUserId;
		if (!userId) return;
		syncStatus.set('pushing');
		try { await pushState(userId, state); syncStatus.set('synced'); }
		catch (e) { console.error("Cloud push failed:", e); syncStatus.set('error'); }
	}, 800);
}

async function onSignIn(userId: string) {
	activeUserId = userId;
	syncStatus.set('pulling');
	try {
		const cloud = await pullState(userId);
		const local = get(tracker);
		
		if (cloud) {
			// Only let cloud win if it's actually newer than our local state.
			// This prevents wiping out local progress if a push failed right before a reload.
			const cloudTime = cloud.savedAt ? new Date(cloud.savedAt).getTime() : 0;
			const localTime = local.savedAt ? new Date(local.savedAt).getTime() : 0;
			
			if (cloudTime >= localTime) {
				replaceTracker(normalizeState(cloud), true);
				syncStatus.set('synced');
			} else {
				// Local is newer! Push local to cloud to heal the sync.
				await pushState(userId, local);
				syncStatus.set('synced');
			}
		} else {
			// First login on this account: migrate the existing local data up so nothing is lost.
			// Never seed the cloud with a never-saved (empty) state — the cloud-wins pull on the
			// device holding real data would otherwise wipe it.
			const local = get(tracker);
			if (local.savedAt) await pushState(userId, local);
			syncStatus.set('synced');
		}
	} catch (e) { console.error("Cloud pull failed:", e); syncStatus.set('error'); }
}

function onSignOut() {
	activeUserId = null;
	clearTimeout(pushTimer);
	syncStatus.set('idle');
}

/** Wire auth + cloud mirroring. Safe to call once from the root layout. */
export function startSync() {
	if (started) return;
	authReady.set(true);
	// Identity comes from Google OAuth; cloud sync additionally needs Supabase.
	if (!supabaseConfigured) {
		syncStatus.set('off');
		return;
	}
	started = true;
	setCloudSink(schedulePush);
	initAuth(onSignIn, onSignOut);
}

export function stopSync() {
	if (!started) return;
	started = false;
	setCloudSink(null);
	clearTimeout(pushTimer);
	activeUserId = null;
	teardownAuth();
}
