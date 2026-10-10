import { loadTrackerState } from '$lib/services/persistence';
import { createInitialTrackerState, DEFAULT_WIDGETS } from '$lib/state/defaults';
import { getLevelData, recordPeaks } from '$lib/state/gamification';
import { rolloverWeekSnapshot } from '$lib/state/weekly';
import { hydration, replaceTracker } from '$lib/stores/tracker';
import type { TrackerState } from '$lib/types/tracker';

/**
 * Merge a raw persisted state onto fresh defaults so older saves (missing newer
 * top-level slices) stay readable. Used for both local hydration and cloud pulls.
 */
export function normalizeState(saved: Partial<TrackerState>): TrackerState {
	const base = createInitialTrackerState();
	let retroXp = saved.gamification?.xp ?? base.gamification!.xp;
	let retroElo = saved.gamification?.elo ? { ...base.gamification!.elo, ...saved.gamification.elo } : { ...base.gamification!.elo };

		// Retroactive XP & ELO bump (ensures previous mock tests and revisions count)
	let minCalculatedXp = 0;
	if (saved.log && Array.isArray(saved.log)) {
		minCalculatedXp += saved.log.reduce((acc, session) => acc + ((session[1] || 0) * 10), 0);
	}
	if (saved.mocks && Array.isArray(saved.mocks)) {
		minCalculatedXp += saved.mocks.length * 200;
	}
	if (saved.rev?.items) {
		minCalculatedXp += Object.keys(saved.rev.items).length * 50;
	}
	
	let statQuestions = { P: 0, C: 0, M: 0 };
	if (saved.stat) {
		for (const day of Object.values(saved.stat)) {
			for (const code of Object.keys(day)) {
				statQuestions[code as 'P' | 'C' | 'M'] = (statQuestions[code as 'P' | 'C' | 'M'] || 0) + (day[code] || 0);
				minCalculatedXp += (day[code] || 0) * 10;
			}
		}
	}
	
	if (retroXp < minCalculatedXp) {
		retroXp = minCalculatedXp;
	}
	
	// Apply retroactive Elo from legacy logged questions if they are still at starting Elo
	for (const code of ['P', 'C', 'M']) {
		const count = statQuestions[code as 'P' | 'C' | 'M'] || 0;
		if (count > 0) {
			let current = retroElo[code as 'P' | 'C' | 'M'] ?? 300;
			// 1.5 Elo per question, capped at +500 retroactive Elo
			const bump = Math.min(count * 1.5, 500);
			retroElo[code as 'P' | 'C' | 'M'] = Math.max(current, 300 + bump);
		}
	}

	const merged: TrackerState = {
		...base,
		...saved,
		rev: {
			...base.rev,
			...saved.rev,
			chapters: saved.rev?.chapters && Object.keys(saved.rev.chapters).length > 0
				? { ...base.rev.chapters, ...saved.rev.chapters }
				: base.rev.chapters,
			dailyHeatmap: saved.rev?.dailyHeatmap && Object.keys(saved.rev.dailyHeatmap).length > 0
				? { ...base.rev.dailyHeatmap, ...saved.rev.dailyHeatmap }
				: base.rev.dailyHeatmap
		},
		ui: {
			...base.ui,
			...saved.ui,
			widgets: Array.isArray(saved.ui?.widgets) ? [...saved.ui.widgets] : [...base.ui.widgets]
		},
		gamification: {
			...saved.gamification,
			xp: retroXp,
			level: Math.max(saved.gamification?.level || 1, getLevelData(retroXp).level),
			elo: retroElo
		}
	};
	const known = new Set(merged.ui.widgets.map((w) => w.id));
	for (const widget of DEFAULT_WIDGETS) if (!known.has(widget.id)) merged.ui.widgets.push({ ...widget });
	rolloverWeekSnapshot(merged);
	recordPeaks(merged.gamification!);
	return merged;
}

export async function hydrateTracker() {
	hydration.set('loading');
	try {
		const saved = await loadTrackerState();
		if (saved) replaceTracker(normalizeState(saved), false);
		hydration.set('ready');
	} catch { hydration.set('error'); }
}
