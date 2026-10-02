import { derived, get, writable } from 'svelte/store';
import { createInitialTrackerState } from '$lib/state/defaults';
import { saveTrackerState } from '$lib/services/persistence';
import { addDaysKey, focusMinutesOn, dayKeyOf, lastNDays, sessionDayKey, startOfWeek, todayKey } from '$lib/state/dates';
import { SUBJECTS, dayPartOf, intervalFor, subjectColor } from '$lib/state/subjects';
import { cellKey, questionCount, questionKey } from '$lib/state/syllabus';
import { isDone, isFlag, resultOf, setDone, setFlag, setResult, setStars, starsOf } from '$lib/state/questions';
import type {
	GoalTarget, HomeworkItem, StudySession, TimerState, TrackerGoal, TrackerState, WidgetLayout
} from '$lib/types/tracker';

export const tracker = writable<TrackerState>(createInitialTrackerState());
export const hydration = writable<'idle' | 'loading' | 'ready' | 'error'>('idle');
export const saveStatus = writable<'saved' | 'saving' | 'error'>('saved');
export const timer = writable<TimerState>({
	running: false, mode: 'focus', kind: 'pomo', secondsRemaining: 25 * 60, elapsedSeconds: 0, totalSeconds: 25 * 60,
	activityId: null, deadlineId: null, speedrun: { phase: 'setup', target: 10, minutes: 15, done: 0 },
	focusSessionId: null
});

let pendingSave: ReturnType<typeof setTimeout> | undefined;
// Optional hook so the sync layer can mirror saves to the cloud without tracker importing it.
let cloudSink: ((state: TrackerState) => void) | null = null;
export function setCloudSink(fn: ((state: TrackerState) => void) | null) { cloudSink = fn; }
export function replaceTracker(next: TrackerState, persist = true) {
	tracker.set(structuredClone(next));
	if (persist) scheduleSave();
}
export function updateTracker(mutator: (draft: TrackerState) => void) {
	tracker.update((current) => { const draft = structuredClone(current); mutator(draft); draft.savedAt = new Date().toISOString(); return draft; });
	scheduleSave();
}
export function scheduleSave() {
	clearTimeout(pendingSave); saveStatus.set('saving');
	pendingSave = setTimeout(async () => {
		const state = get(tracker);
		try { await saveTrackerState(state); saveStatus.set('saved'); cloudSink?.(state); } catch { saveStatus.set('error'); }
	}, 450);
}

export const activeHomework = derived(tracker, ($tracker) => $tracker.h.filter((item) => !item.done));
export const dueRevision = derived(tracker, ($tracker) => {
	const today = todayKey();
	return Object.entries($tracker.rev.items).filter(([, item]) => item.remindDate && item.remindDate <= today && !item.remindDone);
});
export const dashboardWidgets = derived(tracker, ($tracker) => $tracker.ui.widgets.filter((widget) => widget.enabled).sort((a, b) => a.order - b.order));
export function updateWidget(id: WidgetLayout['id'], patch: Partial<WidgetLayout>) {
	updateTracker((state) => { const widget = state.ui.widgets.find((candidate) => candidate.id === id); if (widget) Object.assign(widget, patch); });
}

/** Move a visible widget up (-1) or down (+1) within the enabled ordering. */
export function reorderWidget(id: WidgetLayout['id'], direction: -1 | 1) {
	updateTracker((state) => {
		const visible = state.ui.widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);
		const index = visible.findIndex((w) => w.id === id);
		const swapWith = visible[index + direction];
		if (index < 0 || !swapWith) return;
		const current = visible[index];
		const tmp = current.order; current.order = swapWith.order; swapWith.order = tmp;
	});
}

/** Cycle a widget's grid span 1 → 2 → 3 → 1. */
export function cycleWidgetSpan(id: WidgetLayout['id']) {
	updateTracker((state) => {
		const widget = state.ui.widgets.find((w) => w.id === id);
		if (!widget) return;
		widget.span = widget.span === 1 ? 2 : widget.span === 2 ? 3 : 1;
	});
}

/* ------------------------------------------------------------------ *
 * Phase 3 selectors — Home dashboard + Focus summaries.
 * ------------------------------------------------------------------ */

const sumSolved = (bucket: Partial<Record<string, number>> | undefined) =>
	Object.values(bucket ?? {}).reduce<number>((total, value) => total + (Number(value) || 0), 0);

/** Solved-question counts keyed by subject for the current day. */
export const todayStat = derived(tracker, ($tracker) => $tracker.stat[todayKey()] ?? {});
export const todaySolved = derived(todayStat, sumSolved);
export const todayFocusMinutes = derived(tracker, ($tracker) => focusMinutesOn($tracker.log, todayKey()));

/** Today's progress against the daily goal target. */
export const dailyProgress = derived([tracker, todaySolved, todayFocusMinutes], ([$tracker, solved, minutes]) => {
	const goal = $tracker.goals.day;
	return {
		solved, minutes,
		questionGoal: goal.q, hourGoal: goal.h,
		questionPct: goal.q > 0 ? Math.min(1, solved / goal.q) : 0,
		hourPct: goal.h > 0 ? Math.min(1, minutes / (goal.h * 60)) : 0
	};
});

