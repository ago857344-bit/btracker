import { derived, get } from 'svelte/store';
import { tracker } from './tracker';
import type { ChapterPriority, ChapterRecallData } from '$lib/types/tracker';
import {
	calculateChapterPriority,
	calculateCurrentScore,
	calculateHealthStatus,
	sortByPriority,
	daysUntilThreshold,
	isChapterStudied
} from '$lib/state/decay';
import { getSubtopicsSorted, getStaleSubtopics } from '$lib/state/subtopics';
import { todayKey, addDaysKey } from '$lib/state/dates';

/**
 * Derived store: All chapter recall data
 */
export const chaptersRecallData = derived(tracker, ($tracker) => $tracker.rev.chapters);

/**
 * Derived store: Chapters sorted by priority (highest priority first)
 */
export const chaptersByPriority = derived(tracker, ($tracker) => {
	const chapters = Object.values($tracker.rev.chapters);
	const priorities = chapters
		.filter((ch) => isChapterStudied($tracker, ch.chapterKey))
		.map((ch) =>
			calculateChapterPriority(ch.chapterKey, ch.weightage, ch.decay)
		);
	return sortByPriority(priorities);
});

/**
 * Derived store: Chapters due today (score below fading threshold)
 * Excludes unstudied / phantom chapters.
 */
export const chaptersDueToday = derived(tracker, ($tracker) => {
	const chapters = Object.values($tracker.rev.chapters);
	return chapters
		.filter((ch) => {
			if (!isChapterStudied($tracker, ch.chapterKey)) return false;
			const score = calculateCurrentScore(ch.decay);
			return score < 60; // Below fading threshold
		})
		.map((ch) => calculateChapterPriority(ch.chapterKey, ch.weightage, ch.decay))
		.sort((a, b) => a.currentScore - b.currentScore); // Sort by lowest score first
});

/**
 * Derived store: Chapters in critical state (score below critical threshold)
 * Excludes unstudied / phantom chapters.
 */
export const criticalChapters = derived(tracker, ($tracker) => {
	const chapters = Object.values($tracker.rev.chapters);
	return chapters
		.filter((ch) => {
			if (!isChapterStudied($tracker, ch.chapterKey)) return false;
			const score = calculateCurrentScore(ch.decay);
			return score < 30; // Below critical threshold
		})
		.map((ch) => calculateChapterPriority(ch.chapterKey, ch.weightage, ch.decay))
		.sort((a, b) => a.currentScore - b.currentScore);
});

export interface RevisionReminderItem {
	id: string;
	chapterKey: string;
	subject: string;
	chapterName: string;
	currentScore: number;
	health: 'fresh' | 'fading' | 'critical';
	dueDate: string;
	group: 'overdue' | 'today' | 'week';
	weightage: 1 | 2 | 3;
	lastRevisionAt: number | null;
	step?: number;
}

/**
 * Derived store: All active revision reminders across Overdue, Today, and This Week.
 * Accurately schedules upcoming reviews for chapters studied via Focus / Pomodoro,
 * and strictly omits unstudied chapters.
 */
