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

/**
 * CRDT-style deep union merge between local state and cloud state.
 * Never drops custom exercises or solved questions from either side.
 */
export function mergeTrackerStates(local: TrackerState, cloud: TrackerState): TrackerState {
	const base = normalizeState(local);
	const remote = normalizeState(cloud);

	// 1. Question bitmasks: Bitwise OR union (local | remote)
	const mergedD: Record<string, number[]> = { ...base.d };
	for (const [key, remArr] of Object.entries(remote.d || {})) {
		const locArr = mergedD[key];
		if (!locArr) {
			mergedD[key] = [...remArr];
		} else {
			const maxLen = Math.max(locArr.length, remArr.length);
			const mergedArr = new Array<number>(maxLen).fill(0);
			for (let i = 0; i < maxLen; i++) {
				mergedArr[i] = (locArr[i] || 0) | (remArr[i] || 0);
			}
			mergedD[key] = mergedArr;
		}
	}

	// 2. Custom exercises: Union by code, max count for counts
	const mergedExs: Record<string, { code: string; name: string }[]> = { ...(base.x?.exs || {}) };
	for (const [chKey, remList] of Object.entries(remote.x?.exs || {})) {
		if (!mergedExs[chKey]) {
			mergedExs[chKey] = [...remList];
		} else {
			const codes = new Set(mergedExs[chKey].map((e) => e.code));
			for (const ex of remList) {
				if (!codes.has(ex.code)) {
					mergedExs[chKey].push(ex);
					codes.add(ex.code);
				}
			}
		}
	}

	const mergedCnt: Record<string, number> = { ...(base.x?.cnt || {}) };
	for (const [cKey, count] of Object.entries(remote.x?.cnt || {})) {
		mergedCnt[cKey] = Math.max(mergedCnt[cKey] || 0, count || 0);
	}

	// 3. Stats: Max solved questions per day per subject
	const mergedStat: Record<string, Partial<Record<string, number>>> = { ...(base.stat || {}) };
	for (const [day, remSubjects] of Object.entries(remote.stat || {})) {
		if (!remSubjects) continue;
		if (!mergedStat[day]) {
			mergedStat[day] = { ...remSubjects };
		} else {
			for (const [sub, count] of Object.entries(remSubjects)) {
				mergedStat[day]![sub] = Math.max(Number(mergedStat[day]![sub]) || 0, Number(count) || 0);
			}
		}
	}

	// 4. Log: Union sessions (dedup by epoch and subject)
	const mergedLog = [...(base.log || [])];
	const seenSessions = new Set(mergedLog.map((s) => `${s[0]}-${s[7]}`));
	for (const sess of remote.log || []) {
		const k = `${sess[0]}-${sess[7]}`;
		if (!seenSessions.has(k)) {
			mergedLog.push(sess);
			seenSessions.add(k);
		}
	}

	// 5. Todos: Union by id
	const mergedTodos = [...(base.todos || [])];
	const todoMap = new Map(mergedTodos.map((t) => [t.id, t]));
	for (const remTodo of remote.todos || []) {
		const loc = todoMap.get(remTodo.id);
		if (!loc) {
			mergedTodos.push(remTodo);
			todoMap.set(remTodo.id, remTodo);
		} else if (remTodo.done && !loc.done) {
			loc.done = true;
		}
	}

	// 6. Mocks: Union by id
	const mergedMocks = [...(base.mocks || [])];
	const mockIds = new Set(mergedMocks.map((m) => m.id));
	for (const m of remote.mocks || []) {
		if (!mockIds.has(m.id)) {
			mergedMocks.push(m);
			mockIds.add(m.id);
		}
	}

	// 7. Gamification: Max values
	const mergedGamification = {
		xp: Math.max(base.gamification?.xp || 0, remote.gamification?.xp || 0),
		level: Math.max(base.gamification?.level || 1, remote.gamification?.level || 1),
		elo: {
			P: Math.max(base.gamification?.elo?.P || 300, remote.gamification?.elo?.P || 300),
			C: Math.max(base.gamification?.elo?.C || 300, remote.gamification?.elo?.C || 300),
			M: Math.max(base.gamification?.elo?.M || 300, remote.gamification?.elo?.M || 300)
		},
		v3_elo: true
	};

	const cloudIsNewer = (remote.savedAt ? new Date(remote.savedAt).getTime() : 0) >= (base.savedAt ? new Date(base.savedAt).getTime() : 0);
	const prefSource = cloudIsNewer ? remote : base;

	const merged: TrackerState = {
		...prefSource,
		d: mergedD,
		x: {
			...prefSource.x,
			exs: mergedExs,
			cnt: mergedCnt
		},
		stat: mergedStat,
		log: mergedLog,
		todos: mergedTodos,
		mocks: mergedMocks,
		gamification: mergedGamification,
		savedAt: new Date().toISOString()
	};

	return normalizeState(merged);
}

async function onSignIn(userId: string) {
	activeUserId = userId;
	syncStatus.set('pulling');
	try {
		const cloud = await pullState(userId);
		const local = get(tracker);
		
		if (cloud) {
			// Deep union merge local and cloud to ensure no custom exercises or question progress is lost across devices
			const merged = mergeTrackerStates(local, cloud);
			replaceTracker(merged, true);
			await pushState(userId, merged);
			syncStatus.set('synced');
		} else {
			// First login on this account: migrate the existing local data up so nothing is lost.
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