/** Per-day solved totals for the trailing seven days, oldest first. */
export const weeklyStanding = derived(tracker, ($tracker) => {
	const days = lastNDays(7);
	const solved = days.map((key) => sumSolved($tracker.stat[key]));
	const minutes = days.map((key) => focusMinutesOn($tracker.log, key));
	const totalSolved = solved.reduce((a, b) => a + b, 0);
	const goal = $tracker.goals.week;
	// Week-to-date uses the Monday-based week so the target reads correctly mid-week.
	const weekStart = startOfWeek();
	let weekToDate = 0;
	for (let d = new Date(weekStart); d <= new Date(); d.setDate(d.getDate() + 1)) {
		weekToDate += sumSolved($tracker.stat[dayKeyOf(d)]);
	}
	return {
		days, solved, minutes, totalSolved, weekToDate,
		peak: Math.max(1, ...solved),
		goal: goal.q,
		pct: goal.q > 0 ? Math.min(1, weekToDate / goal.q) : 0
	};
});

/** Homework that is due today or overdue, soonest first. */
export const dueHomework = derived(tracker, ($tracker) => {
	const today = todayKey();
	return $tracker.h
		.filter((item) => !item.done && item.due && item.due <= today)
		.sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : 0));
});

export interface Recommendation { tone: 'revise' | 'homework' | 'push' | 'steady'; title: string; body: string; href: string; cta: string }

/** Lightweight heuristic that mirrors BTracker's "Smart Recommendation" nudge. */
export const recommendation = derived([tracker, dueRevision, dueHomework, dailyProgress], ([$tracker, revisions, due, progress]) => {
	if (!$tracker.norec && revisions.length > 0) {
		return { tone: 'revise', title: 'Revision is due', body: `${revisions.length} topic${revisions.length > 1 ? 's are' : ' is'} waiting on spaced repetition. A quick pass now keeps it fresh.`, href: '/revise', cta: 'Open Revise' } satisfies Recommendation;
	}
	if (due.length > 0) {
		return { tone: 'homework', title: 'Deadlines closing in', body: `${due.length} homework item${due.length > 1 ? 's are' : ' is'} due today or overdue. Knock out the top one to stay clear.`, href: '/plan', cta: 'Go to Plan' } satisfies Recommendation;
	}
	const hour = new Date().getHours();
	if (progress.solved < progress.questionGoal && hour >= 16) {
		const remaining = progress.questionGoal - progress.solved;
		return { tone: 'push', title: 'Finish today’s target', body: `You’re ${remaining} question${remaining === 1 ? '' : 's'} short of your daily goal. One focused block should close the gap.`, href: '/focus', cta: 'Start focusing' } satisfies Recommendation;
	}
	return { tone: 'steady', title: 'You’re on track', body: 'Daily targets are within reach. Keep the streak alive with a short study block.', href: '/focus', cta: 'Start a session' } satisfies Recommendation;
});

/* ------------------------------------------------------------------ *
 * Phase 3 actions.
 * ------------------------------------------------------------------ */

export function toggleHomework(id: string) {
	updateTracker((state) => {
		const index = state.h.findIndex((item) => item.id === id);
		if (index < 0) return;
		const [item] = state.h.splice(index, 1);
		item.done = !item.done;
		item.fin = item.done ? Date.now() : undefined;
		if (item.done) state.hd.push(item); else state.h.push(item);
	});
}

export function setDailyGoal(patch: Partial<GoalTarget>) {
	updateTracker((state) => { Object.assign(state.goals.day, patch); });
}

export function setAccent(color: string) {
	updateTracker((state) => { state.ui.accent = color; });
}

/** Append a completed focus session to the study log. */
export function logStudySession(session: StudySession) {
	updateTracker((state) => { state.log.push(session); });
}

/** Convenience wrapper that builds a StudySession tuple from timer results. */
export function recordFocus(opts: { startedEpochMinutes: number; durationMinutes: number; activity: string; deadlineId: string | null; speedrun?: number; target?: number; completed?: number; subject?: string | null; chapter?: string | null }) {
	logStudySession([opts.startedEpochMinutes, Math.max(1, Math.round(opts.durationMinutes)), opts.activity, opts.deadlineId, opts.speedrun, opts.target, opts.completed, opts.subject ?? undefined, opts.chapter ?? undefined]);
}

export const sessionsToday = derived(tracker, ($tracker) => $tracker.log.filter((session) => sessionDayKey(session) === todayKey()));

/* ------------------------------------------------------------------ *
 * BTracker feature set — profile, planner, goals, reflection, sessions,
 * spaced revision and the analytics selectors that feed them.
 * ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);

/** Transient UI signals (not persisted). */
export const celebration = writable<string | null>(null);
export const plannerPrompt = writable<string | null>(null);
export const customizingHome = writable(false);

export function setProfileName(name: string) { updateTracker((s) => { s.meta.name = name; }); }
export function setExamDate(date: string | null) { updateTracker((s) => { s.meta.exam = date; }); }
export function setWeeklyGoalHours(hours: number) { updateTracker((s) => { s.meta.weekGoalH = Math.max(1, Math.round(hours)); }); }
export function setStreakGoalHours(hours: number) { updateTracker((s) => { s.meta.streakGoalH = Math.max(1, Math.round(hours)); }); }

/* Planner tasks ------------------------------------------------------ */

