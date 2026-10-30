import { get } from 'svelte/store';
import { pullState, pushState } from '$lib/services/cloud';
import { normalizeState } from '$lib/services/hydrate';
import { supabaseConfigured } from '$lib/services/supabase';
import { authReady, initAuth, syncStatus, teardownAuth } from '$lib/stores/auth';
import { replaceTracker, setCloudSink, tracker } from '$lib/stores/tracker';
import { saveTrackerState } from '$lib/services/persistence';
import { currentWeekStartKey } from '$lib/state/weekly';
import type {
	TrackerState, TodoItem, HomeworkItem, ReflectionEntry, TaskRoutine, TrackerGoal,
	ChapterRecallData, RevisionItem, StudyBlock, FocusSession, Flashcard, DumpFileMeta,
	StudyDumpState, CustomReminder, MistakeLog, QuestionKey, QuestionReview
} from '$lib/types/tracker';

let activeUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;
let lastSyncedSavedAt: string | null = null;

export function isBloatedWallpaper(val: unknown): boolean {
	if (typeof val !== 'string') return false;
	if (val.startsWith('data:video/')) return true;
	if (val.startsWith('data:') && val.length > 500_000) return true;
	return false;
}

export function sanitizeWallpaperBloat(state: TrackerState): TrackerState {
	if (!state.ui) return state;
	const wp = state.ui.wallpaper;
	const hist = state.ui.wallpaperHistory;
	const isWpBloated = wp ? isBloatedWallpaper(wp) : false;
	const hasBloatedHist = hist ? hist.some(isBloatedWallpaper) : false;

	if (!isWpBloated && !hasBloatedHist) return state;

	return {
		...state,
		ui: {
			...state.ui,
			wallpaper: isWpBloated ? null : wp,
			wallpaperHistory: hist ? hist.filter((h) => !isBloatedWallpaper(h)) : []
		}
	};
}

/**
 * Pulls the cloud row, unions it with the local snapshot, then pushes the
 * result. A stale tab therefore can never shrink a newer cloud document.
 */
async function pushMerged(userId: string, local: TrackerState): Promise<TrackerState> {
	let outgoing = local;
	try {
		const cloud = await pullState(userId);
		if (cloud) {
			const merged = mergeTrackerStates(local, cloud);
			outgoing = merged;
			if (hasMeaningfulStateDiff(merged, local)) {
				// Adopt cloud-only records without scheduling another save (no echo).
				replaceTracker(merged, false);
				await saveTrackerState(merged);
			}
		}
	} catch (e) {
		console.warn('Pre-push merge failed, pushing local snapshot:', e);
	}
	await pushState(userId, sanitizeWallpaperBloat(outgoing));
	return outgoing;
}

/** Debounced mirror of a local save up to the cloud, only while signed in. */
function schedulePush(state: TrackerState, alreadyMerged = false) {
	if (!activeUserId) return;
	clearTimeout(pushTimer);
	pushTimer = setTimeout(async () => {
		const userId = activeUserId;
		if (!userId) return;
		syncStatus.set('pushing');
		try {
			if (alreadyMerged) {
				await pushState(userId, sanitizeWallpaperBloat(state));
				lastSyncedSavedAt = state.savedAt ?? new Date().toISOString();
			} else {
				const pushed = await pushMerged(userId, state);
				lastSyncedSavedAt = pushed.savedAt ?? new Date().toISOString();
			}
			syncStatus.set('synced');
		} catch (e) {
			console.error("Cloud push failed:", e);
			syncStatus.set('error');
		}
	}, 800);
}

/**
 * Merges a single question integer cell bitmask field-by-field.
 * Avoids bitwise ORing mutually exclusive result states (1=Correct, 2=Wrong, 3=Stuck).
 */
export function mergeQuestionCell(locVal: number, remVal: number, localNewer: boolean): number {
	if (!locVal) return remVal || 0;
	if (!remVal) return locVal || 0;
	if (locVal === remVal) return locVal;

	// 1. Attempted bit (bit 0, value 1): Union
	const done = (locVal & 1) | (remVal & 1);

	// 2. Result state (bits 1..2, (val >> 1) & 3):
	// If one is 0 and other is non-zero, take non-zero. If both non-zero and differ, take newer snapshot.
	const locResult = (locVal >> 1) & 3;
	const remResult = (remVal >> 1) & 3;
	let result = 0;
	if (locResult === 0) result = remResult;
	else if (remResult === 0) result = locResult;
	else if (locResult === remResult) result = locResult;
	else result = localNewer ? locResult : remResult;

	// 3. Starred bit (bit 3, value 8):
	// Prefer the newer snapshot when both states differ so un-starring a question is respected
	const locFlag = (locVal >> 3) & 1;
	const remFlag = (remVal >> 3) & 1;
	let flag = 0;
	if (locFlag === remFlag) flag = locFlag;
	else flag = localNewer ? locFlag : remFlag;

	// 4. Confidence state (bits 4..5, (val >> 4) & 3):
	// If one is 0 and other is non-zero, take non-zero; if both non-zero and differ, take newer snapshot.
	const locConf = (locVal >> 4) & 3;
	const remConf = (remVal >> 4) & 3;
	let conf = 0;
	if (locConf === 0) conf = remConf;
	else if (remConf === 0) conf = locConf;
	else if (locConf === remConf) conf = locConf;
	else conf = localNewer ? locConf : remConf;

	return (done & 1) | ((result & 3) << 1) | ((flag & 1) << 3) | ((conf & 3) << 4);
}

