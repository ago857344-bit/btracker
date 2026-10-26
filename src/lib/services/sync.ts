import { get } from 'svelte/store';
import { pullState, pushState } from '$lib/services/cloud';
import { normalizeState } from '$lib/services/hydrate';
import { supabaseConfigured } from '$lib/services/supabase';
import { authReady, initAuth, syncStatus, teardownAuth } from '$lib/stores/auth';
import { replaceTracker, setCloudSink, tracker } from '$lib/stores/tracker';
import { saveTrackerState } from '$lib/services/persistence';
import type { TrackerState, TodoItem, HomeworkItem } from '$lib/types/tracker';

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

	// 4b. Subject practice sessions: union by id so a newer device never drops
	// universal log entries (or manual BT sessions) from an older one.
	const mergedSess = [...(base.sess || [])];
	const seenPractice = new Set(mergedSess.map((entry) => entry.id));
	for (const entry of remote.sess || []) {
		if (!seenPractice.has(entry.id)) {
			mergedSess.push(entry);
			seenPractice.add(entry.id);
		}
	}
	mergedSess.sort((a, b) => b.at - a.at);

	const cloudTime = remote.savedAt && !isNaN(new Date(remote.savedAt).getTime()) ? new Date(remote.savedAt).getTime() : 0;
	const localTime = base.savedAt && !isNaN(new Date(base.savedAt).getTime()) ? new Date(base.savedAt).getTime() : 0;
	const cloudIsNewer = cloudTime >= localTime;
	const newerTime = Math.max(cloudTime, localTime);
	const prefSource = cloudIsNewer ? remote : base;

	// 5. Todos: Union by id with subtask merging and distributed tombstone deletion
	const mergedDeletedTodos: Record<string, number> = {
		...(base.deletedTodos || {}),
		...(remote.deletedTodos || {})
	};
	const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
	for (const id of Object.keys(mergedDeletedTodos)) {
		if (mergedDeletedTodos[id] < ninetyDaysAgo) {
			delete mergedDeletedTodos[id];
		}
	}

	const locTodoMap = new Map((base.todos || []).map((t) => [t.id, t]));
	const remTodoMap = new Map((remote.todos || []).map((t) => [t.id, t]));

	const mergedTodos: TodoItem[] = [];
	const seenTodoIds = new Set<string>();

	// Start with authoritative state (cloud if newer, local if newer)
	const primaryTodos = cloudIsNewer ? (remote.todos || []) : (base.todos || []);
	const secondaryMap = cloudIsNewer ? locTodoMap : remTodoMap;

	const isTombstoned = (item: TodoItem) => {
		return Boolean(mergedDeletedTodos[item.id]);
	};

	for (const prim of primaryTodos) {
		if (isTombstoned(prim)) continue;
		seenTodoIds.add(prim.id);
		const sec = secondaryMap.get(prim.id);
		if (!sec) {
			mergedTodos.push({ ...prim });
		} else {
			// Item exists in both: merge completion status by latest update timestamp and union subtasks
			const primTime = prim.updated || prim.created || 0;
			const secTime = sec.updated || sec.created || 0;
			const isDone = primTime !== secTime
				? (primTime > secTime ? prim.done : sec.done)
				: Boolean(prim.done || sec.done);

			// Merge subtasks
			const subMap = new Map((prim.subtasks || []).map((s) => [s.id, { ...s }]));
			for (const secSub of sec.subtasks || []) {
				const existing = subMap.get(secSub.id);
				if (!existing) {
					subMap.set(secSub.id, { ...secSub });
				} else {
					existing.done = Boolean(existing.done || secSub.done);
				}
			}
			const mergedSubtasks = Array.from(subMap.values());
			const allSubsDone = mergedSubtasks.length > 0 && mergedSubtasks.every((s) => s.done);

			mergedTodos.push({
				...prim,
				done: isDone || allSubsDone,
				subtasks: mergedSubtasks.length > 0 ? mergedSubtasks : prim.subtasks,
				roiTag: prim.roiTag || sec.roiTag,
				updated: Math.max(primTime, secTime)
			});
		}
	}

	// For items existing ONLY in secondary state:
	for (const [id, sec] of secondaryMap.entries()) {
		if (seenTodoIds.has(id)) continue;
		if (isTombstoned(sec)) continue;
		// If the older state has an item created before the newer state was saved,
		// the newer state deliberately deleted/cleared it -> do not resurrect!
		const createdTime = sec.created || 0;
		if (newerTime > 0 && createdTime < newerTime) {
			continue;
		}
		mergedTodos.push({ ...sec });
		seenTodoIds.add(id);
	}

	// 5b. Planner tasks (h = pending, hd = done)
	const allLocalHd = new Map((base.hd || []).map((i) => [i.id, i]));
	const allRemoteHd = new Map((remote.hd || []).map((i) => [i.id, i]));
	const mergedHdMap = new Map<string, HomeworkItem>();

	for (const [id, item] of allRemoteHd.entries()) mergedHdMap.set(id, { ...item, done: true });
	for (const [id, item] of allLocalHd.entries()) {
		const existing = mergedHdMap.get(id);
		if (!existing) mergedHdMap.set(id, { ...item, done: true });
		else if (item.fin && (!existing.fin || item.fin > existing.fin)) existing.fin = item.fin;
	}

	const primH = cloudIsNewer ? (remote.h || []) : (base.h || []);
	const secH = cloudIsNewer ? (base.h || []) : (remote.h || []);

	// If the authoritative newer state explicitly has an item pending in primH,
	// it was unchecked on the newer device -> ensure it stays in active h
	for (const item of primH) {
		mergedHdMap.delete(item.id);
	}

	const mergedH: HomeworkItem[] = [];
	const seenHIds = new Set<string>();
	const secHMap = new Map(secH.map((i) => [i.id, i]));

	for (const item of primH) {
		seenHIds.add(item.id);
		const sec = secHMap.get(item.id);
		mergedH.push(sec ? { ...sec, ...item } : { ...item });
	}

	for (const item of secH) {
		if (seenHIds.has(item.id) || mergedHdMap.has(item.id)) continue;
		if (!cloudIsNewer) {
			mergedH.push({ ...item });
			seenHIds.add(item.id);
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

	// 8. Chapter checklist grids: Union columns, data marks, and started flags
	const allGridSubs = new Set([
		...Object.keys(base.chapterGrids || {}),
		...Object.keys(remote.chapterGrids || {})
	]);
	const mergedGrids: Record<string, any> = {};
	for (const sub of allGridSubs) {
		const baseG = base.chapterGrids?.[sub];
		const remG = remote.chapterGrids?.[sub];
		if (!baseG && !remG) continue;
		if (!baseG) {
			mergedGrids[sub] = structuredClone(remG);
			continue;
		}
		if (!remG) {
			mergedGrids[sub] = structuredClone(baseG);
			continue;
		}
		const cols = [...(prefSource.chapterGrids?.[sub]?.cols || baseG.cols || [])];
		const otherCols = prefSource === remote ? (baseG.cols || []) : (remG.cols || []);
		for (const c of otherCols) {
			if (!cols.includes(c)) cols.push(c);
		}
		const allRowKeys = new Set([...Object.keys(baseG.data || {}), ...Object.keys(remG.data || {})]);
		const data: Record<string, string[]> = {};
		for (const rk of allRowKeys) {
			const bRow = baseG.data?.[rk] || [];
			const rRow = remG.data?.[rk] || [];
			const maxLen = Math.max(cols.length, bRow.length, rRow.length);
			const rowArr: string[] = [];
			for (let i = 0; i < maxLen; i++) {
				rowArr[i] = (bRow[i] === '✓' || rRow[i] === '✓') ? '✓' : '';
			}
			data[rk] = rowArr;
		}
		const started: Record<string, boolean> = {
			...(baseG.started || {}),
			...(remG.started || {})
		};
		mergedGrids[sub] = { cols, data, started };
	}

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
		sess: mergedSess,
		todos: mergedTodos,
		deletedTodos: mergedDeletedTodos,
		chapterGrids: Object.keys(mergedGrids).length > 0 ? mergedGrids : prefSource.chapterGrids || {},
		onboarded: Boolean(base.onboarded || remote.onboarded),
		h: mergedH,
		hd: Array.from(mergedHdMap.values()),
		mocks: mergedMocks,
		gamification: mergedGamification,
		streakFreezes: {
			available: Math.max(base.streakFreezes?.available ?? 2, remote.streakFreezes?.available ?? 2),
			usedDates: Array.from(new Set([...(base.streakFreezes?.usedDates ?? []), ...(remote.streakFreezes?.usedDates ?? [])]))
		},
		ui: {
			...prefSource.ui,
			wallpaper: base.ui?.wallpaper || remote.ui?.wallpaper || null,
			wallpaperHistory: Array.from(new Set([...(base.ui?.wallpaperHistory || []), ...(remote.ui?.wallpaperHistory || [])]))
		},
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

let lastPullTime = 0;
/** Pulls latest cloud state and merges seamlessly without causing echo saves */
export async function pullAndSync() {
	if (!activeUserId) return;
	const now = Date.now();
	if (now - lastPullTime < 3500) return;
	lastPullTime = now;

	try {
		const cloud = await pullState(activeUserId);
		if (!cloud) return;
		const local = get(tracker);
		const merged = mergeTrackerStates(local, cloud);
		replaceTracker(merged, false);
		await saveTrackerState(merged);
		schedulePush(merged);
		syncStatus.set('synced');
	} catch (e) {
		console.error("Auto pull & sync failed:", e);
	}
}

function handleVisibilityOrFocus() {
	if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
		void pullAndSync();
	}
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
	if (typeof window !== 'undefined') {
		window.addEventListener('visibilitychange', handleVisibilityOrFocus);
		window.addEventListener('focus', handleVisibilityOrFocus);
	}
}

export function stopSync() {
	if (!started) return;
	started = false;
	setCloudSink(null);
	clearTimeout(pushTimer);
	activeUserId = null;
	if (typeof window !== 'undefined') {
		window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
		window.removeEventListener('focus', handleVisibilityOrFocus);
	}
	teardownAuth();
}