export interface PlannerDraft {
	title: string; col: number; s: string; st: string; en: string;
	rec: 'once' | 'daily' | 'weekly'; hrs: number; test: boolean;
}

export function addPlannerTask(day: string, draft: PlannerDraft) {
	updateTracker((s) => {
		s.h.push({
			id: uid(), kind: 'task', title: draft.title, due: day, done: false, subs: [],
			s: draft.s || undefined, col: draft.col, st: draft.st, en: draft.en, rec: draft.rec,
			hrs: draft.hrs, test: draft.test || undefined
		});
	});
}

export function patchTask(id: string, patch: Partial<HomeworkItem>) {
	updateTracker((s) => { const task = s.h.find((item) => item.id === id) ?? s.hd.find((item) => item.id === id); if (task) Object.assign(task, patch); });
}

export function deleteTask(id: string) {
	updateTracker((s) => { s.h = s.h.filter((item) => item.id !== id); s.hd = s.hd.filter((item) => item.id !== id); });
}

/** Flips a planner task's done state; returns the new state so callers can celebrate. */
export function toggleTask(id: string): boolean {
	let done = false;
	updateTracker((s) => {
		const list = s.h.some((item) => item.id === id) ? s.h : s.hd;
		const task = list.find((item) => item.id === id);
		if (!task) return;
		task.done = !task.done;
		task.fin = task.done ? Date.now() : undefined;
		done = Boolean(task.done);
		if (task.done) { s.h = s.h.filter((i) => i.id !== id); s.hd.push(task); }
		else { s.hd = s.hd.filter((i) => i.id !== id); s.h.push(task); }
	});
	return done;
}

export function moveTaskToDay(id: string, day: string) { patchTask(id, { due: day }); }

/** Reorders two tasks of the same day inside the flat homework array. */
export function reorderDayTasks(dragId: string, overId: string) {
	updateTracker((s) => {
		const from = s.h.findIndex((item) => item.id === dragId);
		const to = s.h.findIndex((item) => item.id === overId);
		if (from < 0 || to < 0) return;
		const [moved] = s.h.splice(from, 1);
		s.h.splice(to, 0, moved);
	});
}

export function addSubtask(id: string, text: string) {
	updateTracker((s) => {
		const task = s.h.find((item) => item.id === id) ?? s.hd.find((item) => item.id === id);
		if (!task) return;
		const subs = Array.isArray(task.subs) ? task.subs : [];
		subs.push(text);
		task.subs = subs;
	});
}

/* To Do list --------------------------------------------------------- */

export interface TodoDraft { title: string; sub?: string; ch?: number; source?: 'manual' | 'btest' }

export const openTodos = derived(tracker, ($t) => $t.todos.filter((item) => !item.done));

export function addTodo(draft: TodoDraft) {
	const title = draft.title.trim();
	if (!title) return;
	updateTracker((s) => {
		s.todos.push({ id: uid(), title, done: false, created: Date.now(), sub: draft.sub, ch: draft.ch, source: draft.source ?? 'manual' });
	});
}

/** Adds several To Do items in one save; skips titles already present (open or done). */
export function addTodos(drafts: TodoDraft[]): number {
	const clean = drafts.map((d) => ({ ...d, title: d.title.trim() })).filter((d) => d.title);
	if (!clean.length) return 0;
	let added = 0;
	updateTracker((s) => {
		const seen = new Set(s.todos.map((t) => t.title.toLowerCase()));
		for (const d of clean) {
			const key = d.title.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			s.todos.push({ id: uid(), title: d.title, done: false, created: Date.now(), sub: d.sub, ch: d.ch, source: d.source ?? 'btest' });
			added += 1;
		}
	});
	return added;
}

export function toggleTodo(id: string) {
	updateTracker((s) => { const item = s.todos.find((t) => t.id === id); if (item) item.done = !item.done; });
}

export function deleteTodo(id: string) {
	updateTracker((s) => { s.todos = s.todos.filter((t) => t.id !== id); });
}

/** Reorders the To Do list by moving dragId onto overId's position. */
export function reorderTodo(dragId: string, overId: string) {
	updateTracker((s) => {
		const from = s.todos.findIndex((t) => t.id === dragId);
		const to = s.todos.findIndex((t) => t.id === overId);
		if (from < 0 || to < 0 || from === to) return;
		const [moved] = s.todos.splice(from, 1);
		s.todos.splice(to, 0, moved);
	});
}


export function addTodoSubtask(todoId: string, title: string) {
	title = title.trim();
	if (!title) return;
	updateTracker((s) => {
		const todo = s.todos.find(t => t.id === todoId);
		if (todo) {
			if (!todo.subtasks) todo.subtasks = [];
			todo.subtasks.push({ id: uid(), title, done: false });
			todo.done = false; // automatically uncheck parent if a new subtask is added
		}
	});
}

export function toggleTodoSubtask(todoId: string, subtaskId: string) {
	let parentCompleted = false;
	updateTracker((s) => {
		const todo = s.todos.find(t => t.id === todoId);
		if (todo && todo.subtasks) {
			const sub = todo.subtasks.find(st => st.id === subtaskId);
			if (sub) {
				sub.done = !sub.done;
			}
			// Auto-complete parent if all subtasks are done
			if (todo.subtasks.length > 0 && todo.subtasks.every(st => st.done)) {
				todo.done = true;
				parentCompleted = true;
			} else {
				todo.done = false;
			}
		}
	});
	return parentCompleted;
}

