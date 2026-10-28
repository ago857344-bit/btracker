import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { updateTracker } from '$lib/stores/tracker';

export type SheetSubject = 'ALL' | 'Physics' | 'Chemistry' | 'Maths';
export type SheetFormulaSource = 'starred' | 'highyield' | 'both';
export type SheetColumnLayout = '1-col' | '2-col' | '3-col';
export type SheetFontSize = 'xs' | 'sm' | 'base';

export interface TestDaySheetOptions {
	subject: SheetSubject;
	includeMistakes: boolean;
	includeFormulas: boolean;
	includeStrategy: boolean;
	includeNotes: boolean;
	formulaSource: SheetFormulaSource;
	errorTypes: Array<'Silly' | 'Formula' | 'Conceptual' | 'Time'>;
	columnLayout: SheetColumnLayout;
	fontSize: SheetFontSize;
	examNotes: string;
}

const DEFAULT_OPTIONS: TestDaySheetOptions = {
	subject: 'ALL',
	includeMistakes: true,
	includeFormulas: true,
	includeStrategy: true,
	includeNotes: true,
	formulaSource: 'both',
	errorTypes: ['Silly', 'Formula', 'Conceptual', 'Time'],
	columnLayout: '2-col',
	fontSize: 'sm',
	examNotes: ''
};

function loadStoredNotes(): string {
	if (!browser) return '';
	try {
		return localStorage.getItem('btracker_test_day_notes') || '';
	} catch {
		return '';
	}
}

export const testDaySheetOpen = writable<boolean>(false);
export const testDaySheetOptions = writable<TestDaySheetOptions>({
	...DEFAULT_OPTIONS,
	examNotes: loadStoredNotes()
});

export function openTestDaySheet(customSubject?: SheetSubject) {
	if (customSubject) {
		testDaySheetOptions.update((opt) => ({ ...opt, subject: customSubject }));
	}
	testDaySheetOpen.set(true);
}

export function closeTestDaySheet() {
	testDaySheetOpen.set(false);
}

export function saveExamNotes(notes: string) {
	testDaySheetOptions.update((opt) => ({ ...opt, examNotes: notes }));
	updateTracker((st) => {
		st.examNotes = notes;
	});
	if (browser) {
		try {
			localStorage.setItem('btracker_test_day_notes', notes);
			localStorage.setItem('btracker_exam_morning_notes', notes);
		} catch {}
	}
}
