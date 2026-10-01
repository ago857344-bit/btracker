import type {
	SubtopicProgress,
	ModalityTag,
	ChapterRecallData,
	ConfidenceRating
} from '$lib/types/tracker';
import { createInitialDecayMetrics, updateDecayAfterRevision } from './decay';

/**
 * Create a new subtopic progress entry
 *
 * @param id - Subtopic identifier
 * @param name - Subtopic display name
 * @returns Initial subtopic progress
 */
export function createSubtopicProgress(id: string, name: string): SubtopicProgress {
	return {
		id,
		name,
		lastRevisedAt: null,
		modalities: [],
		decay: createInitialDecayMetrics(0, 7) // Start with 0 score until revised
	};
}

/**
 * Add a subtopic to a chapter's recall data
 *
 * @param chapterData - Chapter recall data
 * @param subtopicId - Subtopic identifier
 * @param subtopicName - Subtopic display name
 * @returns Updated chapter recall data
 */
export function addSubtopicToChapter(
	chapterData: ChapterRecallData,
	subtopicId: string,
	subtopicName: string
): ChapterRecallData {
	if (chapterData.subtopics[subtopicId]) {
		return chapterData; // Already exists
	}

	return {
		...chapterData,
		subtopics: {
			...chapterData.subtopics,
			[subtopicId]: createSubtopicProgress(subtopicId, subtopicName)
		}
	};
}

/**
 * Record a revision for a specific subtopic
 *
 * @param chapterData - Chapter recall data
 * @param subtopicId - Subtopic identifier
 * @param modalities - Modalities used in this revision
 * @param confidence - Self-evaluation rating
 * @returns Updated chapter recall data
 */
export function recordSubtopicRevision(
	chapterData: ChapterRecallData,
	subtopicId: string,
	modalities: ModalityTag[],
	confidence: ConfidenceRating
): ChapterRecallData {
	const subtopic = chapterData.subtopics[subtopicId];
	if (!subtopic) {
		// Auto-create if doesn't exist
		return recordSubtopicRevision(
			addSubtopicToChapter(chapterData, subtopicId, subtopicId),
			subtopicId,
			modalities,
			confidence
		);
	}

	// Update subtopic decay metrics
	const updatedSubtopic: SubtopicProgress = {
		...subtopic,
		lastRevisedAt: Date.now(),
		modalities: [...new Set([...subtopic.modalities, ...modalities])], // Deduplicate
		decay: updateDecayAfterRevision(subtopic.decay, confidence)
	};

	// Also update chapter-level modalities
	const updatedChapterModalities = [
		...new Set([...chapterData.modalities, ...modalities])
	] as ModalityTag[];

	return {
		...chapterData,
		subtopics: {
			...chapterData.subtopics,
			[subtopicId]: updatedSubtopic
		},
		modalities: updatedChapterModalities
	};
}

/**
 * Get all subtopics for a chapter, sorted by last revision date
 *
 * @param chapterData - Chapter recall data
 * @returns Array of subtopic progress objects, sorted by last revision (most recent first)
 */
export function getSubtopicsSorted(chapterData: ChapterRecallData): SubtopicProgress[] {
	return Object.values(chapterData.subtopics).sort((a, b) => {
		const aTime = a.lastRevisedAt ?? 0;
		const bTime = b.lastRevisedAt ?? 0;
		return bTime - aTime;
	});
}

/**
 * Get subtopics that haven't been revised within a threshold
 *
 * @param chapterData - Chapter recall data
 * @param daysThreshold - Days threshold (default: 7)
 * @returns Array of stale subtopics
 */
export function getStaleSubtopics(
	chapterData: ChapterRecallData,
	daysThreshold: number = 7
): SubtopicProgress[] {
	const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

	return Object.values(chapterData.subtopics).filter(
		(subtopic) => !subtopic.lastRevisedAt || subtopic.lastRevisedAt < threshold
	);
}

/**
 * Get the most recently revised subtopic
 *
 * @param chapterData - Chapter recall data
 * @returns Most recently revised subtopic, or null if none
 */
export function getMostRecentSubtopic(chapterData: ChapterRecallData): SubtopicProgress | null {
	const subtopics = Object.values(chapterData.subtopics);
	if (subtopics.length === 0) return null;

	return subtopics.reduce((mostRecent, current) => {
		const mostRecentTime = mostRecent.lastRevisedAt ?? 0;
		const currentTime = current.lastRevisedAt ?? 0;
		return currentTime > mostRecentTime ? current : mostRecent;
	});
}

/**
 * Remove a subtopic from a chapter
 *
 * @param chapterData - Chapter recall data
 * @param subtopicId - Subtopic identifier
 * @returns Updated chapter recall data
 */
export function removeSubtopicFromChapter(
	chapterData: ChapterRecallData,
	subtopicId: string
): ChapterRecallData {
	const { [subtopicId]: removed, ...remainingSubtopics } = chapterData.subtopics;

	return {
		...chapterData,
		subtopics: remainingSubtopics
	};
}

/**
 * Merge modalities used across multiple subtopics
 *
 * @param chapterData - Chapter recall data
 * @param subtopicIds - Array of subtopic IDs to merge
 * @returns Array of unique modalities
 */
export function getMergedModalities(
	chapterData: ChapterRecallData,
	subtopicIds: string[]
): ModalityTag[] {
	const modalitiesSet = new Set<ModalityTag>();

	subtopicIds.forEach((id) => {
		const subtopic = chapterData.subtopics[id];
		if (subtopic) {
			subtopic.modalities.forEach((mod) => modalitiesSet.add(mod));
		}
	});

	return Array.from(modalitiesSet);
}

/**
 * Get modality usage statistics for a chapter
 *
 * @param chapterData - Chapter recall data
 * @returns Object mapping modality to count of subtopics using it
 */
export function getModalityUsage(chapterData: ChapterRecallData): Record<ModalityTag, number> {
	const usage: Partial<Record<ModalityTag, number>> = {};

	Object.values(chapterData.subtopics).forEach((subtopic) => {
		subtopic.modalities.forEach((mod) => {
			usage[mod] = (usage[mod] || 0) + 1;
		});
	});

	return usage as Record<ModalityTag, number>;
}

/**
 * Format modality tag for display
 *
 * @param modality - Modality tag
 * @returns Human-readable label
 */
export function formatModalityLabel(modality: ModalityTag): string {
	const labels: Record<ModalityTag, string> = {
		'theory-skim': 'Theory Skim',
		'formula-sheet': 'Formula Sheet',
		'error-log': 'Error Log',
		'timed-pyqs': 'Timed PYQs',
		'blank-page': 'Blank Page',
		'notes': 'Notes',
		'examples': 'Examples',
		'derivations': 'Derivations'
	};
	return labels[modality] || modality;
}

/**
 * Get recommended modalities based on subtopic decay score
 *
 * @param subtopic - Subtopic progress
 * @returns Array of recommended modalities
 */
export function getRecommendedModalities(subtopic: SubtopicProgress): ModalityTag[] {
	const score = subtopic.decay.currentScore;

	if (score < 30) {
		// Critical: Need comprehensive review
		return ['theory-skim', 'formula-sheet', 'error-log', 'timed-pyqs'];
	} else if (score < 60) {
		// Fading: Need targeted review
		return ['formula-sheet', 'error-log', 'blank-page'];
	} else {
		// Fresh: Quick maintenance
		return ['blank-page', 'timed-pyqs'];
	}
}