export function deleteTodoSubtask(todoId: string, subtaskId: string) {
	updateTracker((s) => {
		const todo = s.todos.find(t => t.id === todoId);
		if (todo && todo.subtasks) {
			todo.subtasks = todo.subtasks.filter(st => st.id !== subtaskId);
		}
	});
}

export function clearDoneTodos() {
	updateTracker((s) => { s.todos = s.todos.filter((t) => !t.done); });
}

/* chapter checklist -------------------------------------------------- */
export const CHECKLIST_DEFAULT_COLS = ['Read Theory', 'Solved PYQs', 'Short Notes'];

const checklistGrid = (s: TrackerState, sub: string) => {
	s.chapterGrids ??= {};
	s.chapterGrids[sub] ??= { cols: [...CHECKLIST_DEFAULT_COLS], data: {} };
	return s.chapterGrids[sub];
};

export function toggleChecklistCell(sub: string, chNo: number, colIdx: number) {
	updateTracker((s) => {
		const grid = checklistGrid(s, sub);
		const row = (grid.data[chNo] ??= []);
		row[colIdx] = row[colIdx] === '✓' ? '' : '✓';
	});
}

export function addChecklistColumn(sub: string, name: string) {
	const label = name.trim();
	if (!label) return;
	updateTracker((s) => { checklistGrid(s, sub).cols.push(label); });
}

export function removeChecklistColumn(sub: string, colIdx: number) {
	updateTracker((s) => {
		const grid = checklistGrid(s, sub);
		grid.cols.splice(colIdx, 1);
		for (const row of Object.values(grid.data)) row.splice(colIdx, 1);
	});
}

export function saveRoutine(name: string, day: string) {
	updateTracker((s) => {
		const tasks = s.h.filter((item) => item.due === day).map((item) => ({ t: item.title ?? '', col: item.col ?? 0, s: item.s ?? '', hrs: item.hrs ?? 0 }));
		if (!tasks.length) return;
		s.lib.push({ id: uid(), n: name, tasks });
	});
}

export function applyRoutine(id: string, day: string) {
	updateTracker((s) => {
		const routine = s.lib.find((entry) => entry.id === id);
		if (!routine) return;
		for (const task of routine.tasks) {
			s.h.push({ id: uid(), kind: 'task', title: task.t, due: day, done: false, subs: [], col: task.col, s: task.s || undefined, hrs: task.hrs });
		}
	});
}

/* Goals tracker ------------------------------------------------------ */

export function addGoal(goal: Omit<TrackerGoal, 'id' | 'created'>) {
	updateTracker((s) => { s.gt.unshift({ ...goal, id: uid(), created: Date.now() }); });
}
export function patchGoal(id: string, patch: Partial<TrackerGoal>) {
	updateTracker((s) => { const goal = s.gt.find((entry) => entry.id === id); if (goal) Object.assign(goal, patch); });
}
export function deleteGoal(id: string) { updateTracker((s) => { s.gt = s.gt.filter((entry) => entry.id !== id); }); }
export function toggleMilestone(goalId: string, milestoneId: string) {
	updateTracker((s) => {
		const goal = s.gt.find((entry) => entry.id === goalId);
		const milestone = goal?.milestones.find((entry) => entry.id === milestoneId);
		if (milestone) milestone.done = !milestone.done;
	});
}

export const goalProgress = (goal: TrackerGoal): number => {
	if (goal.type === 'pyq') return goal.target > 0 ? Math.min(1, goal.solved / goal.target) : 0;
	if (!goal.milestones.length) return 0;
	return goal.milestones.filter((m) => m.done).length / goal.milestones.length;
};
export const goalStatus = (goal: TrackerGoal, today = todayKey()): 'completed' | 'overdue' | 'in-progress' => {
	if (goalProgress(goal) >= 1) return 'completed';
	return goal.deadline && goal.deadline < today ? 'overdue' : 'in-progress';
};

/* Reflection journal -------------------------------------------------- */

export function setReflection(day: string, tab: 'post' | 'mistakes', text: string) {
	updateTracker((s) => {
		const entry = s.refl[day] ?? (s.refl[day] = { post: '', mistakes: '', savedAt: null });
		entry[tab] = text;
		entry.savedAt = new Date().toISOString();
	});
}

/* Subject hub sessions + manual logs ---------------------------------- */

export function addSubjectSession(input: { sub: string; ch: string; att: number; cor: number }) {
	updateTracker((s) => {
		const day = todayKey();
		s.sess.unshift({ id: uid(), day, sub: input.sub, ch: input.ch, att: input.att, cor: input.cor, at: Date.now() });
		const bucket = s.stat[day] ?? (s.stat[day] = {});
		bucket[input.sub] = (Number(bucket[input.sub]) || 0) + input.cor;
	});
}

export function logManualMinutes(minutes: number, subject: string | null, chapter?: string | null) {
	const start = Math.floor(Date.now() / 60000) - minutes;
	logStudySession([start, minutes, 'Manual', null, undefined, undefined, undefined, subject ?? undefined, chapter ?? undefined]);
}

/* Spaced revision ----------------------------------------------------- */

