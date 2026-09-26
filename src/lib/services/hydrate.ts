import { loadTrackerState } from '$lib/services/persistence';
import { createInitialTrackerState, DEFAULT_WIDGETS } from '$lib/state/defaults';
import { hydration, replaceTracker } from '$lib/stores/tracker';
import type { TrackerState } from '$lib/types/tracker';

/**
 * Merge a raw persisted state onto fresh defaults so older saves (missing newer
 * top-level slices) stay readable. Used for both local hydration and cloud pulls.
 */
export function normalizeState(saved: Partial<TrackerState>): TrackerState {
	const base = createInitialTrackerState();
	const merged: TrackerState = {
		...base,
		...saved,
		ui: {
			...base.ui,
			...saved.ui,
			widgets: Array.isArray(saved.ui?.widgets) ? [...saved.ui.widgets] : [...base.ui.widgets]
		}
	};
	const known = new Set(merged.ui.widgets.map((w) => w.id));
	for (const widget of DEFAULT_WIDGETS) if (!known.has(widget.id)) merged.ui.widgets.push({ ...widget });
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
