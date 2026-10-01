import type {
	AnalysisFolder, AnalysisState, CustomizationState, GoalsState, MarksState, MetaState, PomodoroSettings,
	RevisionState, TrackerState, UiPreferences, WidgetLayout, ChapterRecallData, SubtopicProgress, ModalityTag
} from '$lib/types/tracker';
import { createInitialDecayMetrics } from './decay';
import { dayKeyOf, lastNDays, todayKey } from './dates';

export const DEFAULT_POMODORO: PomodoroSettings = {
	focus: 25, brk: 5, chime: 'both', endless: false, autoBrk: false, autoFocus: false, kind: 'pomo', srQ: 10, srM: 15
};
export const createCustomization = (): CustomizationState => ({
	subs: [], mods: {}, chs: {}, exs: {}, cnt: {}, ren: {}, num: {}, mod: {}, tags: [], acts: [], refAdded: {}
});
const markColumns = () => [
	{ id: 'name', n: 'Test' }, { id: 'date', n: 'Date' }, { id: 'tot', n: 'Total marks' }, { id: 'sc', n: 'Scored marks' },
	{ id: 'p', n: 'Physics' }, { id: 'c', n: 'Chemistry' }, { id: 'm', n: 'Maths' }, { id: 'pct', n: 'Percentage', calc: 'pct' },
	{ id: 'agg', n: 'Aggregate' }, { id: 'rb', n: 'Rank in batch' }, { id: 'rt', n: 'Total rank' }
];
export const createMarks = (): MarksState => ({
	v: 2,
	tables: ['btest', 'cet', 'alt'].map((id) => ({ id, n: id === 'cet' ? 'MHTCET' : id === 'alt' ? 'ALT' : 'BTest', cols: markColumns(), rows: [] })),
	cur: 'btest'
});
export const createGoals = (): GoalsState => ({
	day: { q: 40, h: 4, m: 0 }, week: { q: 250, h: 25, m: -2 }, month: { q: 1000, h: 100, m: -5 },
	range: { q: 250, h: 25, m: -2 }, deadline: { q: 2000, h: 200, m: -10 }
});
const test = (name: string) => ({
	id: `seed-${name.toLowerCase().replaceAll(/\W+/g, '-')}`, name,
	subs: { P: { tot: 100, sc: 0, wr: 0, time: 0 }, C: { tot: 100, sc: 0, wr: 0, time: 0 }, M: { tot: 100, sc: 0, wr: 0, time: 0 } },
	ranks: { all: '', batch: '', P: '', C: '', M: '' }, agg: '', qs: [], notes: ''
});
const series = (id: string, name: string, tests: string[]): AnalysisFolder => ({
	id, name, mark: id, cfg: { marks: { P: 100, C: 100, M: 100 }, qs: { P: 25, C: 25, M: 25 } }, tests: tests.map(test)
});
export const createAnalysis = (): AnalysisState => ({
	folders: [series('btest', 'BTest', ['MOT', 'BTest 1', 'BTest 2', 'BTest 3', 'BTest 4']), series('alt', 'ALT', ['ALT 1']), series('cet', 'MHTCET', ['MHTCET 1', 'MHTCET 2', 'MHTCET 3'])]
});

const makeSeedChapter = (
	chapterKey: string,
	weightage: 1 | 2 | 3,
	daysAgo: number,
	halfLife: number,
	r0: number,
	modalities: ModalityTag[],
	subtopicsList: string[]
): ChapterRecallData => {
	const now = Date.now();
	const dayMs = 86400000;
	const lastAt = now - daysAgo * dayMs;
	const currentScore = Math.max(0, Math.min(100, Math.round(r0 * Math.pow(2, -daysAgo / halfLife))));
	const historyDates = [8, 6, 4, 2].map((d) => ({
		date: dayKeyOf(new Date(now - (daysAgo + d) * dayMs)),
		score: Math.min(100, Math.round(r0 + d * 1.5))
	}));
	historyDates.push({ date: dayKeyOf(new Date(lastAt)), score: currentScore });

	const subtopics: Record<string, SubtopicProgress> = {};
	subtopicsList.forEach((name, idx) => {
		const id = `sub-${idx + 1}`;
		subtopics[id] = {
			id,
			name,
			lastRevisedAt: lastAt,
			modalities,
			decay: { r0, halfLife, currentScore, lastRevisionAt: lastAt, history: historyDates }
		};
	});

	return {
		chapterKey,
		weightage,
		decay: { r0, halfLife, currentScore, lastRevisionAt: lastAt, history: historyDates },
		subtopics,
		modalities,
		scheduledSlots: []
	};
};

export const createRevision = (): RevisionState => ({
	items: {},
	decayDays: 14,
	chapters: {},
	dailyHeatmap: {},
	studyBlocks: [],
	focusSessions: []
});

/**
 * Create initial chapter recall data for the Active Recall Hub
 *
 * @param chapterKey - Chapter identifier (e.g., "P-1")
 * @param weightage - High-yield weightage (1-3)
 * @returns Initial chapter recall data
 */
export const createChapterRecallData = (
	chapterKey: string,
	weightage: 1 | 2 | 3 = 2
): ChapterRecallData => ({
	chapterKey,
	weightage,
	decay: createInitialDecayMetrics(80, 7),
	subtopics: {},
	modalities: [],
	scheduledSlots: []
});
export const createMeta = (): MetaState => ({ name: '', exam: null, weekGoalH: 40, streakGoalH: 1 });
export const DEFAULT_WIDGETS: WidgetLayout[] = [
	{ id: 'daily-progress', enabled: true, order: 0, span: 2 },
	{ id: 'quote', enabled: true, order: 1, span: 1 },
	{ id: 'subjects', enabled: true, order: 2, span: 3 },
	{ id: 'weekly-standing', enabled: true, order: 3, span: 1 },
	{ id: 'new-target', enabled: true, order: 4, span: 2 },
	{ id: 'up-next', enabled: true, order: 5, span: 1 },
	{ id: 'due-homework', enabled: true, order: 6, span: 2 },
	{ id: 'activity', enabled: true, order: 7, span: 3, height: 'lg' },
	{ id: 'standing', enabled: false, order: 8, span: 1 },
	{ id: 'recommendation', enabled: true, order: 9, span: 3 }
];
export const createUiPreferences = (): UiPreferences => ({ accent: '#6d5dfc', widgets: DEFAULT_WIDGETS, reducedMotion: false });
export const createInitialTrackerState = (): TrackerState => ({
	stateVersion: 5, d: {}, n: {}, r: {}, x: createCustomization(), h: [], hd: [], log: [], stat: {}, marks: createMarks(), dl: [],
	norec: false, hwSort: 'loc', goals: createGoals(), col: [], bm: {}, notes: [], an: createAnalysis(), rev: createRevision(),
	meta: createMeta(), lib: [], gt: [], refl: {}, sess: [], todos: [], chapterGrids: {},
	theme: 'dark', pom: { ...DEFAULT_POMODORO }, ui: createUiPreferences(), savedAt: null
});
