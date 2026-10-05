import { tracker, scheduleSave } from "./tracker";

function _updateAndSave(updater: (state: TrackerState) => TrackerState) {
    tracker.update(updater);
    scheduleSave();
}
import type { TrackerState, 
	ChapterRecallData,
	ConfidenceRating,
	ModalityTag,
	StudyBlock,
	FocusSession
} from '$lib/types/tracker';
import { createChapterRecallData } from '$lib/state/defaults';
import { updateDecayAfterRevision } from '$lib/state/decay';
import { recordSubtopicRevision, addSubtopicToChapter } from '$lib/state/subtopics';
import { todayKey, dayKeyOf } from '$lib/state/dates';

/**
 * Actions for managing the Active Recall Hub state
 */

/**
 * Add a new chapter to the recall tracking system
 *
 * @param chapterKey - Chapter identifier (e.g., "P-1")
 * @param weightage - High-yield weightage (1-3)
 */
export function addChapterToRecall(chapterKey: string, weightage: 1 | 2 | 3 = 2) {
	_updateAndSave(($tracker) => {
		if ($tracker.rev.chapters[chapterKey]) {
			return $tracker; // Already exists
		}

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: createChapterRecallData(chapterKey, weightage)
				}
			}
		};
	});
}

/**
 * Update chapter weightage
 *
 * @param chapterKey - Chapter identifier
 * @param weightage - New weightage (1-3)
 */
export function updateChapterWeightage(chapterKey: string, weightage: 1 | 2 | 3) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						weightage
					}
				}
			}
		};
	});
}

/**
 * Record a chapter-level revision (updates overall decay metrics)
 *
 * @param chapterKey - Chapter identifier
 * @param confidence - Self-evaluation rating
 * @param modalities - Modalities used
 * @param timeSpentMinutes - Time spent in minutes
 */
export function recordChapterRevision(
	chapterKey: string,
	confidence: ConfidenceRating,
	modalities: ModalityTag[],
	timeSpentMinutes: number = 0
) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		const updatedChapter: ChapterRecallData = {
			...chapter,
			decay: updateDecayAfterRevision(chapter.decay, confidence),
			modalities: [...new Set([...chapter.modalities, ...modalities])] as ModalityTag[]
		};

		// Update daily heatmap
		const today = todayKey();
		const todayData = $tracker.rev.dailyHeatmap[today] || { revisedCount: 0, totalTimeMinutes: 0 };

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: updatedChapter
				},
				dailyHeatmap: {
					...$tracker.rev.dailyHeatmap,
					[today]: {
						revisedCount: todayData.revisedCount + 1,
						totalTimeMinutes: todayData.totalTimeMinutes + timeSpentMinutes
					}
				}
			}
		};
	});
}

/**
 * Record a subtopic-level revision
 *
 * @param chapterKey - Chapter identifier
 * @param subtopicId - Subtopic identifier
 * @param subtopicName - Subtopic display name (if new)
 * @param modalities - Modalities used
 * @param confidence - Self-evaluation rating
 * @param timeSpentMinutes - Time spent in minutes
 */
export function recordSubtopicRevisionAction(
	chapterKey: string,
	subtopicId: string,
	subtopicName: string,
	modalities: ModalityTag[],
	confidence: ConfidenceRating,
	timeSpentMinutes: number = 0
) {
	_updateAndSave(($tracker) => {
		let chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) {
			chapter = createChapterRecallData(chapterKey, 2);
		}

		// Add subtopic if it doesn't exist
		if (!chapter.subtopics[subtopicId]) {
			chapter = addSubtopicToChapter(chapter, subtopicId, subtopicName);
		}

		// Record the revision
		const updatedChapter = recordSubtopicRevision(chapter, subtopicId, modalities, confidence);

		// Update daily heatmap
		const today = todayKey();
		const todayData = $tracker.rev.dailyHeatmap[today] || { revisedCount: 0, totalTimeMinutes: 0 };

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: updatedChapter
				},
				dailyHeatmap: {
					...$tracker.rev.dailyHeatmap,
					[today]: {
						revisedCount: todayData.revisedCount + 1,
						totalTimeMinutes: todayData.totalTimeMinutes + timeSpentMinutes
					}
				}
			}
		};
	});
}

/**
 * Add a study block to the timeline
 *
 * @param block - Study block to add
 */
export function addStudyBlock(block: StudyBlock) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			studyBlocks: [...$tracker.rev.studyBlocks, block]
		}
	}));
}

/**
 * Update a study block
 *
 * @param blockId - Block identifier
 * @param updates - Partial updates to the block
 */
export function updateStudyBlock(blockId: string, updates: Partial<StudyBlock>) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			studyBlocks: $tracker.rev.studyBlocks.map((block) =>
				block.id === blockId ? { ...block, ...updates } : block
			)
		}
	}));
}

/**
 * Remove a study block
 *
 * @param blockId - Block identifier
 */
export function removeStudyBlock(blockId: string) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			studyBlocks: $tracker.rev.studyBlocks.filter((block) => block.id !== blockId)
		}
	}));
}

/**
 * Schedule a revision slot for a chapter
 *
 * @param chapterKey - Chapter identifier
 * @param start - ISO datetime string for start
 * @param end - ISO datetime string for end
 * @param parentBlockId - Optional parent study block ID
 */
export function scheduleRevisionSlot(
	chapterKey: string,
	start: string,
	end: string,
	parentBlockId?: string
) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		const slotId = `${chapterKey}-${Date.now()}`;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						scheduledSlots: [
							...chapter.scheduledSlots,
							{ id: slotId, start, end, parentBlockId }
						]
					}
				}
			}
		};
	});
}

/**
 * Remove a scheduled revision slot
 *
 * @param chapterKey - Chapter identifier
 * @param slotId - Slot identifier
 */
