/**
 * Persistence-compatible model of BTracker v2.9's `S` object.
 * The terse field names are retained at the boundary so legacy imports do not
 * lose data. New UI code should use selectors/actions rather than mutate them.
 */
export type SubjectCode = 'P' | 'C' | 'M' | (string & {});
export type DayKey = `${number}-${number}-${number}` | string;
export type QuestionKey = string;
export type ThemeId = 'light' | 'dark' | 'red' | 'green' | 'custom' | 'notion' | 'duolingo' | 'anki' | 'obsidian' | 'quizlet';
export type TimerKind = 'pomo' | 'endless' | 'speed';

export interface CustomSubject { code: SubjectCode; name: string; accent: string; short?: string }
export interface CustomModule { id: number | string; name: string }
export interface CustomChapter { no: number; name: string }
export interface CustomExercise { code: string; name: string }
export interface NamedTag { id: string; n: string; c?: string }

export interface CustomizationState {
	subs: CustomSubject[];
	mods: Record<string, CustomModule[]>;
	chs: Record<string, CustomChapter[]>;
	exs: Record<string, CustomExercise[]>;
	cnt: Record<string, number>;
	ren: Record<string, string>;
	num: Record<string, number>;
	mod: Record<string, number>;
	tags: NamedTag[];
	acts: NamedTag[];
	refAdded: Record<string, string | number>;
}

export interface HomeworkItem {
	id: string;
	kind?: 'range' | 'back' | 'task' | string;
	s?: SubjectCode;
	c?: number;
	e?: string;
	list?: number[];
	title?: string;
	due?: DayKey;
	priority?: number;
	done?: boolean;
	keep?: boolean;
	fin?: number;
	/** Planner-only extras (Trackly day tasks). */
	col?: number;
	st?: string;
	en?: string;
	rec?: 'once' | 'daily' | 'weekly';
	hrs?: number;
	test?: boolean;
	subs?: string[];
	[key: string]: unknown;
}

export interface TaskRoutine { id: string; n: string; tasks: { t: string; col: number; s: string; hrs: number }[] }

export interface TodoItem {
	id: string;
	title: string;
	done: boolean;
	sub?: SubjectCode;
	ch?: number;
	source?: 'manual' | 'btest';
	created: number;
}

/** Per-subject chapter checklist grid: custom columns, ✓ marks keyed by chapter no. */
export interface ChapterGrid { cols: string[]; data: Record<string, string[]> }

export interface GoalMilestone { id: string; t: string; done: boolean }
export interface TrackerGoal {
	id: string;
	type: 'syllabus' | 'pyq' | 'custom';
	sub: string;
	ch: string;
	title: string;
	deadline: DayKey;
	milestones: GoalMilestone[];
	solved: number;
	target: number;
	created: number;
}

export interface ReflectionEntry { post: string; mistakes: string; savedAt: string | null }

export interface SubjectSession { id: string; day: DayKey; sub: string; ch: string; att: number; cor: number; at: number }

export interface MetaState { name: string; exam: DayKey | null; weekGoalH: number; streakGoalH: number }

/** [started-at in epoch minutes, duration minutes, activity, deadline id, speedrun flag?, target?, completed?, subject?] */
export type StudySession = [number, number, string, string | null, number?, number?, number?, string?];
export interface QuestionReview { d: DayKey; t: string[] }

export interface MarkColumn { id: string; n: string; calc?: string }
export interface MarkRow { v: Record<string, string> }
export interface MarksTable { id: string; n: string; cols: MarkColumn[]; rows: MarkRow[] }
export interface MarksState { v: number; tables: MarksTable[]; cur: string }

export interface Deadline {
	id: string; name: string; start: DayKey; date: DayKey; time?: string;
	goals?: string; reflect?: string; subs?: SubjectCode[]; hidden?: boolean;
}
export interface GoalTarget { q: number; h: number; m: number }
export type GoalsState = Record<'day' | 'week' | 'month' | 'range' | 'deadline', GoalTarget>;

export interface Collection { id: string; n: string; qs?: QuestionKey[] }
export interface StandaloneNote { id: string; title?: string; body?: string; c?: string[]; [key: string]: unknown }

export interface AnalysisSubjectMark { tot: number; sc: number; wr: number; time: number }
export interface AnalysisTest {
	id: string; name: string; subs: Record<'P' | 'C' | 'M', AnalysisSubjectMark>;
	ranks: Record<'all' | 'batch' | 'P' | 'C' | 'M', string>;
	agg: string; qs: unknown[]; notes: string;
}
export interface AnalysisFolder {
	id: string; name: string; mark: string;
	cfg: { marks: Record<'P' | 'C' | 'M', number>; qs: Record<'P' | 'C' | 'M', number> };
	tests: AnalysisTest[];
}
export interface AnalysisState { folders: AnalysisFolder[] }

export interface RevisionItem {
	weight: number; last: number | null; remindDate?: DayKey; remindDone?: boolean;
	remindEvery?: 'week' | 'month'; note?: string;
	method?: 'steady' | 'fast' | 'smart'; step?: number; sub?: string; ch?: string; ef?: number;
}
export interface RevisionState { items: Record<string, RevisionItem>; decayDays: number }

export interface PomodoroSettings {
	focus: number; brk: number; chime: 'both' | 'focus' | 'break' | 'none' | string;
	endless: boolean; autoBrk: boolean; autoFocus: boolean;
	kind?: TimerKind; srQ?: number; srM?: number;
}

export interface WidgetLayout {
	id: 'quote' | 'weekly-standing' | 'recommendation' | 'new-target' | 'daily-progress' | 'due-homework'
		| 'subjects' | 'standing' | 'up-next' | 'activity';
	enabled: boolean; order: number; span: 1 | 2 | 3; height?: 'sm' | 'md' | 'lg';
}
export interface UiPreferences { accent: string; widgets: WidgetLayout[]; reducedMotion: boolean }

export interface TrackerState {
	stateVersion: 4;
	/** BTracker question bitmasks, keyed as subject + permanent chapter no + exercise code. */
	d: Record<string, number[]>;
	/** Per-question note, keyed as subject + permanent chapter no + exercise code + index. */
	n: Record<QuestionKey, string>;
	r: Record<QuestionKey, QuestionReview>;
	x: CustomizationState;
	h: HomeworkItem[];
	hd: HomeworkItem[];
	log: StudySession[];
	stat: Record<DayKey, Partial<Record<SubjectCode, number>>>;
	marks: MarksState;
	dl: Deadline[];
	norec: boolean;
	hwSort: 'loc' | 'pri';
	goals: GoalsState;
	col: Collection[];
	bm: Record<QuestionKey, string[]>;
	notes: StandaloneNote[];
	an: AnalysisState;
	rev: RevisionState;
	meta: MetaState;
	lib: TaskRoutine[];
	gt: TrackerGoal[];
	todos: TodoItem[];
	chapterGrids: Record<string, ChapterGrid>;
	refl: Record<DayKey, ReflectionEntry>;
	sess: SubjectSession[];
	theme: ThemeId;
	pom: PomodoroSettings;
	ui: UiPreferences;
	savedAt: string | null;
}

export interface TimerState {
	running: boolean; mode: 'focus' | 'break'; kind: TimerKind;
	secondsRemaining: number; elapsedSeconds: number; totalSeconds: number;
	activityId: string | null; deadlineId: string | null;
	speedrun: { phase: 'setup' | 'run' | 'result'; target: number; minutes: number; done: number };
}
