import { loadTrackerState } from '$lib/services/persistence';
import { createInitialTrackerState, DEFAULT_WIDGETS } from '$lib/state/defaults';
import { getLevelData, recordPeaks } from '$lib/state/gamification';
import { rolloverWeekSnapshot } from '$lib/state/weekly';
import { dayKeyOf, todayKey } from '$lib/state/dates';
import { hydration, replaceTracker } from '$lib/stores/tracker';
import { isChapterStudied } from '$lib/state/decay';
import { isMobileDevice } from '$lib/state/themes';
import type { TrackerState } from '$lib/types/tracker';

/**
 * Merge a raw persisted state onto fresh defaults so older saves (missing newer
 * top-level slices) stay readable. Used for both local hydration and cloud pulls.
 */
export function normalizeState(saved: Partial<TrackerState>): TrackerState {
	const base = createInitialTrackerState();
	let retroXp = saved.gamification?.xp ?? base.gamification!.xp;
	let retroElo = saved.gamification?.elo ? { ...base.gamification!.elo, ...saved.gamification.elo } : { ...base.gamification!.elo };

	let statQuestions = { P: 0, C: 0, M: 0 };
	if (saved.stat) {
		for (const day of Object.values(saved.stat)) {
			if (!day) continue;
			for (const code of Object.keys(day)) {
				statQuestions[code as 'P' | 'C' | 'M'] = (statQuestions[code as 'P' | 'C' | 'M'] || 0) + (day[code] || 0);
			}
		}
	}

	// Retroactive XP & ELO bump (only for legacy accounts that did not have gamification initialized)
	if (saved.gamification?.xp == null) {
		let minCalculatedXp = 0;
		if (saved.log && Array.isArray(saved.log)) {
			minCalculatedXp += saved.log.reduce((acc, session) => acc + ((session?.[1] || 0) * 10), 0);
		}
		if (saved.mocks && Array.isArray(saved.mocks)) {
			minCalculatedXp += saved.mocks.length * 200;
		}
		if (saved.rev?.items) {
			minCalculatedXp += Object.keys(saved.rev.items).length * 50;
		}
		for (const code of ['P', 'C', 'M'] as const) {
			minCalculatedXp += (statQuestions[code] || 0) * 10;
		}
		retroXp = minCalculatedXp;
	}
	
	// Re-calculate true solved counts directly from the question bitmasks
	let trueSolved = { P: 0, C: 0, M: 0 };
	if (saved.d) {
		for (const [key, arr] of Object.entries(saved.d)) {
			const sc = key.charAt(0);
			if (sc === 'P' || sc === 'C' || sc === 'M') {
				let solved = 0;
				for (const cell of arr) {
					if ((cell & 1) === 1) solved++; // isDone bit
				}
				trueSolved[sc] += solved;
			}
		}
	}

	const g = saved.gamification;
	const needsWipe = !g || !(g as any).v3_elo;

	if (needsWipe) {
		if (saved.gamification) delete saved.gamification.peak;
		
		// Force recalculate true Elo from scratch to wipe the previous inflation bug
		for (const code of ['P', 'C', 'M']) {
			retroElo[code as 'P' | 'C' | 'M'] = 300 + ((trueSolved[code as 'P' | 'C' | 'M'] || 0) * 0.3);
		}
		if (saved.mocks && Array.isArray(saved.mocks)) {
			for (const test of saved.mocks) {
				const totalMarks = test.totalMarks || 0;
				const score = test.score || 0;
				const accuracy = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
				const subNameMap = { P: 'Physics', C: 'Chemistry', M: 'Maths' } as const;
				for (const code of ['P', 'C', 'M']) {
					const sInfo = test.subjects?.[code] || test.subjects?.[subNameMap[code as 'P' | 'C' | 'M']];
					if (sInfo && (sInfo.correct > 0 || sInfo.incorrect > 0)) {
						const expected = Math.max(20, Math.min(96, (retroElo[code as 'P' | 'C' | 'M']! / 1800) * 100));
						const diff = accuracy - expected;
						const multiplier = diff < 0 ? 0.9 : 0.3;
						const change = Math.round(diff * multiplier * 100);
						retroElo[code as 'P' | 'C' | 'M'] = Math.max(100, retroElo[code as 'P' | 'C' | 'M']! + Math.max(-45, Math.min(20, change)));
					}
				}
			}
		}
	}

	// Clean theme and sanitize any corrupted wallpaper data from previous versions
	const cleanTheme = saved.theme || base.theme || 'dark';
	const cleanCosmetics = { ...(saved.ui?.cosmetics || {}) };
	if (cleanCosmetics.wallpaper === 'none' || cleanCosmetics.wallpaper === '') {
		delete cleanCosmetics.wallpaper;
	}

	function normalizeVideoWallpaperPath(path: unknown): string | null | undefined {
		if (typeof path !== 'string') return path as any;
		if (path === 'none' || path === '' || path === 'builtin:none') return null;
		if (path.includes('/videos/')) {
			return path
				.replace('/videos/god mode.mp4', '/videos/god-mode.mp4')
				.replace('/videos/aurora borealis.mp4', '/videos/aurora-borealis.mp4')
				.replace('/videos/catalyst lab.mp4', '/videos/catalyst-lab.mp4')
				.replace('/videos/neon initiate.mp4', '/videos/neon-initiate.mp4')
				.replace('/videos/sapphire master.mp4', '/videos/sapphire-master.mp4');
		}
		return path;
	}

	let cleanWallpaper = normalizeVideoWallpaperPath(saved.ui?.wallpaper);
	if (cleanCosmetics.wallpaper) {
		cleanCosmetics.wallpaper = normalizeVideoWallpaperPath(cleanCosmetics.wallpaper) as any;
	}

	const delIdMap = saved.deletedIds || base.deletedIds || {};

	const merged: TrackerState = {
		...base,
		...saved,
		theme: cleanTheme,
		d: {
			...base.d,
			...saved.d
		},
		x: {
			...base.x,
			...saved.x,
			cnt: { ...base.x.cnt, ...(saved.x?.cnt || {}) },
			exs: { ...base.x.exs, ...(saved.x?.exs || {}) },
			subs: saved.x?.subs || base.x.subs,
			mods: { ...base.x.mods, ...(saved.x?.mods || {}) },
			chs: { ...base.x.chs, ...(saved.x?.chs || {}) }
		},
		rev: {
			...base.rev,
			...saved.rev,
			items: (() => {
				const raw = saved.rev?.items || base.rev.items;
				const clean: Record<string, any> = {};
				for (const [k, v] of Object.entries(raw)) {
					if (delIdMap[k]) continue;
					if (v && (v.userAdded || v.last || v.remindDate || isChapterStudied(saved, k))) {
						clean[k] = v;
					}
				}
				return clean;
			})(),
			chapters: (() => {
				const raw = saved.rev?.chapters || base.rev.chapters;
				const clean: Record<string, any> = {};
				for (const [k, v] of Object.entries(raw)) {
					if (delIdMap[k]) continue;
					if (v && (v.userAdded || v.decay?.lastRevisionAt || isChapterStudied(saved, k))) {
						clean[k] = v;
					}
				}
				return clean;
			})(),
			dailyHeatmap: saved.rev?.dailyHeatmap && Object.keys(saved.rev.dailyHeatmap).length > 0
				? { ...base.rev.dailyHeatmap, ...saved.rev.dailyHeatmap }
				: base.rev.dailyHeatmap
		},
		ui: {
			...base.ui,
			...saved.ui,
			wallpaper: cleanWallpaper,
			devMode: false,
			cosmetics: cleanCosmetics,
			widgets: Array.isArray(saved.ui?.widgets) ? [...saved.ui.widgets] : [...base.ui.widgets]
		},
		gamification: {
			...saved.gamification,
			xp: retroXp,
			level: Math.max(saved.gamification?.level || 1, getLevelData(retroXp).level),
			elo: retroElo,
			v3_elo: true,
			prestige: saved.gamification?.prestige,
			peak: needsWipe ? undefined : saved.gamification?.peak
		},
		streakFreezes: saved.streakFreezes || base.streakFreezes || { available: 2, usedDates: [] },
		deletedTodos: (() => {
			const raw = { ...(base.deletedTodos || {}), ...(saved.deletedTodos || {}) };
			const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
			for (const id of Object.keys(raw)) {
				if (raw[id] < cutoff) delete raw[id];
			}
			return raw;
		})(),
		todos: (() => {
			const raw = saved.todos || base.todos || [];
			const delMap = saved.deletedTodos || base.deletedTodos || {};
			return raw.filter((t) => !delMap[t.id]);
		})(),
		mistakes: (() => {
			const raw = saved.mistakes || base.mistakes || [];
			return raw
				.filter((m) => !delIdMap[m.id])
				.map((m) => {
					const s = String(m.subject || '').trim();
					const normSub = s === 'P' || s.toLowerCase().startsWith('phy') ? 'Physics'
						: s === 'C' || s.toLowerCase().startsWith('chem') ? 'Chemistry'
						: s === 'M' || s.toLowerCase().startsWith('math') ? 'Maths'
						: (s || 'Physics');
					return m.subject === normSub ? m : { ...m, subject: normSub };
				});
		})(),
		meta: {
			...base.meta,
			...(saved.meta || {})
		},
		coaching_type: saved.coaching_type === 'GENERIC' ? 'GENERIC' : 'BT',
		coaching_name: (saved.coaching_name?.trim() === 'Baktiwal Tutorials' ? 'Bakliwal Tutorials' : saved.coaching_name?.trim())
			|| (saved.coaching_type === 'GENERIC' ? 'Other' : 'Bakliwal Tutorials'),
		starredFormulas: (() => {
			let list = saved.starredFormulas;
			if ((!list || !list.length) && typeof window !== 'undefined') {
				try {
					const legacy = localStorage.getItem('btracker_starred_formulas');
					if (legacy) {
						const parsed = JSON.parse(legacy);
						if (Array.isArray(parsed) && parsed.length) list = parsed;
					}
				} catch {}
			}
			return Array.isArray(list) ? list : [];
		})(),
		customFormulas: Array.isArray(saved.customFormulas) ? saved.customFormulas : [],
		examNotes: (() => {
			let notes = saved.examNotes;
			if (notes === undefined && typeof window !== 'undefined') {
				try {
					const legacy = localStorage.getItem('btracker_test_day_notes') || localStorage.getItem('btracker_exam_morning_notes');
					if (legacy) notes = legacy;
				} catch {}
			}
			return typeof notes === 'string' ? notes : '';
		})(),
		customReminders: (() => {
			let list = saved.customReminders;
			if ((!list || !list.length) && typeof window !== 'undefined') {
				try {
					const legacy = localStorage.getItem('btracker_custom_reminders');
					if (legacy) {
						const parsed = JSON.parse(legacy);
						if (Array.isArray(parsed) && parsed.length) list = parsed;
					}
				} catch {}
			}
			return Array.isArray(list) ? list : [];
		})(),
		onboarded: saved.onboarded ?? (Boolean(
			saved.savedAt ||
			(saved.meta?.name && saved.meta.name.trim().length > 0) ||
			(saved.log && saved.log.length > 0) ||
			(saved.d && Object.keys(saved.d).length > 0)
		))
	};
	if (isMobileDevice() && (!merged.onboarded || !saved.ui?.dashboardLayout)) {
		merged.ui.dashboardLayout = 'compact';
	}
	const known = new Set(merged.ui.widgets.map((w) => w.id));
	for (const widget of DEFAULT_WIDGETS) if (!known.has(widget.id)) merged.ui.widgets.push({ ...widget });

	// Migrate layout: disable due-homework, set new-target to span 1, yearly-heatmap to span 2 beside new-target
	if (!saved.ui || !(saved.ui as any).v4_heatmap_layout) {
		const dueHw = merged.ui.widgets.find((w) => w.id === 'due-homework');
		if (dueHw) dueHw.enabled = false;
		const newTarget = merged.ui.widgets.find((w) => w.id === 'new-target');
		if (newTarget) newTarget.span = 1;
		const heatmap = merged.ui.widgets.find((w) => w.id === 'yearly-heatmap');
		if (heatmap) {
			heatmap.span = 2;
			if (newTarget) {
				heatmap.order = newTarget.order + 0.5;
			}
		}
		merged.ui.widgets.sort((a, b) => a.order - b.order).forEach((w, idx) => { w.order = idx; });
		(merged.ui as any).v4_heatmap_layout = true;
	}

	// Clean any previously expanded chapter names in timetable periods back to raw codes (e.g. "Definite Integration (M18)" -> "M18")
	if (merged.timetable?.periods) {
		for (const p of merged.timetable.periods) {
			if (p.topic) {
				p.topic = p.topic.replace(/^.+\s+\(([PMC]\d+)\)$/, '$1');
			}
		}
	}
	
	// Auto-heal and reconcile custom exercises from question bitmasks in d
	const builtInCodes = new Set(['I', '1', '2', '3', '4', 'M', 'A']);
	for (const [key, arr] of Object.entries(merged.d || {})) {
		const match = key.match(/^([PCM])(\d+)(.+)$/);
		if (match) {
			const [, sc, chStr, exCode] = match;
			if (!builtInCodes.has(exCode)) {
				const chKey = `${sc}${chStr}`;
				if (!merged.x.exs[chKey]) merged.x.exs[chKey] = [];
				const exists = merged.x.exs[chKey].some((e) => e.code === exCode);
				if (!exists) {
					merged.x.exs[chKey].push({
						code: exCode,
						name: exCode.startsWith('AI') ? 'AI Practice' : 'Custom Exercise'
					});
				}
				if (Array.isArray(arr) && arr.length > 0) {
					merged.x.cnt[key] = Math.max(merged.x.cnt[key] || 0, arr.length);
				}
			}
		}
	}
	
	// Reconcile question stat with real question bitmasks in d
	if (!merged.stat) merged.stat = {};
	for (const sc of ['P', 'C', 'M'] as const) {
		const solvedInD = trueSolved[sc] || 0;
		const loggedInStat = statQuestions[sc] || 0;
		const diff = solvedInD - loggedInStat;
		if (diff > 0) {
			const parsedSaved = saved.savedAt ? new Date(saved.savedAt) : null;
			const baselineDay = parsedSaved && !isNaN(parsedSaved.getTime()) ? dayKeyOf(parsedSaved) : todayKey();
			const baseBucket = merged.stat[baselineDay] ?? (merged.stat[baselineDay] = {});
			baseBucket[sc] = (Number(baseBucket[sc]) || 0) + diff;
		}
	}

	rolloverWeekSnapshot(merged);
	recordPeaks(merged.gamification!);
	return merged;
}

export async function hydrateTracker() {
	hydration.set('loading');
	try {
		const saved = await loadTrackerState();
		if (saved) replaceTracker(normalizeState(saved), true);
		hydration.set('ready');
	} catch { hydration.set('error'); }
}