/**
 * Merges question bitmask dictionaries (d) field-by-field rather than raw bitwise OR.
 */
export function mergeQuestions(
	localD: Record<string, number[]> = {},
	remoteD: Record<string, number[]> = {},
	localNewer: boolean
): Record<string, number[]> {
	const merged: Record<string, number[]> = {};
	const allKeys = new Set([...Object.keys(localD || {}), ...Object.keys(remoteD || {})]);

	for (const key of allKeys) {
		const locArr = localD[key];
		const remArr = remoteD[key];
		if (!locArr) {
			merged[key] = [...(remArr || [])];
		} else if (!remArr) {
			merged[key] = [...locArr];
		} else {
			const maxLen = Math.max(locArr.length, remArr.length);
			const mergedArr = new Array<number>(maxLen).fill(0);
			for (let i = 0; i < maxLen; i++) {
				mergedArr[i] = mergeQuestionCell(locArr[i] || 0, remArr[i] || 0, localNewer);
			}
			merged[key] = mergedArr;
		}
	}
	return merged;
}

/**
 * Unions mistake logs by id, resolving conflicts with smart attribute merging.
 */
export function mergeMistakes(
	locList: MistakeLog[] = [],
	remList: MistakeLog[] = [],
	localNewer: boolean,
	deletedIds?: Set<string>
): MistakeLog[] {
	const map = new Map<string, MistakeLog>();
	const olderList = localNewer ? remList : locList;
	const newerList = localNewer ? locList : remList;

	for (const m of olderList || []) {
		if (deletedIds?.has(m.id)) continue;
		map.set(m.id, { ...m });
	}

	for (const m of newerList || []) {
		if (deletedIds?.has(m.id)) continue;
		const existing = map.get(m.id);
		if (!existing) {
			map.set(m.id, { ...m });
		} else {
			const prim = localNewer ? m : existing;
			const sec = localNewer ? existing : m;

			const primTime = prim.updated || (prim as any).updatedAt || (prim.resolved ? prim.resolvedAt : 0) || prim.date || 0;
			const secTime = sec.updated || (sec as any).updatedAt || (sec.resolved ? sec.resolvedAt : 0) || sec.date || 0;
			const resolved = (primTime !== secTime)
				? (primTime > secTime ? Boolean(prim.resolved) : Boolean(sec.resolved))
				: Boolean(prim.resolved || sec.resolved);

			const reviewCount = Math.max(
				Number((existing as any).reviewCount) || 0,
				Number((m as any).reviewCount) || 0
			);

			const locRevAt = (existing as any).lastReviewedAt ? new Date((existing as any).lastReviewedAt).getTime() : 0;
			const remRevAt = (m as any).lastReviewedAt ? new Date((m as any).lastReviewedAt).getTime() : 0;
			const lastReviewedAt = remRevAt > locRevAt
				? (m as any).lastReviewedAt
				: (existing as any).lastReviewedAt;

			const note = (prim as any).note || (sec as any).note;
			const questionNum = (prim as any).questionNum ?? (sec as any).questionNum;
			const subtopic = (prim as any).subtopic || (sec as any).subtopic;
			const errorType = prim.errorType || sec.errorType;
			const difficulty = (prim as any).difficulty || (sec as any).difficulty;

			map.set(m.id, {
				...sec,
				...prim,
				resolved,
				resolvedAt: resolved ? (prim.resolvedAt || sec.resolvedAt || Date.now()) : undefined,
				chapter: prim.chapter || sec.chapter,
				updated: Math.max(primTime, secTime),
				...(reviewCount > 0 ? { reviewCount } : {}),
				...(lastReviewedAt ? { lastReviewedAt } : {}),
				...(note ? { note } : {}),
				...(questionNum !== undefined ? { questionNum } : {}),
				...(subtopic ? { subtopic } : {}),
				...(errorType ? { errorType } : {}),
				...(difficulty ? { difficulty } : {})
			});
		}
	}

	return Array.from(map.values()).sort((a, b) => (b.date || 0) - (a.date || 0));
}