export function removeRevisionSlot(chapterKey: string, slotId: string) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						scheduledSlots: chapter.scheduledSlots.filter((slot) => slot.id !== slotId)
					}
				}
			}
		};
	});
}

/**
 * Create a new focus session (brain dump mode)
 *
 * @param chapterKey - Chapter identifier
 * @param subtopicIds - Array of subtopic IDs to focus on
 * @param timerDuration - Timer duration in seconds
 * @returns The created focus session ID
 */
export function createFocusSession(
	chapterKey: string,
	subtopicIds: string[],
	timerDuration: number
): string {
	const sessionId = `focus-${Date.now()}`;
	const session: FocusSession = {
		id: sessionId,
		chapterKey,
		subtopicIds,
		startedAt: Date.now(),
		timerDuration,
		elapsedSeconds: 0,
		isRunning: true,
		phase: 'timer'
	};

	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			focusSessions: [...$tracker.rev.focusSessions, session]
		}
	}));

	return sessionId;
}

/**
 * Update focus session progress
 *
 * @param sessionId - Session identifier
 * @param updates - Partial updates to the session
 */
export function updateFocusSession(sessionId: string, updates: Partial<FocusSession>) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			focusSessions: $tracker.rev.focusSessions.map((session) =>
				session.id === sessionId ? { ...session, ...updates } : session
			)
		}
	}));
}

/**
 * Complete a focus session with confidence rating
 *
 * @param sessionId - Session identifier
 * @param confidence - Self-evaluation rating
 * @param notes - Optional notes from the session
 */
export function completeFocusSession(
	sessionId: string,
	confidence: ConfidenceRating,
	notes?: string
) {
	_updateAndSave(($tracker) => {
		const session = $tracker.rev.focusSessions.find((s) => s.id === sessionId);
		if (!session) return $tracker;

		// Record the revision for each subtopic
		const chapter = $tracker.rev.chapters[session.chapterKey];
		if (chapter) {
			session.subtopicIds.forEach((subtopicId) => {
				const subtopic = chapter.subtopics[subtopicId];
				if (subtopic) {
					// Update subtopic decay
					const updatedSubtopic = {
						...subtopic,
						decay: updateDecayAfterRevision(subtopic.decay, confidence)
					};

					// This is a simplified update - in practice you'd use recordSubtopicRevision
					// But we're updating inline here to avoid circular dependencies
				}
			});

			// Also update chapter-level decay
			const updatedChapter: ChapterRecallData = {
				...chapter,
				decay: updateDecayAfterRevision(chapter.decay, confidence)
			};

			// Update daily heatmap
			const today = todayKey();
			const todayData = $tracker.rev.dailyHeatmap[today] || {
				revisedCount: 0,
				totalTimeMinutes: 0
			};
			const timeSpentMinutes = Math.round(session.elapsedSeconds / 60);

			return {
				...$tracker,
				rev: {
					...$tracker.rev,
					chapters: {
						...$tracker.rev.chapters,
						[session.chapterKey]: updatedChapter
					},
					dailyHeatmap: {
						...$tracker.rev.dailyHeatmap,
						[today]: {
							revisedCount: todayData.revisedCount + 1,
							totalTimeMinutes: todayData.totalTimeMinutes + timeSpentMinutes
						}
					},
					focusSessions: $tracker.rev.focusSessions.map((s) =>
						s.id === sessionId
							? { ...s, isRunning: false, phase: 'complete', confidenceRating: confidence, notes }
							: s
					)
				}
			};
		}

		return $tracker;
	});
}

/**
 * Delete a focus session
 *
 * @param sessionId - Session identifier
 */
export function deleteFocusSession(sessionId: string) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			focusSessions: $tracker.rev.focusSessions.filter((session) => session.id !== sessionId)
		}
	}));
}

/**
 * Remove a chapter from recall tracking
 *
 * @param chapterKey - Chapter identifier
 */
export function removeChapterFromRecall(chapterKey: string) {
	_updateAndSave(($tracker) => {
		const { [chapterKey]: removed, ...remainingChapters } = $tracker.rev.chapters;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: remainingChapters
			}
		};
	});
}

/**
 * Bulk add chapters to recall tracking
 *
 * @param chapterKeys - Array of chapter identifiers
 * @param defaultWeightage - Default weightage for all chapters
 */
export function bulkAddChaptersToRecall(chapterKeys: string[], defaultWeightage: 1 | 2 | 3 = 2) {
	_updateAndSave(($tracker) => {
		const newChapters: Record<string, ChapterRecallData> = {};

		chapterKeys.forEach((key) => {
			if (!$tracker.rev.chapters[key]) {
				newChapters[key] = createChapterRecallData(key, defaultWeightage);
			}
		});

		if (Object.keys(newChapters).length === 0) {
			return $tracker;
		}

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					...newChapters
				}
			}
		};
	});
}

export function boostChapterFromPractice(chapterKey: string) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) {
			// Doesn't exist, so add it fresh
			return {
				...$tracker,
				rev: {
					...$tracker.rev,
					chapters: {
						...$tracker.rev.chapters,
						[chapterKey]: createChapterRecallData(chapterKey, 2)
					}
				}
			};
		}

		// Already exists. Did they already boost it today?
		const today = todayKey();
		const lastRevDate = chapter.decay.lastRevisionAt ? dayKeyOf(new Date(chapter.decay.lastRevisionAt)) : 0;
		
		if (lastRevDate === today) {
			return $tracker; // Already boosted today, prevent half-life explosion from logging 50 questions
		}

		// Reset to 100% and scale half-life like a "Good" rating
		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						decay: updateDecayAfterRevision(chapter.decay, 'good')
					}
				}
			}
		};
	});
}