export function addRevisionPlan(input: { sub: string; ch: string; method: 'steady' | 'fast' | 'smart' }) {
	updateTracker((s) => {
		const key = `${input.sub}:${input.ch}`;
		s.rev.items[key] = {
			weight: 1, last: null, method: input.method, step: 1, sub: input.sub, ch: input.ch,
			ef: 2.5, remindDate: todayKey(), remindDone: false
		};
	});
}

export function completeRevision(key: string, rating?: number) {
	updateTracker((s) => {
		const item = s.rev.items[key];
		if (!item) return;
		const method = item.method ?? 'steady';
		let step = (item.step ?? 1) + 1;
		let ef = item.ef ?? 2.5;
		if (method === 'smart' && rating) {
			ef = Math.min(2.8, Math.max(1.3, ef + (0.1 - (5 - rating) * (0.08 + 0.02 * rating))));
			if (rating < 3) step = 1;
		}
		item.last = Date.now();
		item.step = step;
		item.ef = ef;
		item.remindDone = false;
		item.remindDate = addDaysKey(todayKey(), intervalFor(method, step, ef));
	});
}

export function deleteRevision(key: string) { updateTracker((s) => { delete s.rev.items[key]; }); }

/** Postpone a due revision by one day without advancing its spacing step. */
export function snoozeRevision(key: string) {
	updateTracker((s) => {
		const item = s.rev.items[key];
		if (item) item.remindDate = addDaysKey(todayKey(), 1);
	});
}

export const revisedToday = derived(tracker, ($t) => Object.values($t.rev.items).filter((item) => item.last && dayKeyOf(new Date(item.last)) === todayKey()).length);

/* Feed selectors ------------------------------------------------------ */

export const upNextTasks = derived(tracker, ($t) => {
	const today = todayKey();
	return $t.h.filter((item) => !item.done && item.due && item.due <= today).slice(0, 6);
});

export interface ActivityEntry {
	id: string; kind: 'questions' | 'focus'; title: string; sub: string | null;
	meta: string; right: string; badge?: string; at: number; color: string;
}

export const recentActivity = derived(tracker, ($t): ActivityEntry[] => {
	const fromSessions: ActivityEntry[] = $t.sess.map((entry) => ({
		id: entry.id, kind: 'questions', title: entry.ch, sub: entry.sub,
		meta: `${entry.att} QS`, right: `${entry.att ? Math.round((entry.cor / entry.att) * 100) : 0}%`,
		at: entry.at, color: subjectColor(entry.sub)
	}));
	const fromLog: ActivityEntry[] = $t.log.map((session, index) => ({
		id: `log-${index}`, kind: 'focus', title: 'Focus Session', sub: session[7] ?? null,
		meta: `${session[1]}M`, right: `${session[1]}M`, badge: session[2] === 'Manual' ? 'MANUAL' : undefined,
		at: session[0] * 60000, color: session[7] ? subjectColor(session[7]) : '#6d5dfc'
	}));
	return [...fromSessions, ...fromLog].sort((a, b) => b.at - a.at).slice(0, 8);
});

export const subjectSolvedTotals = derived(tracker, ($t) => {
	const out: Record<string, number> = {};
	for (const bucket of Object.values($t.stat)) {
		for (const [code, value] of Object.entries(bucket)) out[code] = (out[code] ?? 0) + (Number(value) || 0);
	}
	return out;
});

export const weeklyFocusMinutes = derived(tracker, ($t) => lastNDays(7).reduce((sum, key) => sum + focusMinutesOn($t.log, key), 0));

export const streakDays = derived(tracker, ($t) => {
	const need = ($t.meta?.streakGoalH || 1) * 60;
	const met = (key: string) => focusMinutesOn($t.log, key) >= need;
	let cursor = todayKey();
	if (!met(cursor)) cursor = addDaysKey(cursor, -1);
	let count = 0;
	while (count < 3650 && met(cursor)) { count += 1; cursor = addDaysKey(cursor, -1); }
	return count;
});

export const peakProductivity = derived(tracker, ($t) => {
	const buckets: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
	let total = 0;
	for (const session of $t.log) {
		const part = dayPartOf(new Date(session[0] * 60000).getHours());
		buckets[part] += session[1];
		total += session[1];
	}
	const [label, minutes] = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
	return { label, minutes, pct: total ? Math.round((minutes / total) * 100) : 0, has: total > 0 };
});

export const subjectHealth = derived(tracker, ($t) => SUBJECTS.map((meta) => {
	let last: number | null = null;
	for (const session of $t.log) if (session[7] === meta.code) last = Math.max(last ?? 0, session[0] * 60000);
	for (const entry of $t.sess) if (entry.sub === meta.code) last = Math.max(last ?? 0, entry.at);
	let badge = 'NEVER';
	if (last) {
		const hours = (Date.now() - last) / 3600000;
		badge = hours < 1 ? 'JUST NOW' : hours < 24 ? `${Math.round(hours)}H AGO` : `${Math.round(hours / 24)}D AGO`;
	}
	return { ...meta, last, badge };
}).sort((a, b) => (a.last ?? 0) - (b.last ?? 0)));

/* Activity map + study analysis --------------------------------------- */

export type MapGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface ActivityCell { key: string; label: string; minutes: number; today: boolean }
export interface ActivityWindow { cells: ActivityCell[]; total: number; caption: string; canNext: boolean; cols: number }