/**
 * Deep-merges lectureNotes by subject -> chapterId -> lectureId (or flat key),
 * preferring the longer or newer markdown string when both exist.
 */
export function mergeLectureNotes(
	localNotes: any,
	cloudNotes: any,
	localNewer: boolean
): any {
	if (!localNotes && !cloudNotes) return {};
	if (!localNotes) return cloudNotes ? structuredClone(cloudNotes) : {};
	if (!cloudNotes) return localNotes ? structuredClone(localNotes) : {};

	const merged: any = structuredClone(localNewer ? cloudNotes : localNotes);
	const priority: any = localNewer ? localNotes : cloudNotes;

	function deepMerge(target: any, source: any) {
		for (const key of Object.keys(source)) {
			const sVal = source[key];
			const tVal = target[key];

			if (tVal === undefined) {
				target[key] = structuredClone(sVal);
			} else if (typeof sVal === 'object' && sVal !== null && typeof tVal === 'object' && tVal !== null) {
				if ('content' in sVal || 'updatedAt' in sVal || 'content' in tVal || 'updatedAt' in tVal) {
					const sTime = sVal.updatedAt || 0;
					const tTime = tVal.updatedAt || 0;
					if (sTime > tTime) {
						target[key] = { ...tVal, ...sVal };
					} else if (tTime > sTime) {
						target[key] = { ...sVal, ...tVal };
					} else {
						const sLen = typeof sVal.content === 'string' ? sVal.content.length : 0;
						const tLen = typeof tVal.content === 'string' ? tVal.content.length : 0;
						target[key] = sLen >= tLen ? { ...tVal, ...sVal } : { ...sVal, ...tVal };
					}
				} else {
					deepMerge(tVal, sVal);
				}
			} else if (typeof sVal === 'string' && typeof tVal === 'string') {
				target[key] = sVal.length >= tVal.length ? sVal : (localNewer ? sVal : tVal);
			} else {
				target[key] = sVal !== undefined ? sVal : tVal;
			}
		}
	}

	deepMerge(merged, priority);
	return merged;
}

/**
 * Deep-merges question string maps (n = notes, r = reason tags/reviews)
 * supporting both flat QuestionKey dictionaries and hierarchical subject -> chapter -> questionIdx structures.
 */
export function mergeQuestionStringMaps<T = any>(
	localMap: Record<string, any> | undefined,
	remoteMap: Record<string, any> | undefined,
	localNewer: boolean
): Record<string, any> {
	if (!localMap && !remoteMap) return {};
	if (!localMap) return remoteMap ? structuredClone(remoteMap) : {};
	if (!remoteMap) return localMap ? structuredClone(localMap) : {};

	const baseObj = localNewer ? remoteMap : localMap;
	const prioObj = localNewer ? localMap : remoteMap;
	const merged: Record<string, any> = structuredClone(baseObj);
	const priority: Record<string, any> = prioObj;

	function mergeDeep(target: any, source: any) {
		for (const key of Object.keys(source)) {
			const sVal = source[key];
			const tVal = target[key];

			if (tVal === undefined) {
				target[key] = structuredClone(sVal);
			} else if (typeof sVal === 'string' && typeof tVal === 'string') {
				if (!tVal.trim()) {
					target[key] = sVal;
				} else if (!sVal.trim()) {
					target[key] = tVal;
				} else {
					target[key] = localNewer ? sVal : tVal;
				}
			} else if (typeof sVal === 'object' && sVal !== null && typeof tVal === 'object' && tVal !== null) {
				if ('t' in sVal || 't' in tVal) {
					const tags = Array.from(new Set([...(sVal.t || []), ...(tVal.t || [])]));
					const d = (sVal.d && tVal.d)
						? (sVal.d >= tVal.d ? sVal.d : tVal.d)
						: (sVal.d || tVal.d);
					target[key] = { d, t: tags };
				} else {
					mergeDeep(tVal, sVal);
				}
			} else {
				target[key] = localNewer ? sVal : tVal;
			}
		}
	}

	mergeDeep(merged, priority);
	return merged;
}

/**
 * Compares serialized state payloads excluding volatile top-level savedAt.
 */
export function hasMeaningfulStateDiff(a: TrackerState | null | undefined, b: TrackerState | null | undefined): boolean {
	if (!a && !b) return false;
	if (!a || !b) return true;
	if (a === b) return false;

	try {
		const { savedAt: _aSavedAt, ...cleanA } = a;
		const { savedAt: _bSavedAt, ...cleanB } = b;
		return JSON.stringify(cleanA) !== JSON.stringify(cleanB);
	} catch {
		return true;
	}
}

/**
 * CRDT-style deep union merge between local state and cloud state.
 * Never drops custom exercises or solved questions from either side.
 */
