import type {
	AnalysisFolder, AnalysisState, CustomizationState, GoalsState, MarksState, MetaState, PomodoroSettings,
	RevisionState, TrackerState, UiPreferences, WidgetLayout
} from '$lib/types/tracker';

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
export const createRevision = (): RevisionState => ({ items: {}, decayDays: 14 });
export const createMeta = (): MetaState => ({ name: '', exam: null, weekGoalH: 40, streakGoalH: 1 });
export const DEFAULT_WIDGETS: WidgetLayout[] = [
	{ id: 'daily-progress', enabled: true, order: 0, span: 2 },
	{ id: 'quote', enabled: true, order: 1, span: 1 },
	{ id: 'weekly-standing', enabled: true, order: 2, span: 1 },
	{ id: 'new-target', enabled: true, order: 3, span: 2 },
	{ id: 'subjects', enabled: true, order: 4, span: 3 },
	{ id: 'up-next', enabled: true, order: 5, span: 1 },
	{ id: 'due-homework', enabled: true, order: 6, span: 1 },
	{ id: 'standing', enabled: true, order: 7, span: 1 },
	{ id: 'activity', enabled: true, order: 8, span: 3 },
	{ id: 'recommendation', enabled: true, order: 9, span: 3 }
];
export const createUiPreferences = (): UiPreferences => ({ accent: '#6d5dfc', widgets: DEFAULT_WIDGETS, reducedMotion: false });
export const createInitialTrackerState = (): TrackerState => ({
	stateVersion: 4, d: {}, n: {}, r: {}, x: createCustomization(), h: [], hd: [], log: [], stat: {}, marks: createMarks(), dl: [],
	norec: false, hwSort: 'loc', goals: createGoals(), col: [], bm: {}, notes: [], an: createAnalysis(), rev: createRevision(),
	meta: createMeta(), lib: [], gt: [], refl: {}, sess: [], todos: [],
	theme: 'dark', pom: { ...DEFAULT_POMODORO }, ui: createUiPreferences(), savedAt: null
});