const minutesByDay = (log: StudySession[]) => {
	const out: Record<string, number> = {};
	for (const session of log) { const key = sessionDayKey(session); out[key] = (out[key] ?? 0) + session[1]; }
	return out;
};

export function activityWindow(state: TrackerState, gran: MapGranularity, offset: number): ActivityWindow {
	const log = state.log;
	const today = todayKey();
	if (gran === 'daily') {
		const base = addDaysKey(today, offset);
		const cells: ActivityCell[] = Array.from({ length: 24 }, (_, hour) => {
			let minutes = 0;
			for (const session of log) {
				if (sessionDayKey(session) !== base) continue;
				if (new Date(session[0] * 60000).getHours() === hour) minutes += session[1];
			}
			return { key: `${base}-${hour}`, label: `${hour}`, minutes, today: base === today };
		});
		return { cells, total: focusMinutesOn(log, base), caption: base === today ? 'Today' : base, canNext: offset < 0, cols: 12 };
	}
	if (gran === 'weekly') {
		const start = startOfWeek();
		start.setDate(start.getDate() + offset * 7);
		const byDay = minutesByDay(log);
		const cells: ActivityCell[] = Array.from({ length: 7 }, (_, index) => {
			const d = new Date(start);
			d.setDate(start.getDate() + index);
			const key = dayKeyOf(d);
			return { key, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], minutes: byDay[key] ?? 0, today: key === today };
		});
		const end = new Date(start); end.setDate(start.getDate() + 6);
		const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
		return { cells, total: cells.reduce((sum, cell) => sum + cell.minutes, 0), caption: `${fmt(start)} – ${fmt(end)}`, canNext: offset < 0, cols: 7 };
	}
	if (gran === 'monthly') {
		const now = new Date();
		const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
		const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
		const byDay = minutesByDay(log);
		const cells: ActivityCell[] = Array.from({ length: days }, (_, index) => {
			const key = dayKeyOf(new Date(base.getFullYear(), base.getMonth(), index + 1));
			return { key, label: `${index + 1}`, minutes: byDay[key] ?? 0, today: key === today };
		});
		return { cells, total: cells.reduce((sum, cell) => sum + cell.minutes, 0), caption: base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), canNext: offset < 0, cols: 7 };
	}
	const now = new Date();
	const year = now.getFullYear() + offset;
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const days = leap ? 366 : 365;
	const byDay = minutesByDay(log);
	const cells: ActivityCell[] = Array.from({ length: days }, (_, index) => {
		const key = dayKeyOf(new Date(year, 0, index + 1));
		return { key, label: '', minutes: byDay[key] ?? 0, today: key === today };
	});
	return { cells, total: cells.reduce((sum, cell) => sum + cell.minutes, 0), caption: `${year}`, canNext: offset < 0, cols: 53 };
}

export interface AnalysisBucket { label: string; minutes: number; parts: { code: string; minutes: number }[] }
export interface AnalysisSummary {
	hours: number; sessions: number; avg: number;
	bySubject: { code: string; name: string; color: string; minutes: number; pct: number }[];
	bars: AnalysisBucket[];
}

export function analysisSummary(state: TrackerState, gran: MapGranularity, offset: number): AnalysisSummary {
	const window = activityWindow(state, gran === 'daily' ? 'weekly' : gran, offset);
	const keys = new Set(window.cells.map((cell) => cell.key));
	const sessions = state.log.filter((session) => keys.has(sessionDayKey(session)));
	const perSubject: Record<string, number> = {};
	for (const session of sessions) {
		const code = session[7] ?? 'X';
		perSubject[code] = (perSubject[code] ?? 0) + session[1];
	}
	const total = sessions.reduce((sum, session) => sum + session[1], 0);
	const bySubject = SUBJECTS.map((meta) => ({
		code: meta.code, name: meta.name, color: meta.color,
		minutes: perSubject[meta.code] ?? 0, pct: total ? Math.round(((perSubject[meta.code] ?? 0) / total) * 100) : 0
	}));
	const bars: AnalysisBucket[] = window.cells.map((cell) => {
		const parts: { code: string; minutes: number }[] = [];
		if (gran === 'weekly' || gran === 'daily') {
			for (const session of state.log) {
				if (sessionDayKey(session) !== cell.key) continue;
				const code = session[7] ?? 'X';
				const found = parts.find((part) => part.code === code);
				if (found) found.minutes += session[1]; else parts.push({ code, minutes: session[1] });
			}
		}
		return { label: cell.label, minutes: cell.minutes, parts };
	});
	return { hours: total, sessions: sessions.length, avg: sessions.length ? Math.round(total / sessions.length) : 0, bySubject, bars };
}

/** Hour-of-day minutes for the 24h distribution strip. */
export function hourDistribution(state: TrackerState, key: string): number[] {
	const out = Array.from({ length: 24 }, () => 0);
	for (const session of state.log) {
		if (sessionDayKey(session) !== key) continue;
		out[new Date(session[0] * 60000).getHours()] += session[1];
	}
	return out;
}

/* Intelligence (Stats) selectors --------------------------------------- */