export function mergeTrackerStates(local: TrackerState, cloud: TrackerState): TrackerState {
	const base = normalizeState(local);
	const remote = normalizeState(cloud);

	const cloudTime = remote.savedAt && !isNaN(new Date(remote.savedAt).getTime()) ? new Date(remote.savedAt).getTime() : 0;
	const localTime = base.savedAt && !isNaN(new Date(base.savedAt).getTime()) ? new Date(base.savedAt).getTime() : 0;
	const cloudIsNewer = cloudTime >= localTime;
	const localNewer = !cloudIsNewer;
	const newerTime = Math.max(cloudTime, localTime);
	const prefSource = cloudIsNewer ? remote : base;

	// Tombstones for soft deletion
	const mergedDeletedIds: Record<string, number> = {
		...(base.deletedIds || {}),
		...(remote.deletedIds || {})
	};
	const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
	for (const id of Object.keys(mergedDeletedIds)) {
		if (mergedDeletedIds[id] < ninetyDaysAgo) {
			delete mergedDeletedIds[id];
		}
	}
	const deletedIdSet = new Set(Object.keys(mergedDeletedIds));

	// 1. Question bitmasks: Field-by-field merge avoiding raw OR corruption
	const mergedD = mergeQuestions(base.d, remote.d, localNewer);

	// 1b. Question notes (n) & reason tags (r)
	const mergedN = mergeQuestionStringMaps(base.n, remote.n, localNewer);
	const mergedR = mergeQuestionStringMaps(base.r, remote.r, localNewer);

	// 1c. Mistake Book & Lecture Notes
	const mergedMistakes = mergeMistakes(base.mistakes, remote.mistakes, localNewer, deletedIdSet);
	const mergedLectureNotes = mergeLectureNotes(base.lectureNotes, remote.lectureNotes, localNewer);

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

	// 4. Log: Union sessions (dedup by start minute, duration and subject)
	const mergedLog = [...(base.log || [])];
	const sessionKey = (s: (typeof mergedLog)[number]) => `${s[0]}-${s[1]}-${s[7] ?? ''}`;
	const seenSessions = new Set(mergedLog.map(sessionKey));
	for (const sess of remote.log || []) {
		const k = sessionKey(sess);
		if (!seenSessions.has(k)) {
			mergedLog.push(sess);
			seenSessions.add(k);
		}
	}

	// 4b. Subject practice sessions: union by id so a newer device never drops
	// universal log entries (or manual BT sessions) from an older one.
	const mergedSess = (base.sess || []).filter((entry) => !deletedIdSet.has(entry.id));
	const seenPractice = new Set(mergedSess.map((entry) => entry.id));
	for (const entry of remote.sess || []) {
		if (!seenPractice.has(entry.id) && !deletedIdSet.has(entry.id)) {
			mergedSess.push(entry);
			seenPractice.add(entry.id);
		}
	}
	mergedSess.sort((a, b) => b.at - a.at);

	// 5. Todos: Union by id with subtask merging and distributed tombstone deletion
	const mergedDeletedTodos: Record<string, number> = {
		...(base.deletedTodos || {}),
		...(remote.deletedTodos || {})
	};
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

	for (const [id, item] of allRemoteHd.entries()) {
		if (!deletedIdSet.has(id)) mergedHdMap.set(id, { ...item, done: true });
	}
	for (const [id, item] of allLocalHd.entries()) {
		if (deletedIdSet.has(id)) continue;
		const existing = mergedHdMap.get(id);
		if (!existing) {
			mergedHdMap.set(id, { ...item, done: true });
		} else {
			const existingTime = existing.updated || existing.fin || 0;
			const localTime = item.updated || item.fin || 0;
			if (localTime > existingTime) {
				mergedHdMap.set(id, { ...existing, ...item, done: true });
			} else {
				mergedHdMap.set(id, { ...item, ...existing, done: true });
			}
		}
	}

	const primH = cloudIsNewer ? (remote.h || []) : (base.h || []);
	const secH = cloudIsNewer ? (base.h || []) : (remote.h || []);

	const mergedH: HomeworkItem[] = [];
	const seenHIds = new Set<string>();
	const secHMap = new Map(secH.map((i) => [i.id, i]));

	for (const item of primH) {
		if (deletedIdSet.has(item.id)) continue;
		const existingHd = mergedHdMap.get(item.id);
		if (existingHd) {
			const itemTime = item.updated || 0;
			const hdTime = existingHd.fin || existingHd.updated || 0;
			if (itemTime < hdTime) {
				// The task was completed more recently -> keep in hd, do not put in pending h
				continue;
			} else {
				// The task was reopened/updated after completion -> keep in active h
				mergedHdMap.delete(item.id);
			}
		}

		seenHIds.add(item.id);
		const sec = secHMap.get(item.id);
		if (sec) {
			const itemTime = item.updated || item.fin || 0;
			const secTime = sec.updated || sec.fin || 0;
			if (secTime > itemTime) {
				mergedH.push({ ...item, ...sec });
			} else {
				mergedH.push({ ...sec, ...item });
			}
		} else {
			mergedH.push({ ...item });
		}
	}

	for (const item of secH) {
		if (deletedIdSet.has(item.id) || seenHIds.has(item.id) || mergedHdMap.has(item.id)) continue;
		mergedH.push({ ...item });
		seenHIds.add(item.id);
	}

	// 6. Mocks: Union by id with tombstone check and timestamp conflict resolution
	const mergedMocks = (base.mocks || []).filter(m => !deletedIdSet.has(m.id));
	const mockMap = new Map(mergedMocks.map((m) => [m.id, m]));
	for (const m of remote.mocks || []) {
		if (deletedIdSet.has(m.id)) continue;
		const existing = mockMap.get(m.id);
		if (!existing) {
			mergedMocks.push(m);
			mockMap.set(m.id, m);
		} else {
			const existingTime = existing.updated || existing.date || 0;
			const remoteTime = m.updated || m.date || 0;
			if (remoteTime > existingTime) {
				Object.assign(existing, m);
			}
		}
	}

	// 7. Gamification: Max values, deep merge prestige, peak, week
	const baseG = base.gamification;
	const remG = remote.gamification;

	// Prestige merge: taking higher count, merging history by `at`, taking newer seasonElo
	let mergedPrestige = undefined;
	if (baseG?.prestige || remG?.prestige) {
		const bp = baseG?.prestige;
		const rp = remG?.prestige;
		const higherCount = Math.max(bp?.count || 0, rp?.count || 0);

		const seasonElo = (rp?.count || 0) > (bp?.count || 0)
			? { ...(rp?.seasonElo || {}) }
			: (bp?.count || 0) > (rp?.count || 0)
			? { ...(bp?.seasonElo || {}) }
			: cloudIsNewer
			? { ...(rp?.seasonElo || bp?.seasonElo || {}) }
			: { ...(bp?.seasonElo || rp?.seasonElo || {}) };

		const historyMap = new Map<number, { at: number; avgElo: number }>();
		for (const h of bp?.history || []) historyMap.set(h.at, h);
		for (const h of rp?.history || []) historyMap.set(h.at, h);
		const mergedHistory = Array.from(historyMap.values()).sort((a, b) => a.at - b.at);

		mergedPrestige = {
			count: higherCount,
			seasonElo,
			history: mergedHistory
		};
	}

	// Peak merge: taking Math.max of tierElo and per-subject peaks
	let mergedPeak = undefined;
	if (baseG?.peak || remG?.peak) {
		const bPeak = baseG?.peak;
		const rPeak = remG?.peak;
		const tierElo = Math.max(bPeak?.tierElo || 0, rPeak?.tierElo || 0);
		const subject: Record<string, number> = {};
		const allSubs = new Set([...Object.keys(bPeak?.subject || {}), ...Object.keys(rPeak?.subject || {})]);
		for (const sub of allSubs) {
			subject[sub] = Math.max(bPeak?.subject?.[sub] || 0, rPeak?.subject?.[sub] || 0);
		}
		mergedPeak = { tierElo, subject };
	}

	// Week merge: preferring snapshot matching currentWeekStartKey()
	const curWeekKey = currentWeekStartKey();
	let mergedWeek = prefSource.gamification?.week;
	if (remG?.week?.start === curWeekKey && baseG?.week?.start !== curWeekKey) {
		mergedWeek = remG.week;
	} else if (baseG?.week?.start === curWeekKey && remG?.week?.start !== curWeekKey) {
		mergedWeek = baseG.week;
	} else if (remG?.week && baseG?.week) {
		mergedWeek = cloudIsNewer ? remG.week : baseG.week;
	} else {
		mergedWeek = remG?.week || baseG?.week || null;
	}

	const mergedGamification = {
		xp: Math.max(baseG?.xp || 0, remG?.xp || 0),
		level: Math.max(baseG?.level || 1, remG?.level || 1),
		elo: {
			P: Math.max(baseG?.elo?.P || 300, remG?.elo?.P || 300),
			C: Math.max(baseG?.elo?.C || 300, remG?.elo?.C || 300),
			M: Math.max(baseG?.elo?.M || 300, remG?.elo?.M || 300)
		},
		v3_elo: true,
		prestige: mergedPrestige,
		peak: mergedPeak,
		week: mergedWeek
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

	// 9. Planner reflections: Union by day key, preferring newer savedAt timestamp
	const mergedRefl: Record<string, ReflectionEntry> = { ...(base.refl || {}) };
	for (const [day, remEntry] of Object.entries(remote.refl || {})) {
		const locEntry = mergedRefl[day];
		if (!locEntry) {
			mergedRefl[day] = remEntry;
		} else {
			const locTime = locEntry.savedAt ? new Date(locEntry.savedAt).getTime() : 0;
			const remTime = remEntry.savedAt ? new Date(remEntry.savedAt).getTime() : 0;
			if (remTime > locTime) {
				mergedRefl[day] = remEntry;
			}
		}
	}

	// 10. Planner routines library: Union by id with tombstone check
	const mergedLib = (base.lib || []).filter((r) => !deletedIdSet.has(r.id));
	const libIds = new Set(mergedLib.map((r) => r.id));
	for (const r of remote.lib || []) {
		if (!libIds.has(r.id) && !deletedIdSet.has(r.id)) {
			mergedLib.push(r);
			libIds.add(r.id);
		}
	}

	// 11. Goals tracker: Union by id with tombstone check
	const mergedGt = (base.gt || []).filter((g) => !deletedIdSet.has(g.id));
	const gtIds = new Set(mergedGt.map((g) => g.id));
	for (const g of remote.gt || []) {
		if (!gtIds.has(g.id) && !deletedIdSet.has(g.id)) {
			mergedGt.push(g);
			gtIds.add(g.id);
		}
	}

	// 12. Coaching Timetable: Prefer populated timetable
	const mergedTimetable = (remote.timetable?.periods?.length || 0) > (base.timetable?.periods?.length || 0)
		? (remote.timetable || base.timetable)
		: (base.timetable || remote.timetable);

	// 13. Spaced revision & Active Recall (rev):
	// 13a. Chapters: union by chapterKey, preferring the newer lastRevisionAt or nextRevisionDate
	const mergedChapters: Record<string, ChapterRecallData> = { ...(base.rev?.chapters || {}) };
	for (const [key, remCh] of Object.entries(remote.rev?.chapters || {})) {
		const locCh = mergedChapters[key];
		if (!locCh) {
			mergedChapters[key] = structuredClone(remCh);
		} else {
			const locTime = locCh.decay?.lastRevisionAt || 0;
			const remTime = remCh.decay?.lastRevisionAt || 0;
			if (remTime > locTime) {
				mergedChapters[key] = {
					...locCh,
					...remCh,
					decay: { ...remCh.decay },
					nextRevisionDate: remCh.nextRevisionDate || locCh.nextRevisionDate,
					userAdded: Boolean(locCh.userAdded || remCh.userAdded)
				};
			} else {
				mergedChapters[key] = {
					...remCh,
					...locCh,
					decay: { ...locCh.decay },
					nextRevisionDate: locCh.nextRevisionDate || remCh.nextRevisionDate,
					userAdded: Boolean(locCh.userAdded || remCh.userAdded)
				};
			}
		}
	}

	// 13b. Items: union by item key, preferring newer last revision timestamp
	const mergedRevItems: Record<string, RevisionItem> = { ...(base.rev?.items || {}) };
	for (const [key, remItem] of Object.entries(remote.rev?.items || {})) {
		const locItem = mergedRevItems[key];
		if (!locItem) {
			mergedRevItems[key] = structuredClone(remItem);
		} else {
			const locTime = locItem.last || 0;
			const remTime = remItem.last || 0;
			if (remTime > locTime) {
				mergedRevItems[key] = {
					...locItem,
					...remItem,
					remindDate: remItem.remindDate || locItem.remindDate,
					userAdded: Boolean(locItem.userAdded || remItem.userAdded)
				};
			} else {
				mergedRevItems[key] = {
					...remItem,
					...locItem,
					remindDate: locItem.remindDate || remItem.remindDate,
					userAdded: Boolean(locItem.userAdded || remItem.userAdded)
				};
			}
		}
	}

	// 13c. Daily Heatmap: union by date, taking max values
	const allHeatmapDays = new Set([
		...Object.keys(base.rev?.dailyHeatmap || {}),
		...Object.keys(remote.rev?.dailyHeatmap || {})
	]);
	const mergedHeatmap: Record<string, { revisedCount: number; totalTimeMinutes: number }> = {};
	for (const day of allHeatmapDays) {
		const bDay = base.rev?.dailyHeatmap?.[day];
		const rDay = remote.rev?.dailyHeatmap?.[day];
		mergedHeatmap[day] = {
			revisedCount: Math.max(bDay?.revisedCount || 0, rDay?.revisedCount || 0),
			totalTimeMinutes: Math.max(bDay?.totalTimeMinutes || 0, rDay?.totalTimeMinutes || 0)
		};
	}

	// 13d. Study blocks: union by id
	const mergedBlocks = [...(base.rev?.studyBlocks || [])];
	const blockIds = new Set(mergedBlocks.map((b) => b.id));
	for (const b of remote.rev?.studyBlocks || []) {
		if (!blockIds.has(b.id)) {
			mergedBlocks.push(b);
			blockIds.add(b.id);
		}
	}

	// 13e. Focus sessions: union by id
	const mergedFocusSessions = [...(base.rev?.focusSessions || [])];
	const sessionIds = new Set(mergedFocusSessions.map((s) => s.id));
	for (const s of remote.rev?.focusSessions || []) {
		if (!sessionIds.has(s.id)) {
			mergedFocusSessions.push(s);
			sessionIds.add(s.id);
		}
	}

	// 14. Flashcards: union by id with tombstone check, preferring card with greater repetition/newer nextReviewAt
	const mergedFlashcards: Flashcard[] = (base.flashcards || []).filter((f) => !deletedIdSet.has(f.id));
	const fcMap = new Map(mergedFlashcards.map((f) => [f.id, f]));
	for (const card of remote.flashcards || []) {
		if (deletedIdSet.has(card.id)) continue;
		const existing = fcMap.get(card.id);
		if (!existing) {
			mergedFlashcards.push(card);
			fcMap.set(card.id, card);
		} else {
			const existingRev = existing.nextReviewAt || 0;
			const remoteRev = card.nextReviewAt || 0;
			if (remoteRev > existingRev || (card.repetition || 0) > (existing.repetition || 0)) {
				Object.assign(existing, card);
			}
		}
	}

	// 15. Study Dump: union files by id, taking newer lastSyncAt
	const mergedDumpFiles: DumpFileMeta[] = [...(base.studyDump?.files || [])];
	const dumpFileIds = new Set(mergedDumpFiles.map((f) => f.id));
	for (const f of remote.studyDump?.files || []) {
		if (!dumpFileIds.has(f.id)) {
			mergedDumpFiles.push(f);
			dumpFileIds.add(f.id);
		}
	}
	const mergedStudyDump: StudyDumpState = {
		files: mergedDumpFiles,
		lastSyncAt: Math.max(base.studyDump?.lastSyncAt || 0, remote.studyDump?.lastSyncAt || 0),
		sectionZipSizes: { ...(remote.studyDump?.sectionZipSizes || {}), ...(base.studyDump?.sectionZipSizes || {}) }
	};

	const merged: TrackerState = {
		...prefSource,
		d: mergedD,
		n: mergedN,
		r: mergedR,
		meta: {
			...prefSource.meta,
			updatedAt: Math.max(base.meta?.updatedAt ?? 0, remote.meta?.updatedAt ?? 0),
			// Monotonic counters: a device that never saw the better streak must
			// not be allowed to lower it.
			bestStreak: Math.max(base.meta?.bestStreak ?? 0, remote.meta?.bestStreak ?? 0),
			lastActiveDay: [base.meta?.lastActiveDay, remote.meta?.lastActiveDay]
				.filter((day): day is string => Boolean(day))
				.sort()
				.pop() ?? prefSource.meta?.lastActiveDay
		},
		mistakes: mergedMistakes,
		lectureNotes: mergedLectureNotes,
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
		deletedIds: Object.keys(mergedDeletedIds).length > 0 ? mergedDeletedIds : undefined,
		chapterGrids: Object.keys(mergedGrids).length > 0 ? mergedGrids : prefSource.chapterGrids || {},
		onboarded: Boolean(base.onboarded || remote.onboarded),
		h: mergedH,
		hd: Array.from(mergedHdMap.values()),
		refl: mergedRefl,
		lib: mergedLib,
		gt: mergedGt,
		timetable: mergedTimetable,
		studyDump: mergedStudyDump,
		rev: {
			decayDays: prefSource.rev?.decayDays ?? 30,
			items: mergedRevItems,
			chapters: mergedChapters,
			dailyHeatmap: mergedHeatmap,
			studyBlocks: mergedBlocks,
			focusSessions: mergedFocusSessions
		},
		flashcards: mergedFlashcards,
		mocks: mergedMocks,
		gamification: mergedGamification,
		streakFreezes: {
			available: Math.max(base.streakFreezes?.available ?? 2, remote.streakFreezes?.available ?? 2),
			usedDates: Array.from(new Set([...(base.streakFreezes?.usedDates ?? []), ...(remote.streakFreezes?.usedDates ?? [])]))
		},
		starredFormulas: Array.from(new Set([...(base.starredFormulas || []), ...(remote.starredFormulas || [])])),
		customFormulas: (() => {
			const map = new Map((base.customFormulas || []).filter((f) => !deletedIdSet.has(f.id)).map((f) => [f.id, f]));
			for (const f of (remote.customFormulas || []).filter((f) => !deletedIdSet.has(f.id))) {
				map.set(f.id, f);
			}
			return Array.from(map.values());
		})(),
		examNotes: (() => {
			if (base.examNotes && remote.examNotes) {
				return cloudIsNewer ? remote.examNotes : base.examNotes;
			}
			return base.examNotes || remote.examNotes || '';
		})(),
		customReminders: (() => {
			const locMap = new Map((base.customReminders || []).filter((r) => !deletedIdSet.has(r.id)).map((r) => [r.id, r]));
			const remMap = new Map((remote.customReminders || []).filter((r) => !deletedIdSet.has(r.id)).map((r) => [r.id, r]));
			const allIds = new Set([...locMap.keys(), ...remMap.keys()]);
			const res: CustomReminder[] = [];
			for (const id of allIds) {
				if (deletedIdSet.has(id)) continue;
				const loc = locMap.get(id);
				const rem = remMap.get(id);
				if (loc && rem) {
					res.push((rem.updatedAt || 0) >= (loc.updatedAt || 0) ? rem : loc);
				} else if (loc) {
					res.push(loc);
				} else if (rem) {
					res.push(rem);
				}
			}
			return res;
		})(),
		ui: {
			...prefSource.ui,
			wallpaper: (() => {
				const wp = base.ui?.wallpaper || remote.ui?.wallpaper || null;
				return isBloatedWallpaper(wp) ? null : wp;
			})(),
			wallpaperHistory: Array.from(new Set([...(base.ui?.wallpaperHistory || []), ...(remote.ui?.wallpaperHistory || [])])).filter((h) => !isBloatedWallpaper(h))
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
			const merged = mergeTrackerStates(local, cloud);
			replaceTracker(merged, true);
			if (hasMeaningfulStateDiff(cloud, merged)) {
				await pushState(userId, sanitizeWallpaperBloat(merged));
			}
			lastSyncedSavedAt = merged.savedAt;
			syncStatus.set('synced');
		} else {
			if (local.savedAt) await pushState(userId, sanitizeWallpaperBloat(local));
			lastSyncedSavedAt = local.savedAt ?? new Date().toISOString();
			syncStatus.set('synced');
		}
	} catch (e) {
		console.error("Cloud pull failed:", e);
		syncStatus.set('error');
	}
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

		const localChanged = hasMeaningfulStateDiff(local, merged);
		const cloudChanged = hasMeaningfulStateDiff(cloud, merged);

		if (localChanged) {
			replaceTracker(merged, false);
			await saveTrackerState(merged);
		}

		if (cloudChanged) {
			// The merged payload already contains the cloud copy — skip a second pull.
			schedulePush(merged, true);
		} else {
			lastSyncedSavedAt = merged.savedAt ?? new Date().toISOString();
			syncStatus.set('synced');
		}
	} catch (e) {
		console.error("Auto pull & sync failed:", e);
	}
}

