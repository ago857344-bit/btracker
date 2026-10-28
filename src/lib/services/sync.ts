import { get } from 'svelte/store';
import { pullState, pushState } from '$lib/services/cloud';
import { normalizeState } from '$lib/services/hydrate';
import { supabaseConfigured } from '$lib/services/supabase';
import { authReady, initAuth, syncStatus, teardownAuth } from '$lib/stores/auth';
import { replaceTracker, setCloudSink, tracker } from '$lib/stores/tracker';
import { saveTrackerState } from '$lib/services/persistence';
import { currentWeekStartKey } from '$lib/state/weekly';
import type { TrackerState, TodoItem, HomeworkItem, ReflectionEntry, TaskRoutine, TrackerGoal, ChapterRecallData, RevisionItem, StudyBlock, FocusSession, Flashcard, DumpFileMeta, StudyDumpState, CustomReminder } from '$lib/types/tracker';

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
		if (seenHIds.has(item.id) || mergedHdMap.has(item.id)) continue;
		mergedH.push({ ...item });
		seenHIds.add(item.id);
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

	// 10. Planner routines library: Union by id
	const mergedLib = [...(base.lib || [])];
	const libIds = new Set(mergedLib.map((r) => r.id));
	for (const r of remote.lib || []) {
		if (!libIds.has(r.id)) {
			mergedLib.push(r);
			libIds.add(r.id);
		}
	}

	// 11. Goals tracker: Union by id
	const mergedGt = [...(base.gt || [])];
	const gtIds = new Set(mergedGt.map((g) => g.id));
	for (const g of remote.gt || []) {
		if (!gtIds.has(g.id)) {
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

	// 14. Flashcards: union by id, preferring card with greater repetition/newer nextReviewAt
	const mergedFlashcards: Flashcard[] = [...(base.flashcards || [])];
	const fcMap = new Map(mergedFlashcards.map((f) => [f.id, f]));
	for (const card of remote.flashcards || []) {
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
		examNotes: (() => {
			if (base.examNotes && remote.examNotes) {
				return cloudIsNewer ? remote.examNotes : base.examNotes;
			}
			return base.examNotes || remote.examNotes || '';
		})(),
		customReminders: (() => {
			const locMap = new Map((base.customReminders || []).map((r) => [r.id, r]));
			const remMap = new Map((remote.customReminders || []).map((r) => [r.id, r]));
			const allIds = new Set([...locMap.keys(), ...remMap.keys()]);
			const res: CustomReminder[] = [];
			for (const id of allIds) {
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

/** Immediately flushes any pending cloud push without waiting for the debounce timer. */
export async function flushPush(): Promise<void> {
	if (!activeUserId) return;
	clearTimeout(pushTimer);
	pushTimer = undefined;
	const state = get(tracker);
	try {
		await pushState(activeUserId, state);
		syncStatus.set('synced');
	} catch (e) {
		console.error("Flush push to cloud failed:", e);
	}
}

function handleOnline() {
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
		window.addEventListener('visibilitychange', handleVisibilityOrFocus);
		window.addEventListener('focus', handleVisibilityOrFocus);
		window.addEventListener('online', handleOnline);
		window.addEventListener('beforeunload', handleBeforeUnload);
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
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('beforeunload', handleBeforeUnload);
	}
	teardownAuth();
}