export const allRevisionReminders = derived(tracker, ($tracker) => {
	const today = todayKey();
	const weekEnd = addDaysKey(today, 6);
	const itemsMap = new Map<string, RevisionReminderItem>();

	// 1. Process studied chapters from Active Recall ($tracker.rev.chapters)
	for (const ch of Object.values($tracker.rev.chapters)) {
		if (!isChapterStudied($tracker, ch.chapterKey)) continue;

		const [s, ...rest] = ch.chapterKey.split(/[-:]/);
		const chName = rest.join('-').trim();
		const currentScore = calculateCurrentScore(ch.decay);
		const health = calculateHealthStatus(currentScore);

		let dueDate: string;
		if (ch.nextRevisionDate) {
			dueDate = ch.nextRevisionDate;
		} else if (currentScore < 60) {
			dueDate = today;
		} else {
			const daysLeft = daysUntilThreshold(ch.decay, 60);
			dueDate = addDaysKey(today, Math.max(1, Math.round(daysLeft)));
		}

		let group: 'overdue' | 'today' | 'week' | null = null;
		if (dueDate < today || currentScore < 30) {
			group = 'overdue';
		} else if (dueDate === today || currentScore < 60) {
			group = 'today';
		} else if (dueDate <= weekEnd) {
			group = 'week';
		}

		if (group) {
			const normKey = `${s}-${chName.toLowerCase()}`;
			itemsMap.set(normKey, {
				id: `rev-${ch.chapterKey}`,
				chapterKey: ch.chapterKey,
				subject: s,
				chapterName: chName,
				currentScore,
				health,
				dueDate,
				group,
				weightage: ch.weightage,
				lastRevisionAt: ch.decay.lastRevisionAt
			});
		}
	}

	// 2. Process spaced revision items ($tracker.rev.items)
	for (const [key, item] of Object.entries($tracker.rev.items)) {
		if (!item.last || item.last <= 0 || item.remindDone) continue;

		const s = item.sub || key.split(/[-:]/)[0];
		const chName = item.ch || key.split(/[-:]/).slice(1).join('-');
		const normKey = `${s}-${chName.toLowerCase()}`;
		const dueDate = item.remindDate || today;

		let group: 'overdue' | 'today' | 'week' | null = null;
		if (dueDate < today) {
			group = 'overdue';
		} else if (dueDate === today) {
			group = 'today';
		} else if (dueDate <= weekEnd) {
			group = 'week';
		}

		if (group && !itemsMap.has(normKey)) {
			itemsMap.set(normKey, {
				id: `rev-${s}-${chName}`,
				chapterKey: `${s}-${chName}`,
				subject: s,
				chapterName: chName,
				currentScore: 80,
				health: group === 'overdue' ? 'critical' : group === 'today' ? 'fading' : 'fresh',
				dueDate,
				group,
				weightage: (item.weight as 1 | 2 | 3) || 2,
				lastRevisionAt: item.last,
				step: item.step
			});
		}
	}

	return Array.from(itemsMap.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
});


/**
 * Derived store: Get chapter recall data by key
 *
 * @param chapterKey - Chapter identifier
 * @returns Derived store with chapter data or undefined
 */
export function getChapterRecallData(chapterKey: string) {
	return derived(tracker, ($tracker) => $tracker.rev.chapters[chapterKey]);
}

/**
 * Derived store: Get chapter priority by key
 *
 * @param chapterKey - Chapter identifier
 * @returns Derived store with chapter priority or undefined
 */
export function getChapterPriority(chapterKey: string) {
	return derived(tracker, ($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return undefined;
		return calculateChapterPriority(chapter.chapterKey, chapter.weightage, chapter.decay);
	});
}

/**
 * Derived store: Get subtopics for a chapter, sorted by last revision
 *
 * @param chapterKey - Chapter identifier
 * @returns Derived store with sorted subtopics
 */
export function getChapterSubtopics(chapterKey: string) {
	return derived(tracker, ($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return [];
		return getSubtopicsSorted(chapter);
	});
}

/**
 * Derived store: Get stale subtopics for a chapter
 *
 * @param chapterKey - Chapter identifier
 * @param daysThreshold - Days threshold (default: 7)
 * @returns Derived store with stale subtopics
 */
export function getChapterStaleSubtopics(chapterKey: string, daysThreshold: number = 7) {
	return derived(tracker, ($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return [];
		return getStaleSubtopics(chapter, daysThreshold);
	});
}

/**
 * Derived store: Daily heatmap data for the last 90 days
 */
export const heatmapData = derived(tracker, ($tracker) => {
	const today = todayKey();
	const heatmap: Record<string, { revisedCount: number; totalTimeMinutes: number }> = {};

	// Initialize with actual data
	Object.entries($tracker.rev.dailyHeatmap).forEach(([date, data]) => {
		heatmap[date] = data;
	});

	return heatmap;
});

/**
 * Derived store: Today's revision statistics
 */
export const todayRevisionStats = derived(tracker, ($tracker) => {
	const today = todayKey();
	const todayData = $tracker.rev.dailyHeatmap[today];

	return {
		revisedCount: todayData?.revisedCount ?? 0,
		totalTimeMinutes: todayData?.totalTimeMinutes ?? 0
	};
});

/**
 * Derived store: Active focus sessions (currently running)
 */
export const activeFocusSessions = derived(tracker, ($tracker) => {
	return $tracker.rev.focusSessions.filter((session) => session.isRunning);
});

/**
 * Get a chapter's current health status
 *
 * @param chapterKey - Chapter identifier
 * @returns Health status ('fresh', 'fading', 'critical')
 */
export function getChapterHealth(chapterKey: string) {
	return derived(tracker, ($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return 'critical';
		const score = calculateCurrentScore(chapter.decay);
		return calculateHealthStatus(score);
	});
}

/**
 * Get a chapter's current decay score
 *
 * @param chapterKey - Chapter identifier
 * @returns Current decayed score (0-100)
 */
export function getChapterScore(chapterKey: string) {
	return derived(tracker, ($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return 0;
		return calculateCurrentScore(chapter.decay);
	});
}

/**
 * Get days until a chapter reaches critical threshold
 *
 * @param chapterKey - Chapter identifier
 * @returns Days until critical, or Infinity if never
 */
export function getDaysUntilCritical(chapterKey: string) {
	return derived(tracker, ($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return 0;
		return daysUntilThreshold(chapter.decay);
	});
}

/**
 * Get all chapters for a specific subject
 *
 * @param subjectCode - Subject code (e.g., 'P', 'C', 'M')
 * @returns Array of chapter recall data for the subject
 */
export function getSubjectChapters(subjectCode: string) {
	return derived(tracker, ($tracker) => {
		return Object.values($tracker.rev.chapters).filter((ch) =>
			ch.chapterKey.startsWith(`${subjectCode}-`)
		);
	});
}

/**
 * Get total number of chapters tracked
 */
export const totalChaptersTracked = derived(tracker, ($tracker) => {
	return Object.keys($tracker.rev.chapters).length;
});

/**
 * Get number of chapters in each health status
 */
export const healthStatusCounts = derived(tracker, ($tracker) => {
	const counts = { fresh: 0, fading: 0, critical: 0 };

	Object.values($tracker.rev.chapters).forEach((ch) => {
		const score = calculateCurrentScore(ch.decay);
		const health = calculateHealthStatus(score);
		counts[health]++;
	});

	return counts;
});

/**
 * Get average memory score across all chapters
 */
export const averageMemoryScore = derived(tracker, ($tracker) => {
	const chapters = Object.values($tracker.rev.chapters);
	if (chapters.length === 0) return 0;

	const totalScore = chapters.reduce((sum, ch) => sum + calculateCurrentScore(ch.decay), 0);
	return totalScore / chapters.length;
});

/**
 * Get chapter recall data synchronously (for use in actions)
 *
 * @param chapterKey - Chapter identifier
 * @returns Chapter recall data or undefined
 */
export function getChapterRecallDataSync(chapterKey: string): ChapterRecallData | undefined {
	const $tracker = get(tracker);
	return $tracker.rev.chapters[chapterKey];
}

/**
 * Get all chapter recall data synchronously
 *
 * @returns All chapter recall data
 */
export function getAllChaptersRecallDataSync(): Record<string, ChapterRecallData> {
	const $tracker = get(tracker);
	return $tracker.rev.chapters;
}