function handleVisibilityChange() {
	if (typeof document === 'undefined') return;
	if (document.visibilityState === 'hidden') {
		void flushPush();
	} else if (document.visibilityState === 'visible') {
		void pullAndSync();
	}
}

function handleFocus() {
	if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
		void pullAndSync();
	}
}

function onSignOut() {
	activeUserId = null;
	clearTimeout(pushTimer);
	syncStatus.set('idle');
}

/** Immediately flushes any pending cloud push without waiting for the debounce timer. */
export async function flushPush(): Promise<void> {
	if (!activeUserId) return;
	clearTimeout(pushTimer);
	pushTimer = undefined;
	const state = get(tracker);
	try {
		const pushed = await pushMerged(activeUserId, state);
		lastSyncedSavedAt = pushed.savedAt ?? new Date().toISOString();
		syncStatus.set('synced');
	} catch (e) {
		console.error("Flush push to cloud failed:", e);
	}
}

async function handleOnline() {
	if (pushTimer) {
		await flushPush();
	}
	void pullAndSync();
}

function handleBeforeUnload() {
	if (pushTimer) {
		void flushPush();
	}
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
		window.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleFocus);
		window.addEventListener('online', handleOnline);
		window.addEventListener('beforeunload', handleBeforeUnload);
		window.addEventListener('pagehide', handleBeforeUnload);
	}
}

export function stopSync() {
	if (!started) return;
	started = false;
	setCloudSink(null);
	clearTimeout(pushTimer);
	activeUserId = null;
	if (typeof window !== 'undefined') {
		window.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('focus', handleFocus);
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('beforeunload', handleBeforeUnload);
		window.removeEventListener('pagehide', handleBeforeUnload);
	}
	teardownAuth();
}

// Aliases for sync initialization and teardown
export const initCloudSync = startSync;
export const teardownCloudSync = stopSync;