export interface MomentumStatus { id: string; word: string; color: string; sentence: string }
export const MOMENTUM_GUIDE: MomentumStatus[] = [
	{ id: 'relentless', word: 'RELENTLESS', color: '#d99a2b', sentence: '7+ day streak. Peak consistency.' },
	{ id: 'accelerating', word: 'ACCELERATING', color: '#2f9e6e', sentence: '3+ day streak. Momentum building.' },
	{ id: 'outpacing', word: 'OUTPACING', color: '#3ddc84', sentence: 'More hours this week than last.' },
	{ id: 'atrisk', word: 'AT RISK', color: '#e0455a', sentence: 'Streak alive, but no study today yet.' },
	{ id: 'recharged', word: 'RECHARGED', color: '#8b7bff', sentence: 'Back after a break. Time to reload.' },
	{ id: 'building', word: 'BUILDING', color: '#8b87a0', sentence: 'Just starting. Keep going.' }
];

export const momentum = derived([tracker, streakDays], ([$t, streak]): MomentumStatus & { guide: MomentumStatus[] } => {
	const week = (startOffset: number) => {
		const start = startOfWeek();
		start.setDate(start.getDate() + startOffset);
		let sum = 0;
		for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); if (d > new Date()) break; sum += focusMinutesOn($t.log, dayKeyOf(d)); }
		return sum;
	};
	const thisWeek = week(0);
	const lastWeek = week(-7);
	const studiedToday = focusMinutesOn($t.log, todayKey()) > 0;
	let status = MOMENTUM_GUIDE[5];
	if (streak >= 7) status = MOMENTUM_GUIDE[0];
	else if (streak >= 3) status = MOMENTUM_GUIDE[1];
	else if (thisWeek > lastWeek && thisWeek > 0) status = MOMENTUM_GUIDE[2];
	else if (streak > 0 && !studiedToday) status = MOMENTUM_GUIDE[3];
	else if (studiedToday && streak <= 1) status = MOMENTUM_GUIDE[4];
	const sentences: Record<string, string> = {
		relentless: 'A week-plus streak. Your discipline is compounding.',
		accelerating: 'Three or more days in a row. Momentum is building.',
		outpacing: "You've studied more hours this week than last week. Your discipline is accelerating.",
		atrisk: 'Your streak is alive but today is empty. One block saves it.',
		recharged: 'Back after a break. Reload with an easy win today.',
		building: 'Every system starts at zero. Log sessions to build momentum.'
	};
	return { ...status, sentence: sentences[status.id], guide: MOMENTUM_GUIDE };
});

export const intelligence = derived(tracker, ($t) => {
	const byDay = minutesByDay($t.log);
	const days = Object.keys(byDay);
	const lifetime = $t.log.reduce((sum, session) => sum + session[1], 0);
	const now = new Date();
	const monthDays = days.filter((key) => key.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)).length;
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	let bestKey = ''; let bestMinutes = 0;
	for (const [key, minutes] of Object.entries(byDay)) if (minutes > bestMinutes) { bestMinutes = minutes; bestKey = key; }
	const span = days.length ? Math.max(1, Math.round((Date.now() / 60000 - Math.min(...$t.log.map((s) => s[0]))) / 1440)) : 0;
	let maxStreak = 0;
	if (days.length) {
		const sorted = [...days].sort();
		let run = 1;
		maxStreak = 1;
		for (let i = 1; i < sorted.length; i++) {
			run = addDaysKey(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
			maxStreak = Math.max(maxStreak, run);
		}
	}
	const chapters = new Set($t.sess.map((entry) => `${entry.sub}:${entry.ch}`));
	const hours = lifetime / 60;
	const rank = hours >= 150 ? 'ELITE' : hours >= 50 ? 'ADVANCED' : hours >= 10 ? 'INTERMEDIATE' : 'NOVICE';
	return {
		monthDays, daysInMonth, avgDaily: span ? Math.round(lifetime / span) : lifetime, bestKey, bestMinutes,
		lifetimeHours: Math.round(hours * 10) / 10, sessions: $t.log.length, chaptersHit: chapters.size, maxStreak, rank
	};
});

/* Stopwatch reports (session-only) ------------------------------------- */

export interface StopwatchReport {
	sub: string; kind: 'questions' | 'theory' | 'revision'; at: number; seconds: number;
	done: number; correct: number; mistakes: number;
}
export const stopwatchReports = writable<StopwatchReport[]>([]);

/* Question log --------------------------------------------------------- */

export interface QuestionLoc { sc: string; ch: number; ex: string }
export type QuestionAction =
	| 'done' | 'undone' | 'correct' | 'wrong' | 'cant' | 'flag' | 'unflag' | 'clear'
	| 's0' | 's1' | 's2' | 's3';

/** Per-day solved counters, skipped while "catching up" mode is on. */
function bumpSolved(state: TrackerState, sc: string, delta: number) {
	if (state.norec) return;
	const day = todayKey();
	const bucket = state.stat[day] ?? (state.stat[day] = {});
	bucket[sc] = Math.max(0, (Number(bucket[sc]) || 0) + delta);
	if (!bucket[sc]) delete bucket[sc];
	if (!Object.keys(bucket).length) delete state.stat[day];
}

function cellsFor(state: TrackerState, loc: QuestionLoc): number[] {
	const key = cellKey(loc.sc, loc.ch, loc.ex);
	const n = questionCount(state, loc.sc, loc.ch, loc.ex);
	const existing = state.d[key];
	if (!existing || existing.length !== n) {
		const next = new Array<number>(n).fill(0);
		for (let i = 0; i < Math.min(existing?.length ?? 0, n); i++) next[i] = existing![i];
		state.d[key] = next;
	}
	return state.d[key];
}

function applyAction(state: TrackerState, loc: QuestionLoc, i: number, action: QuestionAction) {
	const cells = cellsFor(state, loc);
	const qk = questionKey(loc.sc, loc.ch, loc.ex, i);
	const before = cells[i] || 0;
	const wasDone = isDone(before);
	let v = before;
	if (action === 'done') v = setDone(v, true);
	else if (action === 'undone') { v = setResult(setDone(v, false), 0); delete state.r[qk]; }
	else if (action === 'correct') { v = setResult(setDone(v, true), 1); delete state.r[qk]; }
	else if (action === 'wrong') {
		v = setResult(setDone(v, true), 2);
		if (!state.r[qk]) state.r[qk] = { d: todayKey(), t: ['oth'] };
	}
	else if (action === 'cant') { v = setResult(setDone(v, false), 3); delete state.r[qk]; }
	else if (action === 'flag') v = setFlag(v, true);
	else if (action === 'unflag') v = setFlag(v, false);
	else if (action === 'clear') { v = 0; delete state.n[qk]; delete state.r[qk]; }
	else if (action[0] === 's') v = setStars(v, Number(action[1]));
	cells[i] = v;
	if (!wasDone && isDone(v)) bumpSolved(state, loc.sc, 1);
	if (wasDone && !isDone(v)) bumpSolved(state, loc.sc, -1);
}

export function setQuestionCount(loc: QuestionLoc, count: number) {
	updateTracker((s) => { s.x.cnt[cellKey(loc.sc, loc.ch, loc.ex)] = Math.min(2000, Math.max(1, Math.round(count))); });
}

export function toggleQuestionDone(loc: QuestionLoc, i: number) {
	updateTracker((s) => {
		const cells = cellsFor(s, loc);
		const qk = questionKey(loc.sc, loc.ch, loc.ex, i);
		const was = isDone(cells[i] || 0);
		let v = setDone(cells[i] || 0, !was);
		if (was) { v = setResult(v, 0); delete s.r[qk]; }
		cells[i] = v;
		bumpSolved(s, loc.sc, was ? -1 : 1);
	});
}

/** r = 0 clears the result; 3 ("could not solve") unticks Solved, matching the original. */
export function setQuestionResult(loc: QuestionLoc, i: number, r: 0 | 1 | 2 | 3) {
	updateTracker((s) => {
		const cells = cellsFor(s, loc);
		const qk = questionKey(loc.sc, loc.ch, loc.ex, i);
		const before = cells[i] || 0;
		const was = isDone(before);
		const current = resultOf(before);
		let v: number;
		if (current === r) {
			v = setResult(before, 0);
			if (current === 2) delete s.r[qk];
		} else {
			v = setResult(setDone(before, r !== 3), r);
			if (r === 2) s.r[qk] = s.r[qk] ?? { d: todayKey(), t: [] };
			else delete s.r[qk];
		}
		cells[i] = v;
		if (!was && isDone(v)) bumpSolved(s, loc.sc, 1);
		if (was && !isDone(v)) bumpSolved(s, loc.sc, -1);
	});
}

export function toggleQuestionFlag(loc: QuestionLoc, i: number) {
	updateTracker((s) => { const cells = cellsFor(s, loc); cells[i] = setFlag(cells[i] || 0, !isFlag(cells[i] || 0)); });
}

export function setQuestionStars(loc: QuestionLoc, i: number, stars: number) {
	updateTracker((s) => {
		const cells = cellsFor(s, loc);
		const current = starsOf(cells[i] || 0);
		cells[i] = setStars(cells[i] || 0, current === stars ? 0 : stars);
	});
}

export function setQuestionNote(loc: QuestionLoc, i: number, text: string) {
	updateTracker((s) => {
		const qk = questionKey(loc.sc, loc.ch, loc.ex, i);
		if (text.trim()) s.n[qk] = text; else delete s.n[qk];
	});
}

export function setQuestionReasons(loc: QuestionLoc, i: number, tags: string[]) {
	updateTracker((s) => {
		const qk = questionKey(loc.sc, loc.ch, loc.ex, i);
		const rec = s.r[qk] ?? (s.r[qk] = { d: todayKey(), t: [] });
		rec.t = tags;
	});
}

export function addWrongTag(name: string): string {
	const id = `u${Date.now().toString(36)}`;
	updateTracker((s) => { s.x.tags.push({ id, n: name }); });
	return id;
}

/** Bulk edit over an explicit index list (range apply, selection bar, mark-all). */
export function applyQuestionAction(loc: QuestionLoc, indices: number[], action: QuestionAction) {
	updateTracker((s) => { for (const i of indices) applyAction(s, loc, i, action); });
}

export function bulkExercise(loc: QuestionLoc, action: 'done' | 'correct' | 'clear') {
	updateTracker((s) => {
		const n = questionCount(s, loc.sc, loc.ch, loc.ex);
		const indices = Array.from({ length: n }, (_, i) => i);
		for (const i of indices) applyAction(s, loc, i, action === 'done' ? 'done' : action === 'correct' ? 'correct' : 'clear');
	});
}

